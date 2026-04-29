import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setToken(token);
      // User data is stored in localStorage after login
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      socket.connect(token);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.access_token);
    api.setToken(response.data.access_token);
    setToken(response.data.access_token);

    // Fetch user data after login
    const userResponse = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(userResponse.data));
    setUser(userResponse.data);
    socket.connect(response.data.access_token);
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    localStorage.setItem('token', response.data.access_token);
    api.setToken(response.data.access_token);
    setToken(response.data.access_token);

    // Fetch user data after register
    const userResponse = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(userResponse.data));
    setUser(userResponse.data);
    socket.connect(response.data.access_token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}