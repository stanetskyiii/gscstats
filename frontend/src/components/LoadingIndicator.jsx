import React from 'react';
import { LinearProgress, Box, Typography, Paper, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function LoadingIndicator({ progress, message }) {
  // Функция для форматирования оставшегося времени из сообщения
  const extractTimeInfo = (message) => {
    if (!message) return null;
    
    // Ищем текст о времени в скобках
    const timeRegex = /\(осталось примерно (\d+) (сек|мин)\)/;
    const match = message.match(timeRegex);
    
    if (match) {
      const [fullMatch, time, unit] = match;
      return {
        time: parseInt(time),
        unit: unit,
        fullText: fullMatch
      };
    }
    
    return null;
  };
  
  // Извлекаем процент из сообщения, если он есть
  const extractProgressPercent = (message) => {
    if (!message) return null;
    
    const percentRegex = /: (\d+)%/;
    const match = message.match(percentRegex);
    
    if (match) {
      return parseInt(match[1]);
    }
    
    return null;
  };
  
  const timeInfo = extractTimeInfo(message);
  const messagePercent = extractProgressPercent(message);
  
  // Используем процент из сообщения, если он доступен, иначе используем переданный параметр progress
  const displayProgress = messagePercent !== null ? messagePercent : (progress !== undefined ? progress : 0);
  
  // Очищаем сообщение от технической информации для отображения
  const cleanMessage = message ? message.replace(/: \d+%.*/, '') : '';
  
  return (
    <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      <LinearProgress 
        variant={displayProgress > 0 ? "determinate" : "indeterminate"} 
        value={displayProgress} 
        color="primary"
        sx={{ height: 4 }}
      />
      {message && (
        <Paper
          elevation={3}
          sx={{ 
            position: 'fixed', 
            top: 10, 
            right: 10, 
            backgroundColor: 'background.paper',
            padding: '8px 16px',
            borderRadius: 2,
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {cleanMessage}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {displayProgress > 0 && (
              <Chip 
                size="small" 
                label={`${displayProgress}%`} 
                color="primary" 
                variant="outlined" 
                sx={{ mr: 1 }}
              />
            )}
            
            {timeInfo && (
              <Chip
                size="small"
                icon={<AccessTimeIcon fontSize="small" />}
                label={`${timeInfo.time} ${timeInfo.unit}`}
                variant="outlined"
                color="secondary"
              />
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default LoadingIndicator;