import React from 'react';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.7))',
            border: '1px solid var(--glass-border, rgba(226, 232, 240, 0.8))',
            borderRadius: '1rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <div style={{ width: '40%', height: '14px', borderRadius: '4px', background: '#e2e8f0' }} />
              <div style={{ width: '20%', height: '10px', borderRadius: '4px', background: '#cbd5e1' }} />
            </div>
          </div>
          <div style={{ width: '80%', height: '18px', borderRadius: '4px', background: '#e2e8f0', marginTop: '0.5rem' }} />
          <div style={{ width: '100%', height: '12px', borderRadius: '4px', background: '#cbd5e1' }} />
          <div style={{ width: '90%', height: '12px', borderRadius: '4px', background: '#cbd5e1' }} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ width: '60px', height: '24px', borderRadius: '12px', background: '#e2e8f0' }} />
            <div style={{ width: '60px', height: '24px', borderRadius: '12px', background: '#e2e8f0' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
