import React from 'react';
import { motion } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import BackButton from '../Layout/BackButton';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
    const { notifications, markRead, markAllRead, deleteNotification } = useNotifications();

    return (
        <div style={styles.container}>
            <BackButton />
            <div style={styles.header}>
                <h1 style={styles.title}>🔔 Notifications</h1>
                {notifications.some(n => !n.isRead) && (
                    <button onClick={markAllRead} style={styles.markAllBtn}>
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>All caught up!</h3>
                    <p style={{ color: '#64748b' }}>Check back later for new updates.</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {notifications.map((n, idx) => (
                        <motion.div
                            key={n._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{
                                ...styles.card,
                                background: n.isRead ? '#fff' : '#EFF6FF',
                                borderColor: n.isRead ? '#f1f5f9' : '#BFDBFE'
                            }}
                        >
                            <div style={styles.cardHeader}>
                                <h3 style={styles.cardTitle}>{n.title}</h3>
                                <span style={styles.cardTime}>
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <p style={styles.cardMsg}>{n.message}</p>

                            <div style={styles.cardActions}>
                                {!n.isRead && (
                                    <button onClick={() => markRead(n._id)} style={styles.actionBtnRead}>
                                        ✓ Mark Read
                                    </button>
                                )}
                                <button onClick={() => deleteNotification(n._id)} style={styles.actionBtnDel}>
                                    🗑️ Delete
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1rem'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 800,
        color: '#1e293b'
    },
    markAllBtn: {
        background: '#E0E7FF',
        color: '#4F46E5',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.875rem'
    },
    emptyState: {
        textAlign: 'center',
        padding: '5rem 2rem',
        background: '#fff',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    card: {
        padding: '1.5rem',
        borderRadius: '1rem',
        border: '1px solid',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'transform 0.2s ease',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
    },
    cardTitle: {
        fontWeight: 700,
        fontSize: '1.1rem',
        color: '#0f172a',
        margin: 0
    },
    cardTime: {
        fontSize: '0.75rem',
        color: '#64748b',
        whiteSpace: 'nowrap',
        marginLeft: '1rem'
    },
    cardMsg: {
        color: '#475569',
        lineHeight: 1.5,
        margin: '0 0 1rem 0'
    },
    cardActions: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingTop: '0.75rem'
    },
    actionBtnRead: {
        background: 'transparent',
        border: 'none',
        color: '#10B981',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.85rem'
    },
    actionBtnDel: {
        background: 'transparent',
        border: 'none',
        color: '#EF4444',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.85rem'
    }
};
