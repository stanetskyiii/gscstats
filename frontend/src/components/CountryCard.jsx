import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  CircularProgress, 
  useTheme 
} from '@mui/material';
import CountryChart from './CountryChart';
import CountryTopDomains from './CountryTopDomains';

function CountryCard({ country, data, loading, metrics, activeMetric }) {
  const theme = useTheme();

  // Вычисляем последние значения метрик для страны
  const getLatestMetrics = () => {
    if (!data || data.length === 0) return {};

    // Группируем данные по стране и дате
    const countryData = data.filter(item => item.country === country);
    
    // Находим последнюю дату
    const dates = [...new Set(countryData.map(item => item.date))].sort();
    const latestDate = dates[dates.length - 1];
    
    // Суммируем метрики для последней даты
    const latestData = countryData.filter(item => item.date === latestDate);
    
    let traffic_clicks = 0;
    let impressions = 0;
    let ctr_weighted = 0;
    let position_weighted = 0;
    let impressions_total = 0;
    
    latestData.forEach(item => {
      traffic_clicks += item.traffic_clicks || 0;
      impressions += item.impressions || 0;
      
      if (item.impressions > 0) {
        ctr_weighted += (item.ctr || 0) * (item.impressions || 0);
        position_weighted += (item.avg_position || 0) * (item.impressions || 0);
        impressions_total += item.impressions;
      }
    });
    
    // Вычисляем средние значения
    let ctr = 0;
    let avg_position = 0;
    
    if (impressions_total > 0) {
      ctr = ctr_weighted / impressions_total;
      avg_position = position_weighted / impressions_total;
    }
    
    return {
      traffic_clicks,
      impressions,
      ctr,
      avg_position
    };
  };

  const latestMetrics = getLatestMetrics();

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
        {/* Заголовок с названием страны */}
        <Typography variant="h6" component="div" sx={{ 
          fontWeight: 500, 
          mb: 2
        }}>
          {country}
        </Typography>

        <Grid container spacing={3}>
          {/* Левая колонка с графиком */}
          <Grid item xs={12} md={7}>
            {/* Статистика */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                {/* Клики */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Клики:
                  </Typography>
                  <Typography variant="h6">
                    {loading ? (
                      <CircularProgress size={20} thickness={5} />
                    ) : (
                      latestMetrics.traffic_clicks?.toLocaleString() || 0
                    )}
                  </Typography>
                </Grid>
                
                {/* Показы */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Показы:
                  </Typography>
                  <Typography variant="h6">
                    {loading ? (
                      <CircularProgress size={20} thickness={5} />
                    ) : (
                      latestMetrics.impressions?.toLocaleString() || 0
                    )}
                  </Typography>
                </Grid>
                
                {/* CTR */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    CTR:
                  </Typography>
                  <Typography variant="h6">
                    {loading ? (
                      <CircularProgress size={20} thickness={5} />
                    ) : (
                      `${((latestMetrics.ctr || 0) * 100).toFixed(2)}%`
                    )}
                  </Typography>
                </Grid>
                
                {/* Средняя позиция */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Средняя позиция:
                  </Typography>
                  <Typography variant="h6">
                    {loading ? (
                      <CircularProgress size={20} thickness={5} />
                    ) : (
                      (latestMetrics.avg_position || 0).toFixed(1)
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* График с данными */}
            <Box sx={{ mt: 3, height: 230 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <CountryChart 
                  data={data} 
                  country={country} 
                  metrics={metrics} 
                />
              )}
            </Box>
          </Grid>

          {/* Правая колонка с ТОП доменов */}
          <Grid item xs={12} md={5}>
            <CountryTopDomains 
              data={data}
              country={country}
              metric={activeMetric}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default CountryCard;