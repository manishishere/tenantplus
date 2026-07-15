import axios from 'axios';

// Create a robust Axios instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Crucial for HTTP-only JWT cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Event target to broadcast global auth events (like forced logout)
export const authEventEmitter = new EventTarget();

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    return response;
  },
  (error) => {
    // If we receive a 401 Unauthorized, and it's not the login route
    // we broadcast a logout event so the context can clean up.
    if (error.response && error.response.status === 401) {
      const isLoginRoute = error.config.url === '/accounts/login/' || error.config.url.endsWith('login/');
      if (!isLoginRoute) {
        authEventEmitter.dispatchEvent(new Event('unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
