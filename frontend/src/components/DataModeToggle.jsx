import React from 'react';
import { 
  Box, 
  ToggleButtonGroup, 
  ToggleButton, 
  Typography,
  Paper
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LanguageIcon from '@mui/icons-material/Language';

/**
 * Компонент для переключения между режимами просмотра данных:
 * - По поисковой выдаче (доменам)
 * - По странам
 */
function DataModeToggle({ dataMode, onChange }) {
  const handleChange = (event, newValue) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1" fontWeight={500}>
          Режим анализа:
        </Typography>
        
        <ToggleButtonGroup
          value={dataMode}
          exclusive
          onChange={handleChange}
          aria-label="режим анализа данных"
          color="primary"
        >
          <ToggleButton value="domains" aria-label="По поисковой выдаче">
            <LanguageIcon sx={{ mr: 1 }} />
            По доменам
          </ToggleButton>
          <ToggleButton value="countries" aria-label="По странам">
            <PublicIcon sx={{ mr: 1 }} />
            По странам
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
}

export default DataModeToggle;