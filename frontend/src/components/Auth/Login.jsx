import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CAMPUS_DATA = {
  'R': { name: 'RK Valley', icon: '🏛️', color: '#3B82F6' },
  'N': { name: 'Nuzvid', icon: '🌳', color: '#10B981' },
  'O': { name: 'Ongole', icon: '🌊', color: '#F59E0B' },
  'S': { name: 'Srikakulam', icon: '☀️', color: '#0EA5E9' },
  'B': { name: 'Basar', icon: '📚', color: '#84CC16' },
  'A': { name: 'All Campuses', icon: '🛡️', color: '#64748b' },
};

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    collegeId: '', password: '', mfaToken: '', campus: '',
    name: '', email: '', role: 'STUDENT', branch: '', year: '', section: ''
  });
  const [detectedCampus, setDetectedCampus] = useState(null);
  const [step, setStep] = useState('login'); // 'login' | 'mfa'
  const [loading, setLoading] = useState(false);

  const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MME', 'CHEM', 'PUC'];
  const ROLES = ['STUDENT', 'FACULTY', 'HOD', 'DEAN', 'DIRECTOR', 'ADMIN'];

  const STUDENT_DOMAINS = ['@rguktrkv.ac.in', '@rguktrong.ac.in', '@rguktskl.ac.in', '@rguktnuz.ac.in'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'collegeId') {
      const prefix = value.charAt(0).toUpperCase();
      if (CAMPUS_DATA[prefix]) {
        setDetectedCampus(CAMPUS_DATA[prefix]);
        setForm(prev => ({ ...prev, campus: CAMPUS_DATA[prefix].name }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const result = await login(form.collegeId, form.password, step === 'mfa' ? form.mfaToken : undefined);
        if (result?.requiresMFA) {
          setStep('mfa');
          toast('Verification required', { icon: '🔐' });
        } else {
          navigate('/dashboard');
        }
      } else {
        if (form.role === 'STUDENT') {
          const validDomain = STUDENT_DOMAINS.some(d => form.email.endsWith(d));
          if (!validDomain) {
            toast.error('Students must use their college email (e.g. r220379@rguktrkv.ac.in, @rguktrong.ac.in, @rguktskl.ac.in, @rguktnuz.ac.in)');
            setLoading(false);
            return;
          }
        }
        await register(form);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/dashboard');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google Sign-In Failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error('Google Sign-In was cancelled or failed'),
  });


  return (
    <div style={styles.page}>
      {/* Dynamic Background */}
      <div style={styles.bgOverlay} />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        style={styles.bgGlow}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card"
        style={styles.card}
      >
        {/* Header */}
        <div style={styles.header}>
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            style={styles.brandContainer}
          >
            <span style={styles.logo}>🎓</span>
            <div style={styles.brandText}>
              <h1 className="text-gradient" style={styles.title}>RGUKT PLATFORM</h1>
              <p style={styles.subtitle}>Autonomous Triple IT Universities</p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >

              <form onSubmit={handleSubmit} style={styles.form}>
                {!isLogin && (
                  <>
                    <div style={styles.field}>
                      <label style={styles.label}>Full Name</label>
                      <input name="name" value={form.name} onChange={handleChange} required style={styles.input} className="glass" />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Email Address</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} required style={styles.input} className="glass"
                        placeholder={form.role === 'STUDENT' ? 'e.g. r220379@rguktrkv.ac.in' : 'your email'}
                      />
                      {form.role === 'STUDENT' && (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                          Use your college email: @rguktrkv.ac.in / @rguktrong.ac.in / @rguktskl.ac.in / @rguktnuz.ac.in
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div style={styles.field}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={styles.label}>College ID</label>
                    {detectedCampus && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ ...styles.campusNode, color: detectedCampus.color }}
                      >
                        {detectedCampus.icon} {detectedCampus.name} Detected
                      </motion.span>
                    )}
                  </div>
                  <input
                    name="collegeId"
                    value={form.collegeId}
                    onChange={handleChange}
                    placeholder="e.g. R220379"
                    required
                    style={styles.input}
                    className="glass"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Campus (Auto-detects from ID)</label>
                  <select
                    name="campus"
                    value={form.campus}
                    onChange={handleChange}
                    style={styles.input}
                    className="glass"
                    required
                  >
                    <option value="" style={{ color: '#0f172a' }}>Select Campus</option>
                    {Object.values(CAMPUS_DATA).map(c => (
                      <option key={c.name} value={c.name} style={{ color: '#0f172a' }}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {!isLogin && (
                  <>
                    <div style={styles.field}>
                      <label style={styles.label}>Role</label>
                      <select name="role" value={form.role} onChange={handleChange} style={styles.input} className="glass" required>
                        {ROLES.map(r => <option key={r} value={r} style={{ color: '#0f172a' }}>{r}</option>)}
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Branch</label>
                      <select name="branch" value={form.branch} onChange={handleChange} style={styles.input} className="glass" required>
                        <option value="" style={{ color: '#0f172a' }}>Select Branch</option>
                        {BRANCHES.map(b => <option key={b} value={b} style={{ color: '#0f172a' }}>{b}</option>)}
                      </select>
                    </div>
                    {form.role === 'STUDENT' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ ...styles.field, flex: 1 }}>
                          <label style={styles.label}>Year</label>
                          <select name="year" value={form.year} onChange={handleChange} style={styles.input} className="glass">
                            <option value="" style={{ color: '#0f172a' }}>Select</option>
                            {['PUC1', 'PUC2', 'E1', 'E2', 'E3', 'E4'].map(y => <option key={y} value={y} style={{ color: '#0f172a' }}>{y}</option>)}
                          </select>
                        </div>
                        <div style={{ ...styles.field, flex: 1 }}>
                          <label style={styles.label}>Section</label>
                          <input name="section" value={form.section} onChange={handleChange} placeholder="e.g. A" style={styles.input} className="glass" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>Security Phrase</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      style={{ ...styles.input, paddingRight: '3.5rem' }}
                      className="glass"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-premium" style={styles.submitBtn}>
                  {loading ? 'Processing...' : isLogin ? 'Access Portal' : 'Create Account'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsLogin(!isLogin)} style={styles.toggleBtn}>
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                  </button>
                </div>

                {isLogin && (
                  <>
                    <div style={styles.divider}>
                      <span style={styles.dividerLine} />
                      <span style={styles.dividerText}>OR</span>
                      <span style={styles.dividerLine} />
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      onClick={() => googleLogin()}
                      disabled={loading}
                      style={styles.googleBtn}
                    >
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" style={styles.googleIcon} />
                      Sign in with Google Workspace
                    </motion.button>
                  </>
                )}
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="mfa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={styles.form}
            >
              <div style={styles.field}>
                <label style={styles.label}>🔐 Two-Factor Authentication</label>
                <input
                  name="mfaToken"
                  value={form.mfaToken}
                  onChange={handleChange}
                  placeholder="000000"
                  maxLength={6}
                  required
                  style={styles.mfaInput}
                  className="glass"
                />
                <p style={styles.mfaHint}>Enter the verification code from your device</p>
              </div>

              <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-premium" style={styles.submitBtn}>
                {loading ? 'Verifying...' : 'Complete Login'}
              </button>

              <button type="button" onClick={() => setStep('login')} style={styles.backBtn}>
                ← Return to Basic Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={styles.footer}>
          <p>© 2026 RGUKT Integrated Systems</p>
          <div style={styles.campusDots}>
            {Object.entries(CAMPUS_DATA).map(([key, data]) => (
              <span key={key} title={data.name} style={{ ...styles.dot, background: data.color }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
    padding: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(to bottom right, rgba(30, 64, 175, 0.1), rgba(2, 6, 23, 0.95))',
    zIndex: -1
  },
  bgGlow: {
    position: 'absolute',
    width: '800px',
    height: '800px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
    zIndex: -1,
    top: '-10%',
    left: '10%',
    filter: 'blur(100px)'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '3.5rem',
    borderRadius: '2.5rem',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.6)',
    zIndex: 1,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
  },
  header: { textAlign: 'center', marginBottom: '3rem' },
  brandContainer: { display: 'inline-flex', alignItems: 'center', gap: '1rem', textAlign: 'left' },
  logo: { fontSize: '3.5rem' },
  brandText: { borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' },
  title: { fontSize: '2.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 },
  subtitle: { color: 'var(--slate-400)', fontSize: '0.875rem', margin: '0.25rem 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  quickSection: { marginBottom: '2.5rem' },
  labelSmall: { fontSize: '0.7rem', color: 'var(--slate-500)', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' },
  quickBtn: {
    padding: '0.85rem',
    border: '1px solid',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '1.25rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  label: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate-300)', marginLeft: '0.5rem' },
  campusNode: { fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' },
  input: {
    padding: '1.1rem 1.5rem',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '1.5rem',
    fontSize: '1rem',
    outline: 'none',
    color: 'var(--slate-100)',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.03)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
  submitBtn: { width: '100%', marginTop: '0.5rem', height: '3.75rem', fontSize: '1.1rem', borderRadius: '1.5rem' },
  toggleBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'underline' },
  divider: { display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' },
  dividerLine: { flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' },
  dividerText: { fontSize: '0.75rem', color: 'var(--slate-600)', fontWeight: 800 },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    height: '3.75rem',
    borderRadius: '1.5rem',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    color: 'var(--slate-200)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  googleIcon: { width: '20px', height: '20px' },
  mfaInput: {
    padding: '1.5rem',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '1.5rem',
    fontSize: '2rem',
    letterSpacing: '0.5em',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--slate-100)'
  },
  mfaHint: { fontSize: '0.8rem', color: 'var(--slate-500)', margin: '0.8rem 0 0', textAlign: 'center' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginTop: '1.5rem', alignSelf: 'center' },
  footer: {
    marginTop: '3.5rem',
    paddingTop: '2rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    color: 'var(--slate-600)',
    fontSize: '0.75rem',
    fontWeight: 600
  },
  campusDots: { display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', opacity: 0.6 },
};
