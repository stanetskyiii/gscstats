import React, { useState, useEffect, useMemo, useContext } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  TextField,
  CircularProgress,
  Alert,
  Button,
  useTheme,
  MenuItem,
  Menu
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getSummaryRange, getDomainSummaryRange, getLastAvailableDates } from '../services/api';
import DomainCard from './DomainCard';
import SummaryChart from './SummaryChart';
import MetricsToggle from './MetricsToggle';
import DateRangePicker from './DateRangePicker';
import { LoadingContext } from '../App';

// Массив доменов - полный список 52 домена
const DOMAINS = [
  "alvadi.al", "alvadi.am", "alvadi.at", "alvadi.be", "alvadi.ba", "alvadi.bg",
  "alvadi.cn", "alvadi.hr", "alvadi.cy", "alvadi.cz", "alvadi.ee", "alvadi.pl",
  "alvadi.fi", "alvadi.fr", "alvadi.ge", "alvadi.de", "alvadiparts.gr", "alvadi.gl",
  "alvadi.hu", "alvadi.is", "alvadi.in", "alvadi.id", "alvadi.ie", "alvadi.co.il",
  "alvadi.it", "alvadi.jp", "alvadi.kz", "alvadi.kr", "alvadi.lv", "alvadi.lt",
  "alvadi.lu", "alvadi.mk", "alvadi.my", "alvadi.mt", "alvadi.md", "alvadi.me",
  "alvadiparts.nl", "alvadi.nz", "alvadi.no", "alvadi.pt", "alvadi.ro", "alvadi.rs",
  "alvadi.sk", "alvadi.si", "alvadi.es", "alvadi.se", "alvadi.ch", "alvadi.com.tr",
  "alvadi.co.uk", "alvadi.com", "alvadi.vn", "alvadi.eu", "alvadi.ru", "alvadi.ua"
];

// Популярные регионы (группы доменов)
const DOMAIN_GROUPS = {
  "Европа": ["alvadi.de", "alvadi.fr", "alvadi.co.uk", "alvadi.it", "alvadi.es", "alvadiparts.nl", "alvadi.eu"],
  "Азия": ["alvadi.cn", "alvadi.jp", "alvadi.in", "alvadi.vn", "alvadi.kr"],
  "Топ по трафику": ["alvadi.com", "alvadi.de", "alvadi.co.uk", "alvadi.eu", "alvadi.fr", "alvadi.ru"],
  "СНГ": ["alvadi.ru", "alvadi.ua", "alvadi.kz", "alvadi.by"],
};

function DomainDashboard({ startDate, endDate, onDateRangeChange, onRefresh }) {
  const theme = useTheme();
  const { setGlobalLoading, setLoadingMessage, setLoadingProgress } = useContext(LoadingContext);
  
  // Состояние для поискового запроса
  const [searchTerm, setSearchTerm] = useState('');
  
  // Состояние для отображения метрик
  const [metrics, setMetrics] = useState({
    traffic_clicks: true,
    impressions: false,
    ctr: false,
    avg_position: false
  });
  
  // Состояния для загрузки данных
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState([]);
  const [historicalData, setHistoricalData] = useState({});
  const [error, setError] = useState(null);
  const [lastAvailableDate, setLastAvailableDate] = useState(null);
  
  // Состояние для меню выбора группы доменов
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Открытие/закрытие меню групп
  const handleGroupMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleGroupMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    handleGroupMenuClose();
  };
  
  // Фильтрация доменов - показываем все домены без ограничения
  const filteredDomains = useMemo(() => {
    // Если выбрана группа, фильтруем по ней
    let domains = selectedGroup ? DOMAIN_GROUPS[selectedGroup] : DOMAINS;
    
    // Затем применяем фильтр поиска
    if (searchTerm) {
      domains = domains.filter(domain => 
        domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Показываем все домены вместо ограничения
    return domains;
  }, [searchTerm, selectedGroup]);
  
  // Обработчик изменения поискового запроса
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Сбрасываем выбранную группу при поиске
    if (event.target.value) {
      setSelectedGroup(null);
    }
  };
  
  // Обработчик изменения метрик
  const handleMetricsChange = (newMetrics) => {
    setMetrics(newMetrics);
  };
  
  // Обработчик изменения диапазона дат
  const handleDateRangeChange = (start, end) => {
    // Очищаем данные перед новой загрузкой
    setHistoricalData({});
    if (onDateRangeChange) onDateRangeChange(start, end);
    fetchData(start, end);
  };
  
  // Загрузка данных с отображением прогресса
  const fetchData = async (start = startDate, end = endDate) => {
    setIsLoading(true);
    setError(null);
    setGlobalLoading(true);
    setLoadingMessage('Загрузка данных...');
    setLoadingProgress(0);
    
    const startTime = Date.now();
    
    try {
      // Загружаем сводные данные с помощью оптимизированного API (один запрос)
      setLoadingMessage('Загрузка сводных данных...');
      const summary = await getSummaryRange(start, end, 
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
          setLoadingMessage(`Загрузка сводных данных: ${percent}%${timeMsg}`);
        }
      );
      setSummaryData(summary);
      
      // Загружаем данные по доменам с помощью оптимизированного API
      const historical = {};
      
      // Загружаем данные для первых 10 доменов сразу (наиболее важных)
      const topDomains = [
        "alvadi.com", "alvadi.de", "alvadi.co.uk", "alvadi.eu", "alvadi.fr", 
        "alvadi.it", "alvadi.es", "alvadi.pl", "alvadi.ru", "alvadiparts.nl"
      ].filter(domain => filteredDomains.includes(domain));
      
      // Загружаем данные для топовых доменов параллельно
      const domainPromises = topDomains.map(async (domain, index) => {
        try {
          // Используем оптимизированный метод получения данных за диапазон дат
          const domainData = await getDomainSummaryRange(domain, start, end, 
            (percent, remainingMs) => {
              // Обновляем прогресс только для текущего активного домена
              if (index === 0) {
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
                setLoadingMessage(`Загрузка данных для ${domain}: ${percent}%${timeMsg}`);
              }
            }
          );
          return { domain, data: domainData };
        } catch (e) {
          console.error(`Error loading data for ${domain}:`, e);
          return { domain, data: [] };
        }
      });
      
      // Ждем завершения всех загрузок
      const results = await Promise.all(domainPromises);
      
      // Обновляем данные
      const newHistoricalData = {};
      results.forEach(({ domain, data }) => {
        newHistoricalData[domain] = data;
      });
      
      setHistoricalData(newHistoricalData);
      
      // Загружаем последнюю доступную дату (если не установлена)
      if (!lastAvailableDate) {
        try {
          const lastDates = await getLastAvailableDates("alvadi.com");
          if (lastDates && lastDates.last_date) {
            setLastAvailableDate(lastDates.last_date);
          }
        } catch (e) {
          console.error("Error loading last available date:", e);
        }
      }
      
      // Вычисляем общее время выполнения
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      setLoadingMessage(`Загрузка завершена за ${totalTime} секунд`);
      setTimeout(() => {
        setGlobalLoading(false);
        setLoadingMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Ошибка загрузки данных. Пожалуйста, попробуйте позже.');
      setGlobalLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Загрузка данных для конкретного домена
  const loadDomainData = async (domain) => {
    if (historicalData[domain]?.length > 0) return;
    
    setGlobalLoading(true);
    setLoadingMessage(`Загрузка данных для ${domain}...`);
    setLoadingProgress(0);
    
    try {
      // Используем оптимизированный метод получения данных за диапазон дат
      const domainData = await getDomainSummaryRange(domain, startDate, endDate, 
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
          setLoadingMessage(`Загрузка данных для ${domain}: ${percent}%${timeMsg}`);
        }
      );
      
      setHistoricalData(prev => ({
        ...prev,
        [domain]: domainData
      }));
      
      setLoadingMessage('Загрузка завершена');
      setTimeout(() => {
        setGlobalLoading(false);
        setLoadingMessage('');
      }, 1000);
    } catch (e) {
      console.error(`Error loading data for ${domain}:`, e);
      setGlobalLoading(false);
    }
  };
  
  // Загрузка данных при монтировании компонента
	useEffect(() => {
	  fetchData();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
  
  // Обработчик обновления данных
  const handleRefresh = () => {
    fetchData();
    if (onRefresh) onRefresh();
  };
  
  return (
    <Box>
      {/* Фильтры и переключатели */}
      <DateRangePicker 
        onDateRangeChange={handleDateRangeChange} 
        onRefresh={handleRefresh}
        initialStartDate={startDate}
        initialEndDate={endDate}
        maxEndDate={lastAvailableDate}
      />
      
      <MetricsToggle 
        metrics={metrics} 
        onChange={handleMetricsChange} 
      />
      
      {/* Сводный график, только если есть данные */}
      {summaryData.length > 0 && (
        <SummaryChart 
          data={summaryData} 
          metrics={metrics} 
        />
      )}
      
      {/* Ошибки */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Строка поиска и фильтрации доменов */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h5" component="h2" sx={{ mr: 2 }}>
            Домены {selectedGroup ? `(${selectedGroup})` : ''}
          </Typography>
          
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleGroupMenuOpen}
            endIcon={<MoreVertIcon />}
          >
            {selectedGroup || 'Выбрать группу'}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleGroupMenuClose}
          >
            <MenuItem onClick={() => handleGroupSelect(null)}>Все домены</MenuItem>
            {Object.keys(DOMAIN_GROUPS).map(group => (
              <MenuItem key={group} onClick={() => handleGroupSelect(group)}>
                {group}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        
        <TextField
          size="small"
          placeholder="Поиск домена..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ width: 250 }}
        />
      </Box>
      
      {/* Отображение статуса фильтрации */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Показано {filteredDomains.length} {filteredDomains.length === 1 ? 'домен' : 
          filteredDomains.length < 5 ? 'домена' : 'доменов'} 
        {selectedGroup ? ` из группы "${selectedGroup}"` : 
          searchTerm ? ` по запросу "${searchTerm}"` : 
          ` (всего доменов: ${DOMAINS.length})`}
      </Typography>

      {/* Карточки доменов */}
      <Grid container spacing={3}>
        {isLoading && Object.keys(historicalData).length === 0 ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Grid>
        ) : filteredDomains.length === 0 ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              По запросу "{searchTerm}" не найдено доменов
            </Typography>
          </Grid>
        ) : (
          filteredDomains.map((domain) => (
            <Grid item xs={12} sm={6} md={4} key={domain}>
              <DomainCard
                domain={domain}
                historicalData={historicalData[domain] || []}
                loading={!historicalData[domain]}
                metrics={metrics}
                onLoad={() => loadDomainData(domain)}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}

export default DomainDashboard;