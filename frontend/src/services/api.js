import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create a robust Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for HTTP-only JWT cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Event target to broadcast global auth events (like forced logout)
export const authEventEmitter = new EventTarget();

// Request Interceptor: automatically append Authorization: Bearer <token>
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables for token refresh queuing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor for global error handling and silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const isLoginRoute = originalRequest.url === '/accounts/login/' || originalRequest.url.endsWith('/accounts/login/');
      const isRegisterRoute = originalRequest.url === '/accounts/register/' || originalRequest.url.endsWith('/accounts/register/');
      const isRefreshRoute = originalRequest.url === '/accounts/token/refresh/' || originalRequest.url.endsWith('/accounts/token/refresh/');
      
      // Don't intercept auth attempts
      if (isLoginRoute || isRegisterRoute || isRefreshRoute) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request new access token from backend using the HTTP-only refresh cookie
        const refreshResponse = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {}, { withCredentials: true });
        const newToken = refreshResponse.data.access;
        
        localStorage.setItem('access_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        authEventEmitter.dispatchEvent(new Event('unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
