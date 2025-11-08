import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const ProductCard = React.memo(({ product, showActions, isOwner, onAddToCart, onEdit, onDelete }) => {
  const { theme } = useTheme();
  
  return (
    <article className="card p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 dark:bg-gray-800 dark:border-gray-700">
      <header className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1 pr-4">{product.name}</h3>
        <span className="text-2xl font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
          {product.price} ₽
        </span>
      </header>
      
      {product.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{product.description}</p>
      )}
      
      {product.owner_email && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          <span className="font-medium">Продавец:</span> {product.owner_email}
        </p>
      )}
      
      <footer className="flex flex-wrap gap-2">
        {showActions && (
          <button 
            onClick={() => onAddToCart(product)}
            className="btn btn-primary flex-1 min-w-[120px]"
          >
            🛒 В корзину
          </button>
        )}
        
        {isOwner && (
          <>
            <button 
              onClick={() => onEdit(product)}
              className="btn btn-secondary flex-1 min-w-[140px]"
            >
              ✏️ Редактировать
            </button>
            <button 
              onClick={() => onDelete(product.id)}
              className="btn btn-danger flex-1 min-w-[100px]"
            >
              🗑️ Удалить
            </button>
          </>
        )}
      </footer>
    </article>
  );
});

const ProductForm = React.memo(({ showForm, editingProduct, formData, onClose, onSubmit, onChange }) => {
  const { theme } = useTheme();
  
  if (!showForm) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto transform animate-bounce-in border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 py-8 px-8 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
            {editingProduct ? 'Редактировать товар' : 'Создать товар'}
          </h2>
        </div>

        {/* Форма */}
        <form onSubmit={onSubmit} className="p-8 space-y-8">
          {/* Название товара */}
          <div className="space-y-4">
            <label htmlFor="name" className="block text-lg font-semibold text-gray-900 dark:text-white">
              Название товара
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              placeholder="Введите название товара"
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all duration-200"
            />
          </div>

          {/* Цена */}
          <div className="space-y-4">
            <label htmlFor="price" className="block text-lg font-semibold text-gray-900 dark:text-white">
              Цена (₽)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={onChange}
              required
              placeholder="0.00"
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all duration-200"
            />
          </div>

          {/* Описание */}
          <div className="space-y-4">
            <label htmlFor="description" className="block text-lg font-semibold text-gray-900 dark:text-white">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onChange}
              placeholder="Необязательное описание товара"
              rows="5"
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none transition-all duration-200"
            />
          </div>

          {/* Разделительная линия */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-6"></div>

          {/* Кнопки */}
          <div className="flex gap-4 pt-4">
            <button 
              type="submit" 
              className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-200 dark:focus:ring-green-900 shadow-lg hover:shadow-xl"
            >
              {editingProduct ? 'Обновить' : 'Создать'}
            </button>
            <button 
              type="button" 
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 shadow-lg hover:shadow-xl"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const Products = ({ token, user }) => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: ''
  });
  const { theme } = useTheme();

  const fetchMyProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showAlert('Ошибка при загрузке товаров', 'error');
    }
    setLoading(false);
  }, [token]);

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllProducts(data);
      }
    } catch (error) {
      console.error('Error fetching all products:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchMyProducts();
    fetchAllProducts();
  }, [fetchMyProducts, fetchAllProducts]);

  const showAlert = useCallback((message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const addToCart = useCallback((product) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      existingItem.qty += 1;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        qty: 1
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    showAlert('Товар добавлен в корзину!', 'success');
  }, [showAlert]);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      description: formData.description
    };

    try {
      const url = editingProduct ? 
        `http://localhost:5000/api/products/${editingProduct.id}` : 
        'http://localhost:5000/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', description: '' });
        showAlert(editingProduct ? 'Товар успешно обновлен' : 'Товар успешно создан', 'success');
        fetchMyProducts();
        fetchAllProducts();
      } else {
        const error = await response.json();
        showAlert(error.error, 'error');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showAlert('Ошибка при сохранении товара', 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Удалить товар?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        showAlert('Товар успешно удален', 'success');
        fetchMyProducts();
        fetchAllProducts();
      } else {
        const error = await response.json();
        showAlert(error.error, 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert('Ошибка при удалении товара', 'error');
    }
  };

  const startEdit = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      description: product.description || ''
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', description: '' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Товары</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Управление товарами и покупками</p>
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        )}

        {/* All Products Section */}
        <section className="mb-12">
          <header className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Все товары</h2>
          </header>
          
          {allProducts.length === 0 ? (
            <div className="card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Товаров пока нет</h3>
              <p className="text-gray-600 dark:text-gray-400">Будьте первым, кто создаст товар!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showActions={true}
                  isOwner={product.created_by === user?.id}
                  onAddToCart={addToCart}
                  onEdit={startEdit}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </section>

        {/* My Products Section */}
        <section>
          <header className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Мои товары</h2>
            <button 
              onClick={() => setShowForm(true)}
              className="btn btn-success"
            >
              ➕ Создать товар
            </button>
          </header>

          <ProductForm
            showForm={showForm}
            editingProduct={editingProduct}
            formData={formData}
            onClose={closeForm}
            onSubmit={handleFormSubmit}
            onChange={handleFormChange}
          />

          {products.length === 0 ? (
            <div className="card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">У вас пока нет товаров</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Создайте первый товар, чтобы начать продавать</p>
              <button 
                onClick={() => setShowForm(true)}
                className="btn btn-success"
              >
                ➕ Создать первый товар
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showActions={false}
                  isOwner={true}
                  onAddToCart={addToCart}
                  onEdit={startEdit}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default React.memo(Products);