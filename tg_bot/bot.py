import os
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, CallbackQuery
from aiogram.enums import ParseMode
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Конфигурация
API_URL = "http://localhost:5000"
BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    logger.error("BOT_TOKEN environment variable is not set!")
    exit(1)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Хранилище данных пользователей
user_pages = {}
user_products = {}

# Состояния для создания заказа
class CreateOrderStates(StatesGroup):
    choosing_product_type = State()
    waiting_for_product_name = State()
    waiting_for_quantity = State()
    waiting_for_price = State()
    waiting_for_description = State()
    waiting_for_confirmation = State()
    selecting_existing_product = State()

async def make_api_request(url, params=None, method="GET", json_data=None):
    """Универсальная функция для API запросов"""
    try:
        async with aiohttp.ClientSession() as session:
            if method == "GET":
                async with session.get(url, params=params) as response:
                    logger.info(f"GET запрос к {url}, статус: {response.status}")
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_data = await response.text()
                        logger.error(f"API error: {error_data}")
                        return None
            elif method == "POST":
                async with session.post(url, json=json_data) as response:
                    logger.info(f"POST запрос к {url}, статус: {response.status}")
                    if response.status in [200, 201]:
                        return await response.json()
                    else:
                        error_data = await response.text()
                        logger.error(f"API error: {error_data}")
                        return None
    except aiohttp.ClientConnectorError as e:
        logger.error(f"Connection error: {e}")
        return None
    except asyncio.TimeoutError as e:
        logger.error(f"Timeout error: {e}")
        return None
    except Exception as e:
        logger.error(f"Request error: {e}")
        return None

def create_pagination_keyboard(page, total_pages):
    """Создает клавиатуру для пагинации"""
    keyboard = []
    
    if total_pages > 1:
        row = []
        if page > 1:
            row.append(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"orders_page_{page-1}"))
        
        row.append(InlineKeyboardButton(text=f"{page}/{total_pages}", callback_data="current_page"))
        
        if page < total_pages:
            row.append(InlineKeyboardButton(text="Вперед ➡️", callback_data=f"orders_page_{page+1}"))
        
        keyboard.append(row)
    
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def split_orders_into_pages(orders, orders_per_page=3):
    """Разбивает заказы на страницы"""
    if not orders:
        return []
    pages = []
    for i in range(0, len(orders), orders_per_page):
        pages.append(orders[i:i + orders_per_page])
    
    return pages

def format_orders_page(orders, page, total_pages, total_orders):
    """Форматирует сообщение с заказами для указанной страницы"""
    if not orders:
        return "📦 На этой странице нет заказов"
    
    message_text = f"📋 <b>Ваши заказы (стр. {page}/{total_pages})</b>\n\n"
    
    for order in orders:
        message_text += f"🆔 <b>Заказ #{order['id']}</b>\n"
        message_text += f"💰 Сумма: {order['total_amount']} руб.\n"
        message_text += f"📊 Статус: {get_status_emoji(order['status'])} <b>{format_status(order['status'])}</b>\n"
        message_text += f"📅 Дата: {order['created_at'][:10]}\n"
        
        if order.get('items'):
            message_text += "🛍️ <b>Товары:</b>\n"
            for item in order['items']:
                message_text += f"   • <b>{item['product_name']}</b> - {item['quantity']} шт.\n"
                message_text += f"     {item['price']} руб. × {item['quantity']} = {item['total']} руб.\n"
        else:
            message_text += "🛍️ <b>Товары:</b> нет информации\n"
        
        message_text += "\n" + "─" * 40 + "\n\n"
    
    message_text += f"<i>Всего заказов: {total_orders}</i>"
    
    return message_text

def get_status_emoji(status):
    """Возвращает emoji для статуса заказа"""
    emoji_map = {
        'new': '🆕',
        'in_progress': '🔄',
        'completed': '✅',
        'canceled': '❌'
    }
    return emoji_map.get(status, '📦')

