import axios from 'axios';

// Replace with your actual production backend URL
// For local development with Android Emulator, use 10.0.2.2 instead of localhost
export const API_BASE_URL = 'https://feastfleet-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDashboardOverview = async (uid) => {
  const response = await api.post('/dashboard/overview', { uid });
  return response.data;
};

export default api;
