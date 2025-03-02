// services/api.js
import axios from 'axios';

// Базовый URL API
const API_BASE_URL = '/api';

// Создаем экземпляр axios с настройками
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 минут
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

// Добавляем перехватчик ответов для обработки сжатых данных
api.interceptors.response.use(
  response => {
    // Проверяем, является ли ответ сжатым
    if (
      response.data &&
      typeof response.data === 'object' &&
      response.data.keys &&
      response.data.values
    ) {
      const keys = response.data.keys;
      const values = response.data.values;
      
      const decompressed = values.map(row => {
        const item = {};
        keys.forEach((key, index) => {
          item[key] = row[index];
        });
        return item;
      });
      
      response.data = decompressed;
    }
    return response;
  },
  error => {
    // Обработка ошибок
    if (
      error.message &&
      (error.message.includes('Network Error') || error.message.includes('CORS'))
    ) {
      const originalRequest = error.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        originalRequest.headers['X-Requested-With'] = 'XMLHttpRequest';
        return axios(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// Увеличиваем время жизни кэша
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

// Объект для хранения кэша
const cache = {};

// Переменная для хранения времени начала загрузки для оценки времени
let loadStartTimes = {};

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
    // Очищаем кэш при ошибке
    localStorage.removeItem('api_cache');
  }
};

// Вызываем загрузку кэша при инициализации
loadCache();

// Функция для получения данных с кэшированием
const getCachedData = async (key, fetchFunction, forceRefresh = false, progressCallback = null) => {
  // Проверяем кэш
  const now = Date.now();
  if (!forceRefresh && cache[key] && (now - cache[key].timestamp) < CACHE_TTL) {
    console.log(`Используются кэшированные данные для ${key}`);
    if (progressCallback) progressCallback(100, 0);
    return cache[key].data;
  }
  
  // Получаем свежие данные
  try {
    console.log(`Загрузка свежих данных для ${key}`);
    loadStartTimes[key] = Date.now();
    
    // Добавляем функцию для отслеживания прогресса
    const progressMonitor = progressCallback 
      ? (completed, total) => {
          // Защита от деления на ноль и бесконечных процентов
          const percent = total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0;
          
          // Оценка оставшегося времени
          const elapsedMs = Date.now() - loadStartTimes[key];
          
          // Проверяем на ноль и деление на ноль для избежания Infinity
          let remainingMs = 0;
          if (completed > 0 && total > 0) {
            const estimatedTotalMs = (elapsedMs / completed) * total;
            // Защита от отрицательных значений и бесконечности
            remainingMs = Math.max(0, isFinite(estimatedTotalMs) ? estimatedTotalMs - elapsedMs : 0);
          }
          
          progressCallback(percent, remainingMs);
        }
      : null;
    
    const data = await fetchFunction(progressMonitor);
    
    // Сохраняем в кэш
    cache[key] = {
      data,
      timestamp: now
    };
    
    // Сохраняем кэш в localStorage периодически
    if (Math.random() < 0.1) { // Сохраняем с 10% вероятностью
      saveCache();
    }
    
    if (progressCallback) progressCallback(100, 0);
    return data;
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    
    // Если есть кэшированные данные - возвращаем их даже если устарели
    if (cache[key]) {
      console.log(`Используются устаревшие кэшированные данные для ${key}`);
      if (progressCallback) progressCallback(100, 0);
      return cache[key].data;
    }
    
    // Иначе возвращаем пустой массив
    if (progressCallback) progressCallback(100, 0);
    return [];
  }
};

// Проверка авторизации
export const checkAuth = async () => {
  try {
    await api.get(`/health`); // Используем эндпоинт health для проверки
    return true;
  } catch (error) {
    return false;
  }
};

// 1. ОПТИМИЗИРОВАННЫЙ метод получения сводки за один день
export const getSummary = async (date, progressCallback = null) => {
  const cacheKey = `summary_${date}`;
  return getCachedData(cacheKey, async () => {
    try {
      const response = await api.get(`/summary?target_date=${date}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching summary for ${date}:`, error);
      return [];
    }
  }, false, progressCallback);
};

// 2. ОПТИМИЗИРОВАННЫЙ метод получения сводки за диапазон дат
export const getSummaryRange = async (startDate, endDate, progressCallback = null) => {
  const cacheKey = `summary_range_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async (progressMonitor) => {
    try {
      // Используем оптимизированный API-метод для получения данных за весь период сразу
      console.log(`Загрузка сводных данных за период ${startDate} - ${endDate}`);
      if (progressMonitor) progressMonitor(10, 0); // Начальный прогресс
      
      const response = await api.get(`/summary_range?start_date=${startDate}&end_date=${endDate}`);
      
      if (progressMonitor) progressMonitor(100, 0); // Завершено
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching summary range:`, error);
      
      // Если оптимизированный метод не сработал, возвращаемся к загрузке по дням
      console.log("Falling back to day-by-day loading...");
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates = [];
      
      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dates.push(dt.toISOString().split('T')[0]);
      }
      
      let allData = [];
      const batchSize = 15;
      
      for (let i = 0; i < dates.length; i += batchSize) {
        const batchDates = dates.slice(i, i + batchSize);
        console.log(`Загрузка сводных данных: ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)}`);
        
        if (progressMonitor && dates.length > 0) {
          progressMonitor(Math.round((i / dates.length) * 100), 0);
        }
        
        const batchPromises = batchDates.map(date => 
          getSummary(date).catch(err => [])
        );
        
        const batchResults = await Promise.all(batchPromises);
        allData = [...allData, ...batchResults.flat()];
      }
      
      if (progressMonitor) progressMonitor(100, 0);
      return allData;
    }
  }, false, progressCallback);
};