def format_status(status):
    """Форматирует статус для читаемого отображения"""
    status_map = {
        'new': 'Новый',
        'in_progress': 'В процессе',
        'completed': 'Завершен',
        'canceled': 'Отменен'
    }
    return status_map.get(status, status)

@dp.message(Command("start"))
async def cmd_start(message: Message):
    """Обработчик команды /start"""
    user = message.from_user
    welcome_text = f"""
👋 Привет, {user.first_name}!

Я - бот для управления заказами Bobrshop.

📋 Доступные команды:
/start - Начало работы
/link [код] - Привязать аккаунт
/orders - Мои заказы
/create_order - Создать новый заказ
/profile - Информация о профиле
/help - Помощь

🔗 Для начала привяжите ваш аккаунт с помощью команды /link
    """
    await message.answer(welcome_text, parse_mode=ParseMode.HTML)

@dp.message(Command("help"))
async def cmd_help(message: Message):
    """Обработчик команды /help"""
    help_text = """
🆘 <b>Помощь по командам:</b>

/link [код] - Привязать аккаунт
   Пример: <code>/link a1b2c3d4e5f6g7h8</code>

/orders - Показать все заказы 
/create_order - Создать новый заказ
/profile - Информация о профиле
/help - Эта справка

💡 <b>Как привязать аккаунт:</b>
1. Зайдите в веб-приложение Bobrshop
2. Перейдите в раздел "Профиль"
3. Нажмите "Сгенерировать код"
4. Используйте команду /link с полученным кодом
    """
    await message.answer(help_text, parse_mode=ParseMode.HTML)

@dp.message(Command("link"))
async def cmd_link(message: Message):
    """Обработчик команды /link для привязки аккаунта"""
    args = message.text.split()
    if len(args) < 2:
        await message.answer(
            "❌ <b>Необходимо указать код!</b>\n\n"
            "Пример: <code>/link a1b2c3d4e5f6g7h8</code>\n\n"
            "Код можно получить в веб-приложении в разделе 'Профиль'",
            parse_mode=ParseMode.HTML
        )
        return

    token = args[1]
    telegram_id = message.from_user.id
    
    url = f"{API_URL}/link-telegram"
    params = {"token": token, "telegram_id": telegram_id}
    
    data = await make_api_request(url, params)
    
    if data and data.get('success'):
        await message.answer(
            f"✅ <b>Аккаунт успешно привязан!</b>\n\n"
            f"👤 {data['user_email']}\n\n"
            f"Теперь вы будете получать уведомления о:\n"
            f"• Новых заказах\n"
            f"• Покупках ваших товаров\n"
            f"• Изменениях статусов",
            parse_mode=ParseMode.HTML
        )
    else:
        error_msg = data.get('error', 'Неизвестная ошибка') if data else 'Ошибка соединения с сервером'
        await message.answer(
            f"❌ <b>Ошибка привязки:</b> {error_msg}",
            parse_mode=ParseMode.HTML
        )

@dp.message(Command("create_order"))
async def cmd_create_order(message: Message, state: FSMContext):
    """Обработчик команды /create_order для создания нового заказа"""
    telegram_id = message.from_user.id
    
    user_data = await make_api_request(
        f"{API_URL}/api/telegram/user-info",
        params={"telegram_id": telegram_id}
    )
    
    if not user_data or 'error' in user_data:
        await message.answer(
            "❌ <b>Аккаунт не привязан!</b>\n\n"
            "Используйте команду /link для привязки аккаунта перед созданием заказа.",
            parse_mode=ParseMode.HTML
        )
        return
    
    products_data = await make_api_request(
        f"{API_URL}/api/telegram/products",
        params={"telegram_id": telegram_id}
    )
    
    user_products[telegram_id] = products_data if products_data else []
    
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🛍️ Выбрать существующий товар", callback_data="select_existing"),
                InlineKeyboardButton(text="➕ Создать новый товар", callback_data="create_new")
            ]
        ]
    )
    
    await message.answer(
        "🛍️ <b>Создание нового заказа</b>\n\n"
        "Выберите тип товара:",
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard
    )
    await state.set_state(CreateOrderStates.choosing_product_type)

