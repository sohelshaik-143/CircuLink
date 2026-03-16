import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function BackButton({ to, label = 'Back' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <motion.button
      whileHover={{ x: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleBack}
      style={styles.btn}
      className="glass"
    >
      <span style={styles.icon}>←</span>
      <span style={styles.label}>{label}</span>
      <div style={styles.glow} />
    </motion.button>
  );
}

const styles = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 1.25rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--glass-border)',
    background: 'var(--glass-bg)',
    color: 'var(--slate-600)',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    marginBottom: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s',
  },
  icon: { fontSize: '1.1rem' },
  label: { letterSpacing: '0.02em' },
  glow: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.5s',
  }
};
