# server_cache.py
import json
import logging
from datetime import timedelta
from functools import wraps

# Настройка логирования
logger = logging.getLogger("server_cache")

# Пытаемся использовать Redis, если доступен
try:
    import redis
    redis_client = redis.Redis(
        host='localhost',
        port=6379,
        db=0,
        decode_responses=True
    )
    # Простая проверка подключения
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("Успешное подключение к Redis")
except Exception as e:
    logger.warning(f"Redis недоступен, будет использоваться локальный кэш: {e}")
    redis_client = None
    REDIS_AVAILABLE = False

# Локальный кэш как резервный вариант
local_cache = {}

# Время жизни кэша по умолчанию - 24 часа
DEFAULT_CACHE_TTL = 86400

def cache_response(prefix="api", ttl=DEFAULT_CACHE_TTL):
    """
    Декоратор для кэширования ответов API в Redis или в памяти
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Создаем ключ кэша из префикса и аргументов
            cache_key = f"{prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Пытаемся получить данные из кэша
            cached_data = None
            
            if REDIS_AVAILABLE:
                try:
                    cached_data_str = redis_client.get(cache_key)
                    if cached_data_str:
                        cached_data = json.loads(cached_data_str)
                        logger.info(f"Используются данные из Redis кэша для {cache_key}")
                except Exception as e:
                    logger.error(f"Ошибка при получении данных из Redis кэша: {e}")
            
            # Если Redis недоступен или данных нет, пробуем локальный кэш
            if cached_data is None and cache_key in local_cache:
                cached_data = local_cache[cache_key]["data"]
                logger.info(f"Используются данные из локального кэша для {cache_key}")
            
            # Если данных нет в кэше, вызываем функцию
            if cached_data is None:
                result = await func(*args, **kwargs)
                
                # Сохраняем результат в Redis кэш, если доступен
                if REDIS_AVAILABLE:
                    try:
                        redis_client.setex(
                            cache_key,
                            ttl,
                            json.dumps(result, default=str)
                        )
                        logger.info(f"Данные сохранены в Redis кэш для {cache_key}")
                    except Exception as e:
                        logger.error(f"Ошибка при сохранении данных в Redis кэш: {e}")
                
                # Всегда сохраняем в локальный кэш как резервный вариант
                local_cache[cache_key] = {
                    "data": result,
                    "timestamp": time.time()
                }
                logger.info(f"Данные сохранены в локальный кэш для {cache_key}")
                
                return result
            else:
                return cached_data
        
        return wrapper
    
    return decorator

def invalidate_cache(pattern="*"):
    """
    Очищает кэш по шаблону ключа
    """
    success = False
    
    # Очистка Redis кэша
    if REDIS_AVAILABLE:
        try:
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
            logger.info(f"Redis кэш очищен по шаблону '{pattern}'")
            success = True
        except Exception as e:
            logger.error(f"Ошибка при очистке Redis кэша: {e}")
    
    # Очистка локального кэша
    try:
        # Примитивное сопоставление паттернов
        # Для реального приложения нужно использовать более сложную логику
        if pattern == "*":
            local_cache.clear()
        else:
            pattern_base = pattern.replace("*", "")
            keys_to_delete = [k for k in local_cache.keys() if pattern_base in k]
            for key in keys_to_delete:
                del local_cache[key]
        logger.info(f"Локальный кэш очищен по шаблону '{pattern}'")
        success = True
    except Exception as e:
        logger.error(f"Ошибка при очистке локального кэша: {e}")
    
    return success

def compress_response(response_data):
    """
    Сжимает данные ответа для уменьшения размера передаваемых данных
    """
    if not response_data:
        return response_data
    
    # Для списков данных оптимизируем структуру
    if isinstance(response_data, list) and len(response_data) > 0:
        # Получаем все ключи
        sample = response_data[0]
        if not isinstance(sample, dict):
            return response_data
            
        all_keys = list(sample.keys())
        
        # Преобразуем в формат {keys: [...], values: [[...]]}
        compressed = {
            "keys": all_keys,
            "values": []
        }
        
        for item in response_data:
            row = [item.get(key) for key in all_keys]
            compressed["values"].append(row)
        
        return compressed
    
    return response_data

def decompress_response(compressed_data):
    """
    Распаковывает сжатые данные
    """
    if not compressed_data or not isinstance(compressed_data, dict):
        return compressed_data
    
    if "keys" in compressed_data and "values" in compressed_data:
        keys = compressed_data["keys"]
        values = compressed_data["values"]
        
        result = []
        for row in values:
            item = {keys[i]: value for i, value in enumerate(row)}
            result.append(item)
        
        return result
    
    return compressed_data