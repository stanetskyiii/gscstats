import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Stack,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

function DateRangePicker({ onDateRangeChange, onRefresh }) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(subDays(new Date(), 2), 'yyyy-MM-dd'));

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
    
    // Вызываем функцию родительского компонента
    onDateRangeChange(startDate, endDate);
  };

  // Предустановленные диапазоны
  const setLastWeek = () => {
    const end = format(subDays(new Date(), 2), 'yyyy-MM-dd'); // до позавчера
    const start = format(subDays(new Date(end), 7), 'yyyy-MM-dd'); // неделя до этого
    
    setStartDate(start);
    setEndDate(end);
    
    // Важно - вызываем родительскую функцию!
    onDateRangeChange(start, end);
  };

  const setLastMonth = () => {
    const end = format(subDays(new Date(), 2), 'yyyy-MM-dd'); // до позавчера
    const start = format(subDays(new Date(end), 30), 'yyyy-MM-dd'); // месяц до этого
    
    setStartDate(start);
    setEndDate(end);
    
    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  const setLast3Months = () => {
    const end = format(subDays(new Date(), 2), 'yyyy-MM-dd'); // до позавчера
    const start = format(subMonths(new Date(end), 3), 'yyyy-MM-dd'); // 3 месяца до этого
    
    setStartDate(start);
    setEndDate(end);
    
    // Вызываем родительскую функцию
    onDateRangeChange(start, end);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(subDays(now, 2), 'yyyy-MM-dd'); // до позавчера, но не дальше конца месяца
    
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
          />
          <Button 
            variant="contained"
            size="small"
            onClick={handleApply}
            sx={{ ml: 1 }}
          >
            Применить
          </Button>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto', flexWrap: 'wrap' }}>
          <Tooltip title="Последние 7 дней">
            <Button 
              variant="outlined" 
              size="small" 
              onClick={setLastWeek}
            >
              7 дней
            </Button>
          </Tooltip>
          <Tooltip title="Последние 30 дней">
            <Button 
              variant="outlined" 
              size="small" 
              onClick={setLastMonth}
            >
              30 дней
            </Button>
          </Tooltip>
          <Tooltip title="Последние 3 месяца">
            <Button 
              variant="outlined" 
              size="small" 
              onClick={setLast3Months}
            >
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
            <IconButton 
              color="primary" 
              onClick={onRefresh}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
}

export default DateRangePicker;