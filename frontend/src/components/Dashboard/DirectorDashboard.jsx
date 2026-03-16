import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { postsAPI, circularsAPI, analyticsAPI } from '../../api/axios';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function DirectorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [pendingCirculars, setPendingCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      circularsAPI.getAll({ status: 'PENDING' })
    ]).then(([s, c]) => {
      setStats(s.data.overview || {});
      setPendingCirculars(c.data.circulars || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Administrative Console</h1>
        <p style={styles.subtitle}>{user.role} Dashboard • {user.campus} Campus</p>
      </header>

      <div style={styles.statsGrid}>
        <div className="glass-card" style={styles.statCard}>
          <p style={styles.statLabel}>Total Students</p>
          <p style={styles.statValue}>{stats.totalUsers || 0}</p>
        </div>
        <div className="glass-card" style={styles.statCard}>
          <p style={styles.statLabel}>Active Innovations</p>
          <p style={styles.statValue}>{stats.totalPosts || 0}</p>
        </div>
        <div className="glass-card" style={styles.statCard}>
          <p style={styles.statLabel}>Unpublished Circulars</p>
          <p style={styles.statValue}>{pendingCirculars.length}</p>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div className="glass-card" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Awaiting Approval</h2>
            <Link to="/circulars" style={styles.link}>View All</Link>
          </div>
          <div style={styles.list}>
            {pendingCirculars.length === 0 ? (
              <p style={styles.empty}>No pending approvals</p>
            ) : pendingCirculars.slice(0, 5).map(c => (
              <div key={c._id} style={styles.item}>
                <div>
                  <p style={styles.itemTitle}>{c.title}</p>
                  <p style={styles.itemSub}>{c.author?.name} • {c.category}</p>
                </div>
                <Link to={`/circulars/${c._id}`} style={styles.actionBtn}>Review</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={styles.actions}>
            <Link to="/emergency" style={styles.emergencyBtn}>🚨 Broadcast Emergency</Link>
            <Link to="/circulars" style={styles.actionLink}>📋 Manage Circulars</Link>
            <Link to="/analytics" style={styles.actionLink}>📊 View Analytics</Link>
            <Link to="/users" style={styles.actionLink}>👥 User Directory</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--slate-900)' },
  subtitle: { color: 'var(--slate-500)', fontSize: '1.1rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  statCard: { padding: '1.5rem', textAlign: 'center' },
  statLabel: { color: 'var(--slate-500)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 },
  statValue: { fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', margin: 0 },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' },
  section: { padding: '2rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 800, margin: 0 },
  link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--slate-50)', borderRadius: '0.75rem' },
  itemTitle: { fontWeight: 700, margin: 0, fontSize: '0.95rem' },
  itemSub: { fontSize: '0.8rem', color: 'var(--slate-500)', margin: '0.25rem 0 0' },
  actionBtn: { padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 },
  empty: { textAlign: 'center', color: 'var(--slate-400)', padding: '2rem' },
  actions: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  emergencyBtn: { padding: '1rem', background: '#fee2e2', color: '#ef4444', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 800, textAlign: 'center', border: '1px solid #fecaca' },
  actionLink: { padding: '1rem', background: 'var(--slate-50)', color: 'var(--slate-700)', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 600, border: '1px solid var(--slate-100)' },
};
