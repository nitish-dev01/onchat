import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken = null;

api.setToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.put('/auth/me', data);

// Users
export const searchUsers = (query) => api.get('/users/search', { params: { q: query } });
export const getUser = (id) => api.get(`/users/${id}`);
export const getContacts = () => api.get('/users/');
export const addContact = (id) => api.post(`/users/contacts/${id}`);
export const removeContact = (id) => api.delete(`/users/contacts/${id}`);
export const blockUser = (id) => api.post(`/users/block/${id}`);
export const unblockUser = (id) => api.post(`/users/unblock/${id}`);
export const getBlockedUsers = () => api.get('/users/blocked');

// Channels
export const createChannel = (data) => api.post('/channels/', data);
export const getMyChannels = () => api.get('/channels/');
export const getChannel = (id) => api.get(`/channels/${id}`);
export const updateChannel = (id, data) => api.put(`/channels/${id}`, data);
export const deleteChannel = (id) => api.delete(`/channels/${id}`);
export const addMember = (channelId, userId) => api.post(`/channels/${channelId}/members/${userId}`);
export const removeMember = (channelId, userId) => api.delete(`/channels/${channelId}/members/${userId}`);
export const getChannelMembers = (channelId) => api.get(`/channels/${channelId}/members`);
export const createDirectChannel = (userId) => api.post(`/channels/direct/${userId}`);

// Messages
export const sendMessage = (data) => api.post('/messages/', data);
export const getChannelMessages = (channelId, page = 1, pageSize = 50) =>
  api.get(`/messages/channel/${channelId}`, { params: { page, page_size: pageSize } });
export const editMessage = (id, content) => api.put(`/messages/${id}`, { content });
export const deleteMessage = (id) => api.delete(`/messages/${id}`);
export const addReaction = (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji });
export const removeReaction = (messageId, emoji) => api.delete(`/messages/${messageId}/reactions/${emoji}`);
export const searchMessages = (query, channelId) =>
  api.post('/messages/search', { query, channel_id: channelId });

export default api;