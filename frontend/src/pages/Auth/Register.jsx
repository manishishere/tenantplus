import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { checkAuth, setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'tenant', // default role
    password: '',
    password2: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const { fullName, email, phone, role, password, password2 } = formData;
    const emailStr = email.trim();
    const fullNameStr = fullName.trim();

    // Client-side checks
    if (!fullNameStr || !emailStr || !password || !password2) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // call Django REST register API
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

      // Redirect to Email OTP verification screen first
      navigate('/verify-email');
    } catch (err) {
      console.error(err);
      setError(parseApiError(err, 'Registration failed. Please check your input and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '1rem' }}>
      <section className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem', fontSize: '1.65rem', fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)' }}>Get started with TenantPlus today</p>
        </header>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              name="fullName"
              className="form-input" 
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              name="email"
              className="form-input" 
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              name="phone"
              className="form-input" 
              placeholder="e.g. 98XXXXXXXX"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Register As *</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '0.5rem', background: formData.role === 'tenant' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)', border: formData.role === 'tenant' ? '1px solid var(--primary-indigo)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="role" 
                  value="tenant"
                  checked={formData.role === 'tenant'}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--primary-indigo)' }}
                />
                Tenant
              </label>

              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '0.5rem', background: formData.role === 'landlord' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)', border: formData.role === 'landlord' ? '1px solid var(--primary-indigo)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="role" 
                  value="landlord"
                  checked={formData.role === 'landlord'}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--primary-indigo)' }}
                />
                Landlord
              </label>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password *</label>
            <input 
              type="password" 
              name="password"
              className="form-input" 
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Confirm Password *</label>
            <input 
              type="password" 
              name="password2"
              className="form-input" 
              placeholder="••••••••"
              value={formData.password2}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <footer style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')} 
              style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Sign In
            </button>
          </p>
        </footer>

      </section>
    </div>
  );
}
