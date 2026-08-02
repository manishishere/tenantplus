import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from '../../components/Auth/ForgotPasswordModal';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  // Destructure isLoading from our robust AuthContext
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset local error state before new attempt
    setError(null);

    // Basic client-side validation
    if (!email || !password) {
      setError("Please fill in all fields.");
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
    <div 
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}
      role="main"
      aria-label="Login Page"
    >
      <section className="glass-panel" style={{ width: '100%', maxWidth: '400px' }} aria-labelledby="login-heading">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 id="login-heading" style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to TenantPlus</p>
        </header>

        {error && (
          <div 
            role="alert" 
            aria-live="assertive"
            style={{ 
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1.5rem', 
              fontSize: '0.875rem' 
            }}
          >
            <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!error}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-indigo)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={!!error}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{ marginTop: '0.4rem' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.875rem' }}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={18} style={{ marginRight: '0.5rem', flexShrink: 0 }} /> 
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <footer style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Don't have an account?{' '}
            <button 
              onClick={() => navigate('/register')} 
              style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Register here
            </button>
          </p>
        </footer>

      </section>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
}
