// services/api.js
import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:8000/api';

// Создаем экземпляр axios с настройками
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Увеличиваем таймаут до 60 секунд
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем аутентификацию к каждому запросу
api.interceptors.request.use(config => {
  // Базовая HTTP аутентификация
  const username = localStorage.getItem('username') || 'admin';
  const password = localStorage.getItem('password') || 'admin_password';
  
  config.auth = {
    username,
    password
  };
  return config;
});

// Увеличиваем время жизни кэша
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 часов вместо 30 минут

// Объект для хранения кэша
const cache = {};

// Функции для работы с localStorage
const saveCache = () => {
  try {
    const cachesToSave = {};
    
    // Сохраняем только небольшие объекты, чтобы не переполнить localStorage
    Object.keys(cache).forEach(key => {
      if (JSON.stringify(cache[key]).length < 500000) { // Ограничение ~500KB на запись
        cachesToSave[key] = cache[key];
      }
    });
    
    localStorage.setItem('api_cache', JSON.stringify(cachesToSave));
    console.log('Кэш сохранен в localStorage');
  } catch (e) {
    console.warn('Невозможно сохранить кэш в localStorage', e);
  }
};

const loadCache = () => {
  try {
    const savedCache = localStorage.getItem('api_cache');
    if (savedCache) {
      const parsedCache = JSON.parse(savedCache);
      Object.keys(parsedCache).forEach(key => {
        cache[key] = parsedCache[key];
      });
      console.log('Кэш успешно загружен из localStorage');
    }
  } catch (e) {
    console.warn('Ошибка загрузки кэша из localStorage', e);
  }
};

// Вызываем загрузку кэша при инициализации
loadCache();

// Функция для получения данных с кэшированием
const getCachedData = async (key, fetchFunction, forceRefresh = false) => {
  // Проверяем кэш
  const now = Date.now();
  if (!forceRefresh && cache[key] && (now - cache[key].timestamp) < CACHE_TTL) {
    console.log(`Используются кэшированные данные для ${key}`);
    return cache[key].data;
  }
  
  // Получаем свежие данные
  try {
    console.log(`Загрузка свежих данных для ${key}`);
    const data = await fetchFunction();
    
    // Сохраняем в кэш
    cache[key] = {
      data,
      timestamp: now
    };
    
    // Сохраняем кэш в localStorage периодически
    if (Math.random() < 0.1) { // Сохраняем с 10% вероятностью, чтобы не делать это слишком часто
      saveCache();
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    
    // Если есть кэшированные данные - возвращаем их даже если устарели
    if (cache[key]) {
      console.log(`Используются устаревшие кэшированные данные для ${key}`);
      return cache[key].data;
    }
    
    // Иначе возвращаем пустой массив
    return [];
  }
};

// Проверка авторизации
export const checkAuth = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await api.get(`/summary?target_date=${today}`);
    return true;
  } catch (error) {
    return false;
  }
};

// ОПТИМИЗИРОВАННЫЕ МЕТОДЫ API

// 1. Получение сводки за один день
export const getSummary = async (date) => {
  const cacheKey = `summary_${date}`;
  return getCachedData(cacheKey, async () => {
    const response = await api.get(`/summary?target_date=${date}`);
    return response.data || [];
  });
};

