import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Profile from './pages/Profile';

const Navigation = React.memo(({ user, onLogout }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="bg-gradient-to-r from-green-800 to-green-600 shadow-xl sticky top-0 z-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link 
              to="/products" 
              className="flex items-center space-x-2 text-white font-bold text-xl hover:text-white/90 transition-colors"
            >
              <span>Bobr shop</span>
              <span className="text-2xl">🦫</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <Link to="/products" className={isActive('/products')}>Товары</Link>
            <Link to="/cart" className={isActive('/cart')}>Корзина</Link>
            <Link to="/orders" className={isActive('/orders')}>Заказы</Link>
            <Link to="/profile" className={isActive('/profile')}>Профиль</Link>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Переключить тему"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            <span className="text-white/80 text-sm hidden sm:block">
              {user?.email}
            </span>
            <button 
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-green-800 dark:focus:ring-offset-gray-800"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const { theme, mounted } = useTheme();

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    setToken(null);
    setUser(null);
  }, []);

  const fetchUserInfo = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' 
        : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'
    }`}>
      <Router>
        {token && <Navigation user={user} onLogout={logout} />}
        <main className={token ? '' : 'min-h-screen'}>
          <Routes>
            <Route path="/login" element={!token ? <Login onLogin={login} /> : <Navigate to="/products" replace />} />
            <Route path="/register" element={!token ? <Register onLogin={login} /> : <Navigate to="/products" replace />} />
            <Route path="/products" element={token ? <Products token={token} user={user} /> : <Navigate to="/login" replace />} />
            <Route path="/cart" element={token ? <Cart token={token} user={user} /> : <Navigate to="/login" replace />} />
            <Route path="/orders" element={token ? <Orders token={token} user={user} /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={token ? <Profile token={token} user={user} /> : <Navigate to="/login" replace />} />
            <Route path="/" element={<Navigate to={token ? "/products" : "/login"} replace />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default React.memo(App);