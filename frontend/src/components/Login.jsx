import React, { useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { checkAuth } from '../services/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Сохраняем учётные данные для использования в api.js
      localStorage.setItem('username', username);
      localStorage.setItem('password', password);
      
      // Проверяем авторизацию
      const isAuthenticated = await checkAuth();
      
      if (isAuthenticated) {
        onLogin(true);
      } else {
        setError('Неверное имя пользователя или пароль');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
      }
    } catch (error) {
      setError('Ошибка при попытке входа. Проверьте соединение с сервером.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          GSC Stats Dashboard
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          Панель мониторинга данных из Google Search Console
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
          <TextField
            label="Имя пользователя"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          
          <TextField
            label="Пароль"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Войти'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Login;