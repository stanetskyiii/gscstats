// services/api.js - полностью новая версия
import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:8000/api';

// Создаем экземпляр axios с настройками
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 секунд - если дольше, значит сервер не отвечает
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

// Кэширование в памяти
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// Функция для получения данных с кэшированием
const getCachedData = async (cacheKey, fetchFn) => {
  // Проверяем кэш
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_TTL) {
    return cache[cacheKey].data;
  }
  
  // Получаем свежие данные
  try {
    const data = await fetchFn();
    
    // Сохраняем в кэш
    cache[cacheKey] = {
      data,
      timestamp: now
    };
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for key ${cacheKey}:`, error);
    
    // Если есть кэшированные данные - возвращаем их даже если устарели
    if (cache[cacheKey]) {
      return cache[cacheKey].data;
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
    // Получаем только данные за последнюю неделю для общего представления
    const end = new Date(endDate);
    let start = new Date(startDate);
    const oneWeekAgo = new Date(end);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (start < oneWeekAgo) {
      start = oneWeekAgo;
    }
    
    // Форматируем даты в строки
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные по дням - последовательно
    let allData = [];
    
    for (const date of dates) {
      try {
        const data = await getSummary(date);
        allData = [...allData, ...data];
      } catch (error) {
        console.warn(`Could not load data for ${date}`, error);
      }
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
    // Получаем только за последнюю неделю для скорости
    const end = new Date(endDate);
    let start = new Date(startDate);
    const oneWeekAgo = new Date(end);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (start < oneWeekAgo) {
      start = oneWeekAgo;
    }
    
    // Форматируем даты в строки
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные последовательно
    const results = [];
    
    for (const date of dates) {
      try {
        const data = await getDomainSummary(domain, date);
        if (data && !data.error) {
          results.push(data);
        }
      } catch (error) {
        console.warn(`Could not load data for ${domain} on ${date}`);
      }
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
    // Получаем только за последние несколько дней для быстроты
    const end = new Date(endDate);
    let start = new Date(end);
    start.setDate(start.getDate() - 3); // Только за 3 дня!
    
    const origStart = new Date(startDate);
    if (start < origStart) {
      start = origStart;
    }
    
    // Форматируем даты
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    // Загружаем данные последовательно
    let allData = [];
    
    for (const date of dates) {
      try {
        const data = await getCountrySummary(date);
        allData = [...allData, ...data];
      } catch (error) {
        console.warn(`Could not load country data for ${date}`, error);
      }
    }
    
    return allData;
  });
};

// Очистка кэша
export const clearCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
};

export default api;