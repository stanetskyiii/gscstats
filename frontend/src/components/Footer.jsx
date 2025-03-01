import React from 'react';
import { Box, Typography, Container, Link, useTheme } from '@mui/material';

function Footer() {
  const theme = useTheme();
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.grey[200] 
          : theme.palette.grey[900],
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          © {year} GSC Stats Dashboard • Alvadi Group
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
          <Link color="inherit" href="#" underline="hover">
            Техническая поддержка
          </Link>
          {' | '}
          <Link color="inherit" href="#" underline="hover">
            Документация
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;