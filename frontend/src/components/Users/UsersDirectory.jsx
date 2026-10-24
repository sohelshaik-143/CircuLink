import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI, communityAPI, getFileUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import BackButton from '../Layout/BackButton';
import ChatPanel from './ChatPanel';
import toast from 'react-hot-toast';

export default function UsersDirectory() {
    const { user, updateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampus, setFilterCampus] = useState('ALL');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [chatTarget, setChatTarget] = useState(null);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!user?.joinedCommunity) {
            setShowJoinModal(true);
        } else {
            fetchMembers();
        }
    }, [user]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const res = await usersAPI.getAll({ joinedCommunity: true });
            setUsers((res.data.users || []).filter(u => u.joinedCommunity));
        } catch (err) {
            toast.error('Failed to load community members');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setJoining(true);
        try {
            await communityAPI.join();
            updateUser({ joinedCommunity: true });
            setShowJoinModal(false);
            toast.success('Welcome to the community!');
            fetchMembers();
        } catch (err) {
            toast.error('Failed to join community');
        } finally {
            setJoining(false);
        }
    };

    const handleNotInterested = () => {
        setShowJoinModal(false);
        window.history.back();
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

            {/* Community Join Modal */}
            <AnimatePresence>
                {showJoinModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.85, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.85, y: 30 }}
                            style={styles.modal}
                        >
                            <div style={styles.modalIcon}>👥</div>
                            <h2 style={styles.modalTitle}>Join the Community?</h2>
                            <p style={styles.modalDesc}>
                                Connect with fellow RGUKT students across all campuses.
                                Send direct messages, share files and photos — all within the platform.
                            </p>
                            <div style={styles.modalFeatures}>
                                <span style={styles.feat}>🔒 End-to-end encrypted messages</span>
                                <span style={styles.feat}>📎 File & photo sharing</span>
                                <span style={styles.feat}>🏛️ Connect across campuses</span>
                                <span style={styles.feat}>🚫 No external email access</span>
                            </div>
                            <div style={styles.modalBtns}>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleJoin}
                                    disabled={joining}
                                    style={styles.joinBtn}
                                >
                                    {joining ? 'Joining...' : 'Yes, Join Community'}
                                </motion.button>
                                <button onClick={handleNotInterested} style={styles.notInterestedBtn}>
                                    Not Interested
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {user?.joinedCommunity && (
                <>
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={styles.header}>
                        <div>
                            <h1 style={styles.title}>👥 Community Directory</h1>
                            <p style={styles.subtitle}>{users.length} members • Connect and message peers across RGUKT</p>
                        </div>
                        <div style={styles.filters}>
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                            <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} style={styles.selectInput}>
                                <option value="ALL">All Campuses</option>
                                <option value="RK Valley">RK Valley</option>
                                <option value="Nuzvid">Nuzvid</option>
                                <option value="Basar">Basar</option>
                                <option value="Srikakulam">Srikakulam</option>
                                <option value="Ongole">Ongole</option>
                            </select>
                        </div>
                    </motion.div>

                    {loading ? (
                        <div style={styles.loading}>Loading community members...</div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.grid}>
                            {filteredUsers.length === 0 ? (
                                <div style={styles.empty}>No members found.</div>
                            ) : (
                                filteredUsers.map((u, i) => (
                                    <motion.div
                                        key={u._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        whileHover={{ y: -4, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                                        className="glass-card"
                                        style={styles.userCard}
                                    >
                                        <Link to={`/profile/${u._id}`} style={styles.cardLink}>
                                            <div style={styles.avatarWrapper}>
                                                {u.profilePicture ? (
                                                    <img src={getFileUrl(u.profilePicture)} alt="" style={styles.avatarImg} />
                                                ) : (
                                                    <div style={styles.avatar}>{u.name[0]}</div>
                                                )}
                                                <span style={styles.levelBadge}>{u.level}</span>
                                                {u.isOnline && <span style={styles.onlineDot} title="Online now" />}
                                            </div>
                                            <h3 style={styles.userName}>{u.name}</h3>
                                            <p style={styles.userMeta}>{u.branch} • {u.year || 'N/A'}</p>
                                            <span style={styles.campusTag}>{u.campus}</span>
                                        </Link>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setChatTarget(u)}
                                            style={styles.messageBtn}
                                        >
                                            💬 Message
                                        </motion.button>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </>
            )}

            {chatTarget && (
                <ChatPanel
                    targetUser={chatTarget}
                    currentUser={user}
                    onClose={() => setChatTarget(null)}
                />
            )}
        </div>
    );
}

const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
    title: { fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' },
    subtitle: { color: '#64748b', margin: 0, fontSize: '1rem' },
    filters: { display: 'flex', gap: '1rem' },
    searchInput: { padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.95rem', minWidth: '220px', outline: 'none' },
    selectInput: { padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', background: '#fff', cursor: 'pointer' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' },
    userCard: { padding: '1.5rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
    cardLink: { textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' },
    avatarWrapper: { position: 'relative', marginBottom: '0.5rem' },
    avatar: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 },
    avatarImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' },
    levelBadge: { position: 'absolute', bottom: '-4px', right: '-4px', background: '#F59E0B', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 5px', borderRadius: '999px' },
    onlineDot: { position: 'absolute', top: 0, left: 0, width: '14px', height: '14px', background: '#22c55e', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' },
    userName: { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1e293b' },
    userMeta: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
    campusTag: { background: '#EFF6FF', color: '#2563EB', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 },
    messageBtn: { width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' },

    loading: { textAlign: 'center', padding: '5rem', color: '#64748b' },
    empty: { gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#64748b', fontStyle: 'italic' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
    modal: { background: '#fff', borderRadius: '2rem', padding: '3rem 2.5rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' },
    modalIcon: { fontSize: '4rem', marginBottom: '1rem' },
    modalTitle: { fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem' },
    modalDesc: { color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' },
    modalFeatures: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem', textAlign: 'left' },
    feat: { fontSize: '0.9rem', color: '#334155', fontWeight: 600 },
    modalBtns: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    joinBtn: { padding: '1rem', borderRadius: '1rem', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer' },
    notInterestedBtn: { padding: '0.75rem', borderRadius: '1rem', border: 'none', background: 'none', color: '#94a3b8', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline' },
};
