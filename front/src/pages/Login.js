import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.access_token, data.user);
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка входа' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка сети. Попробуйте снова.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl text-white">🔐</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Вход в систему
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Войдите по email или логину
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`alert alert-${alert.type} dark:bg-gray-800 dark:border-gray-700`}>
            <div className="flex justify-between items-center">
              <span className="flex-1 text-gray-900 dark:text-white">{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6 border border-gray-200 dark:border-gray-700">
          <div>
            <label htmlFor="login" className="form-label dark:text-gray-300">
              Email или логин
            </label>
            <input
              type="text"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleChange}
              required
              placeholder="Введите email или логин"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label dark:text-gray-300">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Введите пароль"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-3 text-lg dark:bg-primary-700 dark:hover:bg-primary-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Нет аккаунта?{' '}
              <Link 
                to="/register" 
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Зарегистрируйтесь здесь
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(Login);