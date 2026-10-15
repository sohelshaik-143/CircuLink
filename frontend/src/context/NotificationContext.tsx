import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../api/axios';
import { useAuth } from './AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';

interface NotificationItem {
  _id: string | number;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  priority?: string;
  createdAt?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  socket: any;
  emergencyAlert: any;
  markRead: (id: string | number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string | number) => Promise<void>;
  dismissEmergency: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<any>(null);

  // Initialize STOMP WebSocket connection
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws-circulink'),
      connectHeaders: {
        Authorization: `Bearer ${token || ''}`,
      },
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      // User private notifications
      client.subscribe('/user/queue/notifications', (message) => {
        try {
          const notif = JSON.parse(message.body);
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast(notif.title, { icon: '🔔', duration: 4000 });
        } catch (_) {}
      });

      // User private messages
      client.subscribe('/user/queue/messages', (message) => {
        try {
          const msg = JSON.parse(message.body);
          toast(`💬 New message from ${msg.senderName || 'user'}`, { duration: 4000 });
        } catch (_) {}
      });

      // Global Emergency alerts
      client.subscribe('/topic/emergency', (message) => {
        try {
          const alert = JSON.parse(message.body);
          setEmergencyAlert(alert);
          toast.error(`🚨 EMERGENCY: ${alert.title}`, { duration: 10000 });
        } catch (_) {}
      });

      // New published circulars
      client.subscribe('/topic/new_circular', (message) => {
        try {
          const data = JSON.parse(message.body);
          toast.success(`📋 New Circular: ${data.title}`);
        } catch (_) {}
      });
    };

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, [user]);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;
    notificationsAPI.getAll({ limit: 20 })
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [user]);

  const markRead = useCallback(async (id: string | number) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string | number) => {
    await notificationsAPI.delete(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
  }, []);

  const dismissEmergency = useCallback(() => setEmergencyAlert(null), []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      socket: stompClient,
      emergencyAlert,
      markRead,
      markAllRead,
      deleteNotification,
      dismissEmergency,
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
