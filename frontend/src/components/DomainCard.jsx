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
  Button,
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

  // Получение значений с сравнением периодов
  const getValueWithComparison = (field) => {
    if (!historicalData || historicalData.length < 2) return { current: 0, previous: 0, change: 0, percent: 0, total: 0 };
    
    // Разделяем данные на два равных периода
    const totalDays = historicalData.length;
    let midPoint = Math.floor(totalDays / 2);
    const startIndex = totalDays % 2 !== 0 ? 1 : 0; // Отбрасываем первый день если нечетное кол-во
    
    const firstPeriod = historicalData.slice(startIndex, startIndex + midPoint);
    const secondPeriod = historicalData.slice(startIndex + midPoint);
    
    // Вычисляем суммы для каждого периода
    let firstSum = 0;
    let secondSum = 0;
    let totalSum = 0;
    
    firstPeriod.forEach(item => {
      firstSum += item[field] || 0;
    });
    
    secondPeriod.forEach(item => {
      secondSum += item[field] || 0;
    });
    
    // Расчет общей суммы
    historicalData.forEach(item => {
      totalSum += item[field] || 0;
    });
    
    // Для средней позиции и CTR используем среднее значение вместо суммы
    if (field === 'avg_position' || field === 'ctr') {
      firstSum = firstSum / firstPeriod.length;
      secondSum = secondSum / secondPeriod.length;
      totalSum = totalSum / historicalData.length;
    }
    
    // Вычисляем изменение и процент
    const change = secondSum - firstSum;
    let percent = 0;
    
    if (firstSum !== 0) {
      percent = (change / firstSum) * 100;
    } else if (secondSum !== 0) {
      percent = 100; // Если было 0, а стало ненулевое значение
    }
    
    // Для средней позиции инвертируем смысл изменений (меньше - лучше)
    const displayPercent = field === 'avg_position' ? -percent : percent;
    
    return {
      current: secondSum,
      previous: firstSum,
      change: change,
      percent: displayPercent,
      total: totalSum
    };
  };

  // Форматируем название домена для отображения
  const formatDomain = (domain) => {
    // Если домен начинается с alvadi или alvadiparts, выделяем это
    if (domain.startsWith('alvadi') || domain.startsWith('alvadiparts')) {
      const parts = domain.split('.');
      if (parts.length > 1) {
        return (
          <>
            <span style={{ fontWeight: 'bold' }}>{parts[0]}</span>
            <span>.{parts.slice(1).join('.')}</span>
          </>
        );
      }
    }
    return domain;
  };

  // Получение цвета для отображения изменения
  const getChangeColor = (percent, isPosition = false) => {
    // Для позиции логика обратная - уменьшение это хорошо
    if (isPosition) {
      if (percent > 0) {
        return 'success';
      } else if (percent < 0) {
        return 'error';
      }
    } else {
      // Для остальных показателей - увеличение это хорошо
      if (percent > 0) {
        return 'success';
      } else if (percent < 0) {
        return 'error';
      }
    }

    return 'default';
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
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

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button variant="outlined" size="small" onClick={() => onLoad && onLoad()}>
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
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

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
            }}
          >
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

  // Получаем значения с сравнением для метрик
  const clicksData = getValueWithComparison('traffic_clicks');
  const impressionsData = getValueWithComparison('impressions');
  const ctrData = getValueWithComparison('ctr');
  const positionData = getValueWithComparison('avg_position');

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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}
          >
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Клики:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  `${Math.round(clicksData.total).toLocaleString()} / ${Math.round(clicksData.current).toLocaleString()}`
                )}
              </Typography>
              <Chip
                size="small"
                label={`${clicksData.percent > 0 ? '+' : ''}${clicksData.percent.toFixed(1)}%`}
                color={getChangeColor(clicksData.percent)}
                variant="outlined"
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Показы:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  `${Math.round(impressionsData.total).toLocaleString()} / ${Math.round(impressionsData.current).toLocaleString()}`
                )}
              </Typography>
              <Chip
                size="small"
                label={`${impressionsData.percent > 0 ? '+' : ''}${impressionsData.percent.toFixed(1)}%`}
                color={getChangeColor(impressionsData.percent)}
                variant="outlined"
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              CTR:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  `${(ctrData.total * 100).toFixed(2)}% / ${(ctrData.current * 100).toFixed(2)}%`
                )}
              </Typography>
              <Chip
                size="small"
                label={`${ctrData.percent > 0 ? '+' : ''}${ctrData.percent.toFixed(1)}%`}
                color={getChangeColor(ctrData.percent)}
                variant="outlined"
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Поз:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {loading ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  `${positionData.total.toFixed(1)} / ${positionData.current.toFixed(1)}`
                )}
              </Typography>
              <Chip
                size="small"
                label={`${positionData.percent > 0 ? '+' : ''}${positionData.percent.toFixed(1)}%`}
                color={getChangeColor(positionData.percent, true)}
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        {/* График с данными */}
        <Box sx={{ mt: 3, height: 200 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
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