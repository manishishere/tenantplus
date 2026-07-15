import { createContext, useState, useEffect, useContext } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in via HTTP-only cookie
  const checkAuth = async () => {
    try {
      const data = await apiFetch('/api/accounts/profile/');
      setUser(data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      await apiFetch('/api/accounts/login/', {
        method: 'POST',
        body: { email, password },
      });
      // After successful login, fetch user profile
      await checkAuth();
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/accounts/logout/', { method: 'POST' });
    } catch (error) {
      // Even if logout fails on server, we clear local state
      console.error("Logout error", error);
    }
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
