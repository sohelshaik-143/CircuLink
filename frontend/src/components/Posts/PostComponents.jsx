// PostCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, getFileUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import BackButton from '../Layout/BackButton';

const TOPIC_COLORS = { AI: '#3B82F6', ML: '#8B5CF6', Robotics: '#F59E0B', IoT: '#10B981', Research: '#EF4444', 'Social Service': '#6366F1', Blockchain: '#F97316', 'Web Dev': '#06B6D4', 'Data Science': '#84CC16' };

export function PostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const isLiked = post.likes?.includes(user?._id);

  const handleLike = async () => {
    try {
      await postsAPI.like(post._id);
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to like post');
    }
  };

  const handleDelete = async () => {
    console.log('handleDelete clicked for post:', post._id);
    // if (!window.confirm('Are you sure you want to delete this post?')) return;
    console.log('Proceeding with deletion...');
    try {
      await postsAPI.delete(post._id);
      toast.success('Post deleted');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleEndorse = async () => {
    const msg = prompt('Add an endorsement message (optional):');
    try {
      await postsAPI.endorse(post._id, msg);
      toast.success('Post endorsed!');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to endorse');
    }
  };

  const canEndorse = ['FACULTY', 'HOD', 'DEAN', 'DIRECTOR', 'DSW'].includes(user?.role);

  return (
    <div style={cardStyles.card}>
      {/* Author */}
      <div style={cardStyles.author}>
        <div style={{ ...cardStyles.avatar, background: '#3B82F6' }}>
          {post.author?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p style={cardStyles.authorName}>{post.author?.name}</p>
          <p style={cardStyles.authorMeta}>{post.author?.role} • {post.author?.branch} • {post.author?.campus}</p>
        </div>
        <span style={cardStyles.type}>{post.type?.replace('_', ' ')}</span>
      </div>

      {/* Content */}
      <Link to={`/posts/${post._id}`} style={{ textDecoration: 'none' }}>
        <h3 style={cardStyles.title}>{post.title}</h3>
        <p style={cardStyles.content}>{post.content?.slice(0, 200)}{post.content?.length > 200 ? '...' : ''}</p>
      </Link>

      {/* Attachments */}
      {post.attachments?.length > 0 && (
        <div style={cardStyles.attachmentsGrid}>
          {post.attachments.map((file, idx) => (
            file.type === 'image' ? (
              <a key={idx} href={getFileUrl(file.url)} target="_blank" rel="noreferrer">
                <img src={getFileUrl(file.url)} alt={file.filename} style={cardStyles.imgAttachment} />
              </a>
            ) : (
              <a key={idx} href={getFileUrl(file.url)} target="_blank" rel="noreferrer" style={cardStyles.docAttachment}>
                📎 {file.filename.length > 20 ? file.filename.slice(0, 20) + '...' : file.filename}
              </a>
            )
          ))}
        </div>
      )}

      {/* Topics */}
      {post.topics?.length > 0 && (
        <div style={cardStyles.topics}>
          {post.topics.map(t => (
            <span key={t} style={{ ...cardStyles.topic, background: (TOPIC_COLORS[t] || '#6B7280') + '20', color: TOPIC_COLORS[t] || '#6B7280' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Endorsements */}
      {post.endorsements?.length > 0 && (
        <div style={cardStyles.endorseBanner}>
          ✅ Endorsed by {post.endorsements.length} faculty member{post.endorsements.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Actions */}
      <div style={cardStyles.actions}>
        <button onClick={handleLike} style={{ ...cardStyles.actionBtn, color: isLiked ? '#EF4444' : '#64748b' }}>
          {isLiked ? '❤️' : '🤍'} {post.likes?.length || 0}
        </button>
        <Link to={`/posts/${post._id}`} style={cardStyles.actionBtn}>
          💬 {post.comments?.length || 0}
        </Link>
        <button style={cardStyles.actionBtn}>🔗 {post.shares || 0}</button>
        <span style={cardStyles.views}>👁️ {post.views || 0}</span>
        {canEndorse && (
          <button onClick={handleEndorse} style={{ ...cardStyles.actionBtn, color: '#10B981', fontWeight: 700 }}>
            ✅ Endorse
          </button>
        )}
        {(post.author?._id === user?._id || ['HOD', 'DEAN', 'DIRECTOR', 'ADMIN'].includes(user?.role)) && (
          <button onClick={handleDelete} style={{ ...cardStyles.actionBtn, color: '#EF4444' }}>
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

// PostFeed.jsx
export function PostFeed() {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({ branch: '', topic: '', type: '', search: '' });
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const BRANCHES = ['', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
  const TOPICS = ['', 'AI', 'ML', 'Robotics', 'IoT', 'Research', 'Social Service', 'Blockchain', 'Web Dev', 'Data Science'];
  const TYPES = ['', 'INNOVATION', 'RESEARCH', 'PROJECT', 'IDEA', 'SOCIAL_SERVICE', 'ACHIEVEMENT'];

  const loadPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await postsAPI.getAll(params);
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, [filters, page]);

  React.useEffect(() => { loadPosts(); }, [loadPosts]);

  return (
    <div style={feedStyles.container}>
      <BackButton to="/dashboard" />
      {/* Filters */}
      <div style={feedStyles.filters}>
        <input
          placeholder="Search posts..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          style={feedStyles.searchInput}
        />
        <select value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })} style={feedStyles.select}>
          {BRANCHES.map(b => <option key={b} value={b}>{b || 'All Branches'}</option>)}
        </select>
        <select value={filters.topic} onChange={e => setFilters({ ...filters, topic: e.target.value })} style={feedStyles.select}>
          {TOPICS.map(t => <option key={t} value={t}>{t || 'All Topics'}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} style={feedStyles.select}>
          {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
        <Link to="/posts/new" style={feedStyles.newBtn}>+ New Post</Link>
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading posts...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
          <p>No posts found. Be the first to share an innovation!</p>
          <Link to="/posts/new" style={{ color: '#3B82F6', fontWeight: 600 }}>Create a post →</Link>
        </div>
      ) : posts.map(p => (
        <PostCard key={p._id} post={p} onUpdate={loadPosts} />
      ))}

      {/* Pagination */}
      {total > 10 && (
        <div style={feedStyles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={feedStyles.pageBtn}>← Prev</button>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Page {page} • {total} posts</span>
          <button onClick={() => setPage(p => p + 1)} disabled={posts.length < 10} style={feedStyles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

// PostForm.jsx
export function PostForm() {
  const { user } = useAuth();
  const [form, setForm] = React.useState({
    title: '', content: '', type: 'PROJECT',
    topics: [], tags: '', visibility: 'PUBLIC',
  });
  const [files, setFiles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const TOPIC_OPTIONS = ['AI', 'ML', 'Robotics', 'IoT', 'Research', 'Social Service', 'Blockchain', 'Web Dev', 'Data Science', 'Cloud', 'Cybersecurity'];

  const toggleTopic = (t) => {
    setForm(f => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content required.');
    setLoading(true);
    try {
      if (files.length > 0) {
        const formData = new FormData();
        Object.keys(form).forEach(key => {
          if (key === 'topics') form.topics.forEach(t => formData.append('topics', t));
          else if (key === 'tags') formData.append('tags', form.tags.split(',').map(t => t.trim()).filter(Boolean).join(','));
          else formData.append(key, form[key]);
        });
        files.forEach(f => formData.append('attachments', f));
        await postsAPI.createWithFiles(formData);
      } else {
        const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
        await postsAPI.create(payload);
      }

      toast.success('Post published! +10 points 🎉');
      window.location.href = '/posts';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post.');
    } finally { setLoading(false); }
  };

  return (
    <div style={formStyles.container}>
      <BackButton />
      <h1 style={formStyles.heading}>✍️ Share Your Innovation</h1>
      <form onSubmit={handleSubmit} style={formStyles.form}>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Title *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. AI-Powered Smart Irrigation System" style={formStyles.input} required />
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={formStyles.select}>
            {['PROJECT', 'RESEARCH', 'INNOVATION', 'IDEA', 'SOCIAL_SERVICE', 'ACHIEVEMENT', 'GENERAL'].map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Topics (select all that apply)</label>
          <div style={formStyles.topicGrid}>
            {TOPIC_OPTIONS.map(t => (
              <button key={t} type="button" onClick={() => toggleTopic(t)}
                style={{ ...formStyles.topicChip, ...(form.topics.includes(t) ? formStyles.topicActive : {}) }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Content *</label>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Describe your project, research, or idea in detail..."
            rows={8} style={{ ...formStyles.input, resize: 'vertical' }} required />
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Attachments (Images, PDFs, Docs)</label>
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} style={formStyles.fileInput} />
          {files.length > 0 && (
            <div style={formStyles.fileList}>
              {files.map((f, i) => <span key={i} style={formStyles.fileBadge}>{f.name}</span>)}
            </div>
          )}
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="arduino, machine-learning, iot" style={formStyles.input} />
        </div>
        <div style={formStyles.field}>
          <label style={formStyles.label}>Visibility</label>
          <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} style={formStyles.select}>
            <option value="PUBLIC">Public (All Campuses)</option>
            <option value="CAMPUS">Campus Only</option>
            <option value="BRANCH">Branch Only</option>
          </select>
        </div>
        <div style={formStyles.actions}>
          <button type="button" onClick={() => window.history.back()} style={formStyles.cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} style={formStyles.submitBtn}>
            {loading ? 'Publishing...' : '🚀 Publish Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

const cardStyles = {
  card: { background: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' },
  author: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  authorName: { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', margin: 0 },
  authorMeta: { fontSize: '0.75rem', color: '#64748b', margin: 0 },
  type: { marginLeft: 'auto', background: '#EFF6FF', color: '#3B82F6', padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 },
  title: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' },
  content: { fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '0.75rem' },
  topics: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  topic: { padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },
  attachmentsGrid: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', marginTop: '0.5rem' },
  imgAttachment: { width: '120px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.2s' },
  docAttachment: { background: '#F1F5F9', color: '#334155', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' },
  endorseBanner: { background: '#F0FDF4', color: '#15803D', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' },
  views: { marginLeft: 'auto', color: '#9ca3af', fontSize: '0.8rem' },
};

const feedStyles = {
  container: { maxWidth: '720px', margin: '0 auto', padding: '1.5rem' },
  filters: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: 1, minWidth: '180px', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' },
  select: { padding: '0.5rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.8rem', background: '#fff' },
  newBtn: { padding: '0.5rem 1rem', background: '#3B82F6', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' },
  pageBtn: { padding: '0.5rem 1rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' },
};

const formStyles = {
  container: { maxWidth: '720px', margin: '0 auto', padding: '1.5rem' },
  heading: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' },
  form: { background: '#fff', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' },
  input: { width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.9rem', background: '#fff' },
  topicGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  topicChip: { padding: '0.375rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '999px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 },
  topicActive: { background: '#EFF6FF', borderColor: '#3B82F6', color: '#3B82F6', fontWeight: 700 },
  fileInput: { width: '100%', padding: '0.5rem', border: '1.5px dashed #cbd5e1', borderRadius: '0.75rem', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem' },
  fileList: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' },
  fileBadge: { background: '#E0E7FF', color: '#4F46E5', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600 },
  actions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: { padding: '0.75rem 1.5rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  submitBtn: { padding: '0.75rem 2rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' },
};
