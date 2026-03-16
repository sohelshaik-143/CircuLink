import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { PostCard } from './PostComponents';

export function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        loadPost();
    }, [id]);

    const loadPost = async () => {
        try {
            setLoading(true);
            const { data } = await postsAPI.getOne(id);
            setPost(data.post);
        } catch (err) {
            toast.error('Failed to load post');
            navigate('/posts');
        } finally {
            setLoading(false);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            await postsAPI.comment(id, commentText);
            setCommentText('');
            toast.success('Comment added!');
            loadPost(); // Reload to get new comments
        } catch (err) {
            toast.error('Failed to add comment');
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: post?.title,
                text: 'Check out this post on the RGUKT Platform!',
                url: url,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
        }
    };

    if (loading) return <div style={styles.loading}>Loading post...</div>;
    if (!post) return null;

    return (
        <div style={styles.container}>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

            <div style={styles.mainPost}>
                {/* We reuse the PostCard for the main display, just pass the post */}
                <PostCard post={post} onUpdate={loadPost} />

                {/* Extra actions for Detail View */}
                <div style={styles.detailActions}>
                    {(post.author?._id === user?._id || ['ADMIN', 'DEAN', 'DIRECTOR'].includes(user?.role)) && (
                        <button 
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this innovation post?')) {
                                    try {
                                        await postsAPI.delete(id);
                                        toast.success('Post deleted successfully');
                                        navigate('/posts');
                                    } catch (err) {
                                        toast.error('Failed to delete post');
                                    }
                                }
                            }} 
                            style={styles.deleteBtn}
                        >
                            🗑️ Delete Post
                        </button>
                    )}
                    <button onClick={handleShare} style={styles.shareBtn}>🔗 Share Post</button>
                </div>
            </div>

            <div className="glass-card" style={styles.commentsSection}>
                <h3 style={styles.commentsTitle}>Comments ({post.comments?.length || 0})</h3>

                <form onSubmit={handleComment} style={styles.commentForm}>
                    <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a constructive comment..."
                        style={styles.commentInput}
                    />
                    <button type="submit" style={styles.commentBtn}>Post</button>
                </form>

                <div style={styles.commentList}>
                    {post.comments?.length === 0 ? (
                        <p style={styles.emptyComments}>No comments yet. Be the first to start the discussion!</p>
                    ) : (
                        post.comments?.map((c, i) => (
                            <div key={i} style={styles.commentItem}>
                                <div style={styles.commentAvatar}>{c.author?.name?.[0]?.toUpperCase() || '?'}</div>
                                <div style={styles.commentBody}>
                                    <div style={styles.commentHeader}>
                                        <strong>{c.author?.name || 'Unknown User'}</strong>
                                        <span style={styles.commentTime}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={styles.commentContent}>{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: '720px', margin: '0 auto', padding: '1.5rem' },
    loading: { textAlign: 'center', padding: '3rem', color: '#64748b' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center' },
    mainPost: { marginBottom: '2rem' },
    detailActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem', marginBottom: '1rem', gap: '0.75rem' },
    deleteBtn: { padding: '0.4rem 1rem', background: '#fee2e2', color: '#ef4444', borderRadius: '0.5rem', border: '1px solid #fecaca', fontWeight: 600, cursor: 'pointer' },
    shareBtn: { padding: '0.4rem 1rem', background: '#e2e8f0', color: '#475569', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' },
    commentsSection: { padding: '1.5rem', background: '#fff' },
    commentsTitle: { margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#1e293b' },
    commentForm: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
    commentInput: { flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' },
    commentBtn: { padding: '0.75rem 1.5rem', background: '#3b82f6', color: '#fff', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' },
    commentList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    emptyComments: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' },
    commentItem: { display: 'flex', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' },
    commentAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    commentBody: { flex: 1 },
    commentHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' },
    commentTime: { color: '#64748b', fontSize: '0.8rem' },
    commentContent: { margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.4 }
};
