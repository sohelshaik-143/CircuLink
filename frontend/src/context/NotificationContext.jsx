import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificationsAPI } from '../api/axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Initialize socket
  useEffect(() => {
    if (!user) return;
    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });
    s.emit('join', user._id);
    s.emit('join_branch', user.branch);
    s.emit('join_campus', user.campus);

    s.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast(notif.title, { icon: '🔔', duration: 4000 });
    });

    s.on('emergency', (data) => {
      setEmergencyAlert(data);
      toast.error(`🚨 EMERGENCY: ${data.title}`, { duration: 10000 });
    });

    s.on('circular_published', (data) => {
      toast.success(`📋 New Circular: ${data.title}`);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;
    notificationsAPI.getAll({ limit: 20 })
      .then(({ data }) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }).catch(() => {});
  }, [user]);

  const markRead = useCallback(async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id) => {
    await notificationsAPI.delete(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
  }, []);

  const dismissEmergency = useCallback(() => setEmergencyAlert(null), []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, socket, emergencyAlert,
      markRead, markAllRead, deleteNotification, dismissEmergency,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
