from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import secrets
import aiohttp
import asyncio
import os
from config import get_config
from database import init_db, execute_query
from auth import hash_pswd, check_pswd, create_access_token, jwt_required

app = Flask(__name__)
cfg = get_config()
app.config.from_object(cfg) 

CORS(app, origins=app.config['CORS_ORIGINS'])

init_db()

def row_to_dict(row):  
    return dict(row) if row else None

def rows_to_dict_list(rows):
    return [dict(row) for row in rows] if rows else []

async def send_telegram_notification_async(telegram_id, message):
    try:
        bot_token = os.getenv('BOT_TOKEN')
        if not bot_token:
            print("❌ BOT_TOKEN не настроен для уведомлений")
            return False
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': telegram_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=10) as response:
                if response.status == 200:
                    print(f"✅ Уведомление отправлено пользователю {telegram_id}")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Ошибка отправки уведомления: {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Исключение при отправке уведомления: {e}")
        return False

def send_telegram_notification(telegram_id, message):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(send_telegram_notification_async(telegram_id, message))
        loop.close()
        return result
    except Exception as e:
        print(f"❌ Ошибка в синхронной обертке: {e}")
        return False

@app.route('/api/auth/register', methods=['POST'])
def reg():
    data = request.get_json()

    required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
    for field in required_fields:
        if not data or not data.get(field):
            return jsonify({'error': f'Field {field} is required'}), 400
    
    existing_user = execute_query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        (data['email'], data['username']),
        fetch_one=True
    )
    
    if existing_user:
        return jsonify({'error': 'Email or username already registered'}), 400
    
    user_id = execute_query(
        'INSERT INTO users (username, email, first_name, last_name, password_hash) VALUES (?, ?, ?, ?, ?)',
        (data['username'], data['email'], data['first_name'], data['last_name'], hash_pswd(data['password'])),
        lastrowid=True
    )
    
    access_token = create_access_token(user_id)
    
    return jsonify({
        'message': 'User created successfully',
        'access_token': access_token,
        'user': {
            'id': user_id,
            'username': data['username'],
            'email': data['email'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'theme': 'light',
            'telegram_linked': False
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('login') or not data.get('password'):
        return jsonify({'error': 'Login and password required'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        (data['login'], data['login']),
        fetch_one=True
    )
    
    if not user or not check_pswd(user['password_hash'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(user['id'])
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'theme': user['theme'] or 'light',
            'telegram_linked': user['telegram_id'] is not None
        }
    })

@app.route('/api/auth/me', methods=['GET'])
@jwt_required
def get_profile():
    user = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (request.user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'theme': user['theme'] or 'light',
        'telegram_linked': user['telegram_id'] is not None,
        'created_at': user['created_at']
    })

@app.route('/api/auth/me', methods=['PUT'])
@jwt_required
def update_profile():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    allowed_fields = ['first_name', 'last_name', 'theme']
    update_fields = []
    params = []
    
    for field in allowed_fields:
        if field in data:
            update_fields.append(f'{field} = ?')
            params.append(data[field])
    
    if not update_fields:
        return jsonify({'error': 'No valid fields to update'}), 400
    
    params.append(request.user_id)
    
    execute_query(
        f'UPDATE users SET {", ".join(update_fields)} WHERE id = ?',
        params
    )
    
    user = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (request.user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'theme': user['theme'] or 'light',
        'telegram_linked': user['telegram_id'] is not None,
        'created_at': user['created_at']
    })

@app.route('/api/auth/me', methods=['DELETE'])
@jwt_required
def delete_account():
    user_id = request.user_id
    
    try:
        execute_query('DELETE FROM telegram_link_tokens WHERE user_id = ?', (user_id,))
        execute_query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', (user_id,))
        execute_query('DELETE FROM orders WHERE user_id = ?', (user_id,))
        execute_query('DELETE FROM products WHERE created_by = ?', (user_id,))
        execute_query('DELETE FROM users WHERE id = ?', (user_id,))
        
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to delete account'}), 500

@app.route('/api/products', methods=['POST'])
@jwt_required
def create_product():
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('price'):
        return jsonify({'error': 'Name and price required'}), 400
    
    product_id = execute_query(
        '''INSERT INTO products (name, price, description, created_by) 
           VALUES (?, ?, ?, ?)''',
        (data['name'], float(data['price']), data.get('description', ''), request.user_id),
        lastrowid=True
    )
    
    user = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (request.user_id,),
        fetch_one=True
    )
    
    if user and user['telegram_id']:
        message = f"🎉 <b>Ваш товар создан!</b>\n\n📦 <b>{data['name']}</b>\n💰 Цена: {data['price']} руб.\n\nТовар теперь доступен для покупки в магазине!"
        send_telegram_notification(user['telegram_id'], message)
    
    return jsonify({
        'id': product_id,
        'name': data['name'],
        'price': float(data['price']),
        'description': data.get('description', ''),
        'created_by': request.user_id
    }), 201

@app.route('/api/products', methods=['GET'])
@jwt_required
def get_products():
    products = execute_query(
        'SELECT * FROM products WHERE created_by = ? ORDER BY created_at DESC',
        (request.user_id,),
        fetch_all=True
    )
    
    return jsonify(rows_to_dict_list(products))

@app.route('/api/products/all', methods=['GET'])
@jwt_required
def get_all_products():
    products = execute_query('''
        SELECT p.*, u.email as owner_email 
        FROM products p 
        JOIN users u ON p.created_by = u.id 
        ORDER BY p.created_at DESC
    ''', fetch_all=True)
    
    return jsonify(rows_to_dict_list(products))

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@jwt_required
def update_product(product_id):
    data = request.get_json()
    
    product = execute_query(
        'SELECT * FROM products WHERE id = ? AND created_by = ?',
        (product_id, request.user_id),
        fetch_one=True
    )
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    update_fields = []
    params = []
    
    if 'name' in data:
        update_fields.append('name = ?')
        params.append(data['name'])
    if 'price' in data:
        update_fields.append('price = ?')
        params.append(float(data['price']))
    if 'description' in data:
        update_fields.append('description = ?')
        params.append(data['description'])
    
    if not update_fields:
        return jsonify({'error': 'No fields to update'}), 400
    
    params.extend([product_id, request.user_id])
    
    execute_query(
        f'UPDATE products SET {", ".join(update_fields)} WHERE id = ? AND created_by = ?',
        params
    )
    
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@jwt_required
def delete_product(product_id):
    product = execute_query(
        'SELECT * FROM products WHERE id = ? AND created_by = ?',
        (product_id, request.user_id),
        fetch_one=True
    )
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    execute_query(
        'DELETE FROM products WHERE id = ? AND created_by = ?',
        (product_id, request.user_id)
    )
    
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/api/orders', methods=['POST'])
@jwt_required
def create_order():
    data = request.get_json()
    
    if not data or not data.get('items') or not isinstance(data['items'], list):
        return jsonify({'error': 'Items array required'}), 400
    
    total_amount = 0
    order_items = []
    product_owners = {}
    
    for item in data['items']:
        if not item.get('product_id') or not item.get('qty'):
            return jsonify({'error': 'Each item must have product_id and qty'}), 400
        
        product = execute_query(
            'SELECT p.*, u.telegram_id, u.id as owner_id FROM products p JOIN users u ON p.created_by = u.id WHERE p.id = ?',
            (item['product_id'],),
            fetch_one=True
        )
        
        if not product:
            return jsonify({'error': f'Product with id {item["product_id"]} not found'}), 404
        
        item_total = product['price'] * item['qty']
        total_amount += item_total
        
        order_items.append({
            'product_id': product['id'],
            'qty': item['qty'],
            'price': product['price'],
            'product_name': product['name'],
            'owner_id': product['owner_id'],
            'owner_telegram_id': product['telegram_id']
        })
        
        if product['owner_id'] not in product_owners:
            product_owners[product['owner_id']] = {
                'telegram_id': product['telegram_id'],
                'products': []
            }
        product_owners[product['owner_id']]['products'].append({
            'name': product['name'],
            'qty': item['qty'],
            'price': product['price'],
            'total': item_total
        })
    
    order_id = execute_query(
        'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
        (request.user_id, total_amount, 'new'),
        lastrowid=True
    )
    
    for item in order_items:
        execute_query(
            'INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)',
            (order_id, item['product_id'], item['qty'], item['price'])
        )
    
    buyer = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (request.user_id,),
        fetch_one=True
    )
    
    if buyer and buyer['telegram_id']:
        items_text = "\n".join([f"   • {item['product_name']} - {item['qty']} шт." for item in order_items[:3]])
        if len(order_items) > 3:
            items_text += f"\n   • ... и еще {len(order_items) - 3} товаров"
            
        message = f"🎉 <b>Заказ #{order_id} создан!</b>\n\n📦 <b>Ваши товары:</b>\n{items_text}\n\n💰 <b>Общая сумма:</b> {total_amount} руб.\n\n🔄 Статус заказа можно отслеживать через /orders"
        send_telegram_notification(buyer['telegram_id'], message)
    
    for owner_id, owner_info in product_owners.items():
        if owner_info['telegram_id'] and owner_id != request.user_id:
            products_text = "\n".join([f"   • {product['name']} - {product['qty']} шт. × {product['price']} руб. = {product['total']} руб." for product in owner_info['products']])
            
            message = f"🛒 <b>Ваш товар купили!</b>\n\n📦 <b>Заказ #{order_id}</b>\n{products_text}\n\n💰 <b>Общая выручка:</b> {sum(p['total'] for p in owner_info['products'])} руб."
            send_telegram_notification(owner_info['telegram_id'], message)
    
    order_items_details = execute_query('''
        SELECT oi.*, p.name as product_name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
    ''', (order_id,), fetch_all=True)
    
    return jsonify({
        'id': order_id,
        'total_amount': total_amount,
        'status': 'new',
        'created_at': datetime.now().isoformat(),
        'items': [{
            'product_name': item['product_name'],
            'quantity': item['qty'],
            'price': item['price'],
            'total': item['qty'] * item['price']
        } for item in order_items_details]
    }), 201

