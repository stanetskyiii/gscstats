import React, { useState, useEffect, useContext } from 'react';
import { Box, Alert, Paper, Typography, Stack } from '@mui/material';
import { subDays, subMonths, format, isAfter, parseISO } from 'date-fns';

import DataModeToggle from './DataModeToggle';
import DomainDashboard from './DomainDashboard';
import CountryDashboard from './CountryDashboard';
import UpdateData from './UpdateData';
import { getAllDomainsLastDates } from '../services/api';
import { LoadingContext } from '../App';

/**
 * Главный компонент Dashboard, который переключается между
 * режимами просмотра данных по доменам и странам
 */
function Dashboard() {
  const { setGlobalLoading, setLoadingMessage } = useContext(LoadingContext);

  // Режим отображения данных (domains или countries)
  const [dataMode, setDataMode] = useState('domains');

  // Диапазон дат (по умолчанию за 3 месяца)
  const today = new Date();
  const yesterday = subDays(today, 1);

  // Параметры для отображения данных
  const [dateParams, setDateParams] = useState({
    startDate: format(subMonths(yesterday, 3), 'yyyy-MM-dd'),
    endDate: format(yesterday, 'yyyy-MM-dd'),
    lastAvailableDate: format(yesterday, 'yyyy-MM-dd'),
  });

  // Состояние для сообщений и ошибок
  const [message, setMessage] = useState(null);

  // Обработчик изменения режима данных
  const handleDataModeChange = (mode) => {
    setDataMode(mode);
  };

  // Обработчик изменения диапазона дат
  const handleDateRangeChange = (start, end) => {
    // Проверяем, что конечная дата не превышает последнюю доступную дату
    let endDate = end;
    if (isAfter(parseISO(end), parseISO(dateParams.lastAvailableDate))) {
      endDate = dateParams.lastAvailableDate;
      setMessage({
        type: 'warning',
        text: `Конечная дата ограничена последней доступной датой (${dateParams.lastAvailableDate}).`,
      });
    } else {
      setMessage(null);
    }

    setDateParams((prevParams) => ({
      ...prevParams,
      startDate: start,
      endDate: endDate,
    }));
  };

  // Получение последней доступной даты
  const fetchLastAvailableDate = async () => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Определение последней доступной даты...');

      const result = await getAllDomainsLastDates();

      if (result && result.latest_date) {
        const lastDate = result.latest_date;

        // Устанавливаем последнюю доступную дату
        setDateParams((prevParams) => {
          // Проверяем, не выходит ли текущая конечная дата за пределы последней доступной
          let endDate = prevParams.endDate;
          if (isAfter(parseISO(endDate), parseISO(lastDate))) {
            endDate = lastDate;
            setMessage({
              type: 'info',
              text: `Конечная дата автоматически установлена на последнюю доступную дату (${lastDate}).`,
            });
          }

          return {
            ...prevParams,
            endDate: endDate,
            lastAvailableDate: lastDate,
          };
        });
      }
    } catch (error) {
      console.error('Error fetching last available date:', error);
      setMessage({
        type: 'error',
        text: 'Не удалось определить последнюю доступную дату. Используются значения по умолчанию.',
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // При первом рендере
	useEffect(() => {
	  fetchLastAvailableDate();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

  // Обработчик обновления данных после ручного обновления
  const handleUpdateComplete = () => {
    fetchLastAvailableDate();
  };

  return (
    <Box>
      {/* Информационные сообщения */}
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Кнопка обновления данных и переключатель режима */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <DataModeToggle dataMode={dataMode} onChange={handleDataModeChange} />
          <UpdateData onComplete={handleUpdateComplete} />
        </Stack>
      </Paper>

      {/* Показываем соответствующий дашборд в зависимости от режима */}
      {dataMode === 'domains' ? (
        <DomainDashboard
          startDate={dateParams.startDate}
          endDate={dateParams.endDate}
          lastAvailableDate={dateParams.lastAvailableDate}
          onDateRangeChange={handleDateRangeChange}
        />
      ) : (
        <CountryDashboard
          startDate={dateParams.startDate}
          endDate={dateParams.endDate}
          lastAvailableDate={dateParams.lastAvailableDate}
          onDateRangeChange={handleDateRangeChange}
        />
      )}
    </Box>
  );
}

export default Dashboard;
