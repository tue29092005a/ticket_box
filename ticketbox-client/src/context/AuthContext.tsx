import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient from '../utils/axiosClient';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const accessToken = localStorage.getItem('access_token');
    const userEmail = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');

    if (accessToken && userEmail && userId) {
      setUser({ email: userEmail, id: userId });
    }
    setIsLoading(false);
  }, []);

  const handleAuth = async (endpoint: string, email: string, password?: string) => {
    try {
      const response = await axiosClient.post(endpoint, { email, password });
      const { accessToken, refreshToken } = response.data;
      
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const userId = payload.sub;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userId', userId);
      
      setUser({ email, id: userId });
    } catch (error) {
      console.error('Auth failed:', error);
      throw error;
    }
  };

  const login = (email: string, password?: string) => handleAuth('/auth/login', email, password);
  const register = (email: string, password?: string) => handleAuth('/auth/register', email, password);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('booking_expireAt');
    sessionStorage.removeItem('idempotency_key');
    setUser(null);
  };

  useEffect(() => {
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
