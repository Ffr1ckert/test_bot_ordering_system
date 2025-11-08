import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const CartItem = React.memo(({ item, onUpdateQuantity, onRemove }) => {
  const { theme } = useTheme();
  
  return (
    <article className="card p-6 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-up dark:bg-gray-800 dark:border-gray-700">
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">{item.name}</h3>
        <p className="text-lg text-green-600 dark:text-green-400 font-bold">{item.price} ₽</p>
      </div>
      
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button 
            onClick={() => onUpdateQuantity(item.product_id, item.qty - 1)}
            disabled={item.qty <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-900 dark:text-white"
            aria-label="Уменьшить количество"
          >
            <span className="text-lg font-bold">−</span>
          </button>
          <span className="mx-3 font-bold min-w-[2rem] text-center text-gray-700 dark:text-gray-300">{item.qty}</span>
          <button 
            onClick={() => onUpdateQuantity(item.product_id, item.qty + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white"
            aria-label="Увеличить количество"
          >
            <span className="text-lg font-bold">+</span>
          </button>
        </div>
        
        <p className="text-xl font-bold text-green-700 dark:text-green-400 min-w-[100px] text-right">
          {item.price * item.qty} ₽
        </p>
        
        <button 
          onClick={() => onRemove(item.product_id)}
          className="btn btn-danger px-3 py-2"
          aria-label="Удалить товар"
        >
          <span className="text-lg">🗑️</span>
        </button>
      </div>
    </article>
  );
});

const Cart = ({ token, user }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const updateCart = useCallback((newCart) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  }, []);

  const updateQuantity = useCallback((productId, newQty) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }
    const updatedCart = cart.map(item => 
      item.product_id === productId ? { ...item, qty: newQty } : item
    );
    updateCart(updatedCart);
  }, [cart, updateCart]);

  const removeFromCart = useCallback((productId) => {
    const updatedCart = cart.filter(item => item.product_id !== productId);
    updateCart(updatedCart);
  }, [cart, updateCart]);

  const getTotalAmount = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }, [cart]);

  const createOrder = async () => {
    if (cart.length === 0) {
      setAlert({ type: 'error', message: 'Корзина пуста!' });
      return;
    }

    setLoading(true);
    const orderData = {
      items: cart.map(item => ({
        product_id: item.product_id,
        qty: item.qty
      }))
    };

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        setAlert({ 
          type: 'success', 
          message: `Заказ #${order.id} успешно создан! Сумма: ${order.total_amount} ₽` 
        });
        setCart([]);
        localStorage.setItem('cart', '[]');
        setTimeout(() => navigate('/orders'), 2000);
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: `Ошибка: ${error.error}` });
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setAlert({ type: 'error', message: 'Ошибка при создании заказа' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Корзина</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Товары, готовые к заказу</p>
        </header>

        {/* Alert */}
        {alert && (
          <div className={`alert alert-${alert.type} mb-6`}>
            <div className="flex justify-between items-center">
              <span className="flex-1">{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Empty Cart */}
        {cart.length === 0 ? (
          <section className="card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Корзина пуста</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Добавьте товары из каталога, чтобы сделать заказ</p>
            <button 
              className="btn btn-primary px-8 py-3 text-lg"
              onClick={() => navigate('/products')}
            >
              Перейти к товарам
            </button>
          </section>
        ) : (
          <>
            {/* Cart Items */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Товары в корзине</h2>
              <div className="space-y-4">
                {cart.map(item => (
                  <CartItem
                    key={item.product_id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            </section>

            {/* Order Summary */}
            <section className="card p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-700">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Итого: {getTotalAmount()} ₽
                </h2>
                <button 
                  className="btn btn-success w-full py-4 text-lg font-bold transform hover:scale-105 transition-transform"
                  disabled={loading}
                  onClick={createOrder}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      Оформление...
                    </>
                  ) : (
                    '📦 Оформить заказ'
                  )}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  После оформления вы сможете отслеживать статус заказа в разделе "Заказы"
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Cart);