// 2. Получение сводки за диапазон дат - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
export const getSummaryRange = async (startDate, endDate) => {
  const cacheKey = `summary_range_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async () => {
    // Форматируем даты в строки
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные по дням - партиями по 7 дней
    let allData = [];
    const batchSize = 7;
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      console.log(`Загрузка данных: ${Math.floor(i/batchSize) + 1}/${Math.ceil(dates.length/batchSize)}`);
      
      const batchPromises = batchDates.map(date => 
        getSummary(date).catch(err => [])
      );
      
      const batchResults = await Promise.all(batchPromises);
      allData = [...allData, ...batchResults.flat()];
    }
    
    return allData;
  });
};

// 3. Получение данных для одного домена за день
export const getDomainSummary = async (domain, date) => {
  const cacheKey = `domain_summary_${domain}_${date}`;
  return getCachedData(cacheKey, async () => {
    try {
      const response = await api.get(`/domain/${domain}/summary?target_date=${date}`);
      return response.data;
    } catch (error) {
      console.log(`No data for ${domain} on ${date}`);
      return null;
    }
  });
};

// 4. Получение исторических данных для домена - ОПТИМИЗИРОВАНО!
export const getDomainSummaryRange = async (domain, startDate, endDate) => {
  const cacheKey = `domain_summary_range_${domain}_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async () => {
    // Используем полный запрошенный период
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Форматируем даты в строки
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные партиями по 7 дней
    const results = [];
    const batchSize = 7;
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      console.log(`Загрузка данных для ${domain}: ${Math.floor(i/batchSize) + 1}/${Math.ceil(dates.length/batchSize)}`);
      
      const batchPromises = batchDates.map(date => 
        getDomainSummary(domain, date).catch(() => null)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(item => item && !item.error));
    }
    
    return results;
  });
};

// 5. Получение данных по странам
export const getCountrySummary = async (date) => {
  const cacheKey = `country_summary_${date}`;
  return getCachedData(cacheKey, async () => {
    try {
      const response = await api.get(`/country_summary?target_date=${date}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching country summary for ${date}`, error);
      return [];
    }
  });
};

// 6. Получение данных по странам за период - ОПТИМИЗИРОВАНО!
export const getCountrySummaryRange = async (startDate, endDate) => {
  const cacheKey = `country_summary_range_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async () => {
    // Используем полный запрошенный период
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Форматируем даты
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные партиями по 7 дней
    let allData = [];
    const batchSize = 7;
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      console.log(`Загрузка данных по странам: ${Math.floor(i/batchSize) + 1}/${Math.ceil(dates.length/batchSize)}`);
      
      const batchPromises = batchDates.map(date => 
        getCountrySummary(date).catch(() => [])
      );
      
      const batchResults = await Promise.all(batchPromises);
      allData = [...allData, ...batchResults.flat()];
    }
    
    return allData;
  });
};

// Функция для предварительной загрузки данных
export const preloadAllData = async (startDate, endDate, setLoading, setMessage) => {
  if (setLoading) setLoading(true);
  if (setMessage) setMessage('Начало загрузки данных...');
  
  // Загружаем общие сводные данные
  try {
    if (setMessage) setMessage('Загрузка сводных данных...');
    await getSummaryRange(startDate, endDate);
    console.log('Сводные данные загружены');
  } catch (e) {
    console.error('Ошибка загрузки сводных данных', e);
  }
  
  // Загружаем данные по первым 10 доменам (наиболее важным)
  const topDomains = ["alvadi.com", "alvadi.de", "alvadi.co.uk", "alvadi.eu", "alvadi.fr", 
                      "alvadi.it", "alvadi.es", "alvadi.pl", "alvadi.nl", "alvadi.ru"];
  
  let completed = 0;
  for (const domain of topDomains) {
    try {
      if (setMessage) setMessage(`Загрузка данных для ${domain} (${completed+1}/${topDomains.length})...`);
      await getDomainSummaryRange(domain, startDate, endDate);
      completed++;
      console.log(`Данные для ${domain} загружены`);
    } catch (e) {
      console.error(`Ошибка загрузки данных для ${domain}`, e);
    }
  }
  
  // Загружаем данные по странам
  try {
    if (setMessage) setMessage('Загрузка данных по странам...');
    await getCountrySummaryRange(startDate, endDate);
    console.log('Данные по странам загружены');
  } catch (e) {
    console.error('Ошибка загрузки данных по странам', e);
  }
  
  if (setMessage) setMessage('Загрузка завершена');
  setTimeout(() => {
    if (setLoading) setLoading(false);
    if (setMessage) setMessage('');
  }, 1000);
  
  console.log('Предварительная загрузка завершена');
};

// Очистка кэша
export const clearCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
  localStorage.removeItem('api_cache');
  console.log('Кэш очищен');
};

export default api;