@app.route('/api/orders', methods=['GET'])
@jwt_required
def get_orders():
    orders = execute_query('''
        SELECT o.*, COUNT(oi.id) as items_count 
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        WHERE o.user_id = ? 
        GROUP BY o.id 
        ORDER BY o.created_at DESC
    ''', (request.user_id,), fetch_all=True)
    
    return jsonify(rows_to_dict_list(orders))

@app.route('/api/orders/<int:order_id>', methods=['GET'])
@jwt_required
def get_order(order_id):
    order = execute_query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        (order_id, request.user_id),
        fetch_one=True
    )
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    order_items = execute_query('''
        SELECT oi.*, p.name as product_name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
    ''', (order_id,), fetch_all=True)
    
    return jsonify({
        'id': order['id'],
        'total_amount': order['total_amount'],
        'status': order['status'],
        'created_at': order['created_at'],
        'items': [{
            'product_name': item['product_name'],
            'quantity': item['qty'],
            'price': item['price'],
            'total': item['qty'] * item['price']
        } for item in order_items]
    })

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@jwt_required
def update_order(order_id):
    data = request.get_json()
    
    order = execute_query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        (order_id, request.user_id),
        fetch_one=True
    )
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    old_status = order['status']
    
    if 'status' in data:
        allowed_statuses = ['new', 'in_progress', 'completed', 'canceled']
        if data['status'] not in allowed_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        execute_query(
            'UPDATE orders SET status = ? WHERE id = ?',
            (data['status'], order_id)
        )
        
        buyer = execute_query(
            'SELECT u.telegram_id FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?',
            (order_id,),
            fetch_one=True
        )
        
        if buyer and buyer['telegram_id']:
            status_emojis = {
                'new': '🆕',
                'in_progress': '🔄',
                'completed': '✅',
                'canceled': '❌'
            }
            emoji = status_emojis.get(data['status'], '📦')
            
            message = f"📢 <b>Статус заказа обновлен!</b>\n\n🆔 Заказ #{order_id}\n{emoji} Статус: <b>{data['status']}</b>\n\n📊 Предыдущий статус: {old_status}"
            send_telegram_notification(buyer['telegram_id'], message)
    
    updated_order = execute_query(
        'SELECT * FROM orders WHERE id = ?',
        (order_id,),
        fetch_one=True
    )
    
    return jsonify({
        'id': updated_order['id'],
        'total_amount': updated_order['total_amount'],
        'status': updated_order['status'],
        'created_at': updated_order['created_at']
    })

