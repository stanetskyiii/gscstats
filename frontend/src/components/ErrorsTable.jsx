import React from 'react';
import { 
  Box, 
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useTheme
} from '@mui/material';

// Функция для определения варианта чипа ошибки по типу
const getErrorVariant = (errorType) => {
  const errors = {
    // Серверные ошибки - красные
    'internalError': { color: 'error', label: 'Внутренняя ошибка' },
    'serverError': { color: 'error', label: 'Ошибка сервера' },
    'quotaExceeded': { color: 'error', label: 'Превышена квота' },
    'rateLimitExceeded': { color: 'error', label: 'Превышен лимит запросов' },
    
    // Клиентские ошибки - оранжевые
    'badRequest': { color: 'warning', label: 'Некорректный запрос' },
    'invalidParameter': { color: 'warning', label: 'Недопустимый параметр' },
    'invalidQuery': { color: 'warning', label: 'Недопустимый запрос' },
    'keyExpired': { color: 'warning', label: 'Истек ключ' },
    'unauthorized': { color: 'warning', label: 'Не авторизован' },
    'notFound': { color: 'warning', label: 'Не найдено' },
    'conflict': { color: 'warning', label: 'Конфликт' },
    'gone': { color: 'warning', label: 'Удалено' },
    'preconditionFailed': { color: 'warning', label: 'Условие не выполнено' },
    'requestEntityTooLarge': { color: 'warning', label: 'Запрос слишком большой' },
    'tooManyRequests': { color: 'warning', label: 'Слишком много запросов' },
    
    // Редиректы - синие
    'movedPermanently': { color: 'info', label: 'Перемещено навсегда' },
    'seeOther': { color: 'info', label: 'См. другой ресурс' },
    'notModified': { color: 'info', label: 'Не изменено' },
    'temporaryRedirect': { color: 'info', label: 'Временное перенаправление' }
  };
  
  return errors[errorType] || { color: 'default', label: errorType };
};

function ErrorsTable({ errors }) {
  const theme = useTheme();

  // Если данных нет, показываем сообщение
  if (!errors || errors.length === 0) {
    return (
      <Box sx={{ 
        height: 230, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'text.secondary',
        fontSize: '0.875rem'
      }}>
        Ошибок не обнаружено
      </Box>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: 230,
        boxShadow: 'none',
        backgroundColor: 'transparent'
      }}
    >
      <Table size="small" stickyHeader aria-label="таблица ошибок">
        <TableHead>
          <TableRow>
            <TableCell>Тип ошибки</TableCell>
            <TableCell align="right">Количество</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {errors.map((error, index) => {
            const errorVariant = getErrorVariant(error.error_type);
            
            return (
              <TableRow
                key={index}
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                <TableCell component="th" scope="row">
                  <Chip
                    size="small"
                    label={errorVariant.label}
                    color={errorVariant.color}
                    variant="outlined"
                    sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>
                    {error.count}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ErrorsTable;