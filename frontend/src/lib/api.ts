import axios, { InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://aeromeet-backend-fwjc.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response Interceptor: Catch 401 Token Expiry, trigger refresh or handle unauthorized redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized
    if (error.response && error.response.status === 401) {
      const isAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');

      // Check if error is 401 Unauthorized AND has not been retried yet
      if (
        error.response.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          if (typeof window !== 'undefined' && !isAuthPage) {
            window.location.href = '/auth';
          }
          return Promise.reject(error);
        }

        try {
          // Run refresh request directly against axios instance to avoid infinite loop
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          
          // Update credentials
          setTokens(accessToken, refreshToken);

          // Resume request queue
          processQueue(null, accessToken);
          isRefreshing = false;

          // Retry original request with updated access token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          clearTokens();
          if (typeof window !== 'undefined' && !isAuthPage) {
            window.location.href = '/auth';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // For any other 401 (invalid token, no token provided) or if it has already been retried
        clearTokens();
        if (typeof window !== 'undefined' && !isAuthPage) {
          window.location.href = '/auth';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;