@app.route('/api/telegram/create-order', methods=['POST'])
def create_telegram_order():
    try:
        data = request.get_json()
        print(f"📦 Получен запрос на создание заказа: {data}")
        
        if not data or not data.get('telegram_id') or not data.get('items') or not isinstance(data['items'], list):
            return jsonify({'error': 'telegram_id and items array required'}), 400
        
        telegram_id = data['telegram_id']
        
        user = execute_query(
            'SELECT * FROM users WHERE telegram_id = ?',
            (telegram_id,),
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_id = user['id']
        total_amount = data.get('total_amount', 0)
        order_items = data['items']
        
        print(f"👤 Найден пользователь: {user['email']}, ID: {user_id}")
        
        order_id = execute_query(
            'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
            (user_id, total_amount, 'new'),
            lastrowid=True
        )
        
        print(f"📝 Создан заказ ID: {order_id}")
        
        for item in order_items:
            product_id = execute_query(
                'INSERT INTO products (name, price, description, created_by) VALUES (?, ?, ?, ?)',
                (item['product_name'], item['price'], item.get('description', f'Товар из заказа Telegram #{order_id}'), user_id),
                lastrowid=True
            )
            
            execute_query(
                'INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)',
                (order_id, product_id, item['quantity'], item['price'])
            )
            
            print(f"✅ Добавлен товар: {item['product_name']} - {item['quantity']} шт. × {item['price']} руб.")
        
        print(f"✅ Добавлено {len(order_items)} товаров в заказ")
        
        order_details = execute_query(
            'SELECT * FROM orders WHERE id = ?',
            (order_id,),
            fetch_one=True
        )
        
        order_items_details = execute_query('''
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        ''', (order_id,), fetch_all=True)
        
        if user['telegram_id']:
            items_text = "\n".join([f"   • {item['product_name']} - {item['quantity']} шт. × {item['price']} руб." for item in order_items])
            
            message = f"🎉 <b>Заказ #{order_id} создан!</b>\n\n📦 <b>Ваши товары:</b>\n{items_text}\n\n💰 <b>Общая сумма:</b> {total_amount} руб.\n\n🔄 Статус заказа можно отслеживать через /orders"
            send_telegram_notification(user['telegram_id'], message)
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'total_amount': total_amount,
            'status': 'new',
            'created_at': order_details['created_at'],
            'items': [{
                'product_name': item['product_name'],
                'quantity': item['quantity'],
                'price': item['price'],
                'total': item['quantity'] * item['price']
            } for item in order_items]
        }), 201
        
    except Exception as e:
        print(f"❌ Ошибка при создании заказа: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/telegram/products', methods=['GET'])
def get_telegram_products():
    telegram_id = request.args.get('telegram_id')
    
    if not telegram_id:
        return jsonify({'error': 'telegram_id required'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE telegram_id = ?',
        (telegram_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    products = execute_query(
        'SELECT * FROM products WHERE created_by = ? ORDER BY created_at DESC',
        (user['id'],),
        fetch_all=True
    )
    
    return jsonify(rows_to_dict_list(products))

@app.route('/api/telegram/generate-token', methods=['POST'])
@jwt_required
def generate_telegram_token():
    execute_query(
        'DELETE FROM telegram_link_tokens WHERE user_id = ?',
        (request.user_id,)
    )
    
    token = secrets.token_hex(16)
    expires_at = datetime.now() + timedelta(minutes=30)
    
    execute_query(
        'INSERT INTO telegram_link_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        (request.user_id, token, expires_at)
    )
    
    user = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (request.user_id,),
        fetch_one=True
    )
    
    if user and user['telegram_id']:
        message = f"🔗 <b>Код для привязки аккаунта</b>\n\n📝 <code>{token}</code>\n\n⏰ Действителен 30 минут\n\n💡 Отправьте боту команду:\n<code>/link {token}</code>"
        send_telegram_notification(user['telegram_id'], message)
    
    return jsonify({
        'token': token,
        'expires_at': expires_at.isoformat()
    })

@app.route('/link-telegram', methods=['GET'])
def link_telegram():
    token = request.args.get('token')
    telegram_id = request.args.get('telegram_id')
    
    if not token or not telegram_id:
        return jsonify({'error': 'Token and telegram_id required'}), 400
    
    token_record = execute_query(
        'SELECT * FROM telegram_link_tokens WHERE token = ? AND is_used = 0 AND expires_at > ?',
        (token, datetime.now()),
        fetch_one=True
    )
    
    if not token_record:
        return jsonify({'error': 'Invalid or expired token'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE id = ?',
        (token_record['user_id'],),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    execute_query(
        'UPDATE users SET telegram_id = ? WHERE id = ?',
        (telegram_id, user['id'])
    )
    
    execute_query(
        'UPDATE telegram_link_tokens SET is_used = 1 WHERE id = ?',
        (token_record['id'],)
    )
    
    message = f"✅ <b>Аккаунт успешно привязан!</b>\n\n👤 {user['email']}\n\nТеперь вы будете получать уведомления о:\n• Новых заказах\n• Покупках ваших товаров\n• Изменениях статусов"
    send_telegram_notification(telegram_id, message)
    
    return jsonify({
        'success': True,
        'message': 'Telegram account linked successfully',
        'user_email': user['email']
    })

@app.route('/api/telegram/user-info', methods=['GET'])
def get_telegram_user_info():
    telegram_id = request.args.get('telegram_id')
    
    if not telegram_id:
        return jsonify({'error': 'telegram_id required'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE telegram_id = ?',
        (telegram_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    all_orders = execute_query(
        'SELECT * FROM orders WHERE user_id = ?',
        (user['id'],),
        fetch_all=True
    )
    
    total_all_orders = sum(order['total_amount'] for order in all_orders) if all_orders else 0
    
    orders = execute_query('''
        SELECT o.* 
        FROM orders o 
        WHERE o.user_id = ? 
        ORDER BY o.created_at DESC 
        LIMIT 3
    ''', (user['id'],), fetch_all=True)
    
    orders_list = []
    for order in orders:
        order_dict = dict(order)
        
        order_items = execute_query('''
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        ''', (order['id'],), fetch_all=True)
        
        items_list = []
        for item in order_items:
            item_dict = dict(item)
            items_list.append({
                'product_name': item_dict['product_name'],
                'quantity': item_dict['qty'],
                'price': float(item_dict['price']),
                'total': float(item_dict['qty'] * item_dict['price'])
            })
        
        order_dict['items'] = items_list
        orders_list.append(order_dict)
    
    return jsonify({
        'email': user['email'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'total_all_orders': total_all_orders,
        'orders': orders_list
    })

@app.route('/api/telegram/orders', methods=['GET'])
def get_telegram_orders():
    telegram_id = request.args.get('telegram_id')
    
    if not telegram_id:
        return jsonify({'error': 'telegram_id required'}), 400
    
    user = execute_query(
        'SELECT * FROM users WHERE telegram_id = ?',
        (telegram_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    orders = execute_query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        (user['id'],),
        fetch_all=True
    )
    
    orders_list = []
    for order in orders:
        order_dict = dict(order)
        
        order_items = execute_query('''
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        ''', (order['id'],), fetch_all=True)
        
        items_list = []
        for item in order_items:
            item_dict = dict(item)
            items_list.append({
                'product_name': item_dict['product_name'],
                'quantity': item_dict['qty'],
                'price': float(item_dict['price']),
                'total': float(item_dict['qty'] * item_dict['price'])
            })
        
        order_dict['items'] = items_list
        orders_list.append(order_dict)
    
    return jsonify(orders_list)

@app.route('/')
def hello():
    return jsonify({
        'message': 'Order System API is running!',
        'version': '2.0',
        'endpoints': {
            'auth': '/api/auth/register, /api/auth/login, /api/auth/me',
            'products': '/api/products, /api/products/all',
            'orders': '/api/orders',
            'telegram': '/api/telegram/generate-token, /link-telegram, /api/telegram/create-order, /api/telegram/products'
        }
    })

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )