import React, { useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Chip,
  CircularProgress, 
  useTheme,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TrafficChart from './TrafficChart';

// Компонент карточки отдельного домена
function DomainCard({ domain, historicalData, loading, metrics, onLoad }) {
  const theme = useTheme();

  // Запрашиваем данные при необходимости
  useEffect(() => {
    if (loading && onLoad && (!historicalData || historicalData.length === 0)) {
      onLoad();
    }
  }, [domain, loading, onLoad, historicalData]);

  // Вычисляем последние значения метрик
  const getLatestValue = (field) => {
    if (!historicalData || historicalData.length === 0) return 0;
    return historicalData[historicalData.length - 1][field] || 0;
  };

  // Форматируем название домена для отображения
  const formatDomain = (domain) => {
    // Если домен начинается с alvadi или alvadiparts, выделяем это
    if (domain.startsWith('alvadi') || domain.startsWith('alvadiparts')) {
      const parts = domain.split('.');
      if (parts.length > 1) {
        return (
          <>
            <span style={{ fontWeight: 'bold' }}>
              {parts[0]}
            </span>
            <span>
              .{parts.slice(1).join('.')}
            </span>
          </>
        );
      }
    }
    return domain;
  };

  // Вычисляем изменение в процентах
  const getChangePercent = (field) => {
    if (!historicalData || historicalData.length < 2) return 0;
    
    const current = historicalData[historicalData.length - 1][field];
    const previous = historicalData[historicalData.length - 2][field];
    
    if (previous === 0) return current > 0 ? 100 : 0;
    
    return ((current - previous) / previous) * 100;
  };
  
  // Форматирование метки изменения
  const getChangeLabel = (field) => {
    const changePercent = getChangePercent(field);
    const formattedChange = Math.abs(changePercent).toFixed(1);
    
    if (changePercent > 0) {
      return `+${formattedChange}%`;
    } else if (changePercent < 0) {
      return `-${formattedChange}%`;
    } else {
      return '0%';
    }
  };
  
  // Определение цвета изменения
  const getChangeColor = (field) => {
    const changePercent = getChangePercent(field);
    
    if (changePercent >= 5) {
      return 'success';
    } else if (changePercent <= -5) {
      return 'error';
    } else {
      return 'default';
    }
  };

  // Формирование URL для Google Search Console
  const getGSCUrl = (domain) => {
    return `https://search.google.com/search-console?resource_id=https://${domain}/`;
  };

  // Показываем skeleton loader при загрузке
  if (loading && (!historicalData || historicalData.length === 0)) {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ flexGrow: 1, padding: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
              {formatDomain(domain)}
            </Typography>
            <Tooltip title={`Открыть ${domain} в Search Console`}>
              <IconButton 
                size="small" 
                href={getGSCUrl(domain)} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => onLoad && onLoad()}
            >
              Загрузить данные
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Показываем сообщение, если нет данных
  if (!historicalData || historicalData.length === 0) {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ flexGrow: 1, padding: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
              {formatDomain(domain)}
            </Typography>
            <Tooltip title={`Открыть ${domain} в Search Console`}>
              <IconButton 
                size="small" 
                href={getGSCUrl(domain)} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary" gutterBottom>
              Нет данных для отображения
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => onLoad && onLoad()}
              sx={{ mt: 2 }}
            >
              Попробовать загрузить данные
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <CardContent sx={{ flexGrow: 1, padding: 2, pb: 2 }}>
        {/* Заголовок с названием домена и иконкой перехода */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ 
            fontWeight: 500, 
            display: 'flex', 
            alignItems: 'center'
          }}>
            {formatDomain(domain)}
          </Typography>
          <Tooltip title={`Открыть ${domain} в Search Console`}>
            <IconButton 
              size="small" 
              href={getGSCUrl(domain)} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Статистика */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Клики:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  getLatestValue('traffic_clicks').toLocaleString()
                )}
              </Typography>
              <Chip 
                size="small" 
                label={getChangeLabel('traffic_clicks')} 
                color={getChangeColor('traffic_clicks')} 
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Показы:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  getLatestValue('impressions').toLocaleString()
                )}
              </Typography>
              <Chip 
                size="small" 
                label={getChangeLabel('impressions')} 
                color={getChangeColor('impressions')} 
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              CTR:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  `${(getLatestValue('ctr') * 100).toFixed(2)}%`
                )}
              </Typography>
              <Chip 
                size="small" 
                label={getChangeLabel('ctr')} 
                color={getChangeColor('ctr')} 
                variant="outlined"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Поз:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  getLatestValue('avg_position').toFixed(1)
                )}
              </Typography>
              <Chip 
                size="small" 
                label={getChangeLabel('avg_position')} 
                // Для позиции логика обратная - снижение это хорошо
                color={getChangeColor('avg_position') === 'success' ? 'error' : (getChangeColor('avg_position') === 'error' ? 'success' : 'default')} 
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        {/* График с данными */}
        <Box sx={{ mt: 3, height: 200 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <TrafficChart data={historicalData} metrics={metrics} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default DomainCard;