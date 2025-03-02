import React from 'react';
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Tooltip,
} from '@mui/material';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PercentIcon from '@mui/icons-material/Percent';
import SwapVertIcon from '@mui/icons-material/SwapVert';

function MetricsToggle({ metrics, onChange }) {
  // Обработчик изменения выбранных метрик
  const handleChange = (event, newMetrics) => {
    // Не позволяем отключить все метрики сразу
    if (newMetrics.length === 0) return;

    // Создаем новый объект состояния метрик
    const updatedMetrics = {
      traffic_clicks: newMetrics.includes('traffic_clicks'),
      impressions: newMetrics.includes('impressions'),
      ctr: newMetrics.includes('ctr'),
      avg_position: newMetrics.includes('avg_position'),
    };

    onChange(updatedMetrics);
  };

  // Формируем массив активных метрик
  const activeMetrics = Object.keys(metrics).filter((key) => metrics[key]);

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body1" sx={{ mr: 2, fontWeight: 500 }}>
          Показатели:
        </Typography>

        <ToggleButtonGroup value={activeMetrics} onChange={handleChange} aria-label="метрики" size="small">
          <Tooltip title="Клики">
            <ToggleButton value="traffic_clicks" aria-label="клики">
              <TouchAppIcon fontSize="small" sx={{ mr: 0.5 }} />
              Клики
            </ToggleButton>
          </Tooltip>

          <Tooltip title="Показы">
            <ToggleButton value="impressions" aria-label="показы">
              <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
              Показы
            </ToggleButton>
          </Tooltip>

          <Tooltip title="CTR (процент кликов)">
            <ToggleButton value="ctr" aria-label="ctr">
              <PercentIcon fontSize="small" sx={{ mr: 0.5 }} />
              CTR
            </ToggleButton>
          </Tooltip>

          <Tooltip title="Средняя позиция">
            <ToggleButton value="avg_position" aria-label="средняя позиция">
              <SwapVertIcon fontSize="small" sx={{ mr: 0.5 }} />
              Позиция
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
}

export default MetricsToggle;
