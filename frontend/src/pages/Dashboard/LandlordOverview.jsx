import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Building2, 
  FileText, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  ChevronRight, 
  Users,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Mail,
  Award,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';

export default function LandlordOverview() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchLandlordData();
  }, []);

  const fetchLandlordData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [propsRes, agreementsRes, appsRes, paymentsRes] = await Promise.allSettled([
        api.get('/properties/my-listings/'),
        api.get('/agreements/'),
        api.get('/applications/'),
        api.get('/rent-payments/')
      ]);

      if (propsRes.status === 'fulfilled') {
        const raw = propsRes.value.data?.results || propsRes.value.data;
        setProperties(Array.isArray(raw) ? raw : []);
      }
      if (agreementsRes.status === 'fulfilled') {
        const raw = agreementsRes.value.data?.results || agreementsRes.value.data;
        setAgreements(Array.isArray(raw) ? raw : []);
      }
      if (appsRes.status === 'fulfilled') {
        const raw = appsRes.value.data?.results || appsRes.value.data;
        setApplications(Array.isArray(raw) ? raw : []);
      }
      if (paymentsRes.status === 'fulfilled') {
        const raw = paymentsRes.value.data?.results || paymentsRes.value.data;
        setPayments(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch overview data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalProperties = properties.length;
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const activeTenanciesCount = activeAgreements.length;
  const pendingApps = applications.filter(app => app.status === 'pending');
  const pendingAppsCount = pendingApps.length;

  const isRentOverdue = (agreement) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const paidForCurrentMonth = payments.some(
      p => p.agreement.id === agreement.id && p.payment_month.startsWith(currentMonthStr)
    );
    return today.getDate() > 7 && !paidForCurrentMonth;
  };

  const calculateUnpaidRent = () => {
    let totalUnpaid = 0;
    const today = new Date();

    activeAgreements.forEach(agreement => {
      const start = new Date(agreement.start_date);
      const monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
      const agreementPayments = payments.filter(p => p.agreement.id === agreement.id);
      const unpaidMonths = Math.max(0, monthsElapsed - agreementPayments.length);
      totalUnpaid += unpaidMonths * parseFloat(agreement.rent_amount);
    });

    return totalUnpaid;
  };

  const unpaidRentAmount = calculateUnpaidRent();

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setProcessingId(appId);
      await api.patch(`/applications/${appId}/status/`, { status: newStatus });
      await fetchLandlordData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || `Failed to ${newStatus} application.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendReminder = async (agreementId) => {
    try {
      const res = await api.post('/rent-payments/send-reminder/', { agreement_id: agreementId });
      alert(res.data.detail || 'Rent due reminder email sent!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send reminder email.');
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
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading landlord overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. TOP HERO HEADER & ESCROW STATUS (WARM MINIMAL) */}
      <div className="glass-panel" style={{ 
        padding: '2.25rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
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
                Landlord Control
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
                <ShieldCheck size={13} /> Verified Landlord Badge
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2.1rem', fontWeight: 800 }}>
              Rental Portfolio Control
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
              Screen tenant applications, oversee active tenancies, and collect rent payments safely.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/dashboard/properties')} 
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <PlusCircle size={18} /> Manage Listings
            </button>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              padding: '0.65rem 1.15rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ backgroundColor: 'var(--accent-amber)', padding: '0.45rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <CreditCard size={18} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  Platform Escrow Disbursal: Active
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                  Direct payouts after tenant move-in check.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* 2. METRICS CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Properties */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem' }}>
          <div style={{ background: 'var(--pill-bg)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--pill-border)' }}>
            <Building2 size={24} color="var(--accent-amber)" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Listings</span>
            <h2 style={{ fontSize: '1.85rem', margin: '0.15rem 0 0 0', fontWeight: 800, color: 'var(--text-main)' }}>{totalProperties}</h2>
          </div>
        </div>

        {/* Active Tenancies */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <FileText size={24} color="#10b981" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Tenancies</span>
            <h2 style={{ fontSize: '1.85rem', margin: '0.15rem 0 0 0', fontWeight: 800, color: '#10b981' }}>{activeTenanciesCount}</h2>
          </div>
        </div>

        {/* Pending Applications */}
        <div 
          className="glass-panel" 
          style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard/applications')}
        >
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Apps</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.85rem', margin: '0.15rem 0 0 0', fontWeight: 800, color: '#f59e0b' }}>{pendingAppsCount}</h2>
          </div>
        </div>

        {/* Unpaid Rent */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem' }}>
          <div style={{ 
            background: unpaidRentAmount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', 
            padding: '0.85rem', 
            borderRadius: '0.75rem',
            border: `1px solid ${unpaidRentAmount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` 
          }}>
            <AlertCircle size={24} color={unpaidRentAmount > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unpaid Rent</span>
            <h2 style={{ fontSize: '1.85rem', margin: '0.15rem 0 0 0', fontWeight: 800, color: unpaidRentAmount > 0 ? '#ef4444' : 'var(--text-main)' }}>
              Rs. {unpaidRentAmount.toLocaleString()}
            </h2>
          </div>
        </div>

      </div>

      {/* 3. MAIN SPLIT SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.75rem' }}>
        
        {/* LEFT COLUMN: NEW LEASE APPLICATIONS */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Clock size={20} color="#f59e0b" /> Lease Application Screening
            </h3>
            <button 
              onClick={() => navigate('/dashboard/applications')} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              View All <ChevronRight size={15} />
            </button>
          </div>

          {pendingApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Users size={38} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.925rem', fontWeight: 600 }}>No pending lease applications at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingApps.slice(0, 5).map((app) => (
                <div key={app.id} style={{ 
                  padding: '1.15rem', 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '0.75rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.85rem' 
                }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {app.tenant.full_name || app.tenant.email}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Property: <strong style={{ color: 'var(--text-main)' }}>{app.property.title}</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      Rs. {parseFloat(app.property.rent_amount).toLocaleString()}/mo
                    </span>
                  </div>

                  {app.message && (
                    <p style={{ 
                      margin: 0, 
                      padding: '0.65rem 0.85rem', 
                      background: 'var(--bg-card)', 
                      borderRadius: '0.5rem', 
                      fontSize: '0.85rem', 
                      color: 'var(--text-muted)', 
                      borderLeft: '3px solid var(--accent-amber)', 
                      fontStyle: 'italic',
                      lineHeight: 1.5
                    }}>
                      "{app.message}"
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      disabled={processingId !== null}
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                      className="btn-primary btn-emerald" 
                      style={{ 
                        flex: 1, 
                        padding: '0.55rem 1rem', 
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Check size={16} /> Accept Application
                    </button>
                    <button 
                      disabled={processingId !== null}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      style={{ 
                        flex: 1, 
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '0.55rem 1rem', 
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '0.625rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE TENANTS */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Users size={20} color="var(--accent-amber)" /> Active Tenancies Ledger
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{activeTenanciesCount} Active Leases</span>
          </div>

          {activeAgreements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Building2 size={38} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.925rem', fontWeight: 600 }}>No active tenants registered currently.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeAgreements.map((agreement) => {
                const overdue = isRentOverdue(agreement);
                return (
                  <div key={agreement.id} style={{ 
                    padding: '1.15rem', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    justify: 'space-between', 
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {agreement.tenant.full_name || agreement.tenant.email}
                      </h4>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        {agreement.property.title}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                        Rs. {parseFloat(agreement.rent_amount).toLocaleString()}/mo
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleSendReminder(agreement.id)}
                          style={{
                            background: 'var(--pill-bg)',
                            border: '1px solid var(--pill-border)',
                            color: 'var(--pill-text)',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          title="Send Email Reminder with 1-Click Payment Link"
                        >
                          <Mail size={12} /> Send Email Reminder
                        </button>
                        
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '1rem',
                          color: overdue ? '#ef4444' : '#10b981',
                          background: overdue ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          border: overdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {overdue ? (
                            <>
                              <AlertTriangle size={13} /> Overdue
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Paid
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
