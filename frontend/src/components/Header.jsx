import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  Tooltip,
  Button,
  useTheme
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';

function Header({ toggleTheme, themeMode, onLogout }) {
  const theme = useTheme();

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Box display="flex" alignItems="center" mr={1}>
          <SearchIcon sx={{ mr: 1 }} />
        </Box>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          GSC Stats Dashboard
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title={`Переключить на ${themeMode === 'light' ? 'темную' : 'светлую'} тему`}>
          <IconButton 
            onClick={toggleTheme} 
            color="inherit"
          >
            {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Выйти">
          <IconButton 
            color="inherit"
            onClick={onLogout}
            sx={{ ml: 1 }}
          >
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}

export default Header;