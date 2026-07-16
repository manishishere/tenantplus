import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function EsewaVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setStatus('failed');
      setErrorMessage('No payment data parameter was returned from eSewa.');
      return;
    }
    verifyPayment(data);
  }, [searchParams]);

  const verifyPayment = async (dataPayload) => {
    try {
      // call backend to verify eSewa signature and transaction details
      await api.get(`/rent-payments/esewa/verify/?data=${dataPayload}`);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('failed');
      setErrorMessage(err.response?.data?.detail || 'Payment verification failed or was tampered.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', textAlign: 'center' }}>
        
        {status === 'verifying' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Loader2 size={64} className="skeleton-pulse" color="var(--primary-indigo)" style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verifying Payment...</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Please wait while we verify your transaction signature with eSewa servers. Do not refresh this page.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                <CheckCircle2 size={48} color="#10B981" />
              </div>
            </div>
            <h1 style={{ fontSize: '1.65rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>Rent Paid Successfully!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              Thank you! Your transaction has been securely verified and recorded. You can view the receipt in your dashboard.
            </p>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                <XCircle size={48} color="#EF4444" />
              </div>
            </div>
            <h1 style={{ fontSize: '1.65rem', marginBottom: '0.5rem', color: '#EF4444' }}>Verification Failed</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              We could not complete your transaction verification.
            </p>
            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
                {errorMessage}
              </div>
            )}
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
