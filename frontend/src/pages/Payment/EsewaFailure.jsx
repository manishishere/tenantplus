import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function EsewaFailure() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', textAlign: 'center' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <XCircle size={48} color="#EF4444" />
          </div>
        </div>

        <h1 style={{ fontSize: '1.65rem', marginBottom: '0.5rem', color: '#EF4444' }}>Payment Cancelled</h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
          The checkout process was cancelled or encountered an error. No funds were debited from your account. You can retry paying from the dashboard.
        </p>

        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-primary" 
          style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

      </div>
    </div>
  );
}
