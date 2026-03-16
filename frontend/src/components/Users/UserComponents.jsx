import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI, postsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import EditProfile from './EditProfile';
import BackButton from '../Layout/BackButton';
import ChatPanel from './ChatPanel';
import toast from 'react-hot-toast';

// ─── Leaderboard ────────────────────────────────────────────────────────────
export function Leaderboard() {
    const { user: currentUser } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [campus, setCampus] = useState('ALL');
    const [branch, setBranch] = useState('ALL');

    const fetchLeaderboard = (c, b) => {
        setLoading(true);
        const params = { limit: 50 };
        if (c !== 'ALL') params.campus = c;
        if (b !== 'ALL') params.branch = b;
        usersAPI.getLeaderboard(params)
            .then(res => setLeaderboard(res.data.leaderboard || []))
            .catch(() => toast.error('Failed to load leaderboard'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLeaderboard(campus, branch); }, [campus, branch]);

    const rankBg = ['linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#94a3b8,#64748b)', 'linear-gradient(135deg,#b45309,#92400e)'];
    const levelColor = { Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#6366f1', Expert: '#ef4444' };
    const myRank = leaderboard.findIndex(u => u._id === currentUser?._id);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <BackButton />
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', borderRadius: '1.5rem', padding: '2.5rem', marginBottom: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(99,102,241,0.3), transparent 60%)', pointerEvents: 'none' }} />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.4rem', position: 'relative' }}>🏆 Leaderboard</h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 1.5rem', position: 'relative' }}>Live rankings — sorted by reputation points</p>
                {myRank >= 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 700, position: 'relative' }}>
                        🎯 Your rank: <strong>#{myRank + 1}</strong> of {leaderboard.length}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <select value={campus} onChange={e => setCampus(e.target.value)} style={lbS.select}>
                    <option value="ALL">All Campuses</option>
                    {['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'Ongole'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={branch} onChange={e => setBranch(e.target.value)} style={lbS.select}>
                    <option value="ALL">All Branches</option>
                    {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    {leaderboard.length} students ranked
                </span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading rankings...</div>
            ) : leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '1rem' }}>No students found for this filter.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {leaderboard.map((u, i) => {
                        const isMe = u._id === currentUser?._id;
                        return (
                            <motion.div
                                key={u._id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                style={{ ...lbS.row, ...(isMe ? lbS.myRow : {}) }}
                            >
                                <div style={{ ...lbS.rank, background: i < 3 ? rankBg[i] : '#f1f5f9', color: i < 3 ? '#fff' : '#64748b', fontSize: i < 3 ? '1rem' : '0.85rem' }}>
                                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                </div>
                                <Link to={`/profile/${u._id}`} style={lbS.info}>
                                    <div style={lbS.avatar}>
                                        {u.profilePicture
                                            ? <img src={`http://localhost:5000${u.profilePicture}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            : u.name[0]}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={lbS.name}>{u.name} {isMe && <span style={lbS.youBadge}>You</span>}</p>
                                        <p style={lbS.meta}>{u.branch} • {u.campus} • {u.collegeId}</p>
                                    </div>
                                </Link>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={lbS.pts}>⭐ {u.points.toLocaleString()}</p>
                                    <span style={{ ...lbS.level, background: (levelColor[u.level] || '#10b981') + '20', color: levelColor[u.level] || '#10b981' }}>{u.level}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const lbS = {
    select: { padding: '0.55rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', outline: 'none' },
    row: { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.25rem', borderRadius: '1rem', background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    myRow: { border: '2px solid #6366f1', background: '#faf5ff' },
    rank: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 },
    info: { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, textDecoration: 'none' },
    avatar: { width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', overflow: 'hidden', flexShrink: 0 },
    name: { fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' },
    youBadge: { background: '#6366f1', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px', fontWeight: 800 },
    meta: { fontSize: '0.75rem', color: '#94a3b8', margin: '0.1rem 0 0' },
    pts: { fontWeight: 800, color: '#d97706', margin: 0, fontSize: '0.95rem' },
    level: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 },
};

// ─── User Profile / Portfolio ───────────────────────────────────────────────
export function UserProfile() {
    const { id } = useParams();
    const { user: currentUser, updateUser } = useAuth();
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const targetId = id || currentUser?._id;

    useEffect(() => {
        if (!targetId) return;
        setLoading(true);
        Promise.all([
            usersAPI.getOne(targetId),
            postsAPI.getAll({ author: targetId })
        ]).then(([uRes, pRes]) => {
            setUser(uRes.data.user);
            setPosts(pRes.data.posts || []);
            setIsFollowing(uRes.data.user.followers?.some(f => (f._id || f)?.toString() === currentUser?._id?.toString()));
        }).catch(() => toast.error('User not found'))
            .finally(() => setLoading(false));
    }, [targetId, currentUser?._id]);

    const handleFollow = async () => {
        try {
            const res = await usersAPI.follow(targetId);
            setIsFollowing(res.data.following);
            setUser(prev => ({
                ...prev,
                followers: res.data.isFollowing
                    ? [...(prev.followers || []), currentUser._id]
                    : (prev.followers || []).filter(fid => fid !== currentUser._id)
            }));

            // Update current user context if they are following someone new
            const updatedFollowing = res.data.isFollowing
                ? [...(currentUser.following || []), targetId]
                : (currentUser.following || []).filter(fid => fid !== targetId);

            updateUser({ ...currentUser, following: updatedFollowing });
            toast.success(res.data.isFollowing ? 'Following user' : 'Unfollowed user');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to toggle follow status');
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `${user.name}'s RGUKT Portfolio`,
                text: `Check out ${user.name}'s academic achievements and innovations on the RGUKT Platform!`,
                url: url,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Profile link copied to clipboard!');
        }
    };

    if (loading) return <div style={styles.loading}>Loading Portfolio...</div>;
    if (!user) return <div style={styles.error}>User not found</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.container}
        >
            <BackButton />
            {/* Premium Header Profile Card */}
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={styles.profileHeader}
                className="glass-card"
            >
                <div style={styles.profileTop}>
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        style={user.profilePicture ? styles.largeAvatarImgWrapper : styles.largeAvatar}
                    >
                        {user.profilePicture ? (
                            <img src={`http://localhost:5000${user.profilePicture}`} alt={user.name} style={styles.largeAvatarImg} />
                        ) : (
                            user.name[0]
                        )}
                    </motion.div>

                    <div style={{ flex: 1 }}>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={styles.profileName}
                        >
                            {user.name}
                        </motion.h1>
                        <motion.p
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={styles.profileMeta}
                        >
                            {user.role} • {user.branch} • {user.campus}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                            style={styles.statsRow}
                        >
                            <div style={styles.statBox}>
                                <strong style={styles.statValue}>{user.points}</strong>
                                <span style={styles.statLabel}>Academics</span>
                            </div>
                            <div style={styles.statBox}>
                                <strong style={styles.statValue}>{posts.length}</strong>
                                <span style={styles.statLabel}>Innovations</span>
                            </div>
                            <div style={styles.statBox}>
                                <strong style={styles.statValue}>{user.followers?.length || 0}</strong>
                                <span style={styles.statLabel}>Network</span>
                            </div>
                        </motion.div>
                    </div>

                    <div style={styles.actionArea}>
                        {id && id !== currentUser?._id && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={isFollowing ? "btn-secondary" : "btn-primary"}
                                    style={styles.actionBtn}
                                    onClick={handleFollow}
                                >
                                    {isFollowing ? 'Followed' : 'Follow'}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="btn-secondary"
                                    style={{ ...styles.actionBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => setShowChat(true)}
                                >
                                    💬 Message
                                </motion.button>
                            </>
                        )}
                        {(!id || id === currentUser?._id) && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-premium" style={styles.actionBtn} onClick={() => setShowEdit(true)}>
                                Edit Profile
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn-secondary"
                            style={{ ...styles.actionBtn, padding: '0.75rem 1rem' }}
                            onClick={handleShare}
                            title="Share Profile"
                        >
                            🔗 Share
                        </motion.button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    style={styles.bioSection}
                >
                    <p style={styles.bio}>{user.bio || "This scholar hasn't added a biography yet."}</p>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {showEdit && (
                    <EditProfile
                        user={user}
                        onClose={() => setShowEdit(false)}
                        onUpdate={(updated) => {
                            setUser(prev => ({ ...prev, ...updated }));
                            updateUser(updated);
                        }}
                    />
                )}
                {showChat && (
                    <ChatPanel targetUser={user} currentUser={currentUser} onClose={() => setShowChat(false)} />
                )}
            </AnimatePresence>

            <div style={styles.portfolioGrid}>
                {/* Innovations Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                    style={{ gridColumn: 'span 2' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={styles.sectionTitle}>Innovation Portfolio</h2>
                        <span style={styles.sectionBadge}>{posts.length} Projects</span>
                    </div>

                    <div style={styles.postList}>
                        {posts.length === 0 ? (
                            <div className="glass-card" style={styles.empty}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
                                No innovations shared yet.
                            </div>
                        ) : posts.map((p, idx) => (
                            <motion.div
                                key={p._id}
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    delay: 0.5 + (idx * 0.1),
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 20
                                }}
                                whileHover="hover"
                                variants={{
                                    hover: {
                                        y: -8,
                                        scale: 1.02,
                                        boxShadow: "0 25px 30px -5px rgba(59, 130, 246, 0.15), 0 15px 15px -5px rgba(59, 130, 246, 0.1)",
                                        borderColor: "rgba(59, 130, 246, 0.4)",
                                        transition: { type: "spring", stiffness: 300, damping: 15 }
                                    }
                                }}
                                className="glass-card"
                                style={{
                                    ...styles.postCard,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Advanced glowing hover effect overlay */}
                                <motion.div
                                    variants={{
                                        hover: { opacity: 1 }
                                    }}
                                    initial={{ opacity: 0 }}
                                    style={{
                                        position: 'absolute', inset: 0,
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 100%)',
                                        zIndex: 0,
                                        pointerEvents: 'none'
                                    }}
                                />

                                <Link to={`/posts/${p._id}`} style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={styles.postTitle}>{p.title}</h3>
                                        <motion.span
                                            variants={{ hover: { backgroundColor: '#DBEAFE', color: '#1D4ED8' } }}
                                            style={styles.postType}
                                        >
                                            {p.type.replace('_', ' ')}
                                        </motion.span>
                                    </div>
                                    <p style={styles.postSnippet}>{p.content.slice(0, 160)}...</p>

                                    <div style={styles.topicsRow}>
                                        {p.topics?.slice(0, 3).map(t => (
                                            <motion.span
                                                key={t}
                                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(59,130,246,0.2)' }}
                                                style={styles.topicChip}
                                            >
                                                {t}
                                            </motion.span>
                                        ))}
                                    </div>

                                    <div style={styles.postFooter}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <motion.span whileHover={{ scale: 1.2, color: '#EF4444' }}>❤️ {p.likes?.length || 0}</motion.span>
                                            <motion.span whileHover={{ scale: 1.2, color: '#3B82F6' }}>💬 {p.comments?.length || 0}</motion.span>
                                        </div>
                                        <span>{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Achievements Section */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                    <h2 style={styles.sectionTitle}>Achievements</h2>
                    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring" }} className="glass-card" style={styles.achievementCard}>

                        <div style={styles.levelRing}>
                            <div style={styles.levelInner}>
                                <span style={styles.levelLvl}>LVL</span>
                                <span style={styles.levelText}>{user.level}</span>
                            </div>
                        </div>

                        <h3 style={styles.badgesTitle}>Earned Badges</h3>
                        <div style={styles.badges}>
                            {user.badges?.length > 0 ? user.badges.map((b, i) => (
                                <motion.span
                                    key={b}
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + (i * 0.1), type: "spring" }}
                                    style={styles.badgePill}
                                >
                                    🏅 {b}
                                </motion.span>
                            )) : <p style={styles.emptySmall}>Learning journey just started.</p>}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
}

const styles = {
    container: { maxWidth: '1000px', margin: '0 auto', padding: '2rem' },
    loading: { textAlign: 'center', padding: '5rem', color: '#64748b', fontSize: '1.2rem' },
    card: { padding: '2.5rem' },
    title: { fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1e293b' },
    subtitle: { color: '#64748b', marginBottom: '2rem' },
    list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    leaderItem: {
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
        background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0'
    },
    rank: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' },
    userInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
    name: { fontWeight: 700, margin: 0 },
    meta: { fontSize: '0.8rem', color: '#64748b', margin: 0 },
    points: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    pointVal: { fontWeight: 800, color: '#b45309' },
    levelBadge: { fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 },

    profileHeader: { padding: '3rem', marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))', borderTop: '4px solid var(--primary)', position: 'relative', overflow: 'hidden' },
    profileTop: { display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 },
    largeAvatar: { width: '120px', height: '120px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 800, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' },
    largeAvatarImgWrapper: { width: '120px', height: '120px', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' },
    largeAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    profileName: { fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a', letterSpacing: '-0.02em' },
    profileMeta: { fontSize: '1.05rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 500 },
    statsRow: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
    statBox: { background: 'rgba(255,255,255,0.6)', padding: '0.75rem 1.5rem', borderRadius: '1rem', border: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' },
    statValue: { fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' },
    statLabel: { fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    actionArea: { display: 'flex', gap: '1rem', alignSelf: 'flex-start' },
    actionBtn: { padding: '0.75rem 2rem', borderRadius: '999px', fontWeight: 700 },
    bioSection: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(226,232,240,0.6)', position: 'relative', zIndex: 1 },
    bio: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, fontStyle: 'italic', maxWidth: '800px' },

    portfolioGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' },
    sectionTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a', letterSpacing: '-0.01em' },
    sectionBadge: { background: '#EFF6FF', color: 'var(--primary)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 },
    postList: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    postCard: { padding: '1.75rem', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(226,232,240,0.8)' },
    postType: { background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' },
    postTitle: { fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem' },
    postSnippet: { color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1rem 0' },
    topicsRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
    topicChip: { background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },
    postFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 },

    achievementCard: { padding: '2rem', background: 'linear-gradient(to bottom right, #fff, #F8FAFC)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
    levelRing: { width: '120px', height: '120px', borderRadius: '50%', background: 'conic-gradient(var(--primary) 70%, #e2e8f0 30%)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(59,130,246,0.2)' },
    levelInner: { width: '100%', height: '100%', background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    levelLvl: { fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '-2px' },
    levelText: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' },
    badgesTitle: { fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '1rem', margin: 0, alignSelf: 'flex-start' },
    badges: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' },
    badgePill: { background: '#FEF3C7', color: '#B45309', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '4px' },
    empty: { textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    emptySmall: { fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' },
    error: { textAlign: 'center', padding: '5rem', color: '#ef4444', fontWeight: 600, fontSize: '1.2rem' }
};