// 3. Получение данных для одного домена за день
export const getDomainSummary = async (domain, date, progressCallback = null) => {
  const cacheKey = `domain_summary_${domain}_${date}`;
  return getCachedData(cacheKey, async () => {
    try {
      const response = await api.get(`/domain/${domain}/summary?target_date=${date}`);
      return response.data;
    } catch (error) {
      console.log(`No data for ${domain} on ${date}`);
      return null;
    }
  }, false, progressCallback);
};

// 4. ОПТИМИЗИРОВАННЫЙ метод получения данных для домена за диапазон дат
export const getDomainSummaryRange = async (domain, startDate, endDate, progressCallback = null) => {
  const cacheKey = `domain_summary_range_${domain}_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async (progressMonitor) => {
    try {
      console.log(`Загрузка данных для ${domain} за период ${startDate} - ${endDate}`);
      if (progressMonitor) progressMonitor(10, 0); // Начальный прогресс
      
      const response = await api.get(`/domain_range_summary?domain_name=${domain}&start_date=${startDate}&end_date=${endDate}`);
      
      // Сортируем данные по дате
      const sortedData = response.data ? 
        response.data.sort((a, b) => new Date(a.date) - new Date(b.date)) : 
        [];
      
      if (progressMonitor) progressMonitor(100, 0); // Завершено
      return sortedData;
    } catch (error) {
      console.error(`Error fetching range data for ${domain}:`, error);
      
      // Если оптимизированный метод не сработал, возвращаемся к загрузке по дням
      console.log(`Falling back to day-by-day loading for ${domain}...`);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Форматируем даты в строки
      const dates = [];
      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dates.push(dt.toISOString().split('T')[0]);
      }
      
      // Загружаем данные партиями по 15 дней
      const results = [];
      const batchSize = 15;
      
      for (let i = 0; i < dates.length; i += batchSize) {
        const batchDates = dates.slice(i, i + batchSize);
        console.log(`Загрузка данных для ${domain}: ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)}`);
        
        if (progressMonitor && dates.length > 0) {
          progressMonitor(Math.round((i / dates.length) * 100), 0);
        }
        
        const batchPromises = batchDates.map(date => 
          getDomainSummary(domain, date).catch(() => null)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(item => item && !item.error));
      }
      
      // Сортируем результаты по дате
      const sortedResults = results.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (progressMonitor) progressMonitor(100, 0);
      return sortedResults;
    }
  }, false, progressCallback);
};

// 5. Получение данных по странам за один день
export const getCountrySummary = async (date, progressCallback = null) => {
  const cacheKey = `country_summary_${date}`;
  return getCachedData(cacheKey, async () => {
    try {
      const response = await api.get(`/country_summary?target_date=${date}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching country summary for ${date}`, error);
      return [];
    }
  }, false, progressCallback);
};

// 6. ОПТИМИЗИРОВАННЫЙ метод получения данных по странам за период
export const getCountrySummaryRange = async (startDate, endDate, progressCallback = null) => {
  const cacheKey = `country_summary_range_${startDate}_${endDate}`;
  
  return getCachedData(cacheKey, async (progressMonitor) => {
    try {
      console.log(`Загрузка данных по странам за период ${startDate} - ${endDate}`);
      if (progressMonitor) progressMonitor(10, 0); // Начальный прогресс
      
      // Пробуем запросить все данные сразу с включенным сжатием
      const response = await api.get(
        `/country_range_summary?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Accept-Encoding': 'gzip, deflate',
          }
        }
      );
      
      if (progressMonitor) progressMonitor(100, 0); // Завершено
      
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching complete country range data:`, error);
      
      // Разбиваем период на части для более эффективной загрузки
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Получаем список всех месяцев в периоде
        const months = [];
        for (let dt = new Date(start.getFullYear(), start.getMonth(), 1); 
             dt <= end; 
             dt.setMonth(dt.getMonth() + 1)) {
          months.push(new Date(dt));
        }
        
        let allData = [];
        const totalMonths = months.length;
        
        // Для каждого месяца пытаемся получить данные одним запросом
        for (let i = 0; i < months.length; i++) {
          const month = months[i];
          const monthStart = new Date(month);
          const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          // Убедимся, что мы не выходим за рамки диапазона
          const actualStart = monthStart < start ? start : monthStart;
          const actualEnd = monthEnd > end ? end : monthEnd;
          
          const startStr = actualStart.toISOString().split('T')[0];
          const endStr = actualEnd.toISOString().split('T')[0];
          
          console.log(`Загрузка данных по странам за ${month.toISOString().slice(0, 7)} (${i + 1}/${totalMonths})`);
          
          if (progressMonitor && totalMonths > 0) {
            progressMonitor(Math.min(Math.round(((i + 0.5) / totalMonths) * 100), 100), 0);
          }
          
          try {
            const response = await api.get(`/country_range_summary?start_date=${startStr}&end_date=${endStr}`);
            if (response.data && response.data.length > 0) {
              allData = [...allData, ...response.data];
            }
          } catch (e) {
            console.log(`Ошибка загрузки данных за месяц ${month.toISOString().slice(0, 7)}, загружаем по дням`);
            
            // Если не получилось загрузить месяц, загружаем по дням
            const dates = [];
            for (let dt = new Date(actualStart); dt <= actualEnd; dt.setDate(dt.getDate() + 1)) {
              dates.push(dt.toISOString().split('T')[0]);
            }
            
            const batchSize = 7;
            for (let j = 0; j < dates.length; j += batchSize) {
              const batchDates = dates.slice(j, j + batchSize);
              
              const batchPromises = batchDates.map(date => 
                getCountrySummary(date).catch(() => [])
              );
              
              const batchResults = await Promise.all(batchPromises);
              allData = [...allData, ...batchResults.flat()];
            }
          }
        }
        
        if (progressMonitor) progressMonitor(100, 0);
        
        // Сортируем все данные по дате
        const sortedData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
        return sortedData;
      } catch (monthError) {
        console.error('Ошибка при загрузке по месяцам:', monthError);
        
        // Если все стратегии не сработали, возвращаемся к простой загрузке по неделям
        console.log(`Falling back to week-by-week loading for countries...`);
        
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
          console.log(`Загрузка данных по странам: ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)}`);
          
          if (progressMonitor && dates.length > 0) {
            progressMonitor(Math.min(Math.round((i / dates.length) * 100), 100), 0);
          }
          
          const batchPromises = batchDates.map(date => 
            getCountrySummary(date).catch(() => [])
          );
          
          const batchResults = await Promise.all(batchPromises);
          allData = [...allData, ...batchResults.flat()];
        }
        
        if (progressMonitor) progressMonitor(100, 0);
        
        // Сортируем результаты
        const sortedData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
        return sortedData;
      }
    }
  }, false, progressCallback);
};

// Функция для получения последних доступных дат для домена
export const getLastAvailableDates = async (domain) => {
  try {
    const response = await api.get(`/domain/${domain}/last_dates`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching last available dates for ${domain}:`, error);
    return null;
  }
};

