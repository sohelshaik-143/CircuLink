import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { postsAPI, circularsAPI, analyticsAPI, usersAPI } from '../../api/axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120 } }
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [overview, setOverview] = useState({});
  const [communityCount, setCommunityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      postsAPI.getAll({ limit: 5, campus: user.campus }),
      circularsAPI.getAll({ limit: 5 }),
      analyticsAPI.getOverview({ campus: user.campus }),
      usersAPI.getAll({ joinedCommunity: true, limit: 1 }),
    ]).then(([p, c, a, comm]) => {
      setRecentPosts(p.data.posts || []);
      setCirculars(c.data.circulars || []);
      setOverview(a.data.overview || {});
      setCommunityCount(comm.data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div style={S.loading}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ fontSize: '2.5rem' }}>🎓</motion.div>
      <p style={{ color: '#64748b', fontWeight: 600, marginTop: '1rem' }}>Loading dashboard...</p>
    </div>
  );

  const unread = circulars.filter(c => !c.isRead);
  const levelMap = { Beginner: { icon: '🌱', color: '#10b981' }, Intermediate: { icon: '🔥', color: '#f59e0b' }, Advanced: { icon: '⚡', color: '#6366f1' }, Expert: { icon: '🏆', color: '#ef4444' } };
  const lvl = levelMap[user.level] || levelMap.Beginner;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={S.page}>

      {/* ── Hero Banner ── */}
      <motion.div variants={item} style={S.hero}>
        <div style={S.heroBg} />
        <div style={S.heroGrid} />
        <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
          <div style={S.campusChip}>{user.campus} Campus</div>
          <h1 style={S.heroTitle}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span style={S.heroName}>{user.name?.split(' ')[0]}</span>
          </h1>
          <p style={S.heroSub}>{user.branch || '—'} • Year {user.year || '—'} • {user.collegeId}</p>
          <div style={S.pillRow}>
            <span style={S.pill}>⭐ {user.points} pts</span>
            <span style={{ ...S.pill, background: 'rgba(255,255,255,0.12)' }}>{lvl.icon} {user.level}</span>
            {user.joinedCommunity && <span style={{ ...S.pill, background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)' }}>✅ Community Member</span>}
          </div>
        </div>
        <div style={S.heroRight}>
          <div style={S.progressRing}>
            <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - Math.min(1, user.points / 1000))}`}
                strokeLinecap="round" />
            </svg>
            <div style={S.progressInner}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{Math.min(100, Math.round(user.points / 10))}%</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div style={S.statsGrid}>
        {[
          { icon: '📋', label: 'Unread Circulars', value: unread.length, color: '#ef4444', to: '/circulars', bg: '#fef2f2' },
          { icon: '💡', label: 'Total Innovations', value: overview.totalPosts || 0, color: '#3b82f6', to: '/posts', bg: '#eff6ff' },
          { icon: '👥', label: 'Community Members', value: communityCount, color: '#8b5cf6', to: '/users', bg: '#f5f3ff' },
          { icon: '🏛️', label: 'Active Campus', value: overview.activeCampus || user.campus?.split(' ')[0], color: '#10b981', to: '/leaderboard', bg: '#f0fdf4' },
        ].map((s, i) => (
          <motion.div key={i} variants={item}>
            <Link to={s.to} style={{ ...S.statCard, background: s.bg, borderLeft: `4px solid ${s.color}`, textDecoration: 'none' }}>
              <div style={{ ...S.statIcon, color: s.color }}>{s.icon}</div>
              <div>
                <p style={{ ...S.statVal, color: s.color }}>{s.value}</p>
                <p style={S.statLabel}>{s.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div style={S.twoCol}>

        {/* Circulars */}
        <motion.div variants={item} style={S.card}>
          <div style={S.cardHead}>
            <div style={S.cardHeadLeft}>
              <span style={S.cardIcon}>📋</span>
              <h2 style={S.cardTitle}>Recent Circulars</h2>
              {unread.length > 0 && <span style={S.badge}>{unread.length} new</span>}
            </div>
            <Link to="/circulars" style={S.viewAll}>View all →</Link>
          </div>
          {circulars.length === 0 ? (
            <Empty icon="✅" text="All caught up!" />
          ) : circulars.slice(0, 4).map(c => (
            <Link to={`/circulars/${c._id}`} key={c._id} style={S.rowItem}>
              <div style={{ ...S.priorityDot, background: c.priority === 'URGENT' ? '#ef4444' : c.priority === 'HIGH' ? '#f59e0b' : '#10b981' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.rowTitle}>{c.title}</p>
                <p style={S.rowMeta}>{c.category} • {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              <span style={{ ...S.chip, background: c.priority === 'URGENT' ? '#fee2e2' : '#f1f5f9', color: c.priority === 'URGENT' ? '#dc2626' : '#64748b' }}>{c.priority}</span>
            </Link>
          ))}
        </motion.div>

        {/* Innovations */}
        <motion.div variants={item} style={S.card}>
          <div style={S.cardHead}>
            <div style={S.cardHeadLeft}>
              <span style={S.cardIcon}>💡</span>
              <h2 style={S.cardTitle}>Top Innovations</h2>
            </div>
            <Link to="/posts" style={S.viewAll}>Explore →</Link>
          </div>
          {recentPosts.length === 0 ? (
            <Empty icon="💡" text="Be the first to innovate!" />
          ) : recentPosts.slice(0, 4).map(p => (
            <Link to={`/posts/${p._id}`} key={p._id} style={S.rowItem}>
              <div style={S.postBullet} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.rowTitle}>{p.title}</p>
                <p style={S.rowMeta}>by {p.author?.name} • ❤️ {p.likes?.length || 0}</p>
              </div>
              {p.topics?.slice(0, 1).map(t => (
                <span key={t} style={{ ...S.chip, background: '#eff6ff', color: '#2563eb' }}>{t}</span>
              ))}
            </Link>
          ))}
        </motion.div>
      </div>

      {/* ── Community Panel ── */}
      <motion.div variants={item} style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardHeadLeft}>
            <span style={S.cardIcon}>👥</span>
            <h2 style={S.cardTitle}>Community</h2>
            <span style={{ ...S.badge, background: '#f5f3ff', color: '#7c3aed' }}>{communityCount} members</span>
          </div>
          <Link to="/users" style={S.viewAll}>Open Directory →</Link>
        </div>
        {user.joinedCommunity ? (
          <div style={S.communityJoined}>
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <div>
              <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem' }}>You're a community member!</p>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Message peers, share files and photos — all encrypted, within the platform.</p>
            </div>
            <Link to="/users" style={S.communityBtn}>Connect Now</Link>
          </div>
        ) : (
          <div style={S.communityJoin}>
            <span style={{ fontSize: '2rem' }}>👋</span>
            <div>
              <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem' }}>Join {communityCount} students in the community</p>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Encrypted messaging, file sharing — no external email access.</p>
            </div>
            <Link to="/users" style={S.communityBtn}>Join Community</Link>
          </div>
        )}
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item} style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardHeadLeft}><span style={S.cardIcon}>⚡</span><h2 style={S.cardTitle}>Quick Access</h2></div>
        </div>
        <div style={S.actionsGrid}>
          {[
            { to: '/posts/new', icon: '✍️', label: 'New Innovation', bg: '#eff6ff', color: '#1d4ed8' },
            { to: '/circulars', icon: '📋', label: 'Circular Hub', bg: '#f0fdf4', color: '#166534' },
            { to: '/leaderboard', icon: '🏆', label: 'Leaderboard', bg: '#fffbeb', color: '#92400e' },
            { to: '/profile', icon: '👤', label: 'My Profile', bg: '#fdf4ff', color: '#6b21a8' },
            { to: '/users', icon: '👥', label: 'Community', bg: '#f5f3ff', color: '#4c1d95' },
            { to: '/notifications', icon: '🔔', label: 'Notifications', bg: '#fff7ed', color: '#9a3412' },
          ].map(a => (
            <motion.div key={a.to} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link to={a.to} style={{ ...S.actionBtn, background: a.bg, color: a.color }}>
                <span style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{a.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}

const Empty = ({ icon, text }) => (
  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '0.75rem' }}>
    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
    <p style={{ margin: 0, fontWeight: 600 }}>{text}</p>
  </div>
);

const S = {
  page: { padding: '2rem', maxWidth: '1280px', margin: '0 auto' },
  loading: { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

  hero: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    borderRadius: '1.5rem', padding: '2.5rem 3rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '2rem', color: '#fff',
    boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
  },
  heroBg: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 50%, rgba(99,102,241,0.25) 0%, transparent 60%)', zIndex: 1 },
  heroGrid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', zIndex: 1 },
  campusChip: { display: 'inline-block', background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '999px', padding: '0.25rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', color: '#a5b4fc' },
  heroTitle: { fontSize: '2rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em' },
  heroName: { background: 'linear-gradient(135deg, #a5b4fc, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', margin: '0 0 1.25rem', fontWeight: 500 },
  pillRow: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' },
  pill: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderRadius: '999px', padding: '0.3rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)' },
  heroRight: { position: 'relative', zIndex: 2 },
  progressRing: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progressInner: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' },
  statCard: { padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'transform 0.2s', cursor: 'pointer' },
  statIcon: { fontSize: '2.25rem', lineHeight: 1 },
  statVal: { fontSize: '2rem', fontWeight: 800, margin: 0, lineHeight: 1 },
  statLabel: { fontSize: '0.82rem', color: '#64748b', fontWeight: 600, margin: '0.2rem 0 0' },

  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  cardHeadLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  cardIcon: { fontSize: '1.25rem' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 },
  badge: { background: '#fee2e2', color: '#dc2626', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 800 },
  viewAll: { color: '#3b82f6', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 700 },

  rowItem: { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem', borderRadius: '0.75rem', marginBottom: '0.5rem', background: '#f8fafc', textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer', border: '1px solid #f1f5f9' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  postBullet: { width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 },
  rowTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMeta: { fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0', fontWeight: 500 },
  chip: { borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 },

  communityJoined: { display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', background: '#f0fdf4', borderRadius: '1rem', border: '1px solid #bbf7d0' },
  communityJoin: { display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', background: '#f5f3ff', borderRadius: '1rem', border: '1px solid #ddd6fe' },
  communityBtn: { marginLeft: 'auto', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' },

  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' },
  actionBtn: { padding: '1.5rem 1rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s', cursor: 'pointer' },
};
