import bcrypt
import jwt as pyjwt
from datetime import datetime, timedelta
from config import get_config

config = get_config()

def hash_pswd(password: str) -> str:
    """Хеширование пароля"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_pswd(hashed_password: str, password: str) -> bool:
    """Проверка пароля"""
    if not hashed_password or not password:
        return False
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def create_access_token(user_id: int) -> str:
    """Создание JWT токена"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + config.JWT_ACCESS_TOKEN_EXPIRES,
        'iat': datetime.utcnow()
    }
    return pyjwt.encode(payload, config.JWT_SECRET_KEY, algorithm='HS256')

def verify_access_token(token: str) -> int:
    """Верификация JWT токена"""
    try:
        payload = pyjwt.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        return None

def jwt_required(f):
    """Декоратор для проверки JWT токена"""
    from functools import wraps
    from flask import request, jsonify
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        user_id = verify_access_token(token)
        if user_id is None:
            return jsonify({'error': 'Invalid token'}), 401        
        request.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated_function