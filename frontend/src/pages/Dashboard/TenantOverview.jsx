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
  ShieldCheck,
  Zap,
  MapPin,
  TrendingUp,
  Receipt
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
      
      const agreementsResponse = await api.get('/agreements/');
      const agreementsList = agreementsResponse.data.results || agreementsResponse.data || [];
      const active = agreementsList.find(a => a.status === 'active');
      
      if (active) {
        setAgreement(active);
        
        const summaryResponse = await api.get(`/rent-payments/summary/?agreement_id=${active.id}`);
        setSummary(summaryResponse.data);
        
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateNextDue = () => {
    if (!agreement) return null;
    
    let dueMonthDate;
    if (summary && summary.last_payment_month) {
      const lastMonth = new Date(summary.last_payment_month);
      dueMonthDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1);
    } else {
      const startDate = new Date(agreement.start_date);
      dueMonthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const today = new Date();
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

      const existingPayment = payments.find(
        p => p.payment_month.substring(0, 7) === nextDue.monthString.substring(0, 7)
      );

      let paymentId;
      if (existingPayment) {
        paymentId = existingPayment.id;
      } else {
        const createResponse = await api.post('/rent-payments/', {
          agreement: agreement.id,
          payment_month: nextDue.monthString,
          amount: nextDue.baseRent,
          notes: 'Rent payment initiated via eSewa checkout'
        });
        paymentId = createResponse.data.id;
      }

      const initiateResponse = await api.post('/rent-payments/esewa/initiate/', {
        payment: paymentId
      });

      const { payment_url, form_data } = initiateResponse.data;

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
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-amber)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading tenant dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. HERO WELCOME HEADER (WARM MINIMAL) */}
      <div className="glass-panel" style={{ 
        padding: '2.25rem', 
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span style={{
                background: 'var(--pill-bg)',
                color: 'var(--pill-text)',
                border: '1px solid var(--pill-border)',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                Tenant Hub
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <ShieldCheck size={13} /> Escrow Protected
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2.1rem', fontWeight: 800 }}>
              Namaste, {user?.full_name || user?.email}
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
              Overview of active lease agreements, upcoming rent payments, and legal documentations.
            </p>
          </div>

          {/* Quick Stat Pill Widget */}
          {agreement && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              padding: '0.85rem 1.35rem',
              borderRadius: '0.75rem'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Rent</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  Rs. {parseFloat(agreement.rent_amount).toLocaleString()}
                </div>
              </div>
              <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--border-color)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Status</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={15} /> Active
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {!agreement ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '0.875rem', border: '2px dashed var(--border-color)' }}>
          <div style={{
            width: '60px', height: '60px',
            borderRadius: '50%',
            background: 'var(--pill-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Building2 size={30} color="var(--accent-amber)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Active Lease Agreement</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: 1.6, fontSize: '0.925rem' }}>
            You currently have no active rental leases linked to your tenant account. Submit a property application to establish a verified lease.
          </p>
        </div>
      ) : (
        <>
          {/* 2. CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            
            {/* Active Agreement Card */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '280px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Tenancy Lease</span>
                    <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0 0 0', fontWeight: 800 }}>{agreement.property.title}</h2>
                  </div>
                  <div style={{ background: 'var(--pill-bg)', padding: '0.65rem', borderRadius: '0.65rem', border: '1px solid var(--pill-border)' }}>
                    <Building2 size={22} color="var(--accent-amber)" />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.925rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={15} /> District Location
                    </span>
                    <span style={{ fontWeight: 700 }}>{agreement.property.district}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} /> Lease Term
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatDate(agreement.start_date)} - {formatDate(agreement.end_date)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingUp size={15} /> Rent Rate
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>Rs. {parseFloat(agreement.rent_amount).toLocaleString()} / month</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDownloadPDF} 
                className="btn-secondary" 
                style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                <Download size={18} />
                Download Legal Lease PDF
              </button>
            </div>

            {/* Next Rent Due Card */}
            {nextDue && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '280px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rent Due Status</span>
                      <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0 0 0', fontWeight: 800 }}>{nextDue.formattedMonth}</h2>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.65rem', borderRadius: '0.65rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <CreditCard size={22} color="#10B981" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.925rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Base Monthly Rent</span>
                      <span style={{ fontWeight: 600 }}>Rs. {nextDue.baseRent.toLocaleString()}</span>
                    </div>
                    
                    {nextDue.isLate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 0.65rem', borderRadius: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                          <AlertCircle size={15} /> Late Charge (Past 7th)
                        </span>
                        <span style={{ fontWeight: 700 }}>+ Rs. {nextDue.lateFee}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.35rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Total Payable Amount</span>
                      <span style={{ fontWeight: 800, fontSize: '1.35rem', color: nextDue.isLate ? '#f59e0b' : '#10b981' }}>
                        Rs. {nextDue.totalDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePayEsewa} 
                  disabled={paying}
                  className="btn-primary btn-emerald" 
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginTop: '1.5rem',
                    justify: 'center'
                  }}
                >
                  <ArrowRight size={18} />
                  {paying ? 'Redirecting to eSewa...' : `Pay Rs. ${nextDue.totalDue.toLocaleString()} via eSewa`}
                </button>
              </div>
            )}
            
          </div>

          {/* 3. ESCROW PROTECTION SAFETY BANNER */}
          <div className="premium-card" style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '1.35rem 1.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            borderRadius: '0.875rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              backgroundColor: 'var(--accent-amber)',
              padding: '0.85rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={26} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>
                Escrow Protected Payment System (TenantPlus Guarantee)
              </h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your rent payments are secured under <strong style={{ color: 'var(--accent-amber)' }}>TenantPlus Escrow Safeguard</strong>. Funds are held safely and disbursed to your landlord automatically after verification.
              </p>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.4rem',
              fontSize: '0.775rem',
              fontWeight: 700
            }}>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.3rem 0.75rem',
                borderRadius: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <CheckCircle2 size={13} /> 100% Escrow Secured
              </span>
              <span style={{
                background: 'var(--pill-bg)',
                color: 'var(--pill-text)',
                border: '1px solid var(--pill-border)',
                padding: '0.3rem 0.75rem',
                borderRadius: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Zap size={13} /> Automated Disbursal
              </span>
            </div>
          </div>

          {/* 4. PAYMENT HISTORY TABLE */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Receipt size={20} color="var(--accent-amber)" />
                Recent Rent Payment Ledger
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {payments.length} Payment Record(s)
              </span>
            </div>
            
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                <Receipt size={36} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No payment records logged for this lease agreement yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Payment Month</th>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Receipt No</th>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Rent Paid</th>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Late Fee</th>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 0.5rem' }}>Paid Date</th>
                      <th style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>Receipt PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt) => {
                      const amount = parseFloat(pmt.amount);
                      const lateFee = parseFloat(pmt.late_fee || 0);
                      const formattedMonth = new Date(pmt.payment_month).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      });

                      return (
                        <tr key={pmt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.95rem 0.5rem', fontWeight: 700 }}>{formattedMonth}</td>
                          <td style={{ padding: '0.95rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {pmt.receipt_no || 'Pending'}
                          </td>
                          <td style={{ padding: '0.95rem 0.5rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                            Rs. {amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.95rem 0.5rem', color: lateFee > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {lateFee > 0 ? `Rs. ${lateFee.toLocaleString()}` : '-'}
                          </td>
                          <td style={{ padding: '0.95rem 0.5rem' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              color: '#10B981', 
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '1rem'
                            }}>
                              <CheckCircle2 size={13} /> Verified
                            </span>
                          </td>
                          <td style={{ padding: '0.95rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {formatDate(pmt.paid_at)}
                          </td>
                          <td style={{ padding: '0.95rem 0.5rem', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDownloadReceipt(pmt.id)} 
                              className="btn-secondary"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.3rem',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem'
                              }}
                            >
                              <Download size={14} /> Download
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
