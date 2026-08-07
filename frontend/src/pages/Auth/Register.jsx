import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { 
  Building2, ShieldCheck, Lock, Eye, EyeOff, 
  UserPlus, User, FileText, AlertCircle, CheckCircle2,
  Sun, Moon
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { checkAuth, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const bgMain = isDark ? '#0B0B0D' : '#F8FAFC';
  const bgCard = isDark ? '#141416' : '#FFFFFF';
  const bgInput = isDark ? '#0B0B0D' : '#F1F5F9';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#A1A1AA' : '#64748B';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const cardShadow = isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.05)';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'tenant',
    password: '',
    password2: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 33, label: 'Weak', color: '#ef4444' };
    if (score === 2 || score === 3) return { score: 66, label: 'Fair', color: '#f59e0b' };
    return { score: 100, label: 'Strong', color: '#22c55e' };
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const { fullName, email, phone, role, password, password2 } = formData;
    const emailStr = email.trim();
    const fullNameStr = fullName.trim();

    if (!fullNameStr || !emailStr || !password || !password2) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/accounts/register/', {
        full_name: fullNameStr,
        email: emailStr,
        phone: phone.trim(),
        role: role,
        password: password,
        password2: password2
      });

      const token = response.data.tokens?.access;
      if (token) {
        localStorage.setItem('access_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      if (response.data.user) {
        setUser(response.data.user);
      } else if (checkAuth) {
        await checkAuth();
      }

      navigate('/verify-email');
    } catch (err) {
      console.error(err);
      setError(parseApiError(err, 'Registration failed. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      maxHeight: '100vh',
      overflow: 'hidden', 
      background: bgMain, 
      color: textMain, 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      padding: '0 2rem',
      position: 'relative',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      
      {/* Top Right Theme Switcher */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '2rem',
          background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          border: `1px solid ${borderColor}`,
          color: textMain,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          zIndex: 10
        }}
        title="Toggle Theme"
      >
        {isDark ? <Sun size={17} color="#FFFFFF" /> : <Moon size={17} color="#0F172A" />}
      </button>

      {/* Centered Spaced Container */}
      <div style={{ 
        width: '100%', 
        maxWidth: '1180px',
        margin: '0 auto',
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '4rem',
        alignItems: 'center'
      }}>
        
        {/* LEFT COLUMN: MINIMALIST BRANDING & FEATURE ROWS */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justify: 'space-between',
          height: '100%',
          maxHeight: '560px',
          paddingRight: '1rem'
        }}>
          {/* Top Logo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '0.45rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center' }}>
                <Building2 size={20} />
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: textMain, letterSpacing: '-0.035em' }}>
                TenantPlus
              </span>
            </div>

            {/* Badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(37, 99, 235, 0.08)', 
              color: isDark ? '#A1A1AA' : '#2563EB', 
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(37, 99, 235, 0.2)'}`,
              padding: '0.3rem 0.75rem', 
              borderRadius: '980px', 
              fontSize: '0.775rem',
              fontWeight: 600,
              marginBottom: '1.25rem'
            }}>
              <ShieldCheck size={14} color="#2563EB" /> Secure Rental Platform
            </div>

            {/* Headline */}
            <h1 style={{ 
              fontSize: 'clamp(2.2rem, 3.5vw, 3rem)', 
              fontWeight: 800, 
              lineHeight: 1.1, 
              letterSpacing: '-0.04em', 
              margin: '0 0 1rem 0',
              color: textMain
            }}>
              Rent with confidence.
            </h1>

            {/* Short Supporting Sentence */}
            <p style={{ color: textMuted, fontSize: '1rem', lineHeight: 1.55, margin: '0 0 2rem 0', maxWidth: '420px' }}>
              Verified landlords, secure escrow payments, and digital lease agreements—all in one place.
            </p>

            {/* 3 Simple Feature Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <CheckCircle2 size={19} color="#2563EB" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: textMain }}>Verified Properties</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Lock size={19} color="#2563EB" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: textMain }}>eSewa Escrow Protection</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <FileText size={19} color="#2563EB" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: textMain }}>Digital Lease Agreements</span>
              </div>
            </div>
          </div>

          {/* Minimal Apartment Vector SVG Artwork */}
          <div style={{ 
            height: '110px', 
            borderRadius: '14px', 
            background: isDark ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)' : 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(0, 0, 0, 0.02) 100%)',
            border: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            overflow: 'hidden',
            marginTop: '1.5rem'
          }}>
            <svg width="100%" height="100%" viewBox="0 0 400 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: isDark ? 0.4 : 0.6 }}>
              <rect x="50" y="25" width="70" height="90" rx="4" fill="#2563EB" fillOpacity="0.2" stroke="#2563EB" strokeWidth="1.5" />
              <rect x="65" y="40" width="14" height="16" rx="2" fill="#2563EB" fillOpacity="0.4" />
              <rect x="87" y="40" width="14" height="16" rx="2" fill="#2563EB" fillOpacity="0.4" />
              <rect x="65" y="66" width="14" height="16" rx="2" fill="#2563EB" fillOpacity="0.4" />
              <rect x="87" y="66" width="14" height="16" rx="2" fill="#2563EB" fillOpacity="0.4" />

              <rect x="150" y="10" width="90" height="105" rx="4" fill={isDark ? "#FFFFFF" : "#0F172A"} fillOpacity="0.05" stroke={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth="1.5" strokeDasharray="4 4" />
              <rect x="168" y="28" width="16" height="20" rx="2" fill={isDark ? "#FFFFFF" : "#0F172A"} fillOpacity="0.2" />
              <rect x="202" y="28" width="16" height="20" rx="2" fill={isDark ? "#FFFFFF" : "#0F172A"} fillOpacity="0.2" />
              <rect x="168" y="58" width="16" height="20" rx="2" fill={isDark ? "#FFFFFF" : "#0F172A"} fillOpacity="0.2" />
              <rect x="202" y="58" width="16" height="20" rx="2" fill={isDark ? "#FFFFFF" : "#0F172A"} fillOpacity="0.2" />

              <path d="M260 110V50L310 20L360 50V110H260Z" stroke="#2563EB" strokeWidth="1.5" fill="#2563EB" fillOpacity="0.1" />
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION CARD */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '440px', 
            padding: '1.75rem 2rem',
            background: bgCard,
            border: `1px solid ${borderColor}`,
            borderRadius: '20px',
            boxShadow: cardShadow,
            transition: 'background-color 0.2s ease, border-color 0.2s ease'
          }}>
            
            <header style={{ marginBottom: '1.15rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem 0', letterSpacing: '-0.03em', color: textMain }}>
                Create an account
              </h2>
              <p style={{ color: textMuted, fontSize: '0.825rem', margin: 0 }}>
                Enter your details to get started with TenantPlus.
              </p>
            </header>

            {error && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                backgroundColor: 'rgba(239, 68, 68, 0.12)', 
                color: '#ef4444', 
                padding: '0.65rem 0.85rem', 
                borderRadius: '0.5rem', 
                marginBottom: '0.85rem', 
                fontSize: '0.8rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 500
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Segmented Control Role Switcher */}
              <div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.25rem', 
                  background: bgInput, 
                  padding: '0.25rem', 
                  borderRadius: '10px', 
                  border: `1px solid ${borderColor}` 
                }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'tenant' })}
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      border: 'none',
                      background: formData.role === 'tenant' ? '#2563EB' : 'transparent',
                      color: formData.role === 'tenant' ? '#FFFFFF' : textMuted,
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <User size={14} /> Tenant
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'landlord' })}
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      border: 'none',
                      background: formData.role === 'landlord' ? '#2563EB' : 'transparent',
                      color: formData.role === 'landlord' ? '#FFFFFF' : textMuted,
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <Building2 size={14} /> Landlord
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input 
                  type="text" 
                  name="fullName"
                  placeholder="Ram Bahadur Shrestha"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgInput,
                    color: textMain,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Email & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.25rem' }}>
                    Email
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      background: bgInput,
                      color: textMain,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.25rem' }}>
                    Phone
                  </label>
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="9841XXXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      background: bgInput,
                      color: textMain,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.25rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 2rem 0 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${borderColor}`,
                        background: bgInput,
                        color: textMain,
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.55rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: textMuted,
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.25rem' }}>
                    Confirm Password
                  </label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password2"
                    placeholder="••••••••"
                    value={formData.password2}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      background: bgInput,
                      color: textMain,
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password Strength Indicator Bar */}
              {formData.password && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: textMuted, marginBottom: '0.15rem' }}>
                    <span>Password Strength</span>
                    <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                  </div>
                  <div style={{ height: '3px', background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${passwordStrength.score}%`, background: passwordStrength.color, transition: 'all 0.3s ease' }} />
                  </div>
                </div>
              )}

              {/* Primary Button */}
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  height: '44px',
                  borderRadius: '10px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  marginTop: '0.25rem'
                }}
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <footer style={{ marginTop: '1.15rem', textAlign: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '0.85rem' }}>
              <p style={{ color: textMuted, fontSize: '0.825rem', margin: 0 }}>
                Already have an account?{' '}
                <button 
                  onClick={() => navigate('/login')} 
                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 700 }}
                >
                  Sign In
                </button>
              </p>
            </footer>

          </div>
        </div>

      </div>
    </div>
  );
}
