import axios from 'axios';

// Match the documented local FastAPI port. Deployments can override this with
// VITE_API_URL at build time.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    const isAuthRequest = originalRequest.url && (
      originalRequest.url.endsWith('/auth/login') ||
      originalRequest.url.endsWith('/auth/signup') ||
      originalRequest.url.endsWith('/auth/refresh')
    );
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !isAuthRequest
    ) {
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

export const generateDocs = async (jd, companyName = '') => {
  const response = await api.post('/generate', { jd, company_name: companyName });
  return response.data;
};

export const answerQuestion = async (jd, question) => {
  const response = await api.post('/answer', { jd, question });
  return response.data;
};

export const getDownloadUrl = (filename) => {
  return `${API_BASE_URL}/download/${filename}`;
};

// Download a generated document through axios (so it carries the auth cookie and
// the silent-refresh interceptor, and works whether the API is same-origin or
// cross-site). Throws on 403/404/etc. so the caller can surface an error toast,
// unlike the old hidden-iframe approach which failed silently.
export const downloadDocument = async (url) => {
  const response = await api.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : url.split('/').pop() || 'document.docx';

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
  return filename;
};

export const sendVerificationEmail = async () => {
  const response = await api.post('/auth/send-verification');
  return response.data;
};

export const verifyEmailToken = async (token) => {
  const response = await api.get(`/auth/verify-email?token=${token}`);
  return response.data;
};

// Password reset
export const requestPasswordReset = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

// Device / session management
export const listSessions = async () => {
  const response = await api.get('/auth/sessions');
  return response.data;
};

export const revokeSession = async (sid) => {
  const response = await api.delete(`/auth/sessions/${sid}`);
  return response.data;
};

export const revokeOtherSessions = async () => {
  const response = await api.post('/auth/sessions/revoke-others');
  return response.data;
};

export default api;
