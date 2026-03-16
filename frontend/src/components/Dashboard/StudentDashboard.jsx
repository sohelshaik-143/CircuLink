import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { postsAPI, circularsAPI, analyticsAPI } from '../../api/axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

const StatCard = ({ icon, label, value, color, to }) => (
  <motion.div variants={itemVariants}>
    <Link to={to || '#'} className="glass-card" style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <span style={{ fontSize: '2.5rem' }}>{icon}</span>
      <div>
        <p style={styles.statValue}>{value}</p>
        <p style={styles.statLabel}>{label}</p>
      </div>
    </Link>
  </motion.div>
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState([]);
  const [unreadCirculars, setUnreadCirculars] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      postsAPI.getAll({ limit: 5, campus: user.campus }),
      circularsAPI.getAll({ limit: 5 }),
      analyticsAPI.getOverview({ campus: user.campus }),
    ]).then(([p, c, a]) => {
      setRecentPosts(p.data.posts || []);
      setUnreadCirculars((c.data.circulars || []).filter(ci => !ci.isRead));
      setOverview(a.data.overview || {});
    }).catch(() => { }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div style={styles.loading}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        style={{ fontSize: '3rem', marginBottom: '1rem' }}
      >
        🎓
      </motion.div>
      <p style={{ fontWeight: 600, color: 'var(--slate-500)' }}>Initializing your workspace...</p>
    </div>
  );

  const badges = { Beginner: '🌱', Intermediate: '🔥', Advanced: '⚡', Expert: '🏆' };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={styles.container}
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} style={styles.welcome} className="glass-card">
        <div style={styles.welcomeBgOverlay} />
        <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
          <h1 style={styles.welcomeTitle}>Welcome back, <span className="text-gradient">{user.name?.split(' ')[0] || 'Scholar'}</span>! 👋</h1>
          <p style={styles.welcomeSub}>{user.branch} • {user.campus} Campus • Year {user.year}</p>
          <div style={styles.badgeRow}>
            <span style={styles.pointsPill}>⭐ {user.points} Points</span>
            <span style={styles.levelPill}>{badges[user.level] || '🌱'} {user.level}</span>
            {user.badges?.map(b => (
              <span key={b} style={styles.achievePill}>{b}</span>
            ))}
          </div>
        </div>
        <div style={{ ...styles.progressSection, position: 'relative', zIndex: 2 }}>
          <div style={styles.progressCircle} className="animate-float">
            <span style={styles.progressNum}>{Math.min(100, Math.round(user.points / 10))}%</span>
            <span style={styles.progressLabel}>Level Up</span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard icon="📋" label="Unread Circulars" value={unreadCirculars.length} color="var(--danger)" to="/circulars" />
        <StatCard icon="💡" label="Global Innovations" value={overview.totalPosts || 0} color="var(--primary)" to="/posts" />
        <StatCard icon="👥" label="Community Members" value={overview.totalUsers || 0} color="var(--secondary)" to="/users" />
        <StatCard icon="🏆" label="Reputation Rank" value={`#${Math.floor(Math.random() * 100) + 1}`} color="var(--accent)" to="/leaderboard" />
      </div>

      <div style={styles.twoCol}>
        {/* Unread Circulars */}
        <motion.div variants={itemVariants} className="glass-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Recent Circulars</h2>
            <Link to="/circulars" style={styles.viewAll}>View All</Link>
          </div>
          <div style={styles.listContainer}>
            {unreadCirculars.length === 0 ? (
              <div style={styles.emptyState}>
                <span>✅</span>
                <p>You're all caught up!</p>
              </div>
            ) : unreadCirculars.map(c => (
              <motion.div whileHover={{ x: 5 }} key={c._id} style={styles.circularItem}>
                <div style={styles.itemHeader}>
                  <p style={styles.itemTitle}>{c.title}</p>
                  <span style={{
                    ...styles.priority,
                    background: c.priority === 'URGENT' ? 'var(--danger)' : 'var(--accent)',
                    color: '#white'
                  }}>
                    {c.priority}
                  </span>
                </div>
                <p style={styles.itemMeta}>{c.category} • {new Date(c.createdAt).toLocaleDateString()}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Innovation Posts */}
        <motion.div variants={itemVariants} className="glass-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Top Innovations</h2>
            <Link to="/posts" style={styles.viewAll}>Explore</Link>
          </div>
          <div style={styles.listContainer}>
            {recentPosts.length === 0 ? (
              <div style={styles.emptyState}>
                <span>💡</span>
                <p>Be the first to innovate!</p>
              </div>
            ) : recentPosts.map(p => (
              <motion.div whileHover={{ scale: 1.02 }} key={p._id}>
                <Link to={`/posts/${p._id}`} style={styles.postItem}>
                  <div style={styles.itemTitle}>{p.title}</div>
                  <div style={styles.postMeta}>
                    <span>BY {p.author?.name?.toUpperCase()}</span>
                    <span>❤️ {p.likes?.length || 0}</span>
                  </div>
                  <div style={styles.topicRow}>
                    {p.topics?.slice(0, 2).map(t => (
                      <span key={t} style={styles.topicChip}>{t}</span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="glass-card" style={styles.card}>
        <h2 style={{ ...styles.cardTitle, marginBottom: '1.5rem' }}>Quick Access</h2>
        <div style={styles.actionsGrid}>
          <ActionButton to="/posts/new" icon="✍️" label="New Innovation" bg="var(--primary-light)" color="var(--primary-dark)" />
          <ActionButton to="/circulars" icon="📋" label="Circular Hub" bg="#f0fdf4" color="#166534" />
          <ActionButton to="/leaderboard" icon="🏆" label="Leaderboard" bg="#fffbeb" color="#92400e" />
          <ActionButton to="/profile" icon="👤" label="My Portfolio" bg="#fdf4ff" color="#6b21a8" />
        </div>
      </motion.div>
    </motion.div>
  );
}

const ActionButton = ({ to, icon, label, bg, color }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Link to={to} style={{ ...styles.actionBtn, background: bg, color: color }}>
      <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</span>
      {label}
    </Link>
  </motion.div>
);

const styles = {
  container: { padding: '2rem', maxWidth: '1280px', margin: '0 auto', minHeight: '100vh' },
  loading: { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  welcome: {
    background: 'linear-gradient(135deg, var(--slate-900), var(--primary-dark))',
    color: '#fff', padding: '3rem', border: 'none',
    marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  welcomeBgOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle at top right, rgba(79, 70, 229, 0.4), transparent 50%)',
    zIndex: 1, pointerEvents: 'none'
  },
  welcomeTitle: { fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' },
  welcomeSub: { color: 'rgba(255,255,255,0.7)', margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 500 },
  badgeRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  pointsPill: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem', fontSize: '0.9rem', fontWeight: 700 },
  levelPill: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem', fontSize: '0.9rem', fontWeight: 700 },
  achievePill: { background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 800 },
  progressSection: { display: 'flex', alignItems: 'center', gap: '1rem' },
  progressCircle: {
    background: 'rgba(255,255,255,0.1)', border: '4px solid rgba(255,255,255,0.2)',
    borderRadius: '50%', width: '100px', height: '100px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  },
  progressNum: { fontSize: '1.75rem', fontWeight: 800 },
  progressLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  statCard: {
    padding: '1.75rem', display: 'flex', gap: '1.5rem', alignItems: 'center',
    textDecoration: 'none', background: '#fff'
  },
  statValue: { fontSize: '2.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0, lineHeight: 1 },
  statLabel: { fontSize: '0.9rem', color: 'var(--slate-500)', fontWeight: 600, margin: '0.25rem 0 0' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2.5rem' },
  card: { padding: '2rem', background: '#fff' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  cardTitle: { fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 },
  viewAll: { color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 700 },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  emptyState: { textAlign: 'center', padding: '3rem', color: 'var(--slate-400)', border: '2px dashed var(--slate-100)', borderRadius: 'var(--radius-xl)' },
  circularItem: {
    padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--slate-50)',
    border: '1px solid var(--slate-100)', cursor: 'pointer', transition: 'all 0.2s'
  },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  itemTitle: { fontWeight: 700, fontSize: '1rem', color: 'var(--slate-800)', margin: 0 },
  itemMeta: { fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.5rem', fontWeight: 500 },
  priority: { padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 800, color: '#fff' },
  postItem: {
    display: 'block', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
    background: 'var(--slate-50)', border: '1px solid var(--slate-100)', textDecoration: 'none'
  },
  postMeta: { fontSize: '0.8rem', color: 'var(--slate-500)', display: 'flex', gap: '1rem', marginTop: '0.5rem', fontWeight: 700 },
  topicRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' },
  topicChip: { background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' },
  actionBtn: {
    padding: '1.5rem', borderRadius: 'var(--radius-xl)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    fontWeight: 800, textDecoration: 'none', fontSize: '1rem', transition: 'all 0.2s'
  },
};

