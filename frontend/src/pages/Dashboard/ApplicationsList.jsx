import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  FilterX, 
  Search,
  Calendar
} from 'lucide-react';

export default function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

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

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setProcessingId(appId);
      setError('');
      await api.patch(`/applications/${appId}/status/`, { status: newStatus });
      await fetchApplications(); // reload
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Failed to update application status to ${newStatus}.`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const tenantName = (app.tenant.full_name || '').toLowerCase();
      const tenantEmail = (app.tenant.email || '').toLowerCase();
      const propertyTitle = (app.property.title || '').toLowerCase();
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
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder="Search by tenant name, email, or property..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
          <label className="form-label">Filter Status</label>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        {(searchQuery || statusFilter) && (
          <button 
            onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
            className="btn-primary" 
            style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Clear filters"
          >
            <FilterX size={20} />
          </button>
        )}
      </div>

      {/* Main Table */}
      {filteredApplications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-darker)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Applications Found</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            No tenancy applications match your current search parameters.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0.5rem' }}>
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
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                          {app.tenant.full_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {app.tenant.email}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{app.property.title}</td>
                      <td style={{ padding: '1rem' }}>Rs. {parseFloat(app.property.rent_amount).toLocaleString()}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />
                          {formatDate(app.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          textTransform: 'uppercase', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          ...statusStyle
                        }}>
                          {app.status === 'pending' && <Clock size={12} />}
                          {app.status === 'accepted' && <Check size={12} />}
                          {app.status === 'rejected' && <X size={12} />}
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {app.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                            >
                              <Check size={14} /> Accept
                            </button>
                            <button 
                              disabled={processingId !== null}
                              onClick={() => handleUpdateStatus(app.id, 'rejected')}
                              className="btn-primary" 
                              style={{ 
                                backgroundColor: '#EF4444', 
                                boxShadow: 'none', 
                                padding: '0.4rem 0.8rem', 
                                fontSize: '0.8rem',
                                gap: '0.25rem'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