@dp.callback_query(F.data == "select_existing", CreateOrderStates.choosing_product_type)
async def process_select_existing(callback: CallbackQuery, state: FSMContext):
    """Обработчик выбора существующего товара"""
    telegram_id = callback.from_user.id
    products = user_products.get(telegram_id, [])
    
    if not products:
        await callback.message.edit_text(
            "❌ <b>У вас нет созданных товаров</b>\n\n"
            "Создайте сначала товары в веб-приложении или выберите создание нового товара.",
            parse_mode=ParseMode.HTML
        )
        await state.set_state(CreateOrderStates.choosing_product_type)
        return
    
    keyboard_buttons = []
    for product in products[:10]:
        keyboard_buttons.append([
            InlineKeyboardButton(
                text=f"{product['name']} - {product['price']} руб.",
                callback_data=f"product_{product['id']}"
            )
        ])
    
    keyboard_buttons.append([
        InlineKeyboardButton(text="⬅️ Назад", callback_data="back_to_choice")
    ])
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    
    await callback.message.edit_text(
        "🛍️ <b>Выберите товар из списка:</b>",
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard
    )
    await state.set_state(CreateOrderStates.selecting_existing_product)

@dp.callback_query(F.data.startswith("product_"), CreateOrderStates.selecting_existing_product)
async def process_product_selection(callback: CallbackQuery, state: FSMContext):
    """Обработчик выбора конкретного товара"""
    product_id = int(callback.data.split("_")[1])
    telegram_id = callback.from_user.id
    
    products = user_products.get(telegram_id, [])
    selected_product = None
    for product in products:
        if product['id'] == product_id:
            selected_product = product
            break
    
    if not selected_product:
        await callback.answer("Товар не найден")
        return
    
    await state.update_data(
        product_name=selected_product['name'],
        price=selected_product['price'],
        description=selected_product.get('description', ''),
        is_existing_product=True
    )
    
    await callback.message.edit_text(
        f"📝 <b>Товар:</b> {selected_product['name']}\n"
        f"💰 <b>Цена:</b> {selected_product['price']} руб.\n\n"
        "Теперь введите количество:",
        parse_mode=ParseMode.HTML
    )
    await state.set_state(CreateOrderStates.waiting_for_quantity)

@dp.callback_query(F.data == "back_to_choice", CreateOrderStates.selecting_existing_product)
async def process_back_to_choice(callback: CallbackQuery, state: FSMContext):
    """Обработчик возврата к выбору типа товара"""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🛍️ Выбрать существующий товар", callback_data="select_existing"),
                InlineKeyboardButton(text="➕ Создать новый товар", callback_data="create_new")
            ]
        ]
    )
    
    await callback.message.edit_text(
        "🛍️ <b>Создание нового заказа</b>\n\n"
        "Выберите тип товара:",
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard
    )
    await state.set_state(CreateOrderStates.choosing_product_type)

@dp.callback_query(F.data == "create_new", CreateOrderStates.choosing_product_type)
async def process_create_new(callback: CallbackQuery, state: FSMContext):
    """Обработчик создания нового товара"""
    await callback.message.edit_text(
        "🛍️ <b>Создание нового заказа</b>\n\n"
        "Введите название товара:",
        parse_mode=ParseMode.HTML
    )
    await state.set_state(CreateOrderStates.waiting_for_product_name)

@dp.message(CreateOrderStates.waiting_for_product_name)
async def process_product_name(message: Message, state: FSMContext):
    """Обработчик ввода названия товара"""
    await state.update_data(product_name=message.text, is_existing_product=False)
    
    await message.answer(
        f"📝 <b>Товар:</b> {message.text}\n\n"
        "Теперь введите количество:",
        parse_mode=ParseMode.HTML
    )
    await state.set_state(CreateOrderStates.waiting_for_quantity)

