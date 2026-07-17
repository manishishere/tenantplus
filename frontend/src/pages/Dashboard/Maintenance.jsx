import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Wrench, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  XCircle, 
  History,
  Image as ImageIcon
} from 'lucide-react';

export default function Maintenance() {
  const { user } = useAuth();
  const isTenant = user?.role === 'tenant';

  const [activeAgreement, setActiveAgreement] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [images, setImages] = useState(null);

  // Details Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isTenant) {
        // Fetch active agreement
        const agreementRes = await api.get('/agreements/');
        const active = (agreementRes.data.results || agreementRes.data || []).find(
          a => a.status === 'active'
        );
        setActiveAgreement(active);
      }

      // Fetch tickets
      const ticketsRes = await api.get('/maintenance/');
      setTickets(ticketsRes.data.results || ticketsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load maintenance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isTenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle ticket details click
  const handleViewTicket = async (ticketId) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await api.get(`/maintenance/${ticketId}/`);
      setSelectedTicket(res.data);
      setUpdateStatus(res.data.status);
      setUpdatePriority(res.data.priority);
    } catch (err) {
      console.error(err);
      setModalError('Failed to load ticket details.');
    } finally {
      setModalLoading(false);
    }
  };

  // Submit new request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;
    if (!activeAgreement) {
      setError('You need an active lease agreement to file requests.');
      return;
    }

    setSubmitLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('property', activeAgreement.property.id || activeAgreement.property);
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('priority', form.priority);

    if (images) {
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }
    }

    try {
      await api.post('/maintenance/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      // Reset form
      setForm({ title: '', description: '', priority: 'medium' });
      setImages(null);
      // Clear file input value manually
      const fileInput = document.getElementById('ticket-images');
      if (fileInput) fileInput.value = '';
      
      // Refresh tickets
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit maintenance request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Landlord update ticket
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/maintenance/${selectedTicket.id}/`, {
        status: updateStatus,
        priority: updatePriority
      });
      setSelectedTicket(res.data);
      // Refresh list
      const ticketsRes = await api.get('/maintenance/');
      setTickets(ticketsRes.data.results || ticketsRes.data || []);
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.detail || 'Failed to update ticket.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={12}/> Resolved</span>;
      case 'in_progress':
        return <span style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> In Progress</span>;
      case 'cancelled':
        return <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12}/> Cancelled</span>;
      default:
        return <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12}/> Pending</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    const style = { padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 };
    switch (priority) {
      case 'emergency':
        return <span style={{ ...style, color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Emergency</span>;
      case 'high':
        return <span style={{ ...style, color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>High</span>;
      case 'low':
        return <span style={{ ...style, color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Low</span>;
      default:
        return <span style={{ ...style, color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }}>Medium</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        Loading Maintenance Portal...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'var(--font-family)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Wrench size={32} color="var(--primary-indigo)" />
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Maintenance Portal</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Log and track repair tickets with audit trails</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isTenant ? '1fr 1.5fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Submit Request (Tenants Only) */}
        {isTenant && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} color="var(--primary-indigo)" /> File a Repair Ticket
            </h2>

            {!activeAgreement ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                No active lease agreement found. You can only file maintenance requests for properties you currently rent under an active agreement.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject / Title *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Leaking kitchen tap"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Priority *</label>
                  <select 
                    className="form-input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low (Non-urgent)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="emergency">Emergency (Severe Risk)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Detailed Description *</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Provide details of the problem (e.g. location, severity, when it started)"
                    rows={4}
                    style={{ resize: 'vertical' }}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attach Photos</label>
                  <input 
                    id="ticket-images"
                    type="file" 
                    multiple
                    accept="image/*"
                    className="form-input" 
                    onChange={(e) => setImages(e.target.files)}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>You can select multiple images</small>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitLoading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {submitLoading ? 'Filing Ticket...' : 'Submit Repair Ticket'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Right Side / Full Width: Request History List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {isTenant ? 'Your Repair Tickets' : 'Property Repair Tickets'}
          </h2>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No maintenance requests found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Ticket No</th>
                  {!isTenant && <th style={{ padding: '0.75rem 0.5rem' }}>Property</th>}
                  <th style={{ padding: '0.75rem 0.5rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Priority</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{ticket.ticket_no}</td>
                    {!isTenant && (
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{ticket.property?.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.property?.address}</div>
                      </td>
                    )}
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{ticket.title}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{getPriorityBadge(ticket.priority)}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{getStatusBadge(ticket.status)}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleViewTicket(ticket.id)}
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.25rem', padding: '0.35rem 0.75rem', color: 'var(--text-light)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.target.style.borderColor = 'var(--primary-indigo)'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ticket #{selectedTicket.ticket_no}</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>{selectedTicket.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Priority</div>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Created At</div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description</div>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0, background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Uploaded Images */}
              {selectedTicket.images?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ImageIcon size={14} /> Uploaded Photos</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedTicket.images.map((img) => (
                      <a key={img.id} href={img.image} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.25rem', overflow: 'hidden', width: '80px', height: '80px' }}>
                        <img src={img.image} alt="ticket attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Landlord Actions: Update ticket status/priority */}
              {!isTenant && (
                <form onSubmit={handleUpdateTicket} style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Update Status & Priority</h4>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Status</label>
                      <select 
                        className="form-input"
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label className="form-label">Priority</label>
                      <select 
                        className="form-input"
                        value={updatePriority}
                        onChange={(e) => setUpdatePriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem' }}>
                    Save Changes
                  </button>
                </form>
              )}

              {/* Audit Trail (django-simple-history) */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><History size={14}/> Audit Trail & History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {(!selectedTicket.history_trail || selectedTicket.history_trail.length === 0) ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No audit trail records found.</div>
                  ) : (
                    selectedTicket.history_trail.map((log, index) => (
                      <div key={index} style={{ fontSize: '0.8rem', borderLeft: '2px solid var(--primary-indigo)', paddingLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>
                            {log.change_type === '+' ? 'Ticket Created' : `Updated by ${log.changed_by}`}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Status: <span style={{ textTransform: 'capitalize', color: 'var(--text-light)', fontWeight: 500 }}>{log.status.replace('_', ' ')}</span> | 
                          Priority: <span style={{ textTransform: 'capitalize', color: 'var(--text-light)', fontWeight: 500 }}>{log.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
