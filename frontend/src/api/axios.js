import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - auto refresh or redirect
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isLoginRequest = original.url.includes('/auth/login');
    if (error.response?.status === 401 && !original._retry && !isLoginRequest) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post('/api/auth/refresh-token', { refreshToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
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

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  googleLogin: (tokenId) => API.post('/auth/google', { tokenId }),
  logout: () => API.post('/auth/logout'),
  getMe: () => API.get('/auth/me'),
  refreshToken: (data) => API.post('/auth/refresh-token', data),
  setupMFA: () => API.post('/auth/setup-mfa'),
  verifyMFA: (token) => API.post('/auth/verify-mfa', { token }),
};

// ─── Posts ──────────────────────────────────────────────────────────────────
export const postsAPI = {
  getAll: (params) => API.get('/posts', { params }),
  getOne: (id) => API.get(`/posts/${id}`),
  create: (data) => API.post('/posts', data),
  createWithFiles: (formData) => API.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => API.put(`/posts/${id}`, data),
  delete: (id) => API.delete(`/posts/${id}`),
  like: (id) => API.post(`/posts/${id}/like`),
  endorse: (id, message) => API.post(`/posts/${id}/endorse`, { message }),
  comment: (id, content) => API.post(`/posts/${id}/comment`, { content }),
};

// ─── Circulars ──────────────────────────────────────────────────────────────
export const circularsAPI = {
  getAll: (params) => API.get('/circulars', { params }),
  create: (data) => API.post('/circulars', data),
  approve: (id, comment) => API.put(`/circulars/${id}/approve`, { comment }),
  reject: (id, reason) => API.put(`/circulars/${id}/reject`, { reason }),
  markRead: (id) => API.post(`/circulars/${id}/read`),
  getOne: (id) => API.get(`/circulars/${id}`),
  delete: (id) => API.delete(`/circulars/${id}`),
  emergency: (data) => API.post('/circulars/emergency', data),
};

// ─── Notifications ──────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/mark-all-read'),
  delete: (id) => API.delete(`/notifications/${id}`),
};

// ─── Users ──────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => API.get('/users', { params }),
  getOne: (id) => API.get(`/users/${id}`),
  updateProfile: (data) => API.put('/users/profile', data),
  follow: (id) => API.post(`/users/${id}/follow`),
  getLeaderboard: (params) => API.get('/users/leaderboard', { params }),
};

// ─── Analytics ──────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getOverview: (params) => API.get('/analytics/overview', { params }),
  getBranchActivity: () => API.get('/analytics/branch-activity'),
  getTopicTrends: () => API.get('/analytics/topic-trends'),
  getAuditLogs: (params) => API.get('/analytics/audit-logs', { params }),
};

export default API;
