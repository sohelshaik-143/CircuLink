import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (user) {
      usersAPI.updateProfile({ theme: newMode ? 'dark' : 'light' })
        .then(({ data }) => setUser(prev => ({ ...prev, theme: data.user.theme })))
        .catch(err => console.error('Failed to sync theme:', err));
    }
  }, [darkMode, user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(({ data }) => {
          setUser(data.user);
          if (data.user.theme) setDarkMode(data.user.theme === 'dark');
        })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.theme) {
      setDarkMode(user.theme === 'dark');
    }
  }, [user?.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
    // Only update profile if logged in and if the modes differ
    if (user && ((user.theme === 'dark') !== darkMode)) {
      usersAPI.updateProfile({ theme: darkMode ? 'dark' : 'light' })
        .then(({ data }) => {
          if (data.success) updateUser({ theme: data.user.theme });
        })
        .catch(err => console.error('Dark mode sync failed:', err));
    }
  }, [darkMode, user?._id]); // Use user._id to prevent loops if other user data changes

  const login = useCallback(async (collegeId, password, mfaToken) => {
    const { data } = await authAPI.login({ collegeId, password, mfaToken });
    if (data.requiresMFA) return { requiresMFA: true };
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.user.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome back, ${data.user.name}!`);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    if (data.user.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome, ${data.user.name}!`);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (tokenId) => {
    const { data } = await authAPI.googleLogin(tokenId);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.user.theme) setDarkMode(data.user.theme === 'dark');
    toast.success(`Welcome, ${data.user.name}!`);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (_) { }
    localStorage.clear();
    setUser(null);
    setDarkMode(false);
    toast.success('Logged out successfully.');
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
    if (updatedData.theme) setDarkMode(updatedData.theme === 'dark');
  }, []);

  const value = {
    user, loading, darkMode,
    setDarkMode, login, logout, register, loginWithGoogle, updateUser,
    isLoggedIn: !!user,
    isRole: (...roles) => user && roles.includes(user.role),
    canApprove: user && ['HOD', 'DSW', 'DEAN', 'DIRECTOR'].includes(user.role),
    canCreateCircular: user && ['FACULTY', 'HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user.role),
    canBroadcast: user && ['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
