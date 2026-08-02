import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Download, ShieldCheck, FileText } from 'lucide-react';

export default function EsewaVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

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
      const response = await api.get(`/rent-payments/esewa/verify/?data=${dataPayload}`);
      setPaymentDetails(response.data);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('failed');
      setErrorMessage(err.response?.data?.detail || 'Payment verification failed or was tampered.');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentDetails?.payment_id) return;
    try {
      setDownloading(true);
      const response = await api.get(`/rent-payments/${paymentDetails.payment_id}/receipt/`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rent_receipt_${paymentDetails.receipt_no || 'esewa'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download payment receipt PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', textAlign: 'center' }}>
        
        {/* VERIFYING STATE */}
        {status === 'verifying' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Loader2 size={64} color="var(--primary-indigo)" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verifying eSewa Payment...</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Please wait while TenantPlus securely verifies your transaction signature and updates your rent ledger.
            </p>
          </div>
        )}

        {/* SUCCESSFUL PAYMENT LANDING PAGE */}
        {status === 'success' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '1rem', borderRadius: '50%', border: '2px solid rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={52} color="#10B981" />
              </div>
            </div>

            <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Payment Successful!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your rent payment has been verified, recorded, and secured in Escrow.
            </p>

            {/* Transaction Receipt Details Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receipt Number</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{paymentDetails?.receipt_no || 'REC-VERIFIED'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
                <span style={{ fontWeight: 700, color: '#10B981', fontSize: '1.05rem' }}>Rs. {parseFloat(paymentDetails?.amount || 0).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Code</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>{paymentDetails?.transaction_code || 'N/A'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Escrow Status</span>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '1rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <ShieldCheck size={12} /> Held in Escrow
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={handleDownloadReceipt}
                className="btn-primary"
                disabled={downloading}
                style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '0.95rem' }}
              >
                <Download size={18} />
                {downloading ? 'Generating PDF Receipt...' : 'Download Official PDF Receipt'}
              </button>

              <button 
                onClick={() => navigate('/dashboard')} 
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowLeft size={16} /> Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* FAILED STATE */}
        {status === 'failed' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '1rem', borderRadius: '50%', border: '2px solid rgba(239, 68, 68, 0.3)' }}>
                <XCircle size={52} color="#EF4444" />
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
              <ArrowLeft size={18} /> Return to Dashboard
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
