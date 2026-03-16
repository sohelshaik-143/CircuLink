import React, { useState, useEffect } from 'react';
import { analyticsAPI, usersAPI } from '../../api/axios';
import BackButton from '../Layout/BackButton';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState({});
  const [branchActivity, setBranchActivity] = useState([]);
  const [topicTrends, setTopicTrends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getBranchActivity(),
      analyticsAPI.getTopicTrends(),
      usersAPI.getLeaderboard({ limit: 10 }),
      analyticsAPI.getAuditLogs({ limit: 10 }).catch(() => ({ data: { logs: [] } })),
    ]).then(([o, b, t, l, a]) => {
      setOverview(o.data.overview || {});
      setBranchActivity(b.data.branchActivity || []);
      setTopicTrends(t.data.trends || []);
      setLeaderboard(l.data.leaderboard || []);
      setAuditLogs(a.data.logs || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading analytics...</div>;

  // Chart data
  const branchChartData = {
    labels: branchActivity.map(b => b.branch),
    datasets: [
      { label: 'Posts', data: branchActivity.map(b => b.posts), backgroundColor: '#3B82F6' },
      { label: 'Students', data: branchActivity.map(b => b.students), backgroundColor: '#10B981' },
      { label: 'Circulars', data: branchActivity.map(b => b.circulars), backgroundColor: '#F59E0B' },
    ],
  };

  const topicChartData = {
    labels: topicTrends.slice(0, 6).map(t => t._id),
    datasets: [{
      data: topicTrends.slice(0, 6).map(t => t.count),
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'],
    }],
  };

  const statCards = [
    { label: 'Total Users', value: overview.totalUsers || 0, icon: '👥', color: '#3B82F6' },
    { label: 'Total Posts', value: overview.totalPosts || 0, icon: '💡', color: '#10B981' },
    { label: 'Circulars Published', value: overview.totalCirculars || 0, icon: '📋', color: '#F59E0B' },
    { label: 'Pending Approvals', value: overview.pendingCirculars || 0, icon: '⏳', color: '#EF4444' },
  ];

  return (
    <div style={styles.container}>
      <BackButton />
      <h1 style={styles.heading}>📊 Analytics Dashboard</h1>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <span style={{ fontSize: '2rem' }}>{s.icon}</span>
            <div>
              <p style={styles.statNum}>{s.value.toLocaleString()}</p>
              <p style={styles.statLabel}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.twoCol}>
        {/* Branch Activity Chart */}
        <div style={styles.chart}>
          <h2 style={styles.chartTitle}>Branch Activity</h2>
          <Bar data={branchChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
        </div>

        {/* Topic Distribution */}
        <div style={styles.chart}>
          <h2 style={styles.chartTitle}>Topic Distribution</h2>
          {topicTrends.length > 0 ? (
            <Doughnut data={topicChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No topic data yet</p>}
        </div>
      </div>

      {/* Leaderboard */}
      <div style={styles.card}>
        <h2 style={styles.chartTitle}>🏆 Top Contributors Leaderboard</h2>
        <div style={styles.leaderboard}>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1.5rem' }}>No data yet</p>
          ) : leaderboard.map((u, i) => (
            <div key={u._id} style={styles.leaderItem}>
              <span style={{ ...styles.rank, background: i === 0 ? '#F59E0B' : i === 1 ? '#94a3b8' : i === 2 ? '#B45309' : '#f1f5f9', color: i < 3 ? '#fff' : '#64748b' }}>
                {i + 1}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {u.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>{u.name}</p>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.75rem' }}>{u.branch} • {u.campus}</p>
              </div>
              <span style={styles.points}>⭐ {u.points}</span>
              <span style={{ ...styles.level, background: '#EDE9FE', color: '#7C3AED' }}>{u.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs */}
      {auditLogs.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.chartTitle}>🔍 Recent Audit Logs</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Campus</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log._id} style={styles.tr}>
                    <td style={styles.td}>{log.user?.name}</td>
                    <td style={styles.td}><span style={styles.actionChip}>{log.action?.replace('_', ' ')}</span></td>
                    <td style={styles.td}>{log.user?.role}</td>
                    <td style={styles.td}>{log.user?.campus}</td>
                    <td style={styles.td}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' },
  heading: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { background: '#fff', borderRadius: '1rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  statNum: { fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  statLabel: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' },
  chart: { background: '#fff', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  chartTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' },
  card: { background: '#fff', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '1.5rem' },
  leaderboard: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  leaderItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: '#f8fafc' },
  rank: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 },
  points: { fontWeight: 700, color: '#D97706', fontSize: '0.875rem' },
  level: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  tableHeader: { background: '#f8fafc' },
  th: { padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.625rem 0.75rem', color: '#4b5563' },
  actionChip: { background: '#EFF6FF', color: '#3B82F6', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 },
};
