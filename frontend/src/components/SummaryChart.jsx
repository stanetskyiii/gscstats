import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, Paper, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
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
import zoomPlugin from 'chartjs-plugin-zoom';

// Регистрируем компоненты ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

// Пользовательский плагин для сравнения периодов
const comparePeriodsPlugin = {
  id: 'comparePeriods',
  afterDraw: (chart) => {
    const { ctx, chartArea, scales } = chart;
    const { top, height } = chartArea;
    
    // Если есть данные о выделенном диапазоне
    if (chart.options.plugins.comparePeriods && chart.options.plugins.comparePeriods.selection) {
      const { startIndex, endIndex, comparing } = chart.options.plugins.comparePeriods.selection;
      
      // Если выделен диапазон
      if (startIndex !== null && endIndex !== null && comparing) {
        const startX = scales.x.getPixelForValue(startIndex);
        const endX = scales.x.getPixelForValue(endIndex);
        
        // Выделяем текущий диапазон
        ctx.save();
        ctx.fillStyle = 'rgba(66, 165, 245, 0.2)';
        ctx.fillRect(startX, top, endX - startX, height);
        ctx.strokeStyle = 'rgba(66, 165, 245, 0.8)';
        ctx.strokeRect(startX, top, endX - startX, height);
        
        // Вычисляем длину выделенного диапазона
        const rangeLength = endIndex - startIndex;
        
        // Вычисляем предыдущий диапазон такой же длины
        const prevStartIndex = Math.max(0, startIndex - rangeLength);
        const prevEndIndex = startIndex;
        
        // Выделяем предыдущий диапазон другим цветом
        const prevStartX = scales.x.getPixelForValue(prevStartIndex);
        const prevEndX = scales.x.getPixelForValue(prevEndIndex);
        
        ctx.fillStyle = 'rgba(244, 67, 54, 0.2)';
        ctx.fillRect(prevStartX, top, prevEndX - prevStartX, height);
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.8)';
        ctx.strokeRect(prevStartX, top, prevEndX - prevStartX, height);
        
        ctx.restore();
      }
    }
  }
};

ChartJS.register(comparePeriodsPlugin);

