import React from 'react';
import { Line } from 'react-chartjs-2';
import { Box } from '@mui/material';
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

function TrafficChart({ data, metrics }) {
  const theme = useTheme();

  // Если данных нет, показываем placeholder
  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        height: 230, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'text.secondary',
        fontSize: '0.875rem'
      }}>
        Нет данных для отображения
      </Box>
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

  // Создаем датасеты для выбранных метрик
  const datasets = Object.keys(metrics)
    .filter(metric => metrics[metric])
    .map(metric => ({
      label: metricLabels[metric],
      data: data.map(item => {
        // Форматируем CTR в процентах
        if (metric === 'ctr') {
          return item[metric] * 100;
        }
        return item[metric];
      }),
      borderColor: metricColors[metric].border,
      backgroundColor: metricColors[metric].background,
      fill: metric === 'traffic_clicks', // Заполнение только для кликов
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: metricColors[metric].border,
      pointBorderColor: theme.palette.background.paper,
      pointBorderWidth: 1.5,
      yAxisID: metric === 'avg_position' ? 'y1' : 'y', // Средняя позиция на отдельной оси
    }));

  // Подготавливаем данные для графика
  const chartData = {
    labels: data.map(item => format(new Date(item.date), 'd MMM', { locale: ru })),
    datasets
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
          precision: 0,
        },
      },
      y1: {
        beginAtZero: false,
        position: 'right',
        // Инвертируем ось для позиций (меньше = лучше)
        reverse: true,
        min: 0,
        max: 100,
        display: metrics.avg_position, // Показываем только если выбрана средняя позиция
        grid: {
          display: false,
        },
        ticks: {
          color: metricColors.avg_position.border,
          font: {
            size: 10,
          },
          padding: 8,
        },
      }
    },
    plugins: {
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
            return format(new Date(data[tooltipItems[0].dataIndex].date), 'd MMMM yyyy', { locale: ru });
          },
          label: (tooltipItem) => {
            const dataset = tooltipItem.dataset;
            let value = tooltipItem.raw;
            let label = dataset.label;
            
            if (label === 'CTR (%)') {
              return `${label}: ${value.toFixed(2)}%`;
            } else if (label === 'Средняя позиция') {
              return `${label}: ${value.toFixed(1)}`;
            }
            return `${label}: ${value.toLocaleString()}`;
          }
        }
      }
    }
  };

  return (
    <Box sx={{ position: 'relative', height: 230 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
}

export default TrafficChart;