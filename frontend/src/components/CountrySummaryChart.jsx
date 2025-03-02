import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Регистрируем компоненты ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function CountrySummaryChart({ data, metrics }) {
  const theme = useTheme();

  // Переносим все useMemo до условной проверки
  const hasData = useMemo(() => data && data.length > 0, [data]);
  
  // Используем useMemo для сортировки данных и получения уникальных дат, но только если есть данные
  const { groupedByDateAndCountry, dates, allCountries, countryTotals, topCountries } = useMemo(() => {
    if (!hasData) {
      return { 
        groupedByDateAndCountry: {}, 
        dates: [], 
        allCountries: [],
        countryTotals: {},
        topCountries: []
      };
    }
    
    // Сортируем по дате для правильного отображения
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Группируем данные по датам и странам
    const grouped = sortedData.reduce((acc, item) => {
      const dateStr = item.date;
      const country = item.country;
      
      if (!acc[dateStr]) {
        acc[dateStr] = {};
      }
      
      if (!acc[dateStr][country]) {
        acc[dateStr][country] = {
          traffic_clicks: 0,
          impressions: 0,
          ctr: 0,
          avg_position: 0,
          domains: 0
        };
      }
      
      acc[dateStr][country].traffic_clicks += item.traffic_clicks || 0;
      acc[dateStr][country].impressions += item.impressions || 0;
      
      // Для CTR и avg_position считаем взвешенное среднее
      if (item.impressions > 0) {
        acc[dateStr][country].ctr += (item.ctr || 0) * (item.impressions || 0);
        acc[dateStr][country].avg_position += (item.avg_position || 0) * (item.impressions || 0);
      }
      
      acc[dateStr][country].domains += 1;
      
      return acc;
    }, {});
    
    // Получаем даты в правильном порядке
    const datesList = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    
    // Получаем список всех уникальных стран
    const countries = new Set();
    Object.values(grouped).forEach(dateData => {
      Object.keys(dateData).forEach(country => countries.add(country));
    });
    const countryList = Array.from(countries);
    
    // Подготавливаем данные по ключевым странам (топ-10 по кликам)
    const totals = {};
    countryList.forEach(country => {
      totals[country] = {
        traffic_clicks: 0,
        impressions: 0,
        ctr_weighted: 0,
        position_weighted: 0,
        impressions_total: 0
      };
    });

    // Считаем общие суммы для каждой страны
    datesList.forEach(date => {
      const dateData = grouped[date];
      Object.entries(dateData).forEach(([country, data]) => {
        totals[country].traffic_clicks += data.traffic_clicks;
        totals[country].impressions += data.impressions;
        totals[country].ctr_weighted += data.ctr * data.impressions;
        totals[country].position_weighted += data.avg_position * data.impressions;
        totals[country].impressions_total += data.impressions;
      });
    });

    // Вычисляем средние значения
    Object.values(totals).forEach(data => {
      if (data.impressions_total > 0) {
        data.ctr = data.ctr_weighted / data.impressions_total;
        data.avg_position = data.position_weighted / data.impressions_total;
      } else {
        data.ctr = 0;
        data.avg_position = 0;
      }
    });
    
    // Определяем топ-10 стран по кликам
    const top = Object.entries(totals)
      .sort((a, b) => b[1].traffic_clicks - a[1].traffic_clicks)
      .slice(0, 10)
      .map(([country]) => country);
    
    return { 
      groupedByDateAndCountry: grouped, 
      dates: datesList, 
      allCountries: countryList, 
      countryTotals: totals, 
      topCountries: top 
    };
  }, [data, hasData]);

  // Создаем пустые датасеты и данные графика заранее (вне условного рендеринга)
  const activeMetric = Object.keys(metrics).find(key => metrics[key]) || 'traffic_clicks';
  
  // Преобразуем данные для графика - всегда вызываем useMemo (безусловно)
  const chartData = useMemo(() => {
    if (!hasData || !topCountries.length) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    // Создаем датасеты для каждой страны из топ-10
    const datasets = topCountries.map((country, index) => {
      // Разные цвета для разных стран
      const hue = (index * 360 / topCountries.length) % 360;
      const borderColor = `hsl(${hue}, 70%, 50%)`;
      const backgroundColor = `hsla(${hue}, 70%, 50%, 0.1)`;
      
      // Данные для страны по выбранной метрике
      const data = dates.map(date => {
        if (groupedByDateAndCountry[date] && groupedByDateAndCountry[date][country]) {
          const value = groupedByDateAndCountry[date][country][activeMetric];
          // Форматируем CTR в процентах
          return activeMetric === 'ctr' ? value * 100 : value;
        }
        return 0;
      });
      
      return {
        label: country,
        data,
        borderColor,
        backgroundColor,
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: borderColor,
        pointBorderColor: theme.palette.background.paper,
        pointBorderWidth: 1,
        yAxisID: activeMetric === 'avg_position' ? 'y1' : 'y',
      };
    });

    return {
      labels: dates.map(date => format(new Date(date), 'd MMM', { locale: ru })),
      datasets
    };
  }, [activeMetric, dates, groupedByDateAndCountry, theme.palette.background.paper, topCountries, hasData]);

  // Если данных нет, показываем placeholder
  if (!hasData) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Статистика по странам
        </Typography>
        <Box sx={{ 
          height: 300, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          color: 'text.secondary',
          fontSize: '1rem'
        }}>
          Нет данных для отображения
        </Box>
      </Paper>
    );
  }

  // Настройки цветов для разных метрик
  const metricColors = {
    traffic_clicks: {
      border: theme.palette.primary.main,
      background: theme.palette.mode === 'dark' ? 'rgba(66, 165, 245, 0.2)' : 'rgba(33, 150, 243, 0.1)'
    },
    impressions: {
      border: theme.palette.success.main,
      background: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)'
    },
    ctr: {
      border: theme.palette.warning.main,
      background: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)'
    },
    avg_position: {
      border: theme.palette.error.main,
      background: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)'
    }
  };

  // Метки для осей
  const metricLabels = {
    traffic_clicks: 'Клики',
    impressions: 'Показы',
    ctr: 'CTR (%)',
    avg_position: 'Средняя позиция'
  };

  // Опции графика
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        position: 'left',
        display: activeMetric !== 'avg_position',
        grid: {
          color: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 10,
          },
          padding: 8,
        },
      },
      y1: {
        beginAtZero: false,
        position: 'right',
        reverse: true, // Инвертируем ось для позиций (меньше = лучше)
        min: 0,
        max: 100,
        display: activeMetric === 'avg_position', // Показываем только для средней позиции
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 10,
          },
          padding: 8,
        },
      }
    },
    plugins: {
      title: {
        display: true,
        text: `${metricLabels[activeMetric]} по странам (топ-10)`,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 15,
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11,
          }
        },
      },
      tooltip: {
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.8)' 
          : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (tooltipItems) => {
            if (!tooltipItems || tooltipItems.length === 0 || !dates[tooltipItems[0].dataIndex]) {
              return '';
            }
            return format(new Date(dates[tooltipItems[0].dataIndex]), 'd MMMM yyyy', { locale: ru });
          },
          label: (tooltipItem) => {
            const country = tooltipItem.dataset.label;
            let value = tooltipItem.raw;
            
            if (activeMetric === 'ctr') {
              return `${country}: ${value.toFixed(2)}%`;
            } else if (activeMetric === 'avg_position') {
              return `${country}: ${value.toFixed(1)}`;
            }
            return `${country}: ${value.toLocaleString()}`;
          }
        }
      }
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ position: 'relative', height: 350 }}>
        <Line data={chartData} options={options} />
      </Box>
    </Paper>
  );
}

export default CountrySummaryChart;