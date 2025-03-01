import React, { useState, useEffect, createContext } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import LoadingIndicator from './components/LoadingIndicator';

// Создаем контекст для индикатора загрузки
export const LoadingContext = createContext({
  setGlobalLoading: () => {},
  setLoadingMessage: () => {}
});

// Создаем светлую тему
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#fff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.8rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  },
});

// Создаем темную тему
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
  },
});

function App() {
  // Состояние для переключения темы
  const [themeMode, setThemeMode] = useState('light');
  // Состояние для проверки авторизации
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Состояние для глобального индикатора загрузки
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Проверяем, есть ли сохраненная аутентификация
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Обработчик успешной авторизации
  const handleLogin = (status) => {
    setIsAuthenticated(status);
    localStorage.setItem('isAuthenticated', 'true');
  };

  // Обработчик выхода из системы
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('password');
  };
  
  // Функция для переключения темы
  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Выбираем тему на основе текущего состояния
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <LoadingContext.Provider value={{ setGlobalLoading, setLoadingMessage }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalLoading && <LoadingIndicator message={loadingMessage} />}
        {!isAuthenticated ? (
          <Login onLogin={handleLogin} />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh',
          }}>
            <Header 
              toggleTheme={toggleTheme} 
              themeMode={themeMode} 
              onLogout={handleLogout}
            />
            <Container maxWidth="xl" style={{ flex: 1, paddingTop: '2rem', paddingBottom: '2rem' }}>
              <Dashboard />
            </Container>
            <Footer />
          </div>
        )}
      </ThemeProvider>
    </LoadingContext.Provider>
  );
}

export default App;