// Функция для получения последних доступных дат по всем доменам
export const getAllDomainsLastDates = async () => {
  try {
    const response = await api.get('/all_domains_last_dates');
    return response.data;
  } catch (error) {
    console.error('Error fetching last dates for all domains:', error);
    return null;
  }
};

// Функция для обновления данных в БД
export const updateDatabaseData = async () => {
  try {
    const response = await api.post('/update_data');
    return response.data;
  } catch (error) {
    console.error('Error updating database data:', error);
    throw error;
  }
};

// Функция для получения статуса обновления
export const getUpdateStatus = async () => {
  try {
    const response = await api.get('/update_status');
    return response.data;
  } catch (error) {
    console.error('Error fetching update status:', error);
    return { status: 'error', error: error.message };
  }
};

// Функция для предварительной загрузки данных
export const preloadAllData = async (startDate, endDate, setLoading, setMessage) => {
  if (setLoading) setLoading(true);
  if (setMessage) setMessage('Начало загрузки данных...');
  
  const startTime = Date.now();
  
  // Создаем функцию для обновления прогресса с оценкой времени
  const updateProgress = (task, percent, remainingMs) => {
    if (!setMessage) return;
    
    // Проверяем на бесконечность и NaN
    const safePercent = isNaN(percent) || !isFinite(percent) ? 0 : Math.min(Math.max(percent, 0), 100);
    
    let timeText = '';
    if (remainingMs > 0 && isFinite(remainingMs)) {
      if (remainingMs < 60000) {
        timeText = `(осталось примерно ${Math.ceil(remainingMs / 1000)} сек)`;
      } else {
        timeText = `(осталось примерно ${Math.ceil(remainingMs / 60000)} мин)`;
      }
    }
    
    setMessage(`${task}: ${safePercent}% ${timeText}`);
  };
  
  // Загружаем общие сводные данные
  try {
    if (setMessage) setMessage('Загрузка сводных данных...');
    await getSummaryRange(startDate, endDate, 
      (percent, remainingMs) => updateProgress('Загрузка сводных данных', percent, remainingMs)
    );
    console.log('Сводные данные загружены');
  } catch (e) {
    console.error('Ошибка загрузки сводных данных', e);
  }
  
  // Загружаем данные по первым 10 доменам (наиболее важным)
  const topDomains = ["alvadi.com", "alvadi.de", "alvadi.co.uk", "alvadi.eu", "alvadi.fr", 
                      "alvadi.it", "alvadi.es", "alvadi.pl", "alvadi.nl", "alvadi.ru"];
  
  let completed = 0;
  const totalDomains = topDomains.length;
  
  // Одновременно загружаем данные для нескольких доменов (параллельно)
  const domainPromises = topDomains.map((domain, index) => {
    return getDomainSummaryRange(domain, startDate, endDate,
      (percent, remainingMs) => {
        // Защита от Infinity и NaN
        const safePercent = isNaN(percent) || !isFinite(percent) ? 0 : Math.min(Math.max(percent, 0), 100);
        updateProgress(`Загрузка данных для ${domain}`, safePercent, remainingMs);
      }
    ).then(data => {
      completed++;
      console.log(`Данные для ${domain} загружены (${completed}/${totalDomains})`);
      return data;
    }).catch(e => {
      console.error(`Ошибка загрузки данных для ${domain}`, e);
      completed++;
      return [];
    });
  });
  
  // Одновременно начинаем загрузку данных по странам
  const countriesPromise = (async () => {
    try {
      if (setMessage) setMessage('Загрузка данных по странам...');
      return await getCountrySummaryRange(startDate, endDate,
        (percent, remainingMs) => {
          // Защита от Infinity и NaN
          const safePercent = isNaN(percent) || !isFinite(percent) ? 0 : Math.min(Math.max(percent, 0), 100);
          updateProgress('Загрузка данных по странам', safePercent, remainingMs);
        }
      );
    } catch (e) {
      console.error('Ошибка загрузки данных по странам', e);
      return [];
    }
  })();
  
  // Ждем завершения загрузки всех данных
  await Promise.all([...domainPromises, countriesPromise]);
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  if (setMessage) setMessage(`Загрузка завершена за ${totalTime} сек`);
  
  setTimeout(() => {
    if (setLoading) setLoading(false);
    if (setMessage) setMessage('');
  }, 2000);
  
  console.log(`Предварительная загрузка завершена за ${totalTime} сек`);
  
  // Сохраняем кэш после полной загрузки
  saveCache();
};

// Очистка кэша
export const clearCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
  localStorage.removeItem('api_cache');
  console.log('Кэш очищен');
};

// Функция для очистки серверного кэша
export const clearServerCache = async () => {
  try {
    const response = await api.post('/clear_cache');
    return response.data;
  } catch (error) {
    console.error('Error clearing server cache:', error);
    return { success: false, message: error.message };
  }
};

export default api;
