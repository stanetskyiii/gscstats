import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Регистрируем компоненты ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function IndexationChart({ data }) {
  const theme = useTheme();

  // Если данных нет, показываем placeholder
  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          height: 230,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'text.secondary',
          fontSize: '0.875rem',
        }}
      >
        Нет данных для отображения
      </Box>
    );
  }

  // Подготавливаем данные для графика
  const chartData = {
    labels: data.map((item) =>
      format(new Date(item.date), 'd MMM', { locale: ru })
    ),
    datasets: [
      {
        label: 'В индексе',
        data: data.map((item) => item.pages_indexed),
        backgroundColor: theme.palette.success.main,
        borderColor: theme.palette.success.main,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        label: 'Не проиндексировано',
        data: data.map((item) => item.pages_not_indexed),
        backgroundColor: theme.palette.error.main,
        borderColor: theme.palette.error.main,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  };

  // Опции графика
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 10,
          },
          maxRotation: 0,
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        grid: {
          color:
            theme.palette.mode === 'dark'
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
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          useBorderRadius: true,
          font: {
            size: 11,
          },
          color: theme.palette.text.secondary,
        },
      },
      tooltip: {
        backgroundColor:
          theme.palette.mode === 'dark'
            ? 'rgba(0, 0, 0, 0.8)'
            : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
        usePointStyle: true,
        callbacks: {
          title: (tooltipItems) => {
            return format(
              new Date(data[tooltipItems[0].dataIndex].date),
              'd MMMM yyyy',
              { locale: ru }
            );
          },
        },
      },
    },
  };

  return (
    <Box sx={{ position: 'relative', height: 230 }}>
      <Bar data={chartData} options={options} />
    </Box>
  );
}

export default IndexationChart;
