import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { circularsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../Layout/BackButton';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  DRAFT: '#94a3b8', PENDING_HOD: '#F59E0B', PENDING_DEAN: '#F97316',
  PENDING_DIRECTOR: '#EF4444', APPROVED: '#10B981', PUBLISHED: '#3B82F6', REJECTED: '#EF4444',
};

export default function CircularDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [circular, setCircular] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this circular?')) return;
    try {
      await circularsAPI.delete(id);
      toast.success('Circular deleted');
      navigate('/circulars');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  useEffect(() => {
    const fetchCircular = async () => {
      try {
        const { data } = await circularsAPI.getOne(id);
        setCircular(data.circular);
      } catch (err) {
        console.error('Fetch circular error detailed:', err.response?.data);
        toast.error('Failed to load circular details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCircular();
  }, [id]);

  if (loading) return <div style={styles.loading}>Loading circular details...</div>;
  if (!circular) return (
    <div style={styles.container}>
      <BackButton to="/circulars" />
      <div style={styles.error}>Circular not found.</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <BackButton to="/circulars" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={styles.card}
      >
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 style={styles.title}>{circular.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {(circular.author?._id === user?._id || ['HOD', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user?.role)) && (
                <button onClick={handleDelete} style={styles.deleteBtn}>🗑️ Delete</button>
              )}
              <span style={{ 
                ...styles.statusBadge, 
                background: STATUS_STYLE[circular.status] + '20', 
                color: STATUS_STYLE[circular.status] 
              }}>
                {circular.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <p style={styles.meta}>
            #{circular.circularNumber} • {circular.category} • Posted by {circular.author?.name} on {new Date(circular.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div style={styles.content}>
          {circular.content?.split('\n').map((line, i) => (
            <p key={i} style={styles.text}>{line}</p>
          ))}
        </div>

        {circular.attachments?.length > 0 && (
          <div style={styles.attachmentsSection}>
            <h3 style={styles.sectionTitle}>Attachments</h3>
            <div style={styles.attachmentsGrid}>
              {circular.attachments.map((file, idx) => (
                <a 
                  key={idx} 
                  href={`http://localhost:5000${file.url}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={styles.attachmentLink}
                >
                  <span style={styles.attachmentIcon}>{file.type === 'image' ? '🖼️' : '📄'}</span>
                  <div style={styles.attachmentInfo}>
                    <p style={styles.attachmentName}>{file.filename}</p>
                    <p style={styles.attachmentSize}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <span style={styles.downloadIcon}>⬇️</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={styles.approvalSection}>
          <h3 style={styles.sectionTitle}>Approval Workflow</h3>
          <div style={styles.chain}>
            {circular.approvalChain?.map((step, i) => (
              <div key={i} style={styles.step}>
                <div style={{
                  ...styles.stepIndicator,
                  background: step.status === 'APPROVED' ? '#10B981' : step.status === 'REJECTED' ? '#EF4444' : '#e2e8f0'
                }}>
                  {step.status === 'APPROVED' ? '✓' : step.status === 'REJECTED' ? '✕' : i + 1}
                </div>
                <div style={styles.stepDetails}>
                  <p style={styles.stepRole}>{step.role} Approval</p>
                  <p style={styles.stepStatus}>
                    {step.status} {step.approvedBy && `by ${step.approvedBy.name}`}
                  </p>
                  {step.comment && <p style={styles.stepComment}>"{step.comment}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  loading: { textAlign: 'center', padding: '5rem', color: 'var(--slate-500)' },
  error: { textAlign: 'center', padding: '5rem', color: 'var(--danger)' },
  card: { padding: '3rem', background: 'var(--glass-bg)' },
  header: { marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' },
  title: { fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.5rem', lineHeight: 1.2 },
  statusBadge: { padding: '4px 12px', borderRadius: 'full', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' },
  meta: { color: 'var(--slate-500)', fontSize: '0.9rem', fontWeight: 500 },
  content: { marginBottom: '3rem' },
  text: { fontSize: '1.1rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' },
  attachmentsSection: { marginBottom: '3rem', background: 'var(--slate-50)', padding: '1.5rem', borderRadius: '1rem' },
  attachmentsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' },
  attachmentLink: { 
    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
    background: '#fff', borderRadius: '0.75rem', textDecoration: 'none',
    border: '1px solid var(--slate-200)', transition: 'all 0.2s'
  },
  attachmentIcon: { fontSize: '1.5rem' },
  attachmentInfo: { flex: 1 },
  attachmentName: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)', margin: 0 },
  attachmentSize: { fontSize: '0.75rem', color: 'var(--slate-500)', margin: 0 },
  downloadIcon: { opacity: 0.5 },
  approvalSection: { paddingTop: '2rem', borderTop: '1px solid var(--slate-100)' },
  chain: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  step: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  stepIndicator: { 
    width: '32px', height: '32px', borderRadius: '50%', color: '#fff', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem',
    flexShrink: 0
  },
  stepDetails: { flex: 1 },
  stepRole: { fontWeight: 800, fontSize: '1rem', color: 'var(--slate-800)', margin: 0 },
  stepStatus: { fontSize: '0.85rem', color: 'var(--slate-500)', margin: '0.25rem 0' },
  stepComment: { fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginTop: '0.5rem' },
  deleteBtn: { padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }
};
