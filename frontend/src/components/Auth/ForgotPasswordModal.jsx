import { useState } from 'react';
import api from '../../services/api';
import { KeyRound, Mail, CheckCircle2, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Token/OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Step 1: Request Password Reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your account email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/accounts/password-reset/request/', { email });
      setMessage(res.data.detail || 'Password reset link / OTP sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm Password Reset
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/accounts/password-reset/confirm/', {
        token: resetToken,
        new_password: newPassword
      });
      setMessage(res.data.detail || 'Password reset successfully!');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        borderRadius: '1.25rem',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--pill-bg)',
            color: 'var(--primary-indigo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem auto'
          }}>
            <KeyRound size={24} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
            {step === 1 ? 'Forgot Password?' : step === 2 ? 'Reset Password' : 'Password Reset Complete'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {step === 1 ? 'Enter your email to receive a password reset token.' : step === 2 ? 'Enter your reset token and new password.' : 'You can now sign in with your new password.'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.825rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: EMAIL REQUEST */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
              {loading ? 'Sending Request...' : 'Send Reset Link / Token'}
            </button>
          </form>
        )}

        {/* STEP 2: CONFIRM TOKEN & SET NEW PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {message && (
              <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.4rem', fontSize: '0.8rem' }}>
                {message}
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Reset Token / Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Paste token or OTP code"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
              {loading ? 'Updating Password...' : 'Set New Password'}
            </button>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              {message}
            </div>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
