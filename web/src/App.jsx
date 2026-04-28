import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import ChatLayout from './screens/ChatLayout';
import ChatList from './screens/ChatList';
import ChatRoom from './screens/ChatRoom';
import Contacts from './screens/Contacts';
import Profile from './screens/Profile';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthScreen />} />
      <Route path="/" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>}>
        <Route index element={<ChatList />} />
        <Route path="chat/:channelId" element={<ChatRoom />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}