function SummaryChart({ data, metrics }) {
  const theme = useTheme();
  const chartRef = useRef(null);
  
  // Состояние для режима сравнения
  const [isComparing, setIsComparing] = useState(false);
  
  // Состояние для выделенного диапазона
  const [selection, setSelection] = useState({
    startIndex: null,
    endIndex: null,
    comparing: false
  });
  
  // Состояние для результатов сравнения
  const [comparison, setComparison] = useState(null);
  
  // Проверяем, есть ли данные
  const hasData = data && data.length > 0;
  
  // Используем useMemo для сортировки данных и получения уникальных дат
  const { summaryData } = useMemo(() => {
    if (!hasData) {
      return { summaryData: [] };
    }
    
    // Сортируем данные по дате для правильного отображения
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Группируем данные по датам и суммируем метрики
    const groupedByDate = sortedData.reduce((acc, item) => {
      const dateStr = item.date;
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          traffic_clicks: 0,
          impressions: 0,
          ctr: 0,
          avg_position: 0,
          domains: 0
        };
      }
      
      acc[dateStr].traffic_clicks += item.traffic_clicks || 0;
      acc[dateStr].impressions += item.impressions || 0;
      
      // Для CTR и avg_position считаем взвешенное среднее
      // Используем показы как вес для CTR и позиции
      if (item.impressions > 0) {
        acc[dateStr].ctr += (item.ctr || 0) * (item.impressions || 0);
        acc[dateStr].avg_position += (item.avg_position || 0) * (item.impressions || 0);
      }
      
      acc[dateStr].domains += 1;
      return acc;
    }, {});

    // Получаем уникальные даты в правильном порядке
    const dates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

    // Преобразуем объект обратно в массив и вычисляем средние значения для CTR и позиции
    const summary = dates.map(date => {
      const day = groupedByDate[date];
      if (day.impressions > 0) {
        day.ctr = day.ctr / day.impressions;
        day.avg_position = day.avg_position / day.impressions;
      } else {
        day.ctr = 0;
        day.avg_position = 0;
      }
      return day;
    });

    return { summaryData: summary };
  }, [data, hasData]);
  
  // Функция для расчета сравнения периодов
  const calculateComparison = (data, startIndex, endIndex) => {
    if (!data || startIndex === null || endIndex === null) return null;
    
    // Проверяем границы
    if (startIndex < 0 || endIndex >= data.length || startIndex >= endIndex) return null;
    
    // Вычисляем длину диапазона
    const rangeLength = endIndex - startIndex;
    
    // Определяем предыдущий диапазон
    const prevStartIndex = Math.max(0, startIndex - rangeLength);
    const prevEndIndex = startIndex;
    
    // Проверяем, что предыдущий диапазон существует
    if (prevStartIndex >= prevEndIndex) return null;
    
    // Вычисляем суммы и средние значения для выбранных метрик
    const result = {};
    
    Object.keys(metrics).forEach(metric => {
      if (metrics[metric]) {
        // Суммы для текущего периода
        let currentSum = 0;
        for (let i = startIndex; i < endIndex; i++) {
          currentSum += data[i][metric] || 0;
        }
        
        // Суммы для предыдущего периода
        let prevSum = 0;
        for (let i = prevStartIndex; i < prevEndIndex; i++) {
          prevSum += data[i][metric] || 0;
        }
        
        // Средние значения
        const currentAvg = (metric === 'avg_position' || metric === 'ctr') ? 
          currentSum / rangeLength : 
          currentSum;
        
        const prevAvg = (metric === 'avg_position' || metric === 'ctr') ? 
          prevSum / (prevEndIndex - prevStartIndex) : 
          prevSum;
        
        // Абсолютное изменение
        const absChange = currentAvg - prevAvg;
        
        // Процентное изменение
        let percentChange = 0;
        if (prevAvg !== 0) {
          percentChange = ((currentAvg - prevAvg) / prevAvg) * 100;
        } else if (currentAvg !== 0) {
          percentChange = 100; // Если предыдущее значение было 0, а текущее не 0
        }
        
        // Для позиции меньше = лучше
        let adjustedPercentChange = percentChange;
        if (metric === 'avg_position' && percentChange !== 0) {
          adjustedPercentChange = -percentChange;
        }
        
        result[metric] = {
          current: currentAvg,
          previous: prevAvg,
          absChange: absChange,
          percentChange: adjustedPercentChange
        };
      }
    });
    
    // Возвращаем даты начала и конца для обоих периодов
    const currentStartDate = data[startIndex].date;
    const currentEndDate = data[endIndex - 1].date;
    const prevStartDate = data[prevStartIndex].date;
    const prevEndDate = data[prevEndIndex - 1].date;
    
    return {
      metrics: result,
      currentPeriod: {
        start: currentStartDate,
        end: currentEndDate,
        days: rangeLength
      },
      previousPeriod: {
        start: prevStartDate,
        end: prevEndDate,
        days: prevEndIndex - prevStartIndex
      }
    };
  };
  
  // Расчет сравнения периодов по умолчанию (данные делим пополам)
  const periodComparison = useMemo(() => {
    // Если данных меньше 8, то нельзя сделать сравнение
    if (!summaryData || summaryData.length < 8) return null;
    
    // Обеспечиваем равное количество дней в обоих периодах
    const totalDays = summaryData.length;
    let midPoint = Math.floor(totalDays / 2);
    
    // Если нечетное количество дней, отбрасываем первый день
    const startIndex = totalDays % 2 !== 0 ? 1 : 0;
    
    const firstPeriod = summaryData.slice(startIndex, startIndex + midPoint);
    const secondPeriod = summaryData.slice(startIndex + midPoint);
    
    // Рассчитываем изменения по каждой метрике
    const changes = {};
    
    Object.keys(metrics).forEach(metric => {
      if (!metrics[metric]) return;
      
      // Суммируем значения для каждого периода
      let firstSum = 0;
      let secondSum = 0;
      
      firstPeriod.forEach(item => {
        firstSum += item[metric] || 0;
      });
      
      secondPeriod.forEach(item => {
        secondSum += item[metric] || 0;
      });
      
      // Рассчитываем средние значения только для CTR и позиции
      const firstValue = (metric === 'avg_position' || metric === 'ctr') ? 
        firstSum / firstPeriod.length : firstSum;
      
      const secondValue = (metric === 'avg_position' || metric === 'ctr') ? 
        secondSum / secondPeriod.length : secondSum;
      
      // Рассчитываем абсолютное изменение
      const absChange = secondValue - firstValue;
      
      // Рассчитываем процентное изменение
      let percentChange = 0;
      if (firstValue !== 0) {
        percentChange = ((secondValue - firstValue) / firstValue) * 100;
      } else if (secondValue !== 0) {
        percentChange = 100; // Если было 0, а стало что-то ненулевое
      }
      
      // Для средней позиции меньше = лучше, поэтому инвертируем процент
      let adjustedPercentChange = percentChange;
      if (metric === 'avg_position' && percentChange !== 0) {
        adjustedPercentChange = -percentChange;
      }
      
      changes[metric] = {
        firstPeriod: firstValue,
        secondPeriod: secondValue,
        absChange: absChange,
        percentChange: adjustedPercentChange
      };
    });
    
    return {
      firstPeriod: {
        start: firstPeriod[0].date,
        end: firstPeriod[firstPeriod.length - 1].date,
        days: firstPeriod.length
      },
      secondPeriod: {
        start: secondPeriod[0].date,
        end: secondPeriod[secondPeriod.length - 1].date,
        days: secondPeriod.length
      },
      changes
    };
  }, [summaryData, metrics]);
  
  // Форматирование процентного изменения
  const formatPercentChange = (change) => {
    if (change === 0) return '0%';
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };
  
  // Форматирование абсолютного изменения (для отображения +/- значений)
  const formatAbsChange = (change, metric) => {
    if (change === 0) return '0';
    
    // Форматируем в зависимости от метрики
    if (metric === 'ctr') {
      return `${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`;
    } else if (metric === 'avg_position') {
      return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
    } else {
      return `${change > 0 ? '+' : ''}${Math.round(change).toLocaleString()}`;
    }
  };
  
  // Получение цвета для отображения изменения
  const getChangeColor = (change, isPosition = false) => {
    // Для небольших изменений используем нейтральный цвет
    if (Math.abs(change) < 2) return 'text.secondary';
    
    // Для позиции логика обратная - уменьшение это хорошо
    if (isPosition) {
      return change > 0 ? 'success.main' : 'error.main';
    } else {
      return change > 0 ? 'success.main' : 'error.main';
    }
  };
  
  // Обработчик переключения режима сравнения
  const handleCompareToggle = () => {
    setIsComparing(!isComparing);
    // Сбрасываем выделение при выключении режима
    if (isComparing) {
      setSelection({
        startIndex: null,
        endIndex: null,
        comparing: false
      });
      setComparison(null);
    }
  };
  
  // React useEffect для обновления сравнения при изменении выделения
  useEffect(() => {
    if (selection.comparing && selection.startIndex !== null && selection.endIndex !== null) {
      const result = calculateComparison(summaryData, selection.startIndex, selection.endIndex);
      setComparison(result);
    } else {
      setComparison(null);
    }
  }, [selection, summaryData]);
  
  // Если данных нет, показываем placeholder
  if (!hasData) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Общая статистика
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

  // Создаем датасеты для выбранных метрик
  const datasets = Object.keys(metrics)
    .filter(metric => metrics[metric])
    .map(metric => ({
      label: metricLabels[metric],
      data: summaryData.map(item => {
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
    labels: summaryData.map(item => format(new Date(item.date), 'd MMM', { locale: ru })),
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
      title: {
        display: true,
        text: 'Общая статистика по всем доменам',
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
            return format(new Date(summaryData[tooltipItems[0].dataIndex].date), 'd MMMM yyyy', { locale: ru });
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
          },
          footer: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            const domains = summaryData[index].domains;
            return `Включено доменов: ${domains}`;
          }
        }
      },
      // Настройки для сравнения периодов
      comparePeriods: {
        selection: selection,
      },
      // Настройки для плагина zoom
      zoom: {
        pan: {
          enabled: isComparing,
          mode: 'x',
          overScaleMode: 'x',
        },
        zoom: {
          wheel: {
            enabled: false,
          },
          pinch: {
            enabled: false
          },
          drag: {
            enabled: isComparing,
            modifierKey: null, // Без клавиши-модификатора
            backgroundColor: 'rgba(66, 165, 245, 0.2)',
            borderColor: 'rgba(66, 165, 245, 0.8)',
            borderWidth: 1,
            drawTime: 'beforeDatasetsDraw',
            threshold: 10,
          },
          mode: 'x',
        },
      }
    },
    // Обработчики событий
    onClick: (event, elements, chart) => {
      if (!isComparing) return;
      
      // Если уже есть выделение, сбрасываем его
      if (selection.startIndex !== null && selection.endIndex !== null) {
        setSelection({
          startIndex: null,
          endIndex: null,
          comparing: false
        });
        return;
      }
      
      // Получаем индекс точки, по которой кликнули
      if (elements.length > 0) {
        const index = elements[0].index;
        // Выделяем небольшой диапазон вокруг точки (чтобы было удобнее потом регулировать)
        const rangeSize = Math.floor(summaryData.length / 8); // Примерно 1/8 от всего графика
        
        setSelection({
          startIndex: Math.max(0, index - Math.floor(rangeSize/2)), 
          endIndex: Math.min(summaryData.length - 1, index + Math.floor(rangeSize/2)),
          comparing: true
        });
      }
    },
    onZoomComplete: ({chart}) => {
      // Получаем новые границы данных после масштабирования
      const {min, max} = chart.scales.x;
      const startIndex = Math.round(min);
      const endIndex = Math.round(max);
      
      // Проверяем, что выделен достаточный диапазон
      if (endIndex - startIndex >= 2) {
        setSelection({
          startIndex,
          endIndex,
          comparing: true
        });
      }
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
      {/* Переключатель режима сравнения */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {isComparing ? 
            'Выделите диапазон для сравнения' : 
            periodComparison ? 
            `Сравнение периодов: ${format(new Date(periodComparison.firstPeriod.start), 'd MMM', { locale: ru })} - ${format(new Date(periodComparison.firstPeriod.end), 'd MMM', { locale: ru })} vs ${format(new Date(periodComparison.secondPeriod.start), 'd MMM', { locale: ru })} - ${format(new Date(periodComparison.secondPeriod.end), 'd MMM', { locale: ru })}` : 
            'Включите режим сравнения для анализа периодов'}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={isComparing ? 'compare' : 'normal'}
          onChange={() => handleCompareToggle()}
        >
          <ToggleButton value="compare" aria-label="режим сравнения">
            <CompareArrowsIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {/* График */}
      <Box sx={{ position: 'relative', height: 350 }}>
        <Line 
          ref={chartRef}
          data={chartData} 
          options={options} 
        />
      </Box>
      
      {/* Отображение результатов сравнения */}
      {comparison && (
        <Paper variant="outlined" sx={{ p: 1, mt: 1, fontSize: '0.875rem' }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Сравнение: {format(new Date(comparison.currentPeriod.start), 'd MMM', { locale: ru })} - {format(new Date(comparison.currentPeriod.end), 'd MMM', { locale: ru })} ({comparison.currentPeriod.days} дн.) vs {format(new Date(comparison.previousPeriod.start), 'd MMM', { locale: ru })} - {format(new Date(comparison.previousPeriod.end), 'd MMM', { locale: ru })} ({comparison.previousPeriod.days} дн.)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {Object.keys(comparison.metrics).map(metric => (
              <Box key={metric} sx={{ minWidth: '120px' }}>
                <Typography variant="caption" color="text.secondary">
                  {metricLabels[metric]}:
                </Typography>
                <Typography 
                  variant="body2" 
                  color={getChangeColor(comparison.metrics[metric].percentChange, metric === 'avg_position')}
                  fontWeight="bold"
                >
                  {formatAbsChange(comparison.metrics[metric].absChange, metric)} ({formatPercentChange(comparison.metrics[metric].percentChange)})
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
      
      {/* Отображение результатов автоматического сравнения (периоды делятся пополам) */}
      {!comparison && periodComparison && !isComparing && (
        <Paper variant="outlined" sx={{ p: 1, mt: 1, fontSize: '0.875rem' }}>
          <Typography variant="body2" gutterBottom>
            Сравнение периодов:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {Object.keys(periodComparison.changes)
              .filter(metric => metrics[metric])
              .map(metric => (
                <Box key={metric} sx={{ minWidth: '120px' }}>
                  <Typography variant="caption" color="text.secondary">
                    {metricLabels[metric]}:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color={getChangeColor(periodComparison.changes[metric].percentChange, metric === 'avg_position')}
                    fontWeight="bold"
                  >
                    {formatAbsChange(periodComparison.changes[metric].absChange, metric)} ({formatPercentChange(periodComparison.changes[metric].percentChange)})
                  </Typography>
                </Box>
              ))}
          </Box>
        </Paper>
      )}
    </Paper>
  );
}

export default SummaryChart;