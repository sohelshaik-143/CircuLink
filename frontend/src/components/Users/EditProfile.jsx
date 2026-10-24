import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usersAPI, getFileUrl } from '../../api/axios';
import toast from 'react-hot-toast';

const CAMPUSES = ['RK Valley', 'Nuzvid', 'Basar', 'Srikakulam', 'Ongole'];
const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
const YEARS = ['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4'];

export default function EditProfile({ user, onUpdate, onClose }) {
    const [form, setForm] = useState({
        name: user.name || '',
        bio: user.bio || '',
        phone: user.phone || '',
        campus: user.campus || '',
        branch: user.branch || '',
        year: user.year || '',
        language: user.language || 'en'
    });
    const [fileOptions, setFileOptions] = useState({
        file: null,
        previewUrl: user.profilePicture ? getFileUrl(user.profilePicture) : null
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileOptions({
                file,
                previewUrl: URL.createObjectURL(file)
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (fileOptions.file) {
                formData.append('profilePicture', fileOptions.file);
            }

            const { data } = await usersAPI.updateProfile(formData);
            if (data.success) {
                toast.success('Profile updated successfully!');
                onUpdate(data.user);
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={styles.modal}
            >
                <div style={styles.header}>
                    <h2 style={styles.title}>Edit Profile</h2>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.avatarSection}>
                        <div style={styles.avatarPreview}>
                            {fileOptions.previewUrl ? (
                                <img src={fileOptions.previewUrl} alt="Profile Preview" style={styles.avatarImg} />
                            ) : (
                                <div style={styles.avatarPlaceholder}>{form.name?.[0]?.toUpperCase() || '?'}</div>
                            )}
                        </div>
                        <div style={styles.avatarActions}>
                            <label style={styles.uploadLabel}>
                                Upload New Avatar
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                            <span style={styles.uploadHint}>JPG, PNG or GIF (Max 2MB)</span>
                        </div>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Full Name</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Your Name"
                            required
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Current Campus</label>
                        <select
                            name="campus"
                            value={form.campus}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        >
                            <option value="">Select Campus</option>
                            {CAMPUSES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <p style={styles.hint}>Transfer students should select their current active campus.</p>
                    </div>

                    {['STUDENT', 'FACULTY', 'HOD'].includes(user.role) && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Branch</label>
                                <select name="branch" value={form.branch} onChange={handleChange} style={styles.input}>
                                    <option value="">Select Branch</option>
                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            {user.role === 'STUDENT' && (
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>Year</label>
                                    <select name="year" value={form.year} onChange={handleChange} style={styles.input}>
                                        <option value="">Select Year</option>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={styles.field}>
                        <label style={styles.label}>Bio</label>
                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            style={{ ...styles.input, height: '100px', resize: 'none' }}
                            placeholder="Write something about yourself..."
                            maxLength={300}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Phone Number</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    <div style={styles.footer}>
                        <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={styles.saveBtn}>
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: '1rem'
    },
    modal: {
        width: '100%', maxWidth: '500px', padding: '2rem', background: '#fff',
        maxHeight: '90vh', overflowY: 'auto', borderRadius: '1.5rem',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    title: { fontSize: '1.5rem', fontWeight: 800, margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' },
    form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.9rem', fontWeight: 700, color: '#475569' },
    input: {
        padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #94afd2ff',
        fontSize: '1rem', outline: 'none', transition: 'border 0.2s'
    },

    avatarSection: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' },
    avatarPreview: { width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 },
    avatarActions: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    uploadLabel: { padding: '0.5rem 1rem', background: '#f1f5f9', color: '#334155', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center', transition: 'background 0.2s' },
    uploadHint: { fontSize: '0.75rem', color: '#94a3b8' },

    hint: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' },
    footer: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' },
    cancelBtn: { padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' },
    saveBtn: { padding: '0.75rem 2rem', borderRadius: '0.5rem', border: 'none', fontWeight: 700, cursor: 'pointer' }
};
