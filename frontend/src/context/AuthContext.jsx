import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api, { authEventEmitter } from '../services/api';
import { parseApiError } from '../utils/errorUtils';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} role - e.g., 'landlord', 'tenant', 'admin'
 */

/**
 * @typedef {Object} AuthContextType
 * @property {User|null} user - The authenticated user or null
 * @property {boolean} isInitializing - True during the initial profile check on mount
 * @property {boolean} isLoading - True during active auth requests (login/logout)
 * @property {function(string, string): Promise<{success: boolean, error?: string}>} login
 * @property {function(): Promise<void>} logout
 */

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // Distinguish between the initial load vs a user-initiated load
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/accounts/profile/');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Run on mount and poll periodically for live status updates (e.g. KYC approval)
  useEffect(() => {
    checkAuth();
    const interval = setInterval(() => {
      const token = localStorage.getItem('access_token');
      if (token) {
        checkAuth();
      }
    }, 15000); // 15s live sync interval
    return () => clearInterval(interval);
  }, [checkAuth]);

  // Listen for global 401s to force logout
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('access_token');
      setUser(null);
      setIsInitializing(false);
      setIsLoading(false);
    };

    authEventEmitter.addEventListener('unauthorized', handleUnauthorized);
    return () => authEventEmitter.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  /**
   * Attempts to login and refetches profile
   */
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/accounts/login/', { email, password });
      const token = response.data.tokens?.access;
      if (token) {
        localStorage.setItem('access_token', token);
      }
      await checkAuth(); // sets user state
      return { success: true };
    } catch (error) {
      const message = parseApiError(error, 'Failed to login. Please check your credentials.');
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logs out the user via backend and clears local state
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/accounts/logout/');
    } catch (error) {
      console.error('Failed to logout cleanly from backend', error);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
      setIsLoading(false);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isInitializing,
    isLoading,
    login,
    logout,
    checkAuth,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
