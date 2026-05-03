import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const isFullUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
const isRelativePath = (value) => typeof value === 'string' && value.startsWith('/');

const API_URL = (() => {
  if (rawApiUrl) {
    if (isFullUrl(rawApiUrl)) {
      return rawApiUrl;
    }
    if (isRelativePath(rawApiUrl)) {
      return `${window.location.origin}${rawApiUrl}`;
    }

    console.error(
      'Invalid VITE_API_URL. Use either a full URL like https://your-railway-app.railway.app/api/v1 or a relative path like /api/v1 when frontend and backend share the same origin.'
    );
    return 'http://localhost:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
})();

console.log('API_URL:', API_URL); // Debug log

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const parseResponse = (request) => request.then((response) => response.data);

let authToken = null;

// Initialize token from localStorage if it exists
const initToken = localStorage.getItem('token');
if (initToken && initToken !== 'undefined') {
  api.defaults.headers.common['Authorization'] = `Bearer ${initToken}`;
  authToken = initToken;
}

api.setToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Add response interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => parseResponse(api.post('/auth/login', { email, password }));
export const register = (data) => parseResponse(api.post('/auth/register', data));
export const getMe = () => parseResponse(api.get('/auth/me'));
export const updateMe = (data) => parseResponse(api.put('/auth/me', data));

// Users
export const searchUsers = (query) => parseResponse(api.get('/users/search', { params: { q: query } }));
export const getUser = (id) => parseResponse(api.get(`/users/${id}`));
export const getContacts = () => parseResponse(api.get('/users/'));
export const addContact = (id) => parseResponse(api.post(`/users/contacts/${id}`));
export const removeContact = (id) => parseResponse(api.delete(`/users/contacts/${id}`));
export const blockUser = (id) => parseResponse(api.post(`/users/block/${id}`));
export const unblockUser = (id) => parseResponse(api.post(`/users/unblock/${id}`));
export const getBlockedUsers = () => parseResponse(api.get('/users/blocked'));

// Channels
export const createChannel = (data) => parseResponse(api.post('/channels/', data));
export const getMyChannels = () => parseResponse(api.get('/channels/'));
export const getChannel = (id) => parseResponse(api.get(`/channels/${id}`));
export const updateChannel = (id, data) => parseResponse(api.put(`/channels/${id}`, data));
export const deleteChannel = (id) => parseResponse(api.delete(`/channels/${id}`));
export const addMember = (channelId, userId) => parseResponse(api.post(`/channels/${channelId}/members/${userId}`));
export const removeMember = (channelId, userId) => parseResponse(api.delete(`/channels/${channelId}/members/${userId}`));
export const getChannelMembers = (channelId) => parseResponse(api.get(`/channels/${channelId}/members`));
export const createDirectChannel = (userId) => parseResponse(api.post(`/channels/direct/${userId}`));

// Messages
export const sendMessage = (data) => parseResponse(api.post('/messages/', data));
export const getChannelMessages = (channelId, page = 1, pageSize = 50) =>
  parseResponse(api.get(`/messages/channel/${channelId}`, { params: { page, page_size: pageSize } }));
export const editMessage = (id, content) => parseResponse(api.put(`/messages/${id}`, { content }));
export const deleteMessage = (id) => parseResponse(api.delete(`/messages/${id}`));
export const addReaction = (messageId, emoji) => parseResponse(api.post(`/messages/${messageId}/reactions`, { emoji }));
export const removeReaction = (messageId, emoji) => parseResponse(api.delete(`/messages/${messageId}/reactions/${emoji}`));
export const searchMessages = (query, channelId) =>
  parseResponse(api.post('/messages/search', { query, channel_id: channelId }));

export default api;