@dp.message(CreateOrderStates.waiting_for_quantity)
async def process_quantity(message: Message, state: FSMContext):
    """Обработчик ввода количества товара"""
    try:
        quantity = int(message.text)
        if quantity <= 0:
            await message.answer("❌ Количество должно быть положительным числом. Попробуйте еще раз:")
            return
    except ValueError:
        await message.answer("❌ Пожалуйста, введите целое число для количества:")
        return
    
    data = await state.get_data()
    
    if data.get('is_existing_product'):
        price = data['price']
        total_amount = price * quantity
        
        await state.update_data(quantity=quantity, total_amount=total_amount)
        
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_order"),
                    InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_order")
                ]
            ]
        )
        
        await message.answer(
            f"🛍️ <b>Подтверждение заказа</b>\n\n"
            f"📝 <b>Товар:</b> {data['product_name']}\n"
            f"🔢 <b>Количество:</b> {quantity}\n"
            f"💰 <b>Цена за единицу:</b> {price} руб.\n"
            f"💵 <b>Общая сумма:</b> {total_amount} руб.\n\n"
            f"Подтверждаете создание заказа?",
            parse_mode=ParseMode.HTML,
            reply_markup=keyboard
        )
        await state.set_state(CreateOrderStates.waiting_for_confirmation)
    else:
        await state.update_data(quantity=quantity)
        
        await message.answer(
            f"📝 <b>Товар:</b> {data['product_name']}\n"
            f"🔢 <b>Количество:</b> {quantity}\n\n"
            "Теперь введите цену за единицу (в рублях):",
            parse_mode=ParseMode.HTML
        )
        await state.set_state(CreateOrderStates.waiting_for_price)

@dp.message(CreateOrderStates.waiting_for_price)
async def process_price(message: Message, state: FSMContext):
    """Обработчик ввода цены товара"""
    try:
        price = float(message.text)
        if price <= 0:
            await message.answer("❌ Цена должна быть положительным числом. Попробуйте еще раз:")
            return
    except ValueError:
        await message.answer("❌ Пожалуйста, введите число для цены:")
        return
    
    data = await state.get_data()
    product_name = data['product_name']
    quantity = data['quantity']
    total_amount = price * quantity
    
    await state.update_data(price=price, total_amount=total_amount)
    
    await message.answer(
        f"📝 <b>Товар:</b> {product_name}\n"
        f"🔢 <b>Количество:</b> {quantity}\n"
        f"💰 <b>Цена за единицу:</b> {price} руб.\n\n"
        "Теперь введите описание товара (или отправьте 'нет', чтобы пропустить):",
        parse_mode=ParseMode.HTML
    )
    await state.set_state(CreateOrderStates.waiting_for_description)

@dp.message(CreateOrderStates.waiting_for_description)
async def process_description(message: Message, state: FSMContext):
    """Обработчик ввода описания товара"""
    description = message.text if message.text.lower() != 'нет' else ''
    
    await state.update_data(description=description)
    
    data = await state.get_data()
    product_name = data['product_name']
    quantity = data['quantity']
    price = data['price']
    total_amount = data['total_amount']
    
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_order"),
                InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_order")
            ]
        ]
    )
    
    message_text = f"🛍️ <b>Подтверждение заказа</b>\n\n"
    message_text += f"📝 <b>Товар:</b> {product_name}\n"
    message_text += f"🔢 <b>Количество:</b> {quantity}\n"
    message_text += f"💰 <b>Цена за единицу:</b> {price} руб.\n"
    if description:
        message_text += f"📄 <b>Описание:</b> {description}\n"
    message_text += f"💵 <b>Общая сумма:</b> {total_amount} руб.\n\n"
    message_text += f"Подтверждаете создание заказа?"
    
    await message.answer(
        message_text,
        parse_mode=ParseMode.HTML,
        reply_markup=keyboard
    )
    await state.set_state(CreateOrderStates.waiting_for_confirmation)

