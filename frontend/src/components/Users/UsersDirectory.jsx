import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usersAPI } from '../../api/axios';
import { Link } from 'react-router-dom';
import BackButton from '../Layout/BackButton';
import toast from 'react-hot-toast';

export default function UsersDirectory() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampus, setFilterCampus] = useState('ALL');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await usersAPI.getAll();
            setUsers(res.data.users || []);
        } catch (err) {
            toast.error('Failed to load community members');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.collegeId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCampus = filterCampus === 'ALL' || u.campus === filterCampus;
        return matchesSearch && matchesCampus;
    });

    return (
        <div style={styles.container}>
            <BackButton />
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.header}
            >
                <div>
                    <h1 style={styles.title}>👥 Community Directory</h1>
                    <p style={styles.subtitle}>Connect with peers, innovators, and mentors across RGUKT.</p>
                </div>

                <div style={styles.filters}>
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={filterCampus}
                        onChange={(e) => setFilterCampus(e.target.value)}
                        style={styles.selectInput}
                    >
                        <option value="ALL">All Campuses</option>
                        <option value="RK Valley">RK Valley</option>
                        <option value="Nuzvid">Nuzvid</option>
                        <option value="Basar">Basar</option>
                        <option value="Srikakulam">Srikakulam</option>
                    </select>
                </div>
            </motion.div>

            {loading ? (
                <div style={styles.loading}>Loading community...</div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={styles.grid}
                >
                    {filteredUsers.length === 0 ? (
                        <div style={styles.empty}>No members found matching your criteria.</div>
                    ) : (
                        filteredUsers.map((u, i) => (
                            <motion.div
                                key={u._id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                className="glass-card"
                                style={styles.userCard}
                            >
                                <Link to={`/profile/${u._id}`} style={styles.cardLink}>
                                    <div style={styles.avatarWrapper}>
                                        <div style={styles.avatar}>{u.name[0]}</div>
                                        <span style={styles.levelBadge}>{u.level}</span>
                                    </div>
                                    <h3 style={styles.userName}>{u.name}</h3>
                                    <p style={styles.userMeta}>{u.branch} • {u.year || 'N/A'}</p>
                                    <span style={styles.campusTag}>{u.campus}</span>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    title: {
        fontSize: '2rem',
        fontWeight: 800,
        color: '#0f172a',
        margin: '0 0 0.5rem 0',
        letterSpacing: '-0.02em'
    },
    subtitle: {
        color: '#64748b',
        margin: 0,
        fontSize: '1.1rem'
    },
    filters: {
        display: 'flex',
        gap: '1rem'
    },
    searchInput: {
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        fontSize: '0.95rem',
        minWidth: '250px',
        outline: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    selectInput: {
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        fontSize: '0.95rem',
        outline: 'none',
        background: '#fff',
        cursor: 'pointer'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem'
    },
    userCard: {
        padding: '1.5rem',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative'
    },
    cardLink: {
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: '1rem'
    },
    avatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        fontWeight: 800,
        boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
    },
    levelBadge: {
        position: 'absolute',
        bottom: '-5px',
        right: '-5px',
        background: '#F59E0B',
        color: '#fff',
        fontSize: '0.65rem',
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: '999px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    userName: {
        fontSize: '1.1rem',
        fontWeight: 700,
        margin: '0 0 0.25rem 0',
        color: '#1e293b'
    },
    userMeta: {
        fontSize: '0.85rem',
        color: '#64748b',
        margin: '0 0 0.75rem 0',
        fontWeight: 500
    },
    campusTag: {
        background: '#EFF6FF',
        color: '#2563EB',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 700
    },
    loading: {
        textAlign: 'center',
        padding: '5rem',
        color: '#64748b',
        fontSize: '1.2rem'
    },
    empty: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '4rem',
        background: '#f8fafc',
        borderRadius: '1rem',
        color: '#64748b',
        fontStyle: 'italic'
    }
};
