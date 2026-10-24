
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Login from './components/Auth/Login';
import ProfileSetup from './components/Auth/ProfileSetup';
import Navbar from './components/Layout/Navbar';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import { PostFeed, PostForm } from './components/Posts/PostComponents';
import { CircularList } from './components/Circulars/CircularComponents';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import { Leaderboard, UserProfile } from './components/Users/UserComponents';
import { PostDetail } from './components/Posts/PostDetail';
import Settings from './components/Users/Settings';
import Notifications from './components/Notifications/Notifications';
import UsersDirectory from './components/Users/UsersDirectory';
import Emergency from './components/Director/Emergency';
import CircularDetail from './components/Circulars/CircularDetail';
import DirectorDashboard from './components/Dashboard/DirectorDashboard';
import { SecurityDashboard, DeanAcademicsDashboard, DeanStudentWelfareDashboard } from './components/Dashboard/RoleSpecificDashboards';

// Page wrapper for animations
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    style={{ minHeight: 'calc(100vh - 72px)' }}
  >
    {children}
  </motion.div>
);

// Protected route wrapper
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ fontSize: '3rem' }}
      >
        🎓
      </motion.div>
      <p style={{ color: '#64748b', fontWeight: 600 }}>RGUKT Secure Portal...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// App layout with navbar
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const needsProfileSetup = user && (
    user.role === 'STUDENT' ? (!user.branch || !user.year) :
      user.role === 'FACULTY' ? (!user.branch) : false
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      {user && <Navbar />}
      <main>
        {children}
      </main>
      {needsProfileSetup && <ProfileSetup />}
    </div>
  );
}

// Dashboard router based on role
function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const directorPreview = searchParams.get('view');

  if (['DIRECTOR', 'ADMIN'].includes(user?.role || '') && directorPreview) {
    if (directorPreview === 'security') return <SecurityDashboard />;
    if (directorPreview === 'dean-academics') return <DeanAcademicsDashboard />;
    if (directorPreview === 'dean-welfare') return <DeanStudentWelfareDashboard />;
  }

  if (['DIRECTOR', 'ADMIN'].includes(user?.role || '')) {
    return <DirectorDashboard />;
  }

  if (user?.role === 'SECURITY') {
    return <SecurityDashboard />;
  }

  if (user?.role === 'DEAN') {
    return <DeanAcademicsDashboard />;
  }

  if (user?.role === 'DSW') {
    return <DeanStudentWelfareDashboard />;
  }

  return <StudentDashboard />;
}

function AppRoutes() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PageWrapper><PostFeed /></PageWrapper></ProtectedRoute>} />
          <Route path="/posts/new" element={<ProtectedRoute><PageWrapper><PostForm /></PageWrapper></ProtectedRoute>} />
          <Route path="/circulars" element={<ProtectedRoute><PageWrapper><CircularList /></PageWrapper></ProtectedRoute>} />
          <Route path="/circulars/:id" element={<ProtectedRoute><PageWrapper><CircularDetail /></PageWrapper></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute roles={['DEAN', 'DSW', 'DIRECTOR', 'ADMIN']}><PageWrapper><AnalyticsDashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/posts/:id" element={<ProtectedRoute><PageWrapper><PostDetail /></PageWrapper></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><PageWrapper><Leaderboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><PageWrapper><UsersDirectory /></PageWrapper></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageWrapper><Settings /></PageWrapper></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><PageWrapper><Notifications /></PageWrapper></ProtectedRoute>} />
          <Route path="/emergency" element={<ProtectedRoute roles={['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN']}><PageWrapper><Emergency /></PageWrapper></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageWrapper><UserProfile /></PageWrapper></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><PageWrapper><UserProfile /></PageWrapper></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="/feed" element={<Navigate to="/posts" replace />} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '5rem' }}>
              <h1 style={{ fontSize: '4rem', color: 'var(--primary)' }}>404</h1>
              <p style={{ color: 'var(--slate-500)', fontSize: '1.1rem' }}>The requested resource was not found.</p>
              <Link to="/dashboard" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>Back to Campus</Link>
            </div>
          } />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  const googleClientId = (
    import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
    import.meta.env?.GOOGLE_CLIENT_ID ||
    ''
  ).trim();

  const appContent = (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--slate-800)',
              fontWeight: 600
            }
          }} />
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );

  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        {appContent}
      </GoogleOAuthProvider>
    );
  }

  return appContent;
}
