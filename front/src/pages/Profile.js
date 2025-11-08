import React, { useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const Profile = ({ token, user }) => {
  const [telegramToken, setTelegramToken] = useState('');
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const generateTelegramToken = useCallback(async () => {
    setGenerating(true);
    setAlert(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/telegram/generate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTelegramToken(data.token);
        setAlert({ 
          type: 'success', 
          message: 'Токен успешно сгенерирован! Отправьте его боту в Telegram.' 
        });
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.error });
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setAlert({ type: 'error', message: 'Ошибка при генерации токена' });
    }
    setGenerating(false);
  }, [token]);

  const updateTheme = useCallback(async (newTheme) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      });

      if (!response.ok) {
        console.error('Failed to update theme on server');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  }, [token]);

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    updateTheme(newTheme);
  }, [theme, toggleTheme, updateTheme]);

  const handleDeleteAccount = useCallback(async () => {
    if (!window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить. Все ваши данные будут безвозвратно удалены.')) {
      return;
    }

    if (!window.confirm('Это последнее предупреждение! Все ваши товары, заказы и данные будут удалены навсегда. Продолжить?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setAlert({ type: 'success', message: 'Аккаунт успешно удален' });
     
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.error || 'Ошибка при удалении аккаунта' });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setAlert({ type: 'error', message: 'Ошибка при удалении аккаунта' });
    }
    setDeleting(false);
  }, [token]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Профиль</h1>
          <p className="text-lg opacity-80">Управление вашей учетной записью Bobrshop</p>
        </header>

        {/* Alert */}
        {alert && (
          <div className={`alert alert-${alert.type} mb-6`}>
            <div className="flex justify-between items-center">
              <span className="flex-1">{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-4 opacity-70 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <section>
            <div className="card p-6 h-full">
              <header className="mb-6">
                <h2 className="text-2xl font-bold">Информация о пользователе</h2>
              </header>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Логин:</span>
                  <span className="font-semibold">{user?.username}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Email:</span>
                  <span className="font-semibold">{user?.email}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Telegram:</span>
                  <span className={`font-semibold ${
                    user?.telegram_linked ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {user?.telegram_linked ? 'Привязан ✅' : 'Не привязан ❌'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Имя:</span>
                  <span className="font-semibold">{user?.first_name}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Фамилия:</span>
                  <span className="font-semibold">{user?.last_name}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">Дата регистрации:</span>
                  <span className="font-semibold">
                    {new Date(user?.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-8">
            {/* Theme Settings */}
            <div className="card p-6">
              <header className="mb-6">
                <h2 className="text-2xl font-bold">Настройки темы</h2>
              </header>
              
              <div className="space-y-4">
                <p className="opacity-80">
                  Выберите предпочтительную цветовую схему для интерфейса
                </p>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                  <div>
                    <h3 className="font-semibold">Текущая тема: {theme === 'light' ? 'Светлая' : 'Темная'}</h3>
                    <p className="text-sm opacity-70 mt-1">
                      {theme === 'light' ? 'Яркая и чистая' : 'Успокаивающая для глаз'}
                    </p>
                  </div>
                  <button 
                    onClick={handleThemeToggle}
                    className="btn btn-primary px-6"
                  >
                    {theme === 'light' ? '🌙 Темная' : '☀️ Светлая'}
                  </button>
                </div>
              </div>
            </div>

            {/* Telegram Integration */}
            <div className="card p-6">
              <header className="mb-6">
                <h2 className="text-2xl font-bold">Привязка Telegram</h2>
              </header>
              
              <div className="space-y-4">
                <p className="opacity-80">
                  Привяжите Telegram аккаунт для получения уведомлений и управления заказами через бота.
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Инструкция по привязке:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
                    <li>Нажмите кнопку "Сгенерировать код"</li>
                    <li>
                      Отправьте полученный код боту в Telegram{' '}
                      <a 
                        href="https://t.me/mybobrshopper_bot" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        @mybobrshopper_bot
                      </a>
                    </li>
                    <li>Используйте команду: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">/link ВАШ_КОД</code></li>
                  </ol>
                </div>
                
                <div className="space-y-4">
                  <button 
                    className="btn btn-primary w-full py-3"
                    onClick={generateTelegramToken}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Генерация...
                      </>
                    ) : (
                      '🔗 Сгенерировать код'
                    )}
                  </button>
                  
                  {telegramToken && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-6 animate-bounce-in">
                      <div className="text-center space-y-4">
                        <div>
                          <p className="font-bold text-green-900 dark:text-green-300 mb-2">Ваш код:</p>
                          <div className="bg-green-900 text-white font-mono text-lg p-4 rounded-lg tracking-wider animate-pulse">
                            {telegramToken}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-green-800 dark:text-green-200 mb-2">
                            Отправьте этот код боту в Telegram{' '}
                            <a 
                              href="https://t.me/mybobrshopper_bot" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 dark:text-green-400 hover:underline font-medium"
                            >
                              @mybobrshopper_bot
                            </a>
                            :
                          </p>
                          <code className="bg-green-100 dark:bg-green-800 text-green-900 dark:text-green-100 px-3 py-2 rounded-lg font-mono text-sm">
                            /link {telegramToken}
                          </code>
                        </div>
                        
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Код действителен в течение 30 минут
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card p-6 border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
              <header className="mb-6">
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Опасная зона</h2>
              </header>
              
              <div className="space-y-4">
                <p className="text-red-700 dark:text-red-300">
                  Удаление аккаунта - необратимое действие. Все ваши данные, включая товары, заказы и историю, будут безвозвратно удалены.
                </p>
                
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="btn btn-danger w-full py-3"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Удаление...
                    </>
                  ) : (
                    '🗑️ Удалить аккаунт'
                  )}
                </button>
                
                <p className="text-xs text-red-600 dark:text-red-400 text-center">
                  Это действие нельзя отменить!
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Profile);