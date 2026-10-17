import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI, usersAPI } from '../../api/axios';
import BackButton from '../Layout/BackButton';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const REFRESH_INTERVAL = 30000; // 30s live refresh

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState({});
  const [branchActivity, setBranchActivity] = useState([]);
  const [topicTrends, setTopicTrends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [campusFilter, setCampusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (campusFilter !== 'ALL') params.campus = campusFilter;
      if (branchFilter !== 'ALL') params.branch = branchFilter;

      const [o, b, t, l, a] = await Promise.all([
        analyticsAPI.getOverview(params),
        analyticsAPI.getBranchActivity(),
        analyticsAPI.getTopicTrends(),
        usersAPI.getLeaderboard({ limit: 10, ...params }),
        analyticsAPI.getAuditLogs({ limit: 8 }).catch(() => ({ data: { logs: [] } })),
      ]);
      setOverview(o.data.overview || {});
      setBranchActivity(b.data.branchActivity || []);
      setTopicTrends(t.data.trends || []);
      setLeaderboard(l.data.leaderboard || []);
      setAuditLogs(a.data.logs || []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [campusFilter, branchFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  const BRANCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4'];

  const branchChart = {
    labels: branchActivity.map(b => b.branch),
    datasets: [
      { label: 'Students', data: branchActivity.map(b => b.students), backgroundColor: '#3b82f6', borderRadius: 6 },
      { label: 'Posts', data: branchActivity.map(b => b.posts), backgroundColor: '#10b981', borderRadius: 6 },
      { label: 'Circulars', data: branchActivity.map(b => b.circulars), backgroundColor: '#f59e0b', borderRadius: 6 },
    ],
  };

  const topicChart = {
    labels: topicTrends.slice(0, 7).map(t => t._id || 'Other'),
    datasets: [{
      data: topicTrends.slice(0, 7).map(t => t.count),
      backgroundColor: BRANCH_COLORS,
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const campusChart = {
    labels: (overview.campusBreakdown || []).map(c => c._id),
    datasets: [{
      label: 'Students',
      data: (overview.campusBreakdown || []).map(c => c.count),
      backgroundColor: BRANCH_COLORS.map(c => c + '33'),
      borderColor: BRANCH_COLORS,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  };

  const statCards = [
    { label: 'Total Users', value: overview.totalUsers ?? 0, icon: '👥', color: '#3b82f6', bg: '#eff6ff', sub: `${overview.totalStudents ?? 0} students` },
    { label: 'Community Members', value: overview.communityMembers ?? 0, icon: '🤝', color: '#8b5cf6', bg: '#f5f3ff', sub: 'Opted in' },
    { label: 'Online Now', value: overview.onlineUsers ?? 0, icon: '🟢', color: '#10b981', bg: '#f0fdf4', sub: 'Active right now' },
    { label: 'Published Posts', value: overview.totalPosts ?? 0, icon: '💡', color: '#f59e0b', bg: '#fffbeb', sub: 'Innovations' },
    { label: 'Circulars', value: overview.totalCirculars ?? 0, icon: '📋', color: '#ef4444', bg: '#fef2f2', sub: 'Published' },
    { label: 'Pending Approval', value: overview.pendingCirculars ?? 0, icon: '⏳', color: '#64748b', bg: '#f8fafc', sub: 'Awaiting review' },
  ];

  const levelColor = { Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#6366f1', Expert: '#ef4444' };
  const rankBg = ['#f59e0b', '#94a3b8', '#b45309'];

  return (
    <div style={S.page}>
      <BackButton />

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📊 Analytics Dashboard</h1>
          <p style={S.subtitle}>
            {lastUpdated ? `Live · Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading live data...'}
          </p>
        </div>
        <div style={S.filters}>
          <select value={campusFilter} onChange={e => setCampusFilter(e.target.value)} style={S.select}>
            <option value="ALL">All Campuses</option>
            {['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'Ongole'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={S.select}>
            <option value="ALL">All Branches</option>
            {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={() => fetchData()} style={S.refreshBtn} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {loading && <div style={S.loadingBar}><div style={S.loadingFill} /></div>}

      {/* Stat Cards */}
      <div style={S.statsGrid}>
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ ...S.statCard, background: s.bg, borderLeft: `4px solid ${s.color}` }}>
            <div style={{ ...S.statIcon, color: s.color }}>{s.icon}</div>
            <div>
              <p style={{ ...S.statNum, color: s.color }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
              <p style={S.statLabel}>{s.label}</p>
              <p style={S.statSub}>{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={S.twoCol}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={S.chartCard}>
          <h2 style={S.chartTitle}>Branch Activity</h2>
          <p style={S.chartSub}>Students, posts & circulars per branch</p>
          {branchActivity.length > 0
            ? <Bar data={branchChart} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { grid: { display: false } } } }} />
            : <Empty text="No branch data yet" />}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={S.chartCard}>
          <h2 style={S.chartTitle}>Topic Trends</h2>
          <p style={S.chartSub}>Most discussed innovation topics</p>
          {topicTrends.length > 0
            ? <Doughnut data={topicChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }} />
            : <Empty text="No topic data yet" />}
        </motion.div>
      </div>

      {/* Campus Distribution */}
      {(overview.campusBreakdown?.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...S.chartCard, marginBottom: '1.5rem' }}>
          <h2 style={S.chartTitle}>Campus Student Distribution</h2>
          <p style={S.chartSub}>Live count of enrolled students per campus</p>
          <Line data={campusChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
        </motion.div>
      )}

      {/* Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...S.chartCard, marginBottom: '1.5rem' }}>
        <div style={S.cardHead}>
          <div>
            <h2 style={S.chartTitle}>🏆 Live Leaderboard</h2>
            <p style={S.chartSub}>Top students by reputation points</p>
          </div>
        </div>
        {leaderboard.length === 0 ? <Empty text="No leaderboard data yet" /> : (
          <div style={S.lbList}>
            {leaderboard.map((u, i) => (
              <motion.div key={u._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} style={S.lbRow}>
                <div style={{ ...S.lbRank, background: i < 3 ? rankBg[i] : '#f1f5f9', color: i < 3 ? '#fff' : '#64748b' }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </div>
                <div style={S.lbAvatar}>
                  {u.profilePicture
                    ? <img src={`http://localhost:5000${u.profilePicture}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : u.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={S.lbName}>{u.name}</p>
                  <p style={S.lbMeta}>{u.branch} • {u.campus} • {u.collegeId}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={S.lbPoints}>⭐ {u.points.toLocaleString()}</p>
                  <span style={{ ...S.lbLevel, background: levelColor[u.level] + '20', color: levelColor[u.level] }}>{u.level}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Audit Logs */}
      {auditLogs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={S.chartCard}>
          <h2 style={S.chartTitle}>🔍 Recent Activity Logs</h2>
          <p style={S.chartSub}>Admin/dean/director view only</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['User', 'Action', 'Role', 'Campus', 'Time'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log._id || log.id} style={S.tr}>
                    <td style={S.td}>
                      <span style={{ fontWeight: 700 }}>{log.user?.name || log.userName || 'System User'}</span><br />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{log.user?.collegeId || ''}</span>
                    </td>
                    <td style={S.td}><span style={S.actionChip}>{log.action?.replace(/_/g, ' ')}</span></td>
                    <td style={S.td}>{log.user?.role || '—'}</td>
                    <td style={S.td}>{log.user?.campus || '—'}</td>
                    <td style={S.td}>
                      {log.createdAt 
                        ? (() => {
                            const d = new Date(typeof log.createdAt === 'string' ? log.createdAt.replace(' ', 'T') : log.createdAt);
                            return isNaN(d.getTime()) ? String(log.createdAt) : d.toLocaleString();
                          })()
                        : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const Empty = ({ text }) => (
  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '0.75rem' }}>
    <p style={{ margin: 0, fontWeight: 600 }}>{text}</p>
  </div>
);

const S = {
  page: { maxWidth: '1280px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' },
  title: { fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' },
  subtitle: { fontSize: '0.85rem', color: '#10b981', fontWeight: 600, margin: 0 },
  filters: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '0.55rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', outline: 'none' },
  refreshBtn: { padding: '0.55rem 1rem', borderRadius: '0.75rem', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' },

  loadingBar: { height: '3px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.5rem' },
  loadingFill: { height: '100%', width: '40%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '999px', animation: 'pulse 1.5s infinite' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' },
  statCard: { borderRadius: '1rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: '2rem', lineHeight: 1, flexShrink: 0 },
  statNum: { fontSize: '1.85rem', fontWeight: 800, margin: 0, lineHeight: 1 },
  statLabel: { fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: '0.2rem 0 0' },
  statSub: { fontSize: '0.72rem', color: '#94a3b8', margin: '0.1rem 0 0' },

  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  chartCard: { background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  chartTitle: { fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem' },
  chartSub: { fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 1.25rem', fontWeight: 500 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },

  lbList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  lbRow: { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #f1f5f9' },
  lbRank: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 },
  lbAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden', flexShrink: 0 },
  lbName: { fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lbMeta: { fontSize: '0.75rem', color: '#94a3b8', margin: '0.1rem 0 0' },
  lbPoints: { fontWeight: 800, color: '#d97706', fontSize: '0.9rem', margin: 0 },
  lbLevel: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '500px' },
  th: { padding: '0.7rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.7rem 0.85rem', color: '#4b5563', verticalAlign: 'middle' },
  actionChip: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' },
};
