import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { searchAPI, getFileUrl } from '../../api/axios';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdowns on route change
  useEffect(() => {
    setShowNotifs(false);
    setShowProfile(false);
    setMobileOpen(false);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [location.pathname]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await searchAPI.search(searchQuery.trim());
        setSearchResults(data.results || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSelect = (item) => {
    const path = item._type === 'post' ? `/posts/${item._id}` : `/circulars/${item._id}`;
    navigate(path);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const navLinks = (() => {
    if (user?.role === 'SECURITY') {
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/emergency', label: '🚨 Emergency' },
        { to: '/notifications', label: 'Security Updates' },
      ];
    }

    const links = [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/posts', label: 'Innovations' },
      { to: '/circulars', label: 'Circulars' },
      ...((['HOD', 'DSW', 'DEAN', 'DIRECTOR'].includes(user?.role))
        ? [{ to: '/circulars?status=PENDING', label: 'Approvals' }] : []),
      ...((['SECURITY', 'DEAN', 'DSW', 'DIRECTOR', 'ADMIN'].includes(user?.role))
        ? [{ to: '/emergency', label: '🚨 Emergency' }] : []),
      ...((['DEAN', 'DSW', 'DIRECTOR', 'ADMIN'].includes(user?.role))
        ? [{ to: '/analytics', label: 'Analytics' }] : []),
    ];

    return links;
  })();

  return (
    <>
      <nav className="glass" style={S.nav}>
        {/* Brand */}
        <Link to="/dashboard" style={S.brand}>
          <motion.span initial={{ rotate: -20, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} style={S.brandIcon}>🎓</motion.span>
          <div style={S.brandText}>
            <div style={S.brandName} className="text-gradient">CircuLink</div>
            <div style={S.brandSub}>{user?.campus}</div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="nav-desktop-links" style={S.links}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} style={{
              ...S.navLink,
              ...(location.pathname === l.to.split('?')[0] && !l.to.includes('?status') ? S.activeLink : {}),
              ...(l.to.includes('emergency') ? S.emergencyLink : {}),
            }}>
              {labelWithUnderline(l.label, location, l.to)}
            </Link>
          ))}
        </div>

        {/* Right Controls */}
        <div style={S.controls}>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowSearch(s => !s)} style={S.iconBtn} title="Search">
              🔍
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card" style={S.searchBox}>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search posts, circulars..."
                    style={S.searchInput}
                  />
                  {searchLoading && <p style={S.searchHint}>Searching...</p>}
                  {!searchLoading && searchResults.length === 0 && searchQuery.length >= 2 && (
                    <p style={S.searchHint}>No results found</p>
                  )}
                  {searchResults.map(item => (
                    <button key={item._id} onClick={() => handleSearchSelect(item)} style={S.searchItem}>
                      <span style={{ ...S.searchType, background: item._type === 'post' ? '#eff6ff' : '#f0fdf4', color: item._type === 'post' ? '#2563eb' : '#16a34a' }}>
                        {item._type === 'post' ? '💡' : '📋'} {item._type}
                      </span>
                      <span style={S.searchTitle}>{item.title}</span>
                      <span style={S.searchMeta}>{item.branch || item.category}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dark mode */}
          <button onClick={() => setDarkMode(!darkMode)} style={S.iconBtn} title="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(s => !s); setShowProfile(false); }} style={S.iconBtn}>
              🔔
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={S.badge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card" style={S.dropdown}>
                  <div style={S.dropHeader}>
                    <span style={{ fontWeight: 700 }}>Notifications</span>
                    <button onClick={markAllRead} style={S.markAllBtn}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0
                      ? <p style={S.emptyText}>No notifications yet</p>
                      : notifications.slice(0, 8).map(n => (
                          <div key={n._id} style={{ ...S.notifItem, background: n.isRead ? 'transparent' : 'rgba(79,70,229,0.06)' }}>
                            <div style={S.notifTitle}>{n.title}</div>
                            <div style={S.notifMsg}>{n.message}</div>
                          </div>
                        ))}
                  </div>
                  <Link to="/notifications" onClick={() => setShowNotifs(false)} style={S.viewAll}>View all →</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowProfile(s => !s); setShowNotifs(false); }} style={S.profileBtn}>
              <div style={S.avatarWrap}>
                {user?.profilePicture
                  ? <img src={getFileUrl(user.profilePicture)} alt="" style={S.avatarImg} />
                  : <div style={{ ...S.avatar, background: ROLE_COLORS[user?.role] }}>{user?.name?.[0]?.toUpperCase()}</div>}
                <span style={S.onlineDot} title="Online" />
              </div>
              <div style={S.profileInfo}>
                <span style={S.profileName}>{user?.name?.split(' ')[0]}</span>
                <span style={{ ...S.roleBadge, background: ROLE_COLORS[user?.role] }}>{user?.role}</span>
              </div>
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card" style={{ ...S.dropdown, right: 0, width: '240px' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={S.avatarWrap}>
                      {user?.profilePicture
                        ? <img src={getFileUrl(user.profilePicture)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ ...S.avatar, background: ROLE_COLORS[user?.role], width: 40, height: 40 }}>{user?.name?.[0]?.toUpperCase()}</div>}
                    </div>
                    <p style={{ fontWeight: 800, margin: '0.5rem 0 0', fontSize: '1rem' }}>{user?.name}</p>
                    <p style={{ color: 'var(--slate-500)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{user?.collegeId || user?.email}</p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <span style={S.pointsBadge}>⭐ {user?.points || 0}</span>
                      <span style={S.levelBadge}>{user?.level || 'Beginner'}</span>
                    </div>
                  </div>
                  <Link to="/profile" onClick={() => setShowProfile(false)} style={S.dropLink}>👤 My Profile</Link>
                  <Link to="/settings" onClick={() => setShowProfile(false)} style={S.dropLink}>⚙️ Settings</Link>
                  <button onClick={handleLogout} style={S.logoutBtn}>🚪 Logout</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(s => !s)} className="nav-hamburger" style={S.hamburger} aria-label="Menu">
            <span style={{ ...S.hamburgerLine, transform: mobileOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
            <span style={{ ...S.hamburgerLine, opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ ...S.hamburgerLine, transform: mobileOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="glass nav-mobile-menu" style={S.mobileMenu}>
            {/* Mobile Search */}
            <div style={{ padding: '0.75rem 1rem' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Search posts, circulars..."
                style={{ ...S.searchInput, display: 'block' }}
                onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) handleSearchSelect(searchResults[0]); }}
              />
              {searchResults.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {searchResults.map(item => (
                    <button key={item._id} onClick={() => { handleSearchSelect(item); setMobileOpen(false); }} style={S.searchItem}>
                      <span style={{ ...S.searchType, background: item._type === 'post' ? '#eff6ff' : '#f0fdf4', color: item._type === 'post' ? '#2563eb' : '#16a34a' }}>
                        {item._type === 'post' ? '💡' : '📋'} {item._type}
                      </span>
                      <span style={S.searchTitle}>{item.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                style={{ ...S.mobileLink, ...(location.pathname === l.to.split('?')[0] ? S.mobileLinkActive : {}) }}>
                {l.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function labelWithUnderline(text, location, to) {
  const isActive = location.pathname === to.split('?')[0] && !to.includes('status');
  return (
    <span style={{ position: 'relative' }}>
      {text}
      {isActive && (
        <motion.span layoutId="nav-underline"
          style={{ position: 'absolute', bottom: '-6px', left: 0, right: 0, height: '2px', background: 'var(--primary)', borderRadius: '2px', display: 'block' }} />
      )}
    </span>
  );
}

const S = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.5rem', height: '64px', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: 'var(--shadow-md)', borderBottom: '1px solid var(--glass-border)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', flexShrink: 0 },
  brandIcon: { fontSize: '1.75rem' },
  brandText: { display: 'flex', flexDirection: 'column' },
  brandName: { fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', lineHeight: 1.1 },
  brandSub: { fontSize: '0.65rem', color: 'var(--slate-500)', fontWeight: 500 },
  links: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  navLink: { padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'var(--slate-600)', fontSize: '0.85rem', fontWeight: 600, position: 'relative', transition: 'color 0.2s' },
  activeLink: { color: 'var(--primary)', background: 'rgba(79,70,229,0.06)' },
  emergencyLink: { color: 'var(--danger)', fontWeight: 800 },
  controls: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 },
  iconBtn: { position: 'relative', background: 'var(--slate-100)', border: 'none', cursor: 'pointer', padding: '0.5rem', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)', transition: 'all 0.2s', lineHeight: 1 },
  badge: { position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: '0.6rem', padding: '1px 5px', fontWeight: 800, border: '2px solid #fff' },
  avatarWrap: { position: 'relative', display: 'inline-block', flexShrink: 0 },
  avatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem' },
  avatarImg: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, background: '#22c55e', borderRadius: '50%', border: '2px solid #fff' },
  profileBtn: { display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--slate-100)', border: 'none', cursor: 'pointer', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-xl)', transition: 'background 0.2s' },
  profileInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  profileName: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-800)', lineHeight: 1.2 },
  roleBadge: { color: '#fff', fontSize: '0.5rem', padding: '1px 5px', borderRadius: 'var(--radius-full)', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1.4 },
  dropdown: { position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: '300px', zIndex: 200, padding: '0.25rem 0' },
  dropHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--glass-border)' },
  markAllBtn: { background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 },
  notifItem: { padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--glass-border)' },
  notifTitle: { fontWeight: 700, fontSize: '0.82rem', color: 'var(--slate-800)' },
  notifMsg: { fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' },
  emptyText: { textAlign: 'center', color: 'var(--slate-400)', padding: '1.5rem', fontSize: '0.85rem', margin: 0 },
  viewAll: { display: 'block', textAlign: 'center', padding: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 },
  dropLink: { display: 'block', padding: '0.7rem 1.25rem', color: 'var(--slate-700)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 },
  logoutBtn: { display: 'block', padding: '0.7rem 1.25rem', color: 'var(--danger)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700, border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' },
  pointsBadge: { background: 'var(--accent)', color: '#fff', fontSize: '0.68rem', padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: 700 },
  levelBadge: { background: '#8B5CF6', color: '#fff', fontSize: '0.68rem', padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: 700 },
  // Search
  searchBox: { position: 'absolute', top: 'calc(100% + 10px)', right: '-80px', width: '340px', zIndex: 200, padding: '0.75rem' },
  searchInput: { width: '100%', padding: '0.65rem 1rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--slate-200)', fontSize: '0.9rem', outline: 'none', background: 'var(--slate-50)', boxSizing: 'border-box' },
  searchItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left', transition: 'background 0.15s' },
  searchType: { fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', flexShrink: 0, textTransform: 'uppercase' },
  searchTitle: { flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  searchMeta: { fontSize: '0.7rem', color: 'var(--slate-400)', flexShrink: 0 },
  searchHint: { fontSize: '0.8rem', color: 'var(--slate-400)', textAlign: 'center', padding: '0.75rem', margin: 0 },
  // Mobile
  hamburger: { display: 'none', flexDirection: 'column', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' },
  hamburgerLine: { width: '22px', height: '2px', background: 'var(--slate-700)', borderRadius: '2px', transition: 'all 0.3s', display: 'block' },
  mobileMenu: { padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' },
  mobileLink: { display: 'block', padding: '0.85rem 1.5rem', color: 'var(--slate-700)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600 },
  mobileLinkActive: { color: 'var(--primary)', background: 'rgba(79,70,229,0.06)' },
};
