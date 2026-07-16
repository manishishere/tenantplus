import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, ArrowRight, ShieldCheck, CreditCard, Wrench, Calendar, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-light)', fontFamily: 'var(--font-family)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header / Navbar */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2rem', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Building2 size={28} color="var(--primary-indigo)" />
          <span style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TenantPlus
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-primary" 
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')} 
                style={{ 
                  background: 'transparent', 
                  color: 'var(--text-light)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  borderRadius: '0.5rem', 
                  padding: '0.5rem 1.25rem', 
                  fontWeight: 500, 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = 'var(--primary-indigo)'; e.target.style.color = 'var(--primary-indigo)'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'var(--text-light)'; }}
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')} 
                className="btn-primary" 
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'center', width: '100%' }}>
          
          {/* Hero Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(99, 102, 241, 0.1)', 
              color: '#a5b4fc', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '2rem', 
              fontSize: '0.85rem',
              fontWeight: 600,
              width: 'fit-content'
            }}>
              <Sparkles size={14} /> Modern Lease & Payment Management
            </div>

            <h1 style={{ 
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
              lineHeight: 1.15, 
              margin: 0, 
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Modern Rental Management <br/>
              <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Made Simple.
              </span>
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6, margin: 0 }}>
              TenantPlus bridges the gap between landlords and tenants. Generate digital contracts, verify payment receipt PDFs, request maintenance repairs, and execute secure eSewa checkouts seamlessly.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {user ? (
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="btn-primary" 
                  style={{ padding: '0.85rem 2.5rem', fontSize: '1.05rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                  Go to Dashboard <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/register')} 
                    className="btn-primary" 
                    style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  >
                    Create Account <ArrowRight size={18} />
                  </button>
                  <button 
                    onClick={() => navigate('/login')} 
                    style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      color: 'var(--text-light)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '0.5rem', 
                      padding: '0.85rem 2rem', 
                      fontSize: '1.05rem',
                      fontWeight: 500, 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.02)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Hero Right Visual (Glassmorphic Mockup) */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '340px', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }}></span>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }}></span>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TenantPlus Platform Demo</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck color="#10B981" size={20} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Tenancy Agreement</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated from House Rent Act 2075</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>Verified</span>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CreditCard color="#6366F1" size={20} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Secure Rent Payment</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pay instantly via eSewa checkout</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-light)' }}>Rs. 15,000</span>
              </div>
            </div>
          </div>

        </div>

        {/* Feature Grid */}
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '3rem', fontWeight: 700 }}>Streamlined Features Built For You</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            
            {/* Feature 1 */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '48px', height: '48px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck color="var(--primary-indigo)" size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Digital Leases</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Tenancy agreements are generated automatically in PDF format upon landlord approval, including all standard legal terms.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard color="#10B981" size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>eSewa Rent Payments</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Tenants pay rent directly inside their dashboard via eSewa checkout. Payment records and receipts update instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '48px', height: '48px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wrench color="#EF4444" size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Maintenance Requests</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Submit repair requests instantly, track progress, and log audit trails using our tamper-evident backend logging.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '48px', height: '48px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar color="#F59E0B" size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Utility Billing</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Landlords submit monthly utility meter readings, automatically calculating and splitting costs with tenants.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ padding: '2.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>&copy; {new Date().getFullYear()} TenantPlus Rental Platform. All rights reserved.</p>
      </footer>

    </div>
  );
}
