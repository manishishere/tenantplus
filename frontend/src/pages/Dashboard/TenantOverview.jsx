import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Building2, 
  Download, 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export default function TenantOverview() {
  const { user } = useAuth();
  const [agreement, setAgreement] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch agreements
      const agreementsResponse = await api.get('/agreements/');
      const agreementsList = agreementsResponse.data.results || agreementsResponse.data || [];
      const active = agreementsList.find(a => a.status === 'active');
      
      if (active) {
        setAgreement(active);
        
        // 2. Fetch rent payment summary for this agreement
        const summaryResponse = await api.get(`/rent-payments/summary/?agreement_id=${active.id}`);
        setSummary(summaryResponse.data);
        
        // 3. Fetch list of rent payments
        const paymentsResponse = await api.get(`/rent-payments/?agreement_id=${active.id}`);
        setPayments(paymentsResponse.data.results || paymentsResponse.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to calculate the next due date and amount
  const calculateNextDue = () => {
    if (!agreement) return null;
    
    let dueMonthDate;
    if (summary && summary.last_payment_month) {
      // If there are previous payments, next due is the month after last_payment_month
      const lastMonth = new Date(summary.last_payment_month);
      dueMonthDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1);
    } else {
      // If no payments yet, next due is the start date's month
      const startDate = new Date(agreement.start_date);
      dueMonthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const today = new Date();
    // Grace period ends on the 7th day of the due month
    const gracePeriodLimit = new Date(dueMonthDate.getFullYear(), dueMonthDate.getMonth(), 7);
    const isLate = today > gracePeriodLimit;
    const lateFee = isLate ? 500 : 0;
    const baseRent = parseFloat(agreement.rent_amount);
    const totalDue = baseRent + lateFee;

    const formattedMonth = dueMonthDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });

    const monthString = `${dueMonthDate.getFullYear()}-${String(dueMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    return {
      monthString,
      formattedMonth,
      baseRent,
      lateFee,
      totalDue,
      isLate
    };
  };

  const nextDue = calculateNextDue();

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    try {
      const response = await api.get(`/agreements/${agreement.id}/pdf/`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lease_agreement_${agreement.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download legal lease PDF. Please try again.');
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/rent-payments/${paymentId}/receipt/`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rent_receipt_${paymentId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download receipt. Please try again.');
    }
  };

  const handlePayEsewa = async () => {
    if (!agreement || !nextDue) return;
    try {
      setPaying(true);
      setError('');

      // Check if a payment for this month already exists (e.g. failed/tampered/pending state)
      const existingPayment = payments.find(
        p => p.payment_month.substring(0, 7) === nextDue.monthString.substring(0, 7)
      );

      let paymentId;
      if (existingPayment) {
        paymentId = existingPayment.id;
      } else {
        // Create new RentPayment record on Django
        const createResponse = await api.post('/rent-payments/', {
          agreement: agreement.id,
          payment_month: nextDue.monthString,
          amount: nextDue.baseRent,
          notes: 'Rent payment initiated via eSewa checkout'
        });
        paymentId = createResponse.data.id;
      }

      // Initiate eSewa integration
      const initiateResponse = await api.post('/rent-payments/esewa/initiate/', {
        payment: paymentId
      });

      const { payment_url, form_data } = initiateResponse.data;

      // Programmatically create and submit POST form to eSewa gateway
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payment_url;

      Object.entries(form_data).forEach(([key, value]) => {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = key;
        hiddenField.value = value;
        form.appendChild(hiddenField);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to initiate eSewa payment. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--primary-indigo)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading tenant dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Welcome Back, {user?.full_name || user?.email}</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Here is a summary of your active tenancy and rent status.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!agreement ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-darker)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Active Lease Agreement</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            You do not currently have any active lease agreements. Submit a rental application to list active leases here.
          </p>
        </div>
      ) : (
        <>
          {/* Main Dashboard Cards (Top) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Active Agreement Card */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Tenancy</span>
                    <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0 0 0' }}>{agreement.property.title}</h2>
                  </div>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <Building2 size={24} color="var(--primary-indigo)" />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Property Location</span>
                    <span style={{ fontWeight: 500 }}>{agreement.property.district}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lease Period</span>
                    <span style={{ fontWeight: 500 }}>{formatDate(agreement.start_date)} - {formatDate(agreement.end_date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rent Amount</span>
                    <span style={{ fontWeight: 600 }}>Rs. {parseFloat(agreement.rent_amount).toLocaleString()} / month</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDownloadPDF} 
                className="btn-primary" 
                style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}
              >
                <Download size={18} />
                Download Legal Lease PDF
              </button>
            </div>

            {/* Next Rent Due Card */}
            {nextDue && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rent Due Status</span>
                      <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0 0 0' }}>{nextDue.formattedMonth}</h2>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                      <CreditCard size={24} color="#10B981" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Rent</span>
                      <span style={{ fontWeight: 500 }}>Rs. {nextDue.baseRent.toLocaleString()}</span>
                    </div>
                    
                    {nextDue.isLate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={14} /> Late Fee (after 7th)
                        </span>
                        <span style={{ fontWeight: 600 }}>+ Rs. {nextDue.lateFee}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>Total Amount Due</span>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: nextDue.isLate ? '#f59e0b' : 'var(--text-light)' }}>
                        Rs. {nextDue.totalDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePayEsewa} 
                  disabled={paying}
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginTop: '1.5rem',
                    backgroundColor: '#10B981', 
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                >
                  <ArrowRight size={18} />
                  {paying ? 'Redirecting to eSewa...' : `Pay Rs. ${nextDue.totalDue.toLocaleString()} via eSewa`}
                </button>
              </div>
            )}
            
          </div>

          {/* Payment History Section */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="var(--primary-indigo)" />
              Recent Rent Payments
            </h3>
            
            {payments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No rent payment records found for this active lease agreement.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '1rem 0.5rem' }}>Payment Month</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Receipt No</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Rent Paid</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Late Fee</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Payment Status</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Date Paid</th>
                      <th style={{ padding: '1rem 0.5rem', textRight: 'true' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt) => {
                      const amount = parseFloat(pmt.amount);
                      const lateFee = parseFloat(pmt.late_fee || 0);
                      const total = amount + lateFee;
                      const formattedMonth = new Date(pmt.payment_month).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      });

                      return (
                        <tr key={pmt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{formattedMonth}</td>
                          <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{pmt.receipt_no || 'Pending'}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>Rs. {amount.toLocaleString()}</td>
                          <td style={{ padding: '1rem 0.5rem', color: lateFee > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {lateFee > 0 ? `Rs. ${lateFee.toLocaleString()}` : '-'}
                          </td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              color: '#10B981', 
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '2rem'
                            }}>
                              <CheckCircle2 size={12} />
                              Verified
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{formatDate(pmt.paid_at)}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <button 
                              onClick={() => handleDownloadReceipt(pmt.id)} 
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--primary-indigo)', 
                                cursor: 'pointer', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem',
                                padding: 0
                              }}
                            >
                              <Download size={14} /> Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
