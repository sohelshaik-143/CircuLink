import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../api/axios';
import { useAuthStore, User } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  login: (loginId: string, password: string, mfaToken?: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<any>;
  loginWithGoogle: (tokenId: string) => Promise<any>;
  updateUser: (updatedData: Partial<User>) => void;
  isLoggedIn: boolean;
  isRole: (...roles: string[]) => boolean;
  canApprove: boolean;
  canCreateCircular: boolean;
  canBroadcast: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, darkMode, loading, setUser, setToken, setDarkMode, setLoading, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const fallbackTimer = setTimeout(() => {
        setLoading(false);
      }, 3000);

      authAPI.getMe()
        .then(({ data }) => {
          setUser(data.user);
          if (data.user?.theme) {
            setDarkMode(data.user.theme === 'dark');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
        })
        .finally(() => {
          clearTimeout(fallbackTimer);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [setUser, setDarkMode, setLoading]);

  const login = useCallback(async (loginId: string, password: string, mfaToken?: string) => {
    const { data } = await authAPI.login({ loginId, password, mfaToken });
    if (data.requiresMFA) return { requiresMFA: true };

    setToken(data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.user?.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome back, ${data.user.name}!`);
    return data;
  }, [setToken, setUser, setDarkMode]);

  const register = useCallback(async (userData: any) => {
    const { data } = await authAPI.register(userData);
    setToken(data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.user?.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome, ${data.user.name}!`);
    return data;
  }, [setToken, setUser, setDarkMode]);

  const loginWithGoogle = useCallback(async (tokenId: string) => {
    const { data } = await authAPI.googleLogin(tokenId);
    setToken(data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.user?.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome, ${data.user.name}!`);
    return data;
  }, [setToken, setUser, setDarkMode]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (_) {}
    storeLogout();
    toast.success('Logged out successfully.');
  }, [storeLogout]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    if (updatedData.theme) setDarkMode(updatedData.theme === 'dark');
  }, [user, setUser, setDarkMode]);

  const value: AuthContextType = {
    user,
    loading,
    darkMode,
    setDarkMode,
    login,
    logout,
    register,
    loginWithGoogle,
    updateUser,
    isLoggedIn: !!user,
    isRole: (...roles: string[]) => user ? roles.includes(user.role) : false,
    canApprove: user ? ['HOD', 'DSW', 'DEAN', 'DIRECTOR'].includes(user.role) : false,
    canCreateCircular: user ? ['FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user.role) : false,
    canBroadcast: user ? ['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user.role) : false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
