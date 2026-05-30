import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const generateDocs = async (jd, companyName) => {
  const response = await api.post('/generate', {
    jd,
    company_name: companyName,
  });
  return response.data;
};

export const answerQuestion = async (jd, question) => {
  const response = await api.post('/answer', {
    jd,
    question,
  });
  return response.data;
};

export const getDownloadUrl = (filename) => {
  return `${API_BASE_URL}/download/${filename}`;
};

export default api;
