import { create } from 'zustand';

export interface User {
  _id: number | string;
  id?: number | string;
  collegeId?: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'HOD' | 'DSW' | 'DEAN' | 'DIRECTOR' | 'SECURITY' | 'ADMIN';
  branch?: string;
  campus: string;
  year?: string;
  section?: string;
  points?: number;
  streakDays?: number;
  level?: string;
  badges?: string[];
  profilePicture?: string;
  bio?: string;
  phone?: string;
  mfaEnabled?: boolean;
  joinedCommunity?: boolean;
  theme?: 'light' | 'dark';
  language?: 'en' | 'te';
}

interface AuthState {
  user: User | null;
  token: string | null;
  darkMode: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setDarkMode: (dark: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  darkMode: localStorage.getItem('darkMode') === 'true',
  loading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  setDarkMode: (darkMode) => {
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
    set({ darkMode });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    localStorage.clear();
    set({ user: null, token: null, darkMode: false });
  },
}));
