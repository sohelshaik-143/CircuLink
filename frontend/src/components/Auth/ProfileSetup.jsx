import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usersAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CHEM', 'MMT'];
const YEARS = ['PUC-1', 'PUC-2', 'E1', 'E2', 'E3', 'E4'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function ProfileSetup() {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({
        branch: user.branch || '',
        year: user.year || '',
        section: user.section || '',
    });
    const [loading, setLoading] = useState(false);

    const isStudent = user?.role === 'STUDENT';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.branch || (isStudent && !form.year)) {
            toast.error(isStudent ? 'Please select your branch and year' : 'Please select your branch');
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('branch', form.branch);
            if (form.year) formData.append('year', form.year);
            if (form.section) formData.append('section', form.section);

            const { data } = await usersAPI.updateProfile(formData);
            if (data.success) {
                updateUser(data.user);
                toast.success('Profile setup complete! Welcome to RGUKT Platform 🎓');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={S.overlay}>
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 120 }}
                style={S.modal}
            >
                {/* Header */}
                <div style={S.header}>
                    <div style={S.logo}>🎓</div>
                    <h2 style={S.title}>Complete Your Profile</h2>
                    <p style={S.subtitle}>Just a few details to get you started</p>
                </div>

                {/* Read-only info */}
                <div style={S.infoBox}>
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Name</span>
                        <span style={S.infoValue}>{user.name}</span>
                    </div>
                    {user.collegeId && (
                        <div style={S.infoRow}>
                            <span style={S.infoLabel}>Student ID</span>
                            <span style={S.infoValue}>{user.collegeId}</span>
                        </div>
                    )}
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Campus</span>
                        <span style={S.infoValue}>{user.campus}</span>
                    </div>
                    <div style={S.infoRow}>
                        <span style={S.infoLabel}>Email</span>
                        <span style={{ ...S.infoValue, fontSize: '0.8rem' }}>{user.email}</span>
                    </div>
                </div>

                <p style={S.note}>Name, role, and campus are auto-detected from your college credentials and cannot be changed.</p>

                {/* Form */}
                <form onSubmit={handleSubmit} style={S.form}>
                    <div style={S.field}>
                        <label style={S.label}>Branch *</label>
                        <select
                            value={form.branch}
                            onChange={e => setForm({ ...form, branch: e.target.value })}
                            style={S.select}
                            required
                        >
                            <option value="">Select your branch</option>
                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {isStudent && (
                            <div style={{ ...S.field, flex: 1 }}>
                                <label style={S.label}>Year *</label>
                                <select
                                    value={form.year}
                                    onChange={e => setForm({ ...form, year: e.target.value })}
                                    style={S.select}
                                    required
                                >
                                    <option value="">Select year</option>
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ ...S.field, flex: 1 }}>
                            <label style={S.label}>Section</label>
                            <select
                                value={form.section}
                                onChange={e => setForm({ ...form, section: e.target.value })}
                                style={S.select}
                            >
                                <option value="">Select section</option>
                                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={S.btn}
                    >
                        {loading ? 'Saving...' : 'Complete Setup →'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}

const S = {
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
    },
    modal: {
        background: '#fff', borderRadius: '1.75rem',
        padding: '2.5rem', width: '100%', maxWidth: '460px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
    },
    header: { textAlign: 'center', marginBottom: '1.5rem' },
    logo: { fontSize: '3rem', marginBottom: '0.75rem' },
    title: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' },
    subtitle: { fontSize: '0.9rem', color: '#64748b', margin: 0 },
    infoBox: {
        background: '#f8fafc', borderRadius: '1rem',
        padding: '1rem 1.25rem', marginBottom: '0.75rem',
        border: '1px solid #e2e8f0',
    },
    infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0' },
    infoLabel: { fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
    infoValue: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
    note: { fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem', fontStyle: 'italic' },
    form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    label: { fontSize: '0.875rem', fontWeight: 700, color: '#374151' },
    select: {
        padding: '0.75rem 1rem', borderRadius: '0.75rem',
        border: '1.5px solid #e2e8f0', fontSize: '0.95rem',
        outline: 'none', background: '#fff', cursor: 'pointer',
    },
    btn: {
        padding: '1rem', borderRadius: '1rem', border: 'none',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: '#fff', fontWeight: 800, fontSize: '1rem',
        cursor: 'pointer', marginTop: '0.5rem',
    },
};
