import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { circularsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import BackButton from '../Layout/BackButton';

const PRIORITY_STYLE = {
  LOW: { bg: '#F1F5F9', color: '#64748b' },
  MEDIUM: { bg: '#FEF3C7', color: '#D97706' },
  HIGH: { bg: '#FEE2E2', color: '#DC2626' },
  URGENT: { bg: '#EF4444', color: '#fff' },
};

const STATUS_STYLE = {
  DRAFT: '#94a3b8', PENDING_HOD: '#F59E0B', PENDING_DEAN: '#F97316',
  PENDING_DIRECTOR: '#EF4444', APPROVED: '#10B981', PUBLISHED: '#3B82F6', REJECTED: '#EF4444',
};

// ─── Circular List ──────────────────────────────────────────────────────────
export function CircularList() {
  const { user, canApprove, canCreateCircular } = useAuth();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') === 'PENDING' ? `PENDING_${user?.role === 'DSW' ? 'DEAN' : user?.role}` : '';
  
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', priority: '', status: initialStatus || '' });
  const [showForm, setShowForm] = useState(false);

  const loadCirculars = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await circularsAPI.getAll(params);
      setCirculars(data.circulars || []);
    } catch { setCirculars([]); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadCirculars(); }, [loadCirculars]);

  // Sync filters with search params for approvals
  useEffect(() => {
    if (searchParams.get('status') === 'PENDING') {
      const pendingStatus = `PENDING_${user?.role === 'DSW' ? 'DEAN' : user?.role}`;
      setFilters(prev => ({ ...prev, status: pendingStatus }));
    } else if (!searchParams.get('status')) {
      setFilters(prev => ({ ...prev, status: '' }));
    }
  }, [searchParams, user?.role]);

  const markRead = async (id) => {
    await circularsAPI.markRead(id);
    setCirculars(prev => prev.map(c => c._id === id ? { ...c, isRead: true } : c));
  };

  const handleApprove = async (id) => {
    const comment = prompt('Add approval comment (optional):');
    try {
      await circularsAPI.approve(id, comment);
      toast.success('Circular approved!');
      loadCirculars();
    } catch (err) { toast.error(err.response?.data?.message || 'Approval failed'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
      await circularsAPI.reject(id, reason);
      toast.success('Circular rejected.');
      loadCirculars();
    } catch (err) { toast.error(err.response?.data?.message || 'Rejection failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this circular?')) return;
    try {
      await circularsAPI.delete(id);
      toast.success('Circular deleted');
      loadCirculars();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const CATEGORIES = ['', 'ACADEMIC', 'ADMINISTRATIVE', 'EXAM', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'PLACEMENT', 'SPORTS', 'CULTURAL'];

  return (
    <div style={styles.container}>
      <BackButton to="/dashboard" />
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Circulars</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canCreateCircular && (
            <button onClick={() => setShowForm(true)} style={styles.newBtn}>+ New Circular</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} style={styles.select}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} style={styles.select}>
          <option value="">All Priorities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {canApprove && (
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={styles.select}>
            <option value="">All Status</option>
            <option value="PENDING_HOD">Pending HOD</option>
            <option value="PENDING_DEAN">Pending Dean</option>
            <option value="PENDING_DIRECTOR">Pending Director</option>
            <option value="PUBLISHED">Published</option>
          </select>
        )}
      </div>

      {/* List */}
      {loading ? <p style={styles.loading}>Loading...</p> : (
        circulars.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p>No circulars found</p>
          </div>
        ) : circulars.map(c => (
          <div key={c._id} 
            style={{ ...styles.card, borderLeft: `4px solid ${STATUS_STYLE[c.status] || '#94a3b8'}`, background: c.isRead ? '#fff' : '#EFF6FF' }}>
            <div style={styles.cardTop} onClick={() => markRead(c._id)}>
              <div style={{ flex: 1 }}>
                <Link to={`/circulars/${c._id}`} style={{ textDecoration: 'none' }}>
                  <div style={styles.cardHeader}>
                    {!c.isRead && <span style={styles.unreadDot} />}
                    <h3 style={styles.cardTitle}>{c.title}</h3>
                  </div>
                </Link>
                <p style={styles.cardNum}>{c.circularNumber} • {c.category} • {c.author?.name}</p>
              </div>
              <div style={styles.badges}>
                <span style={{ ...styles.priorityBadge, background: PRIORITY_STYLE[c.priority]?.bg, color: PRIORITY_STYLE[c.priority]?.color }}>
                  {c.priority}
                </span>
                <span style={{ ...styles.statusBadge, background: STATUS_STYLE[c.status] + '20', color: STATUS_STYLE[c.status] }}>
                  {c.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <Link to={`/circulars/${c._id}`} style={{ textDecoration: 'none' }}>
              <p style={styles.cardContent}>{c.content?.slice(0, 150)}...</p>
            </Link>

            {/* Approval Chain */}
            <div style={styles.approvalChain}>
              {c.approvalChain?.map((step, i) => (
                <div key={i} style={{ ...styles.approvalStep, background: step.status === 'APPROVED' ? '#F0FDF4' : step.status === 'REJECTED' ? '#FEF2F2' : '#F8FAFC' }}>
                  <span style={{ fontSize: '0.75rem', color: step.status === 'APPROVED' ? '#16A34A' : step.status === 'REJECTED' ? '#DC2626' : '#94a3b8' }}>
                    {step.status === 'APPROVED' ? '✅' : step.status === 'REJECTED' ? '❌' : '⏳'} {step.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Approval buttons */}
            {canApprove && (c.status === `PENDING_${user?.role}` || (user?.role === 'DSW' && c.status === 'PENDING_DEAN')) && (
              <div style={styles.approvalActions}>
                <button onClick={(e) => { e.stopPropagation(); handleApprove(c._id); }} style={styles.approveBtn}>
                  ✅ Approve
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleReject(c._id); }} style={styles.rejectBtn}>
                  ❌ Reject
                </button>
              </div>
            )}

            {/* Delete button for author/HOD+ */}
            {(c.author?._id === user?._id || ['HOD', 'DSW', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user?.role)) && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}
                style={styles.deleteBtn}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        ))
      )}

      {showForm && <CircularForm onClose={() => { setShowForm(false); loadCirculars(); }} />}
    </div>
  );
}

// ─── Circular Form (Modal) ──────────────────────────────────────────────────
export function CircularForm({ onClose }) {
  const [form, setForm] = useState({
    title: '', content: '', category: 'ACADEMIC', priority: 'MEDIUM',
    targetBranches: ['ALL'], targetCampuses: ['ALL'], targetYears: ['ALL'],
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (Array.isArray(form[key])) formData.append(key, JSON.stringify(form[key]));
        else formData.append(key, form[key]);
      });
      files.forEach(f => formData.append('attachments', f));

      await circularsAPI.create(formData);
      toast.success('Circular submitted for approval!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create circular');
    } finally { setLoading(false); }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Create New Circular</h2>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <Field label="Title *">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Circular title" style={modalStyles.input} required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={modalStyles.input}>
                {['ACADEMIC', 'ADMINISTRATIVE', 'EXAM', 'EVENT', 'HOLIDAY', 'PLACEMENT', 'SPORTS', 'CULTURAL'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={modalStyles.input}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Content *">
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Circular content..." rows={5}
              style={{ ...modalStyles.input, resize: 'vertical' }} required />
          </Field>
          <Field label="Attachments">
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} style={modalStyles.input} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Upload PDFs, Images, or Docs (Max 5)</p>
          </Field>
          <div style={modalStyles.footer}>
            <button type="button" onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={modalStyles.submitBtn}>
              {loading ? 'Submitting...' : '📤 Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  newBtn: { padding: '0.625rem 1.25rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' },
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  select: { padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.85rem', background: '#fff' },
  loading: { textAlign: 'center', padding: '3rem', color: '#64748b' },
  empty: { textAlign: 'center', padding: '3rem', color: '#9ca3af' },
  card: { background: '#fff', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.15s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  unreadDot: { width: '8px', height: '8px', background: '#3B82F6', borderRadius: '50%', flexShrink: 0 },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 },
  cardNum: { fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0' },
  badges: { display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' },
  priorityBadge: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700 },
  statusBadge: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700 },
  cardContent: { fontSize: '0.875rem', color: '#4b5563', margin: '0.5rem 0', lineHeight: 1.5 },
  approvalChain: { display: 'flex', gap: '0.5rem', margin: '0.75rem 0' },
  approvalStep: { padding: '4px 10px', borderRadius: '999px', border: '1px solid #e2e8f0' },
  approvalActions: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' },
  approveBtn: { padding: '0.5rem 1.25rem', background: '#10B981', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' },
  rejectBtn: { padding: '0.5rem 1.25rem', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' },
  deleteBtn: {
    background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem',
    fontWeight: 700, cursor: 'pointer', marginTop: '0.75rem', opacity: 0.6,
    transition: 'opacity 0.2s',
  },
};

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#fff', borderRadius: '1.25rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 0' },
  title: { fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' },
  form: { padding: '1.5rem' },
  input: { width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  footer: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' },
  cancelBtn: { padding: '0.625rem 1.25rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 },
  submitBtn: { padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700 },
};
