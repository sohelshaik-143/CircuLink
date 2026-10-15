import axios from 'axios';

const getBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  return '/api';
};

const API = axios.create({
  baseURL: getBaseUrl(),
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 - auto refresh token rotation
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isLoginRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh-token');
    if (error.response?.status === 401 && !original?._retry && !isLoginRequest) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${getBaseUrl()}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.token}`;
        return API(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ───────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: any) => API.post('/auth/register', data),
  login: (data: any) => API.post('/auth/login', data),
  googleLogin: (tokenId: string) => API.post('/auth/google', { tokenId }),
  logout: () => API.post('/auth/logout'),
  getMe: () => API.get('/auth/me'),
  refreshToken: (data: any) => API.post('/auth/refresh-token', data),
  setupMFA: () => API.post('/auth/setup-mfa'),
  verifyMFA: (token: string) => API.post('/auth/verify-mfa', { token }),
  forgotPassword: (email: string) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => API.post('/auth/reset-password', data),
};

// ─── Posts API ──────────────────────────────────────────────────────────────
export const postsAPI = {
  getAll: (params?: any) => API.get('/posts', { params }),
  getOne: (id: string | number) => API.get(`/posts/${id}`),
  create: (data: any) => API.post('/posts', data),
  createWithFiles: (formData: FormData) => API.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: string | number, data: any) => API.put(`/posts/${id}`, data),
  delete: (id: string | number) => API.delete(`/posts/${id}`),
  like: (id: string | number) => API.post(`/posts/${id}/like`),
  endorse: (id: string | number, message: string) => API.post(`/posts/${id}/endorse`, { message }),
  comment: (id: string | number, content: string, parentComment?: string | number) =>
    API.post(`/posts/${id}/comment`, { content, parentComment }),
};

// ─── Circulars API ──────────────────────────────────────────────────────────
export const circularsAPI = {
  getAll: (params?: any) => API.get('/circulars', { params }),
  create: (data: any) => API.post('/circulars', data),
  approve: (id: string | number, comment?: string) => API.put(`/circulars/${id}/approve`, { comment }),
  reject: (id: string | number, reason: string) => API.put(`/circulars/${id}/reject`, { reason }),
  markRead: (id: string | number) => API.post(`/circulars/${id}/read`),
  getOne: (id: string | number) => API.get(`/circulars/${id}`),
  delete: (id: string | number) => API.delete(`/circulars/${id}`),
  emergency: (data: any) => API.post('/circulars/emergency', data),
};

// ─── Notifications API ──────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params?: any) => API.get('/notifications', { params }),
  markRead: (id: string | number) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/mark-all-read'),
  delete: (id: string | number) => API.delete(`/notifications/${id}`),
};

// ─── Users API ──────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params?: any) => API.get('/users', { params }),
  getOne: (id: string | number) => API.get(`/users/${id}`),
  updateProfile: (data: any) => {
    if (data instanceof FormData) {
      return API.put('/users/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return API.put('/users/profile', data);
  },
  follow: (id: string | number) => API.post(`/users/${id}/follow`),
  getLeaderboard: (params?: any) => API.get('/users/leaderboard', { params }),
};

// ─── Analytics API ──────────────────────────────────────────────────────────
export const analyticsAPI = {
  getOverview: (params?: any) => API.get('/analytics/overview', { params }),
  getBranchActivity: () => API.get('/analytics/branch-activity'),
  getTopicTrends: () => API.get('/analytics/topic-trends'),
  getAuditLogs: (params?: any) => API.get('/analytics/audit-logs', { params }),
};

// ─── Messages API ────────────────────────────────────────────────────────────
export const messagesAPI = {
  getConversation: (userId: string | number) => API.get(`/messages/${userId}`),
  sendMessage: (userId: string | number, formData: FormData) => API.post(`/messages/${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  sendText: (userId: string | number, content: string) => API.post(`/messages/${userId}`, { content }),
  getUnreadCounts: () => API.get('/messages/unread'),
};

// ─── Community API ───────────────────────────────────────────────────────────
export const communityAPI = {
  join: () => API.post('/users/community/join'),
  leave: () => API.post('/users/community/leave'),
};

// ─── Search API ──────────────────────────────────────────────────────────────
export const searchAPI = {
  search: (q: string) => API.get('/search', { params: { q } }),
};

export default API;
