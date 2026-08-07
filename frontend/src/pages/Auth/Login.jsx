import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ForgotPasswordModal from '../../components/Auth/ForgotPasswordModal';
import { 
  LogIn, AlertCircle, Building2, ShieldCheck, Lock, 
  Eye, EyeOff, CheckCircle2, FileText, Sun, Moon 
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  const { login, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === 'dark';
  const bgMain = isDark ? '#0B0B0D' : '#F8FAFC';
  const bgCard = isDark ? '#141416' : '#FFFFFF';
  const bgInput = isDark ? '#0B0B0D' : '#F1F5F9';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#A1A1AA' : '#64748B';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const cardShadow = isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 10px 30px rgba(0, 0, 0, 0.05)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
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
            padding: '2.25rem 2.5rem',
            background: bgCard,
            border: `1px solid ${borderColor}`,
            borderRadius: '20px',
            boxShadow: cardShadow,
            transition: 'background-color 0.2s ease, border-color 0.2s ease'
          }}>
            
            <header style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem 0', letterSpacing: '-0.03em', color: textMain }}>
                Welcome back
              </h2>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>
                Sign in to access your TenantPlus account.
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
                borderRadius: '8px', 
                marginBottom: '1rem', 
                fontSize: '0.8rem',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontWeight: 500
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted, display: 'block', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 0.95rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgInput,
                    color: textMain,
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted, margin: 0 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: textMuted,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '0 2.5rem 0 0.95rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      background: bgInput,
                      color: textMain,
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: textMuted,
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  height: '48px',
                  borderRadius: '10px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  transition: 'all 0.18s ease'
                }}
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <footer style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '1rem' }}>
              <p style={{ color: textMuted, fontSize: '0.85rem', margin: 0 }}>
                Don't have an account?{' '}
                <button 
                  onClick={() => navigate('/register')} 
                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 700 }}
                >
                  Create an account
                </button>
              </p>
            </footer>

          </div>
        </div>

      </div>

      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
}
