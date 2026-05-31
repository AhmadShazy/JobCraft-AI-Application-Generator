import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for HTTP-only cookies
});

// Response interceptor for silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        if (window.handleAuthFailure) {
          window.handleAuthFailure();
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signupUser = async (email, password) => {
  const response = await api.post('/auth/signup', { email, password });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const verifySession = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};

// Profile Endpoints
export const normalizeProfile = async (data) => {
  const response = await api.post('/profile/normalize', data);
  return response.data;
};

export const saveProfile = async (profile) => {
  const response = await api.post('/profile/save', { profile });
  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await api.patch('/profile/update', payload);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/profile/me');
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const generateDocs = async (jd) => {
  const response = await api.post('/generate', { jd });
  return response.data;
};

export const answerQuestion = async (jd, question) => {
  const response = await api.post('/answer', { jd, question });
  return response.data;
};

export const getDownloadUrl = (filename) => {
  return `${API_BASE_URL}/download/${filename}`;
};

export default api;
