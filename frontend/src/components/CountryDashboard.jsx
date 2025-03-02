import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  TextField,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getCountrySummaryRange } from '../services/api';
import CountrySummaryChart from './CountrySummaryChart';
import CountryCard from './CountryCard';
import DateRangePicker from './DateRangePicker';
import MetricsToggle from './MetricsToggle';
import { LoadingContext } from '../App';

function CountryDashboard({ startDate, endDate, onDateRangeChange, onRefresh }) {
  const theme = useTheme();
  const { setGlobalLoading, setLoadingMessage, setLoadingProgress } = useContext(LoadingContext);
  
  // Состояние для хранения данных по странам
  const [countryData, setCountryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние для поискового запроса
  const [searchTerm, setSearchTerm] = useState('');
  
  // Активная метрика для таблицы ТОП доменов
  const [activeMetric, setActiveMetric] = useState('traffic_clicks');
  
  // Состояние для отображения метрик на графиках
  const [metrics, setMetrics] = useState({
    traffic_clicks: true,
    impressions: false,
    ctr: false,
    avg_position: false
  });
  
  // Получаем список уникальных стран из данных
  const countries = useMemo(() => {
    if (!countryData || countryData.length === 0) return [];
    
    // Извлекаем уникальные страны и считаем клики
    const countryMap = {};
    
    countryData.forEach(item => {
      const country = item.country;
      if (!countryMap[country]) {
        countryMap[country] = {
          name: country,
          clicks: 0,
          impressions: 0
        };
      }
      
      countryMap[country].clicks += item.traffic_clicks || 0;
      countryMap[country].impressions += item.impressions || 0;
    });
    
    // Преобразуем в массив и сортируем по кликам
    return Object.values(countryMap)
      .sort((a, b) => b.clicks - a.clicks)
      .map(item => item.name);
  }, [countryData]);
  
  // Фильтрация стран по поисковому запросу - показываем все страны
  const filteredCountries = useMemo(() => {
    if (!searchTerm) {
      // Показываем все страны
      return countries;
    }
    
    return countries
      .filter(country => country.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [countries, searchTerm]);
  
  // Загрузка данных по странам с отображением прогресса
  const fetchCountryData = async (start = startDate, end = endDate) => {
    setIsLoading(true);
    setError(null);
    setGlobalLoading(true);
    setLoadingMessage('Загрузка данных по странам...');
    setLoadingProgress(0);
    
    const startTime = Date.now();
    
    try {
      const data = await getCountrySummaryRange(start, end, 
        (percent, remainingMs) => {
          setLoadingProgress(percent);
          
          // Формируем сообщение с оценкой времени
          let timeMsg = '';
          if (remainingMs > 0) {
            if (remainingMs > 60000) {
              timeMsg = ` (осталось примерно ${Math.ceil(remainingMs / 60000)} мин)`;
            } else {
              timeMsg = ` (осталось примерно ${Math.ceil(remainingMs / 1000)} сек)`;
            }
          }
          setLoadingMessage(`Загрузка данных по странам: ${percent}%${timeMsg}`);
        }
      );
      
      if (!data || data.length === 0) {
        setError("Нет данных о странах за выбранный период");
      }
      
      // Сортируем данные по дате для обеспечения правильного отображения на графиках
      const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setCountryData(sortedData);
      
      // Вычисляем общее время выполнения
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      setLoadingMessage(`Загрузка завершена за ${totalTime} секунд`);
      setTimeout(() => {
        setGlobalLoading(false);
        setLoadingMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error fetching country data:', error);
      setError("Ошибка загрузки данных о странах");
      setGlobalLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Обработчик изменения поискового запроса
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Обработчик изменения выбранных метрик
  const handleMetricsChange = (newMetrics) => {
    setMetrics(newMetrics);
    
    if (!newMetrics[activeMetric]) {
      const newActiveMetric = Object.keys(newMetrics).find(key => newMetrics[key]);
      if (newActiveMetric) {
        setActiveMetric(newActiveMetric);
      }
    }
  };
  
  // Обработчик изменения активной метрики для таблицы
  const handleActiveMetricChange = (event) => {
    setActiveMetric(event.target.value);
    
    if (!metrics[event.target.value]) {
      setMetrics(prev => ({
        ...prev,
        [event.target.value]: true
      }));
    }
  };
  
  // Загрузка данных при первом рендере
	useEffect(() => {
	  fetchCountryData();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
  
  // Обработчик обновления данных
  const handleRefresh = () => {
    fetchCountryData();
    if (onRefresh) onRefresh();
  };
  
  // Обработчик изменения диапазона дат
  const handleDateRangeChange = (start, end) => {
    if (onDateRangeChange) onDateRangeChange(start, end);
    fetchCountryData(start, end);
  };

  return (
    <Box>
      {/* Фильтры и переключатели */}
      <DateRangePicker 
        onDateRangeChange={handleDateRangeChange} 
        onRefresh={handleRefresh} 
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <MetricsToggle 
          metrics={metrics} 
          onChange={handleMetricsChange} 
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="metric-select-label">Метрика для таблицы</InputLabel>
          <Select
            labelId="metric-select-label"
            id="metric-select"
            value={activeMetric}
            label="Метрика для таблицы"
            onChange={handleActiveMetricChange}
          >
            <MenuItem value="traffic_clicks">Клики</MenuItem>
            <MenuItem value="impressions">Показы</MenuItem>
            <MenuItem value="ctr">CTR</MenuItem>
            <MenuItem value="avg_position">Средняя позиция</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Ошибки */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Сводный график по странам, только если есть данные */}
      {countryData.length > 0 && (
        <CountrySummaryChart 
          data={countryData} 
          metrics={metrics} 
        />
      )}

      {/* Строка поиска стран */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Страны ({filteredCountries.length}{countries.length > filteredCountries.length ? ` из ${countries.length}` : ''})
        </Typography>
        
        <TextField
          size="small"
          placeholder="Поиск страны..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ width: 250 }}
        />
      </Box>

      {/* Карточки стран */}
      <Grid container spacing={3}>
        {isLoading && countryData.length === 0 ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Grid>
        ) : filteredCountries.length === 0 ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              {countries.length === 0 
                ? "Нет данных о странах за выбранный период" 
                : `По запросу "${searchTerm}" не найдено стран`}
            </Typography>
          </Grid>
        ) : (
          filteredCountries.map((country) => (
            <Grid item xs={12} key={country}>
              <CountryCard
                country={country}
                data={countryData}
                loading={isLoading}
                metrics={metrics}
                activeMetric={activeMetric}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

export default CountryDashboard;