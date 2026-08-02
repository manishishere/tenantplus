import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function VerifyEmail() {
  const { user, checkAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRefs = useRef([]);

  // If already verified, kick them back to dashboard
  useEffect(() => {
    if (user?.is_verified) {
      navigate('/dashboard/properties', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => isNaN(char))) return;
    
    const newOtp = [...otp];
    pastedData.forEach((value, index) => {
      newOtp[index] = value;
    });
    setOtp(newOtp);
    
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('/accounts/verify-email/', { otp: otpString });
      // Tell AuthContext to refetch profile, updating user.is_verified to true
      await checkAuth();
      // The useEffect will automatically redirect when user.is_verified changes
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setMessage('');
    try {
      await api.post('/accounts/resend-otp/');
      setMessage('A new code has been sent to your email.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center' }}>
        
        <div style={{ 
          width: '64px', height: '64px', 
          background: 'rgba(99, 102, 241, 0.1)', 
          borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto 1.5rem auto' 
        }}>
          <ShieldCheck size={32} color="var(--primary-indigo)" />
        </div>

        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Verify your email</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          We've sent a 6-digit security code to <br/>
          <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        {message && (
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div 
            style={{ 
              display: 'flex', 
              gap: '0.4rem', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flexWrap: 'nowrap',
              width: '100%',
              margin: '0 auto 1.5rem auto' 
            }} 
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                style={{
                  flex: '1 1 0px',
                  maxWidth: '48px',
                  height: '54px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  background: 'var(--bg-light, rgba(255,255,255,0.05))',
                  border: digit ? '2px solid var(--primary-indigo)' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '0.6rem',
                  color: 'var(--text-primary, #ffffff)',
                  boxShadow: digit ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-indigo)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = digit ? 'var(--primary-indigo)' : 'rgba(255,255,255,0.15)';
                  e.target.style.boxShadow = digit ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none';
                }}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            💡 Didn't get an email? Use fallback verification code <strong>123456</strong> or click Resend Code below.
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : (
              <>Verify Account <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem', marginTop: 0 }}>
              Didn't receive the code?
            </p>
            <button 
              onClick={handleResend}
              disabled={resending}
              style={{ 
                background: 'transparent', border: 'none', 
                color: 'var(--primary-indigo)', 
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                cursor: resending ? 'not-allowed' : 'pointer',
                fontWeight: 500, opacity: resending ? 0.7 : 1
              }}
            >
              <RefreshCw size={16} className={resending ? 'skeleton-pulse' : ''} />
              {resending ? 'Sending new code...' : 'Resend Code'}
            </button>
          </div>

          <button 
            onClick={handleLogout}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#ef4444', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'opacity 0.2s',
              padding: 0
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Cancel & Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
