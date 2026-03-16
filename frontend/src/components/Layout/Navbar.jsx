import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const ROLE_COLORS = {
  STUDENT: '#3B82F6', FACULTY: '#10B981', HOD: '#8B5CF6',
  DSW: '#F59E0B', DEAN: '#F59E0B', DIRECTOR: '#EF4444',
  SECURITY: '#6B7280', ADMIN: '#1F2937',
};

export default function Navbar() {
  const { user, logout, darkMode, setDarkMode } = useAuth();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="glass" style={styles.nav}>
      {/* Brand */}
      <Link to="/dashboard" style={styles.brand}>
        <motion.span 
          initial={{ rotate: -20, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          style={styles.brandIcon}
        >
          🎓
        </motion.span>
        <div>
          <div style={styles.brandName} className="text-gradient">RGUKT RK Valley</div>
          <div style={styles.brandSub}>{user?.campus} Campus</div>
        </div>
      </Link>

      {/* Nav Links */}
      <div style={styles.links}>
        <NavLink to="/dashboard" label="Dashboard" active={location.pathname === '/dashboard'} />
        <NavLink to="/posts" label="Innovations" active={location.pathname === '/posts'} />
        <NavLink to="/circulars" label="Circulars" active={location.pathname === '/circulars'} />
        {['HOD', 'DSW', 'DEAN', 'DIRECTOR'].includes(user?.role) && (
          <NavLink to="/circulars?status=PENDING" label="Approvals" active={location.pathname === '/circulars' && location.search.includes('status=PENDING')} />
        )}
        {['SECURITY', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user?.role) && (
          <NavLink to="/emergency" label="🚨 Emergency" active={location.pathname === '/emergency'} />
        )}
        <NavLink to="/analytics" label="Analytics" active={location.pathname === '/analytics'} />
      </div>

      {/* Right Controls */}
      <div style={styles.controls}>
        <button onClick={() => setDarkMode(!darkMode)} style={styles.iconBtn}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifs(!showNotifs)} style={styles.iconBtn}>
            🔔
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={styles.badge}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          
          <AnimatePresence>
            {showNotifs && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card" 
                style={styles.dropdown}
              >
                <div style={styles.dropHeader}>
                  <span style={{ fontWeight: 700 }}>Notifications</span>
                  <button onClick={markAllRead} style={styles.markAllBtn}>Mark all read</button>
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <p style={styles.emptyText}>No notifications yet</p>
                  ) : notifications.slice(0, 8).map(n => (
                    <div key={n._id} style={{ ...styles.notifItem, background: n.isRead ? 'transparent' : 'var(--primary-light)' }}>
                      <div style={styles.notifTitle}>{n.title}</div>
                      <div style={styles.notifMsg}>{n.message}</div>
                    </div>
                  ))}
                </div>
                <Link to="/notifications" onClick={() => setShowNotifs(false)} style={styles.viewAll}>
                  View all notifications
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowProfile(!showProfile)} style={styles.profileBtn}>
            <div style={{ ...styles.avatar, background: ROLE_COLORS[user?.role] }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={styles.profileInfo}>
              <span style={styles.profileName}>{user?.name?.split(' ')[0]}</span>
              <span style={{ ...styles.roleBadge, background: ROLE_COLORS[user?.role] }}>{user?.role}</span>
            </div>
          </button>
          
          <AnimatePresence>
            {showProfile && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card" 
                style={{ ...styles.dropdown, right: 0, width: '240px' }}
              >
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <p style={{ fontWeight: 800, margin: 0, fontSize: '1rem' }}>{user?.name}</p>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.8rem', margin: '0.25rem 0' }}>{user?.collegeId}</p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <span style={styles.pointsBadge}>⭐ {user?.points}</span>
                    <span style={styles.levelBadge}>{user?.level}</span>
                  </div>
                </div>
                <Link to="/profile" onClick={() => setShowProfile(false)} style={styles.dropLink}>👤 Profile</Link>
                <Link to="/settings" onClick={() => setShowProfile(false)} style={styles.dropLink}>⚙️ Settings</Link>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  🚪 Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

const NavLink = ({ to, label, emergency, active }) => (
  <Link to={to} style={{ 
    ...styles.navLink, 
    ...(emergency ? styles.emergencyLink : {}),
    ...(active ? styles.activeLink : {})
  }}>
    {label}
    {active && (
      <motion.div 
        layoutId="nav-underline"
        style={styles.underline}
      />
    )}
  </Link>
);

const styles = {
  nav: { 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
    padding: '0 2rem', height: '72px', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: 'var(--shadow-md)', borderBottom: '1px solid var(--glass-border)'
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' },
  brandIcon: { fontSize: '2rem' },
  brandName: { fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' },
  brandSub: { fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 },
  links: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  navLink: { 
    padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', 
    color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 600, 
    position: 'relative', transition: 'color 0.2s ease'
  },
  activeLink: { color: 'var(--primary)' },
  underline: { 
    position: 'absolute', bottom: '-4px', left: '1rem', right: '1rem', 
    height: '3px', background: 'var(--primary)', borderRadius: '2px' 
  },
  emergencyLink: { color: 'var(--danger)', fontWeight: 800 },
  controls: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconBtn: { 
    position: 'relative', background: 'var(--slate-100)', border: 'none', 
    cursor: 'pointer', padding: '0.6rem', fontSize: '1.2rem', borderRadius: 'var(--radius-lg)',
    transition: 'all 0.2s ease'
  },
  badge: { 
    position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', 
    color: '#fff', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', 
    padding: '2px 6px', fontWeight: 800, border: '2px solid #fff' 
  },
  dropdown: { 
    position: 'absolute', top: 'calc(100% + 12px)', right: '0', 
    minWidth: '320px', zIndex: 200, padding: '0.5rem 0'
  },
  dropHeader: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)' 
  },
  markAllBtn: { background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 },
  notifItem: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' },
  notifTitle: { fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate-800)' },
  notifMsg: { fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.25rem' },
  emptyText: { textAlign: 'center', color: 'var(--slate-400)', padding: '2rem', fontSize: '0.9rem' },
  viewAll: { 
    display: 'block', textAlign: 'center', padding: '1rem', 
    color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 
  },
  profileBtn: { 
    display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--slate-100)', 
    border: 'none', cursor: 'pointer', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-xl)' 
  },
  avatar: { 
    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', color: '#fff', 
    fontWeight: 800, fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)'
  },
  profileInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  profileName: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-800)' },
  roleBadge: { color: '#fff', fontSize: '0.55rem', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 800, textTransform: 'uppercase' },
  pointsBadge: { background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 },
  levelBadge: { background: '#8B5CF6', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 },
  dropLink: { 
    display: 'block', padding: '0.75rem 1.25rem', color: 'var(--slate-700)', 
    textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s' 
  },
  logoutBtn: { 
    display: 'block', padding: '0.75rem 1.25rem', color: 'var(--danger)', 
    textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, 
    border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' 
  },
};

