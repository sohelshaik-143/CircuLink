import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../api/axios';
import toast from 'react-hot-toast';
import BackButton from '../Layout/BackButton';

export default function Settings() {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        phone: user?.phone || '',
        password: '',
    });

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await usersAPI.updateProfile(form);
            if (data.success) {
                toast.success('Account updated successfully!');
                updateUser(data.user);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
            setForm(prev => ({ ...prev, password: '' })); // Clear password field after update
        }
    };

    return (
        <div style={styles.container}>
            <BackButton />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={styles.card}>
                <h1 style={styles.title}>⚙️ Account Settings</h1>
                <p style={styles.subtitle}>Manage your preferences, notifications, and security</p>

                {/* Account Updation Section */}
                <div style={styles.settingsSection}>
                    <h3 style={styles.sectionTitle}>Account Profile</h3>
                    <form onSubmit={handleUpdateAccount}>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input name="name" value={form.name} onChange={handleChange} style={styles.input} placeholder="Your Name" required />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input name="phone" value={form.phone} onChange={handleChange} style={styles.input} placeholder="+91 XXXXX XXXXX" />
                            </div>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Bio</label>
                            <textarea name="bio" value={form.bio} onChange={handleChange} style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Write something about yourself..." maxLength={300} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>New Password (leave blank to keep current)</label>
                            <input type="password" name="password" value={form.password} onChange={handleChange} style={styles.input} placeholder="••••••••" minLength={6} />
                        </div>
                        {/* Aligned Submit Button */}
                        <div style={styles.buttonContainer}>
                            <button type="submit" disabled={loading} style={styles.updateBtn}>
                                {loading ? 'Updating...' : 'Update Account'}
                            </button>
                        </div>
                    </form>
                </div>

                <div style={styles.settingsSection}>
                    <h3 style={styles.sectionTitle}>Notifications</h3>
                    <div style={styles.row}>
                        <span>Email Notifications</span>
                        <input type="checkbox" defaultChecked />
                    </div>
                    <div style={styles.row}>
                        <span>Push Notifications</span>
                        <input type="checkbox" defaultChecked />
                    </div>
                </div>

                    <div style={styles.row}>
                        <span>Dark Mode</span>
                        <input type="checkbox" checked={user?.theme === 'dark'} onChange={async (e) => {
                            const newTheme = e.target.checked ? 'dark' : 'light';
                            try {
                                const { data } = await usersAPI.updateProfile({ theme: newTheme });
                                updateUser(data.user);
                            } catch (err) { toast.error('Failed to change theme'); }
                        }} />
                    </div>

                <div style={styles.settingsSection}>
                    <h3 style={styles.sectionTitle}>Security</h3>
                    <button style={styles.btnSecondary}>Change Password</button>
                    <button style={styles.btnSecondary}>Setup MFA</button>
                </div>

                <div style={styles.footer}>
                    <button style={styles.saveBtn}>Save Settings</button>
                </div>
            </motion.div>
        </div>
    );
}

const styles = {
    container: { maxWidth: '720px', margin: '0 auto', padding: '2rem' },
    card: { padding: '2.5rem' },
    title: { fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1e293b' },
    subtitle: { color: '#64748b', marginBottom: '2rem' },
    settingsSection: { marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#334155' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: '#475569' },

    /* Form Styles */
    formRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
    formGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
    label: { fontSize: '0.9rem', fontWeight: 700, color: '#475569' },
    input: { padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border 0.2s', width: '100%', boxSizing: 'border-box' },
    buttonContainer: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' },
    updateBtn: { padding: '0.75rem 1.5rem', background: '#10B981', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },

    btnSecondary: { padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '0.5rem', color: '#475569', fontWeight: 600, cursor: 'pointer', marginRight: '0.5rem' },
    saveBtn: { padding: '0.75rem 2rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' },
    footer: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }
};
