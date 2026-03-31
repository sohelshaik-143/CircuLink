import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI, circularsAPI, notificationsAPI } from '../../api/axios';

function StatCard({ label, value, tone = 'default' }) {
  return (
    <div className="glass-card" style={{ ...styles.statCard, ...(tone === 'alert' ? styles.alertCard : {}) }}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="glass-card" style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function SecurityDashboard() {
  const { user } = useAuth();
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 8 }).then(({ data }) => {
      setRecentAlerts(data.notifications || []);
    }).catch(() => {
      setRecentAlerts([]);
    }).finally(() => setLoading(false));
  }, []);

  const unreadCount = useMemo(() => recentAlerts.filter(n => !n.isRead).length, [recentAlerts]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Security Operations Console</h1>
        <p style={styles.subtitle}>Security Officer Dashboard • {user?.campus} Campus</p>
      </header>

      <div style={styles.statsGrid}>
        <StatCard label="Unread Alerts" value={unreadCount} tone="alert" />
        <StatCard label="Recent Updates" value={recentAlerts.length} />
      </div>

      <div style={styles.mainGridSingle}>
        <Section
          title="Security Updates"
          action={<Link to="/notifications" style={styles.link}>Open Notification Center</Link>}
        >
          <div style={styles.list}>
            {loading ? (
              <p style={styles.empty}>Loading security updates...</p>
            ) : recentAlerts.length === 0 ? (
              <p style={styles.empty}>No recent security updates</p>
            ) : recentAlerts.map(item => (
              <div key={item._id} style={styles.item}>
                <div>
                  <p style={styles.itemTitle}>{item.title}</p>
                  <p style={styles.itemSub}>{item.message}</p>
                </div>
                <span style={{ ...styles.badge, background: item.isRead ? '#e2e8f0' : '#fee2e2', color: item.isRead ? '#475569' : '#b91c1c' }}>
                  {item.isRead ? 'Read' : 'New'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Security Actions">
          <div style={styles.actions}>
            <Link to="/emergency" style={styles.emergencyBtn}>🚨 Publish Security Alert</Link>
            <Link to="/notifications" style={styles.actionLink}>🔔 Review Notifications</Link>
            <Link to="/settings" style={styles.actionLink}>⚙️ Security Settings</Link>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function DeanAcademicsDashboard() {
  const { user } = useAuth();
  const [pendingCirculars, setPendingCirculars] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    Promise.all([
      circularsAPI.getAll({ status: 'PENDING_DEAN' }),
      analyticsAPI.getOverview()
    ]).then(([c, s]) => {
      setPendingCirculars(c.data.circulars || []);
      setStats(s.data.overview || {});
    }).catch(() => {
      setPendingCirculars([]);
      setStats({});
    });
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dean of Academics Dashboard</h1>
        <p style={styles.subtitle}>Academic Governance • {user?.campus} Campus</p>
      </header>

      <div style={styles.statsGrid}>
        <StatCard label="Pending Academic Approvals" value={pendingCirculars.length} tone="alert" />
        <StatCard label="Total Innovations" value={stats.totalPosts || 0} />
        <StatCard label="Community Users" value={stats.totalUsers || 0} />
      </div>

      <div style={styles.mainGrid}>
        <Section
          title="Academic Circular Queue"
          action={<Link to="/circulars?status=PENDING" style={styles.link}>View Full Queue</Link>}
        >
          <div style={styles.list}>
            {pendingCirculars.length === 0 ? (
              <p style={styles.empty}>No pending dean approvals</p>
            ) : pendingCirculars.slice(0, 6).map(c => (
              <div key={c._id} style={styles.item}>
                <div>
                  <p style={styles.itemTitle}>{c.title}</p>
                  <p style={styles.itemSub}>{c.author?.name} • {c.category}</p>
                </div>
                <Link to={`/circulars/${c._id}`} style={styles.actionBtn}>Review</Link>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Academic Actions">
          <div style={styles.actions}>
            <Link to="/circulars?status=PENDING" style={styles.actionLink}>📋 Approve Circulars</Link>
            <Link to="/analytics" style={styles.actionLink}>📊 Academic Analytics</Link>
            <Link to="/users" style={styles.actionLink}>👥 Faculty & Student Directory</Link>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function DeanStudentWelfareDashboard() {
  const { user } = useAuth();
  const [pendingCirculars, setPendingCirculars] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    Promise.all([
      circularsAPI.getAll({ status: 'PENDING_DEAN' }),
      notificationsAPI.getAll({ limit: 6 })
    ]).then(([c, n]) => {
      setPendingCirculars(c.data.circulars || []);
      setNotifs(n.data.notifications || []);
    }).catch(() => {
      setPendingCirculars([]);
      setNotifs([]);
    });
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dean of Student Welfare Dashboard</h1>
        <p style={styles.subtitle}>Student Welfare Operations • {user?.campus} Campus</p>
      </header>

      <div style={styles.statsGrid}>
        <StatCard label="Pending Welfare Approvals" value={pendingCirculars.length} tone="alert" />
        <StatCard label="Recent Welfare Updates" value={notifs.length} />
      </div>

      <div style={styles.mainGrid}>
        <Section title="Welfare Circular Approvals" action={<Link to="/circulars?status=PENDING" style={styles.link}>Open Circulars</Link>}>
          <div style={styles.list}>
            {pendingCirculars.length === 0 ? (
              <p style={styles.empty}>No pending welfare circulars</p>
            ) : pendingCirculars.slice(0, 6).map(c => (
              <div key={c._id} style={styles.item}>
                <div>
                  <p style={styles.itemTitle}>{c.title}</p>
                  <p style={styles.itemSub}>{c.author?.name} • {c.category}</p>
                </div>
                <Link to={`/circulars/${c._id}`} style={styles.actionBtn}>Review</Link>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Welfare Actions">
          <div style={styles.actions}>
            <Link to="/circulars?status=PENDING" style={styles.actionLink}>📋 Welfare Approvals</Link>
            <Link to="/notifications" style={styles.actionLink}>🔔 Student Welfare Updates</Link>
            <Link to="/emergency" style={styles.emergencyBtn}>🚨 Send Welfare Emergency Notice</Link>
          </div>
        </Section>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '2.2rem', fontWeight: 800, margin: 0, color: 'var(--slate-900)' },
  subtitle: { color: 'var(--slate-500)', fontSize: '1.05rem', marginTop: '0.35rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' },
  statCard: { padding: '1.25rem', textAlign: 'center' },
  alertCard: { border: '1px solid #fecaca' },
  statLabel: { color: 'var(--slate-500)', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 700 },
  statValue: { fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' },
  mainGridSingle: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' },
  section: { padding: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 800, margin: 0 },
  link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.9rem', background: 'var(--slate-50)', borderRadius: '0.75rem' },
  itemTitle: { fontWeight: 700, margin: 0, fontSize: '0.92rem' },
  itemSub: { fontSize: '0.78rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' },
  actionBtn: { padding: '0.45rem 0.9rem', background: 'var(--primary)', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 },
  empty: { textAlign: 'center', color: 'var(--slate-400)', padding: '1.5rem' },
  actions: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  emergencyBtn: { padding: '0.9rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 800, textAlign: 'center', border: '1px solid #fecaca' },
  actionLink: { padding: '0.9rem', background: 'var(--slate-50)', color: 'var(--slate-700)', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 600, border: '1px solid var(--slate-100)' },
  badge: { fontSize: '0.72rem', fontWeight: 700, borderRadius: '999px', padding: '0.25rem 0.6rem', whiteSpace: 'nowrap' },
};