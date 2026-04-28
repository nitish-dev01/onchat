import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ActivityIndicator } from 'react-native';

import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChannelScreen from './src/screens/ChannelScreen';
import api from './src/services/api';
import socket from './src/services/socket';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ChatListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="Channel" component={ChannelScreen} options={{ title: 'Channel' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Chats" component={ChatListStack} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        api.setToken(storedToken);
        const userData = await api.get('/auth/me');
        setUser(userData);
        setToken(storedToken);
        socket.connect(storedToken);
      }
    } catch (error) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (authToken, userData) => {
    await AsyncStorage.setItem('token', authToken);
    api.setToken(authToken);
    socket.connect(authToken);
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    socket.disconnect();
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <MainTabs />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}