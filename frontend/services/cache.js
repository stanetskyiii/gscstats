// services/cache.js
/**
 * Простой модуль для кэширования данных на клиентской стороне
 * Позволяет существенно ускорить загрузку данных при повторных просмотрах
 */

// Время жизни кэша в миллисекундах (30 минут)
const CACHE_TTL = 30 * 60 * 1000;

// Объект для хранения кэша
const cache = {};

/**
 * Получает данные из кэша или выполняет функцию загрузки и кэширует результат
 * 
 * @param {string} key - Ключ кэша
 * @param {Function} fetchFunction - Функция для получения данных, если их нет в кэше
 * @param {boolean} forceRefresh - Принудительное обновление кэша
 * @returns {Promise<any>} - Результат выполнения функции или данные из кэша
 */
export const getCachedData = async (key, fetchFunction, forceRefresh = false) => {
  const now = Date.now();
  
  // Проверяем наличие данных в кэше и их актуальность
  if (
    !forceRefresh && 
    cache[key] && 
    cache[key].timestamp && 
    (now - cache[key].timestamp) < CACHE_TTL
  ) {
    console.log(`Using cached data for ${key}`);
    return cache[key].data;
  }
  
  // Если данных нет в кэше или они устарели, получаем новые
  try {
    console.log(`Fetching fresh data for ${key}`);
    const data = await fetchFunction();
    
    // Сохраняем в кэш
    cache[key] = {
      data,
      timestamp: now
    };
    
    return data;
  } catch (error) {
    // Если произошла ошибка, но есть данные в кэше, возвращаем их
    if (cache[key] && cache[key].data) {
      console.warn(`Error fetching fresh data for ${key}, using stale cache:`, error);
      return cache[key].data;
    }
    
    // Если данных нет, пробрасываем ошибку
    throw error;
  }
};

/**
 * Очищает весь кэш или только для указанного ключа
 * 
 * @param {string} [key] - Ключ кэша (если не указан, очищается весь кэш)
 */
export const clearCache = (key) => {
  if (key) {
    delete cache[key];
    console.log(`Cache cleared for ${key}`);
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
    console.log('Full cache cleared');
  }
};

/**
 * Получает информацию о состоянии кэша
 * 
 * @returns {Object} - Объект с информацией о кэше
 */
export const getCacheInfo = () => {
  const info = {
    entries: Object.keys(cache).length,
    keys: Object.keys(cache),
    sizes: {},
    ages: {}
  };
  
  const now = Date.now();
  
  Object.entries(cache).forEach(([key, entry]) => {
    // Примерный размер в JSON
    const size = JSON.stringify(entry.data).length;
    info.sizes[key] = `${(size / 1024).toFixed(2)} KB`;
    
    // Возраст в минутах
    const ageMs = now - entry.timestamp;
    info.ages[key] = `${(ageMs / 60000).toFixed(2)} min`;
  });
  
  return info;
};

export default {
  getCachedData,
  clearCache,
  getCacheInfo
};