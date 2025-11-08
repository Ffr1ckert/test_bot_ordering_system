import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-dev-secret-change-in-production'

    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'app.db'
    
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

config_dict = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    config_class = config_dict.get(env, config_dict['default'])
    
    # Вывод информации о конфигурации
    print(f"🔧 Loading {env} configuration")
    print(f"📁 Database path: {config_class.DATABASE_PATH}")
    print(f"🌐 CORS origins: {config_class.CORS_ORIGINS}")
    print(f"🐛 Debug mode: {config_class.DEBUG}")
    
    return config_class