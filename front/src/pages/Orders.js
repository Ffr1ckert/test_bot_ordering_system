import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const OrderCard = React.memo(({ order, isSelected, onClick, onStatusUpdate }) => {
  const { theme } = useTheme();
  
  const getStatusConfig = (status) => {
    const configs = {
      new: { label: 'Новый', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      in_progress: { label: 'Выполняется', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      completed: { label: 'Выполнен', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      canceled: { label: 'Отменен', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
    };
    return configs[status] || { label: status, className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  };

  const config = getStatusConfig(order.status);

  const handleStatusChange = async (newStatus) => {
    await onStatusUpdate(order.id, newStatus);
  };

  return (
    <article 
      className={`card p-6 cursor-pointer transition-all duration-300 border-2 dark:bg-gray-800 dark:border-gray-700 ${
        isSelected 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400 transform scale-105' 
          : 'border-transparent hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-xl dark:hover:shadow-gray-900/50'
      }`}
      onClick={onClick}
    >
      <header className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Заказ #{order.id}</h3>
        <div className="flex items-center gap-2">
          <select 
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium border-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
              order.status === 'new' ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300' :
              order.status === 'in_progress' ? 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300' :
              order.status === 'completed' ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300' :
              'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="new">Новый</option>
            <option value="in_progress">Выполняется</option>
            <option value="completed">Выполнен</option>
            <option value="canceled">Отменен</option>
          </select>
        </div>
      </header>
      
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p><strong className="text-gray-700 dark:text-gray-300">Сумма:</strong> {order.total_amount} ₽</p>
        <p><strong className="text-gray-700 dark:text-gray-300">Дата:</strong> {new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
        <p><strong className="text-gray-700 dark:text-gray-300">Товаров:</strong> {order.items_count || order.items?.length || 0}</p>
      </div>
    </article>
  );
});

const Orders = ({ token, user }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { theme } = useTheme();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.error });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAlert({ type: 'error', message: 'Ошибка при загрузке заказов' });
    }
    setLoading(false);
  }, [token]);

  const fetchOrderDetails = useCallback(async (orderId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const order = await response.json();
        setSelectedOrder(order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  }, [token]);

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
        
        setAlert({ type: 'success', message: 'Статус заказа успешно обновлен' });
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.error });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setAlert({ type: 'error', message: 'Ошибка при обновлении статуса заказа' });
    }
  }, [token, selectedOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">Загрузка заказов...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Мои заказы</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">История и статусы ваших заказов</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Orders List */}
          <section>
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">История заказов</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {orders.length} заказов
              </span>
            </header>

            {orders.length === 0 ? (
              <div className="card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Заказов пока нет</h3>
                <p className="text-gray-600 dark:text-gray-400">Сделайте первый заказ в разделе "Товары"</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrder?.id === order.id}
                    onClick={() => fetchOrderDetails(order.id)}
                    onStatusUpdate={updateOrderStatus}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Order Details */}
          <section>
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Детали заказа</h2>
            </header>

            {selectedOrder ? (
              <div className="card p-6 sticky top-4 dark:bg-gray-800 dark:border-gray-700">
                <header className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Заказ #{selectedOrder.id}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Статус:</span>
                    <select 
                      value={selectedOrder.status}
                      onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                      className={`px-4 py-2 rounded-lg font-medium border-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                        selectedOrder.status === 'new' ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300' :
                        selectedOrder.status === 'in_progress' ? 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        selectedOrder.status === 'completed' ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300' :
                        'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      <option value="new">Новый</option>
                      <option value="in_progress">Выполняется</option>
                      <option value="completed">Выполнен</option>
                      <option value="canceled">Отменен</option>
                    </select>
                  </div>
                </header>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Общая сумма:</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{selectedOrder.total_amount} ₽</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Дата создания:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(selectedOrder.created_at).toLocaleDateString('ru-RU')}, {' '}
                      {new Date(selectedOrder.created_at).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Состав заказа:</h4>
                  <div className="space-y-3">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <div key={index} className="card p-4 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white flex-1 pr-4">{item.product_name}</h5>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{item.total} ₽</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Количество: {item.quantity}</span>
                            <span>Цена: {item.price} ₽/шт</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        Информация о товарах недоступна
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Выберите заказ</h3>
                <p className="text-gray-600 dark:text-gray-400">Для просмотра деталей выберите заказ из списка</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Orders);