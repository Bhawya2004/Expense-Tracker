import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Live Render Production Backend URL
export const DEFAULT_API_URL = 'https://expense-tracker-lils.onrender.com/api';

export const getBaseURL = async () => {
  try {
    const customUrl = await AsyncStorage.getItem('custom_api_url');
    if (
      customUrl &&
      customUrl.trim().length > 0 &&
      !customUrl.includes('localhost') &&
      !customUrl.includes('10.0.2.2')
    ) {
      return customUrl.trim();
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_API_URL;
};

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to inject dynamic Base URL and JWT Authorization Header
api.interceptors.request.use(
  async (config) => {
    try {
      const activeBaseUrl = await getBaseURL();
      config.baseURL = activeBaseUrl;

      const token = await AsyncStorage.getItem('access');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Error reading tokens for request', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to auto-refresh expired JWT tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/token/')
    ) {
      originalRequest._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh');
        if (refresh) {
          const activeBaseUrl = await getBaseURL();
          const res = await axios.post(`${activeBaseUrl}/token/refresh/`, { refresh });
          if (res.data.access) {
            await AsyncStorage.setItem('access', res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.warn('Token refresh failed:', refreshErr);
        await AsyncStorage.multiRemove(['access', 'refresh', 'username']);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
