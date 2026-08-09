import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  FilterX, 
  Search,
  Calendar,
  ShieldCheck,
  Award,
  MessageSquare,
  Mail,
  Phone,
  Eye,
  MapPin,
  FileText,
  RotateCcw
} from 'lucide-react';

export default function ApplicationsList() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [selectedAppModal, setSelectedAppModal] = useState(null);

  // Optional Rejection Reason Modal State
  const [rejectTargetApp, setRejectTargetApp] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdrawApplication = async (appId) => {
    if (!window.confirm('Are you sure you want to withdraw your rental application? This action cannot be undone.')) {
      return;
    }
    try {
      setProcessingId(appId);
      setError('');
      await api.patch(`/applications/${appId}/withdraw/`);
      await fetchApplications();
      if (selectedAppModal && selectedAppModal.id === appId) {
        setSelectedAppModal(prev => prev ? { ...prev, status: 'withdrawn' } : null);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to withdraw application.');
    } finally {
      setProcessingId(null);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/applications/');
      setApplications(response.data.results || response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (tenantId, propertyId) => {
    try {
      const res = await api.post('/chat/conversations/', {
        other_user_id: tenantId,
        property_id: propertyId
      });
      navigate('/dashboard/chat', { state: { conversationId: res.data?.id } });
    } catch (err) {
      console.error(err);
      alert('Failed to start chat session.');
    }
  };

  const handleUpdateStatus = async (appId, newStatus, reason = '') => {
    try {
      setProcessingId(appId);
      setError('');
      await api.patch(`/applications/${appId}/status/`, { status: newStatus, reason: reason.trim() });
      await fetchApplications(); // reload
      if (selectedAppModal && selectedAppModal.id === appId) {
        setSelectedAppModal(prev => prev ? { ...prev, status: newStatus, rejection_reason: reason.trim() } : null);
      }
      setShowRejectModal(false);
      setRejectTargetApp(null);
      setRejectReason('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Failed to update application status to ${newStatus}.`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const tenantName = (app.tenant?.full_name || '').toLowerCase();
      const tenantEmail = (app.tenant?.email || '').toLowerCase();
      const propertyTitle = (app.property?.title || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchSearch = tenantName.includes(query) || 
                          tenantEmail.includes(query) || 
                          propertyTitle.includes(query);

      const matchStatus = statusFilter ? app.status === statusFilter : true;

      return matchSearch && matchStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'accepted':
        return { color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' };
      case 'rejected':
        return { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' };
      case 'pending':
        return { color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' };
      case 'withdrawn':
        return { color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)' };
      default:
        return { color: 'var(--text-light)', background: 'rgba(255, 255, 255, 0.1)' };
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
          <p style={{ color: 'var(--text-muted)' }}>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Lease Applications</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Review, manage, and process all incoming tenancy applications.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 250px' }}>
          <label className="form-label">Search Applications</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by tenant or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0, flex: '0 1 200px' }}>
          <label className="form-label">Filter Status</label>
          <select 
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        {(searchQuery || statusFilter) && (
          <button 
            className="btn-secondary"
            onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
            style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FilterX size={16} /> Reset
          </button>
        )}
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>No Applications Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {searchQuery || statusFilter 
              ? "No tenancy applications match your current filters."
              : "You haven't received any tenancy applications yet."}
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>Tenant Details</th>
                  <th style={{ padding: '1rem' }}>Property Applied</th>
                  <th style={{ padding: '1rem' }}>Monthly Rent</th>
                  <th style={{ padding: '1rem' }}>Applied Date</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const statusStyle = getStatusStyle(app.status);
                  const tenantObj = app.tenant || app.applicant || {};
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {tenantObj.full_name || tenantObj.email || 'N/A'}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '0.8rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <ShieldCheck size={12} color="#10b981" /> Genuine Applicant
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={12} /> {tenantObj.email}</span>
                          {tenantObj.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} /> {tenantObj.phone}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{app.property?.title}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary-indigo)' }}>
                        Rs. {parseFloat(app.offered_rent_amount || app.property?.rent_amount || 0).toLocaleString()}
                        {app.offered_rent_amount && parseFloat(app.offered_rent_amount) !== parseFloat(app.property?.rent_amount || 0) && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>
                            (Negotiated Offer)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={14} />
                          {formatDate(app.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          ...statusStyle
                        }}>
                          {app.status === 'pending' && <Clock size={12} />}
                          {app.status === 'accepted' && <Check size={12} />}
                          {app.status === 'rejected' && <X size={12} />}
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          
                          {/* Full Application Details Modal Button */}
                          <button
                            onClick={() => setSelectedAppModal(app)}
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '0.5rem',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Eye size={13} /> View Details
                          </button>

                          {/* Chat Button (Only available AFTER acceptance) */}
                          {app.status === 'accepted' && (
                            <button
                              onClick={() => handleStartChat(tenantObj.id, app.property?.id)}
                              style={{
                                background: 'var(--pill-bg)',
                                border: '1px solid var(--pill-border)',
                                color: 'var(--primary-indigo)',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <MessageSquare size={13} /> Chat
                            </button>
                          )}

                          {app.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {role === 'landlord' ? (
                                <>
                                  <button 
                                    disabled={processingId !== null}
                                    onClick={() => handleUpdateStatus(app.id, 'accepted')}
                                    className="btn-primary" 
                                    style={{ 
                                      backgroundColor: '#10B981', 
                                      boxShadow: 'none', 
                                      padding: '0.4rem 0.8rem', 
                                      fontSize: '0.8rem',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <Check size={14} /> Accept
                                  </button>
                                  <button 
                                    disabled={processingId !== null}
                                    onClick={() => { setRejectTargetApp(app); setRejectReason(''); setShowRejectModal(true); }}
                                    className="btn-primary" 
                                    style={{ 
                                      backgroundColor: '#EF4444', 
                                      boxShadow: 'none', 
                                      padding: '0.4rem 0.8rem', 
                                      fontSize: '0.8rem',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled={processingId !== null}
                                  onClick={() => handleWithdrawApplication(app.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                >
                                  <RotateCcw size={13} /> Withdraw
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem', textTransform: 'capitalize' }}>
                              {app.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL TENANT APPLICATION DETAILS MODAL */}
      {selectedAppModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '1.25rem' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Tenancy Application Details
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {selectedAppModal.tenant?.full_name || selectedAppModal.tenant?.email}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedAppModal(null)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>

            {/* Application Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Applicant Card */}
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Tenant Profile
                </span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {selectedAppModal.tenant?.full_name || 'N/A'}
                  {selectedAppModal.tenant?.is_verified && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '0.4rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <ShieldCheck size={10} /> Verified Tenant
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Mail size={13} /> {selectedAppModal.tenant?.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Phone size={13} /> {selectedAppModal.tenant?.phone || 'Not Provided'}</div>
                </div>
              </div>

              {/* Property Card */}
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Applied Listing
                </span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {selectedAppModal.property?.title}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--primary-indigo)', fontWeight: 800, marginTop: '0.25rem' }}>
                  Rs. {parseFloat(selectedAppModal.property?.rent_amount || 0).toLocaleString()} / month
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} color="var(--primary-indigo)" />
                  {selectedAppModal.property?.display_address || selectedAppModal.property?.district || 'Kathmandu Valley'}
                </div>
              </div>

            </div>

            {/* Application Intro / Message */}
            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={14} color="var(--primary-indigo)" /> Tenant Introduction & Move-in Message
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0, color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                {selectedAppModal.message || 'No additional message provided by the tenant.'}
              </p>
            </div>

            {/* Rejection Note Display if rejected */}
            {selectedAppModal.rejection_reason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.825rem', color: '#ef4444' }}>
                <strong>Rejection Feedback Note:</strong> {selectedAppModal.rejection_reason}
              </div>
            )}

            {/* Application Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                {selectedAppModal.status === 'accepted' && (
                  <button
                    onClick={() => {
                      const tId = selectedAppModal.tenant?.id || selectedAppModal.applicant?.id;
                      const pId = selectedAppModal.property?.id;
                      setSelectedAppModal(null);
                      handleStartChat(tId, pId);
                    }}
                    style={{ background: 'var(--pill-bg)', border: '1px solid var(--pill-border)', color: 'var(--primary-indigo)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <MessageSquare size={15} /> Chat with Tenant
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedAppModal.status === 'pending' && (
                  <>
                    {role === 'landlord' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedAppModal.id, 'accepted')}
                          style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '0.5rem 1.15rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Check size={15} /> Accept Application
                        </button>
                        <button
                          onClick={() => {
                            setRejectTargetApp(selectedAppModal);
                            setRejectReason('');
                            setShowRejectModal(true);
                          }}
                          style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '0.5rem 1.15rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <X size={15} /> Reject Application
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleWithdrawApplication(selectedAppModal.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 1.15rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <RotateCcw size={15} /> Withdraw Application
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => setSelectedAppModal(null)}
                  style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1.15rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* REJECT APPLICATION WITH OPTIONAL MESSAGE MODAL */}
      {showRejectModal && rejectTargetApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', width: '100%', maxWidth: '540px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
              Reject Tenancy Application
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: 1.45 }}>
              Rejecting application for <strong>{rejectTargetApp.property?.title}</strong> from <strong>{rejectTargetApp.tenant?.full_name || rejectTargetApp.tenant?.email}</strong>.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Quick Note Presets (Optional Click to Fill):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  'Property is already booked by another tenant.',
                  'Move-in timeline is incompatible with landlord terms.',
                  'Incomplete applicant verification profile.',
                  'Occupancy terms do not meet property requirements.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.4rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 800 }}>Feedback Message for Tenant (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Type an optional note explaining why application was not accepted..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ padding: '0.75rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectTargetApp(null); }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Direct Reject Button (No Message) */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(rejectTargetApp.id, 'rejected', '')}
                  disabled={processingId !== null}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
                >
                  Reject Directly
                </button>

                {/* Reject with Optional Note Button */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(rejectTargetApp.id, 'rejected', rejectReason)}
                  disabled={processingId !== null}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '0.5rem', background: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
