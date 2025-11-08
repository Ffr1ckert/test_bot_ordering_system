import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const Register = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '', 
    password: '',
    confirmPassword: ''
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

    if (formData.password !== formData.confirmPassword) {
      setAlert({ type: 'error', message: 'Пароли не совпадают' });
      setLoading(false);
      return;
    }

    if (formData.username.length < 3) {
      setAlert({ type: 'error', message: 'Логин должен быть не менее 3 символов' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.access_token, data.user);
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка регистрации' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка сети. Попробуйте снова.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl text-white">👤</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Регистрация
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Создайте новый аккаунт
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
            <label htmlFor="username" className="form-label dark:text-gray-300">
              Логин *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength="3"
              placeholder="Придумайте логин"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="form-label dark:text-gray-300">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="form-label dark:text-gray-300">
                Имя *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Ваше имя"
                className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="form-label dark:text-gray-300">
                Фамилия *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Ваша фамилия"
                className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="form-label dark:text-gray-300">
              Пароль *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Не менее 6 символов"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label dark:text-gray-300">
              Подтвердите пароль *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Повторите пароль"
              className="form-input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-success w-full py-3 text-lg dark:bg-green-700 dark:hover:bg-green-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Регистрация...
              </>
            ) : (
              'Зарегистрироваться'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <Link 
                to="/login" 
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Войдите здесь
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(Register);