@dp.callback_query(F.data == "confirm_order", CreateOrderStates.waiting_for_confirmation)
async def process_order_confirmation(callback: CallbackQuery, state: FSMContext):
    """Обработчик подтверждения заказа"""
    data = await state.get_data()
    telegram_id = callback.from_user.id
    
    order_data = {
        "telegram_id": telegram_id,
        "items": [
            {
                "product_name": data['product_name'],
                "quantity": data['quantity'],
                "price": data['price'],
                "total": data['total_amount']
            }
        ],
        "total_amount": data['total_amount']
    }
    
    if data.get('description'):
        order_data['items'][0]['description'] = data['description']
    
    logger.info(f"Отправка данных заказа: {order_data}")
    
    response = await make_api_request(
        f"{API_URL}/api/telegram/create-order",
        method="POST",
        json_data=order_data
    )
    
    logger.info(f"Ответ от сервера: {response}")
    
    if response and response.get('success'):
        order_id = response.get('order_id', 'N/A')
        message_text = f"✅ <b>Заказ успешно создан!</b>\n\n"
        message_text += f"🆔 <b>Номер заказа:</b> #{order_id}\n"
        message_text += f"📝 <b>Товар:</b> {data['product_name']}\n"
        message_text += f"🔢 <b>Количество:</b> {data['quantity']}\n"
        message_text += f"💰 <b>Цена за единицу:</b> {data['price']} руб.\n"
        if data.get('description'):
            message_text += f"📄 <b>Описание:</b> {data['description']}\n"
        message_text += f"💵 <b>Общая сумма:</b> {data['total_amount']} руб.\n\n"
        message_text += f"Вы можете просмотреть все свои заказы с помощью команды /orders"
        
        await callback.message.edit_text(
            message_text,
            parse_mode=ParseMode.HTML
        )
    else:
        error_msg = response.get('error', 'Неизвестная ошибка') if response else 'Ошибка соединения с сервером'
        logger.error(f"Ошибка при создании заказа: {error_msg}")
        await callback.message.edit_text(
            f"❌ <b>Ошибка при создании заказа:</b> {error_msg}\n\n"
            f"⚠️ <i>Заказ мог быть создан, но мы не получили подтверждение от сервера.</i>\n"
            f"Проверьте ваши заказы с помощью команды /orders",
            parse_mode=ParseMode.HTML
        )
    
    await state.clear()

@dp.callback_query(F.data == "cancel_order", CreateOrderStates.waiting_for_confirmation)
async def process_order_cancellation(callback: CallbackQuery, state: FSMContext):
    """Обработчик отмены заказа"""
    await callback.message.edit_text(
        "❌ <b>Создание заказа отменено</b>",
        parse_mode=ParseMode.HTML
    )
    await state.clear()

@dp.message(Command("orders"))
async def cmd_orders(message: Message):
    """Обработчик команды /orders для показа заказов"""
    telegram_id = message.from_user.id
    
    orders_data = await make_api_request(
        f"{API_URL}/api/telegram/orders",
        params={"telegram_id": telegram_id}
    )
    
    if not orders_data:
        await message.answer(
            "❌ <b>Ошибка соединения с сервером</b>\n\n"
            "Попробуйте позже или обратитесь к администратору.",
            parse_mode=ParseMode.HTML
        )
        return
    
    if isinstance(orders_data, dict) and 'error' in orders_data:
        await message.answer(
            "❌ <b>Аккаунт не привязан!</b>\n\n"
            "Используйте команду /link для привязки аккаунта.",
            parse_mode=ParseMode.HTML
        )
        return
    
    if not orders_data:
        await message.answer(
            "📦 <b>У вас пока нет заказов</b>\n\n"
            "Сделайте первый заказ в веб-приложении Bobrshop!",
            parse_mode=ParseMode.HTML
        )
        return
    
    orders_pages = split_orders_into_pages(orders_data, orders_per_page=3)
    total_pages = len(orders_pages)
    total_orders = len(orders_data)
    
    user_pages[telegram_id] = {
        'orders_pages': orders_pages,
        'current_page': 1,
        'total_pages': total_pages,
        'total_orders': total_orders
    }
    
    current_orders = orders_pages[0]
    message_text = format_orders_page(current_orders, 1, total_pages, total_orders)
    keyboard = create_pagination_keyboard(1, total_pages)
    
    await message.answer(message_text, parse_mode=ParseMode.HTML, reply_markup=keyboard)

