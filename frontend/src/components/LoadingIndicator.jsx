import React from 'react';
import { LinearProgress, Box, Typography } from '@mui/material';

function LoadingIndicator({ progress, message }) {
  return (
    <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      <LinearProgress 
        variant={progress !== undefined ? "determinate" : "indeterminate"} 
        value={progress} 
        color="primary"
      />
      {message && (
        <Typography 
          variant="caption" 
          component="div" 
          color="text.secondary"
          sx={{ 
            position: 'fixed', 
            top: 4, 
            right: 16, 
            backgroundColor: 'background.paper',
            padding: '2px 8px',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}

export default LoadingIndicator;