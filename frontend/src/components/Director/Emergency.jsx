import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { circularsAPI } from '../../api/axios';
import BackButton from '../Layout/BackButton';
import toast from 'react-hot-toast';

export default function Emergency() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await circularsAPI.emergency({ title: 'EMERGENCY ALERT', content: message, targetCampuses: ['ALL'] });
      toast.success('Emergency broadcast sent to all users!', {
        icon: '📢',
        style: { background: '#EF4444', color: '#fff' }
      });
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <BackButton to="/dashboard" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={styles.card}
      >
        <div style={styles.header}>
          <span style={styles.icon}>🚨</span>
          <h1 style={styles.title}>Emergency Dashboard</h1>
          <p style={styles.subtitle}>Broadcast urgent alerts to all campus members instantly.</p>
        </div>

        <form onSubmit={handleBroadcast} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Alert Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="System-wide emergency announcement..."
              style={styles.textarea}
              rows={6}
              required
            />
          </div>

          <div style={styles.options}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isCritical}
                onChange={e => setIsCritical(e.target.checked)}
                style={styles.checkbox}
              />
              Mark as Critical (High Priority)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !message.trim()}
            style={{
              ...styles.broadcastBtn,
              background: isCritical ? '#EF4444' : 'var(--primary)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Broadcasting...' : '📢 Send System-Wide Alert'}
          </button>
        </form>

        <div style={styles.recentAlerts}>
          <h3 style={styles.sectionTitle}>Recent Broadcasts</h3>
          <div style={styles.empty}>No alerts sent in the last 24 hours.</div>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  container: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  card: { padding: '3rem', borderTop: '4px solid #EF4444' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  icon: { fontSize: '3.5rem', display: 'block', marginBottom: '1rem' },
  title: { fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 },
  subtitle: { color: 'var(--slate-500)', marginTop: '0.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-700)' },
  textarea: {
    width: '100%',
    padding: '1.25rem',
    borderRadius: '1.25rem',
    border: '1.5px solid var(--slate-200)',
    fontSize: '1rem',
    outline: 'none',
    resize: 'none',
    background: 'var(--slate-50)',
    transition: 'all 0.2s',
  },
  options: { display: 'flex', alignItems: 'center' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--slate-600)', cursor: 'pointer', fontWeight: 600 },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  broadcastBtn: {
    padding: '1.25rem',
    borderRadius: '1.25rem',
    color: '#fff',
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  recentAlerts: { marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--slate-100)' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '1rem' },
  empty: { textAlign: 'center', padding: '2rem', color: 'var(--slate-400)', border: '2px dashed var(--slate-100)', borderRadius: '1rem' }
};