@dp.callback_query(F.data.startswith("orders_page_"))
async def process_orders_pagination(callback: CallbackQuery):
    """Обработчик пагинации заказов"""
    telegram_id = callback.from_user.id
    page = int(callback.data.split("_")[2])
    
    user_data = user_pages.get(telegram_id)
    if not user_data:
        await callback.answer("Данные устарели. Используйте /orders для обновления.")
        return
    
    orders_pages = user_data['orders_pages']
    total_pages = user_data['total_pages']
    total_orders = user_data['total_orders']
    
    if page < 1 or page > total_pages:
        await callback.answer("Неверная страница")
        return
    
    user_pages[telegram_id]['current_page'] = page
    
    current_orders = orders_pages[page-1]
    message_text = format_orders_page(current_orders, page, total_pages, total_orders)
    keyboard = create_pagination_keyboard(page, total_pages)
    
    await callback.message.edit_text(message_text, parse_mode=ParseMode.HTML, reply_markup=keyboard)
    await callback.answer()

@dp.callback_query(F.data == "current_page")
async def process_current_page(callback: CallbackQuery):
    """Обработчик нажатия на текущую страницу"""
    await callback.answer("Это текущая страница")

@dp.message(Command("profile"))
async def cmd_profile(message: Message):
    """Обработчик команды /profile для показа профиля"""
    telegram_id = message.from_user.id
    
    user_data = await make_api_request(
        f"{API_URL}/api/telegram/user-info",
        params={"telegram_id": telegram_id}
    )
    
    if not user_data:
        await message.answer(
            "❌ <b>Ошибка соединения с сервером</b>",
            parse_mode=ParseMode.HTML
        )
        return
    
    if 'error' in user_data:
        await message.answer(
            "❌ <b>Аккаунт не привязан!</b>\n\n"
            "Используйте команду /link для привязки аккаунта.",
            parse_mode=ParseMode.HTML
        )
        return
    
    all_orders = await make_api_request(
        f"{API_URL}/api/telegram/orders",
        params={"telegram_id": telegram_id}
    )
    
    total_amount_all_orders = 0
    if all_orders and not isinstance(all_orders, dict):
        total_amount_all_orders = sum(order['total_amount'] for order in all_orders)
    
    orders = user_data.get('orders', [])
    
    profile_text = f"""
👤 <b>Профиль пользователя</b>

📧 Email: {user_data['email']}
👨‍💼 Имя: {user_data['first_name']} {user_data['last_name']}
📦 Всего заказов: {len(orders)}
💳 Сумма всех заказов: {total_amount_all_orders} руб.

💡 <b>Последние действия:</b>
"""
    
    if orders:
        for order in orders[:3]:
            profile_text += f"\n🆔 Заказ #{order['id']} - {order['total_amount']} руб."
            profile_text += f" ({get_status_emoji(order['status'])} {format_status(order['status'])})"
            
            if order.get('items'):
                for item in order['items'][:2]:
                    profile_text += f"\n   📦 {item['product_name']} - {item['quantity']} шт."
                if len(order['items']) > 2:
                    profile_text += f"\n   ... и еще {len(order['items']) - 2} товаров"
    else:
        profile_text += "\n📝 Заказов пока нет"
    
    await message.answer(profile_text, parse_mode=ParseMode.HTML)

@dp.message(F.text & ~F.text.startswith('/'))
async def handle_text(message: Message):
    """Обработчик текстовых сообщений"""
    await message.answer(
        "🤖 <b>Я понимаю только команды</b>\n\n"
        "Используйте /help для просмотра доступных команд",
        parse_mode=ParseMode.HTML
    )

async def main():
    """Основная функция запуска бота"""
    logger.info("Bot is starting...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())