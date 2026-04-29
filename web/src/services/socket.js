import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

let socket = null;
const listeners = {};

export const connect = (token) => {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { user_id: parseToken(token) },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  socket.on('new_message', (data) => notifyListeners('new_message', data));
  socket.on('user_online', (data) => notifyListeners('user_online', data));
  socket.on('user_offline', (data) => notifyListeners('user_offline', data));
  socket.on('user_typing', (data) => notifyListeners('user_typing', data));
  socket.on('messages_read', (data) => notifyListeners('messages_read', data));
  socket.on('user_joined', (data) => notifyListeners('user_joined', data));
  socket.on('user_left', (data) => notifyListeners('user_left', data));
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinChannel = (channelId) => {
  socket?.emit('join_channel', { channel_id: channelId });
};

export const leaveChannel = (channelId) => {
  socket?.emit('leave_channel', { channel_id: channelId });
};

export const sendSocketMessage = (channelId, message) => {
  socket?.emit('send_message', { channel_id: channelId, message });
};

export const startTyping = (channelId) => {
  socket?.emit('typing_start', { channel_id: channelId });
};

export const stopTyping = (channelId) => {
  socket?.emit('typing_stop', { channel_id: channelId });
};

export const markRead = (channelId, messageIds) => {
  socket?.emit('read_messages', { channel_id: channelId, message_ids: messageIds });
};

export const addListener = (event, callback) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
};

export const removeListener = (event, callback) => {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }
};

const notifyListeners = (event, data) => {
  listeners[event]?.forEach(callback => callback(data));
};

const parseToken = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).sub;
  } catch {
    return null;
  }
};

export default { connect, disconnect, joinChannel, leaveChannel, sendSocketMessage, startTyping, stopTyping, markRead, addListener, removeListener };