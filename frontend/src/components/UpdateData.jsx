import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LoadingContext } from '../App';
import { updateDatabaseData, getUpdateStatus } from '../services/api';

/**
 * Компонент для обновления данных в базе данных
 * 
 * @param {Function} onComplete - Функция, вызываемая после завершения обновления
 * @param {string} buttonVariant - Вариант кнопки ('contained', 'outlined', 'text')
 * @param {string} buttonLabel - Текст на кнопке
 * @param {boolean} showButton - Показывать ли кнопку для запуска обновления
 * @param {boolean} autoStart - Автоматически запускать обновление при открытии диалога
 */
function UpdateData({
  onComplete,
  buttonVariant = 'contained',
  buttonLabel = 'Обновить данные',
  showButton = true,
  autoStart = false,
}) {
  const { setGlobalLoading, setLoadingMessage } = useContext(LoadingContext);

  // Состояния
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Открытие диалога
  const handleClickOpen = () => {
    setOpen(true);
    setError(null);
    setStatus(null);
  };

  // Закрытие диалога
  const handleClose = () => {
    if (!updating) {
      setOpen(false);
      // Если обновление было завершено, вызываем функцию onComplete
      if (status && (status.status === 'completed' || status.status === 'error')) {
        if (onComplete) onComplete();
      }

      // Очищаем интервал при закрытии
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Сбрасываем состояния
      setStatus(null);
      setError(null);
    }
  };

  // Начать обновление данных
  const startUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);

      // Вызываем API для начала обновления данных
      const response = await updateDatabaseData();

      if (response.status === 'started') {
        // Запускаем периодический опрос статуса
        const interval = setInterval(fetchUpdateStatus, 2000); // Каждые 2 секунды
        setPollingInterval(interval);
      } else {
        setError('Не удалось запустить обновление данных');
        setUpdating(false);
      }
    } catch (error) {
      console.error('Error starting update:', error);
      setError('Ошибка при запуске обновления данных: ' + (error.message || 'Неизвестная ошибка'));
      setUpdating(false);
    }
  };

  // Получить текущий статус обновления
  const fetchUpdateStatus = async () => {
    try {
      const response = await getUpdateStatus();
      setStatus(response);

      // Если обновление завершено или произошла ошибка - останавливаем опрос
      if (response.status === 'completed' || response.status === 'error') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setUpdating(false);
      }
    } catch (error) {
      console.error('Error fetching update status:', error);
      // Если не удалось получить статус, останавливаем опрос
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setError('Ошибка при получении статуса обновления');
      setUpdating(false);
    }
  };

  // Получение статуса в виде текста
  const getStatusText = useCallback(() => {
    if (!status) return 'Ожидание';

    switch (status.status) {
      case 'running':
        return `Обновление данных: домен ${status.current_domain} (${status.domains_processed}/${status.domains_total})`;
      case 'updating_countries':
        return `Обновление данных по странам: ${status.current_domain} (${status.domains_processed}/${status.domains_total})`;
      case 'completed':
        return 'Обновление завершено успешно';
      case 'error':
        return 'Ошибка при обновлении данных';
      case 'idle':
        return 'Готов к обновлению';
      default:
        return 'Неизвестный статус';
    }
  }, [status]);

  // Форматирование даты для отображения
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    } catch (error) {
      return dateString;
    }
  };

  // Получение цвета статуса
  const getStatusColor = () => {
    if (!status) return 'info';

    switch (status.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
      case 'updating_countries':
        return 'primary';
      default:
        return 'info';
    }
  };

  // Получение иконки статуса
  const getStatusIcon = () => {
    if (!status) return <InfoIcon />;

    switch (status.status) {
      case 'completed':
        return <CheckCircleOutlineIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'running':
      case 'updating_countries':
        return <RefreshIcon color="primary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Автоматическое открытие диалога и запуск обновления
  useEffect(() => {
    if (!showButton) {
      setOpen(true);

      if (autoStart) {
        // Небольшая задержка перед стартом
        const timer = setTimeout(() => {
          startUpdate();
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [showButton, autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showButton && (
        <Tooltip title="Обновить данные из Google Search Console">
          <Button
            variant={buttonVariant}
            onClick={handleClickOpen}
            startIcon={<UpdateIcon />}
            size="medium"
          >
            {buttonLabel}
          </Button>
        </Tooltip>
      )}

      <Dialog open={open} onClose={updating ? undefined : handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              Обновление данных
            </Typography>
            {!updating && (
              <IconButton onClick={handleClose} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {getStatusIcon()}
              <Typography variant="body1">{getStatusText()}</Typography>
            </Stack>

            {status &&
              (status.status === 'running' || status.status === 'updating_countries') && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={status.progress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {status.domains_processed} из {status.domains_total} доменов
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.progress}%
                    </Typography>
                  </Box>

                  {status.current_date && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Текущая дата: {formatDate(status.current_date)}
                    </Typography>
                  )}
                </Box>
              )}
          </Box>

          {status && status.errors && status.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Ошибки ({status.errors.length}):
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                <List dense>
                  {status.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          <DialogContentText sx={{ mt: 3 }}>
            {!status || status.status === 'idle'
              ? "Нажмите 'Начать обновление' для загрузки новых данных из Google Search Console."
              : status.status === 'completed'
              ? 'Обновление завершено. Данные успешно загружены в базу данных.'
              : status.status === 'error'
              ? 'Во время обновления произошли ошибки. Проверьте лог ошибок.'
              : 'Пожалуйста, подождите, идет обновление данных...'}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          {(!status || status.status === 'idle') && !updating && (
            <Button
              onClick={startUpdate}
              variant="contained"
              color="primary"
              startIcon={<UpdateIcon />}
            >
              Начать обновление
            </Button>
          )}

          {updating && (
            <Button disabled>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Обновление...
            </Button>
          )}

          {!updating && (
            <Button onClick={handleClose} color="inherit">
              {status && status.status === 'completed' ? 'Закрыть' : 'Отмена'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

export default UpdateData;
