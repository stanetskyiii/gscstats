import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  isAfter,
  parseISO,
} from 'date-fns';

function DateRangePicker({
  onDateRangeChange,
  onRefresh,
  initialStartDate,
  initialEndDate,
  maxEndDate, // максимальная доступная дата (обычно вчера или последняя с данными)
}) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(
    initialStartDate || format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    initialEndDate || format(subDays(new Date(), 2), 'yyyy-MM-dd')
  );

  // Обновление при изменении начальных значений
  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate);
    }
    if (initialEndDate) {
      setEndDate(initialEndDate);
    }
  }, [initialStartDate, initialEndDate]);

  // Обработчик изменения начальной даты
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  // Обработчик изменения конечной даты
  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  // Обработчик применения диапазона дат
  const handleApply = () => {
    // Проверяем, что даты корректны
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Пожалуйста, выберите корректные даты');
      return;
    }

    if (start > end) {
      alert('Начальная дата не может быть позже конечной');
      return;
    }

    // Проверяем, что конечная дата не превышает максимальную
    if (maxEndDate && isAfter(end, parseISO(maxEndDate))) {
      const newEndDate = maxEndDate;
      setEndDate(newEndDate);

      // Вызываем функцию родительского компонента с корректированной датой
      onDateRangeChange(startDate, newEndDate);

      alert(
        `Конечная дата ограничена последней доступной датой (${maxEndDate})`
      );
      return;
    }

    // Вызываем функцию родительского компонента с правильными аргументами
    onDateRangeChange(startDate, endDate);
  };

  // Предустановленные диапазоны
  const setLastWeek = () => {
    // Определяем конечную дату как вчера или максимальную доступную
    const maxDate = maxEndDate ? new Date(maxEndDate) : subDays(new Date(), 2);
    const end = format(maxDate, 'yyyy-MM-dd');
    const start = format(subDays(new Date(end), 7), 'yyyy-MM-dd');

    setStartDate(start);
    setEndDate(end);

    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  const setLastMonth = () => {
    // Определяем конечную дату как вчера или максимальную доступную
    const maxDate = maxEndDate ? new Date(maxEndDate) : subDays(new Date(), 2);
    const end = format(maxDate, 'yyyy-MM-dd');
    const start = format(subDays(new Date(end), 30), 'yyyy-MM-dd');

    setStartDate(start);
    setEndDate(end);

    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  const setLast3Months = () => {
    // Определяем конечную дату как вчера или максимальную доступную
    const maxDate = maxEndDate ? new Date(maxEndDate) : subDays(new Date(), 2);
    const end = format(maxDate, 'yyyy-MM-dd');
    const start = format(subMonths(new Date(end), 3), 'yyyy-MM-dd');

    setStartDate(start);
    setEndDate(end);

    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');

    // Определяем конечную дату как вчера или максимальную доступную, но не дальше конца месяца
    const maxDate = maxEndDate ? new Date(maxEndDate) : subDays(now, 2);
    const end = format(maxDate, 'yyyy-MM-dd');

    setStartDate(start);
    setEndDate(end);

    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Stack spacing={1} direction="row" alignItems="center">
          <TextField
            label="Начальная дата"
            type="date"
            size="small"
            value={startDate}
            onChange={handleStartDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ width: 170 }}
          />
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
          <TextField
            label="Конечная дата"
            type="date"
            size="small"
            value={endDate}
            onChange={handleEndDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ width: 170 }}
            inputProps={{
              max: maxEndDate || undefined,
            }}
          />
          <Button variant="contained" size="small" onClick={handleApply} sx={{ ml: 1 }}>
            Применить
          </Button>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto', flexWrap: 'wrap' }}>
          <Tooltip title="Последние 7 дней">
            <Button variant="outlined" size="small" onClick={setLastWeek}>
              7 дней
            </Button>
          </Tooltip>
          <Tooltip title="Последние 30 дней">
            <Button variant="outlined" size="small" onClick={setLastMonth}>
              30 дней
            </Button>
          </Tooltip>
          <Tooltip title="Последние 3 месяца">
            <Button variant="outlined" size="small" onClick={setLast3Months}>
              3 мес
            </Button>
          </Tooltip>
          <Tooltip title="Текущий месяц">
            <Button
              variant="outlined"
              size="small"
              onClick={setCurrentMonth}
              startIcon={<TodayIcon fontSize="small" />}
            >
              Текущий месяц
            </Button>
          </Tooltip>
          <Tooltip title="Обновить данные">
            <IconButton color="primary" onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
}

export default DateRangePicker;
