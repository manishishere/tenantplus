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
  AlertTriangle
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
      
      const [propsRes, agreementsRes, appsRes, paymentsRes] = await Promise.all([
        api.get('/properties/my-listings/'),
        api.get('/agreements/'),
        api.get('/applications/'),
        api.get('/rent-payments/')
      ]);

      setProperties(propsRes.data || []);
      setAgreements(agreementsRes.data.results || agreementsRes.data || []);
      setApplications(appsRes.data.results || appsRes.data || []);
      setPayments(paymentsRes.data.results || paymentsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch overview data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Total Properties Metric
  const totalProperties = properties.length;

  // 2. Active Tenancies Metric
  const activeAgreements = agreements.filter(a => a.status === 'active');
  const activeTenanciesCount = activeAgreements.length;

  // 3. Pending Applications Metric
  const pendingApps = applications.filter(app => app.status === 'pending');
  const pendingAppsCount = pendingApps.length;

  // Helper: check if rent is overdue for an agreement in the current month
  const isRentOverdue = (agreement) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if there is any payment for this agreement and this month
    const paidForCurrentMonth = payments.some(
      p => p.agreement.id === agreement.id && p.payment_month.startsWith(currentMonthStr)
    );

    // Rent is considered overdue if today's day is past the 7th of the month and they haven't paid
    return today.getDate() > 7 && !paidForCurrentMonth;
  };

  // 4. Unpaid Rent Calculation
  const calculateUnpaidRent = () => {
    let totalUnpaid = 0;
    const today = new Date();

    activeAgreements.forEach(agreement => {
      const start = new Date(agreement.start_date);
      // Calculate number of months elapsed since lease start, capped up to current date
      const monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
      
      // Find all verified payments for this agreement
      const agreementPayments = payments.filter(p => p.agreement.id === agreement.id);
      
      const unpaidMonths = Math.max(0, monthsElapsed - agreementPayments.length);
      totalUnpaid += unpaidMonths * parseFloat(agreement.rent_amount);
    });

    return totalUnpaid;
  };

  const unpaidRentAmount = calculateUnpaidRent();

  // Accept or Reject an application
  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setProcessingId(appId);
      await api.patch(`/applications/${appId}/status/`, { status: newStatus });
      // Refresh overview data
      await fetchLandlordData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || `Failed to ${newStatus} application.`);
    } finally {
      setProcessingId(null);
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
          <p style={{ color: 'var(--text-muted)' }}>Loading landlord overview...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Landlord Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Monitor your portfolio, handle applications, and track rent roll.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* Total Properties */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <Building2 size={28} color="var(--primary-indigo)" />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Properties</span>
            <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0 0', fontWeight: '700' }}>{totalProperties}</h2>
          </div>
        </div>

        {/* Active Tenancies */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <FileText size={28} color="#10B981" />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Tenancies</span>
            <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0 0', fontWeight: '700' }}>{activeTenanciesCount}</h2>
          </div>
        </div>

        {/* Pending Applications */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard/applications')}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <Clock size={28} color="#F59E0B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending Apps</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0 0', fontWeight: '700' }}>{pendingAppsCount}</h2>
          </div>
        </div>

        {/* Unpaid Rent */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ background: unpaidRentAmount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
            <AlertCircle size={28} color={unpaidRentAmount > 0 ? '#EF4444' : '#10B981'} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Unpaid Rent</span>
            <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0 0', fontWeight: '700', color: unpaidRentAmount > 0 ? '#EF4444' : 'var(--text-light)' }}>
              Rs. {unpaidRentAmount.toLocaleString()}
            </h2>
          </div>
        </div>

      </div>

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: New Lease Applications */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="#F59E0B" />
              New Lease Applications
            </h3>
            <button 
              onClick={() => navigate('/dashboard/applications')} 
              style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          {pendingApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Users size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No pending lease applications.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingApps.slice(0, 5).map((app) => (
                <div key={app.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{app.tenant.full_name || app.tenant.email}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Applied for: <strong>{app.property.title}</strong></span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-indigo)' }}>
                      Rs. {parseFloat(app.property.rent_amount).toLocaleString()}/mo
                    </span>
                  </div>

                  {app.message && (
                    <p style={{ margin: '0 0 1rem 0', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary-indigo)' }}>
                      "{app.message}"
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      disabled={processingId !== null}
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                      className="btn-primary" 
                      style={{ 
                        flex: 1, 
                        backgroundColor: '#10B981', 
                        boxShadow: 'none', 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                    >
                      <Check size={16} /> Accept
                    </button>
                    <button 
                      disabled={processingId !== null}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      className="btn-primary" 
                      style={{ 
                        flex: 1, 
                        backgroundColor: '#EF4444', 
                        boxShadow: 'none', 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Tenants */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--primary-indigo)" />
            Active Tenants
          </h3>

          {activeAgreements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Building2 size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No active tenants at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeAgreements.map((agreement) => {
                const overdue = isRentOverdue(agreement);
                return (
                  <div key={agreement.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{agreement.tenant.full_name || agreement.tenant.email}</h4>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{agreement.property.title}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Rs. {parseFloat(agreement.rent_amount).toLocaleString()}/mo
                      </div>
                      <span style={{ 
                        marginTop: '0.25rem',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '1rem',
                        color: overdue ? '#EF4444' : '#10B981',
                        background: overdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                      }}>
                        {overdue ? (
                          <>
                            <AlertTriangle size={12} /> Overdue
                          </>
                        ) : (
                          <>
                            <Check size={12} /> Paid
                          </>
                        )}
                      </span>
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
