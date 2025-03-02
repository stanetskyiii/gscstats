import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';

/**
 * Компонент для отображения ТОП-10 доменов по выбранной стране
 */
function CountryTopDomains({ data, country, metric = 'traffic_clicks' }) {
  const theme = useTheme();

  // Группируем данные по доменам для выбранной страны
  // Безусловно вызываем useMemo
  const domainData = useMemo(() => {
    if (!data || !country || data.length === 0) return [];

    // Фильтруем данные по выбранной стране
    const countryData = data.filter((item) => item.country === country);

    // Группируем по доменам
    const domainTotals = countryData.reduce((acc, item) => {
      const domain = item.domain;

      if (!acc[domain]) {
        acc[domain] = {
          domain,
          traffic_clicks: 0,
          impressions: 0,
          ctr_weighted: 0,
          position_weighted: 0,
          impressions_total: 0,
        };
      }

      acc[domain].traffic_clicks += item.traffic_clicks || 0;
      acc[domain].impressions += item.impressions || 0;

      if (item.impressions > 0) {
        acc[domain].ctr_weighted += (item.ctr || 0) * (item.impressions || 0);
        acc[domain].position_weighted += (item.avg_position || 0) * (item.impressions || 0);
        acc[domain].impressions_total += item.impressions;
      }

      return acc;
    }, {});

    // Вычисляем средние значения
    Object.values(domainTotals).forEach((data) => {
      if (data.impressions_total > 0) {
        data.ctr = data.ctr_weighted / data.impressions_total;
        data.avg_position = data.position_weighted / data.impressions_total;
      } else {
        data.ctr = 0;
        data.avg_position = 0;
      }
    });

    // Сортируем по указанной метрике (по умолчанию клики)
    return Object.values(domainTotals)
      .sort((a, b) => {
        // Для средней позиции сортировка обратная (меньше = лучше)
        if (metric === 'avg_position') {
          return a[metric] - b[metric];
        }
        return b[metric] - a[metric];
      })
      .slice(0, 10); // Берем топ-10
  }, [data, country, metric]);

  // Безусловно вызываем useMemo для расчета total
  const total = useMemo(() => {
    if (!domainData.length || metric === 'ctr' || metric === 'avg_position') {
      // Для процентных метрик не считаем общую сумму
      return 0;
    }
    return domainData.reduce((sum, item) => sum + (item[metric] || 0), 0);
  }, [domainData, metric]);

  // Форматируем значение в зависимости от метрики
  const formatValue = (value, metric) => {
    if (metric === 'ctr') {
      return `${(value * 100).toFixed(2)}%`;
    } else if (metric === 'avg_position') {
      return value.toFixed(1);
    }
    return value.toLocaleString();
  };

  // Форматируем процент
  const formatPercent = (value, total) => {
    if (total === 0 || metric === 'ctr' || metric === 'avg_position') {
      return '';
    }
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Определяем заголовок метрики
  const metricLabel = {
    traffic_clicks: 'Клики',
    impressions: 'Показы',
    ctr: 'CTR',
    avg_position: 'Поз.',
  }[metric];

  // Если данных нет, показываем placeholder
  if (!data || !country || domainData.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          ТОП-10 доменов
        </Typography>
        <Box
          sx={{
            height: 'calc(100% - 40px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'text.secondary',
            fontSize: '0.875rem',
          }}
        >
          Нет данных для отображения
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        ТОП-10 доменов: {country}
      </Typography>

      <TableContainer sx={{ maxHeight: 350 }}>
        <Table size="small" aria-label="top domains">
          <TableHead>
            <TableRow>
              <TableCell>Домен</TableCell>
              <TableCell align="right">{metricLabel}</TableCell>
              {metric !== 'ctr' && metric !== 'avg_position' && (
                <TableCell align="right">%</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {domainData.map((row) => (
              <TableRow
                key={row.domain}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.domain}
                </TableCell>
                <TableCell align="right">{formatValue(row[metric], metric)}</TableCell>
                {metric !== 'ctr' && metric !== 'avg_position' && (
                  <TableCell align="right">{formatPercent(row[metric], total)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default CountryTopDomains;
