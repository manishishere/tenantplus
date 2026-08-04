import { useState, useEffect } from 'react';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { 
  Users, Building2, ShieldCheck, DollarSign, AlertTriangle, 
  CheckCircle2, XCircle, Search, Filter, RefreshCw, Mail, 
  FileText, Activity, Lock, Unlock, Eye, Sparkles, Download, Megaphone,
  Database, Server, Cpu, Clock, Layers
} from 'lucide-react';

export default function AdminOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'kyc', 'users', 'properties', 'rent', 'disputes'

  // System Health & Activity State (Competitor Parity)
  const [systemHealth, setSystemHealth] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // KYC Queue State
  const [kycDocs, setKycDocs] = useState([]);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [kycFilter, setKycFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'

  // User Directory State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Property Moderation State
  const [propertiesList, setPropertiesList] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propSearchQuery, setPropSearchQuery] = useState('');

  // Rent Ledger State
  const [rentPayments, setRentPayments] = useState([]);
  const [loadingRent, setLoadingRent] = useState(false);

  // Disputes State
  const [disputesList, setDisputesList] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);

  // Test Email Diagnostic State
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  // Broadcast Notice State
  const [systemAnnouncement, setSystemAnnouncement] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState('');

  // Action messages
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    fetchMetrics();
    fetchSystemHealth();
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'kyc') fetchKycDocs();
    if (activeTab === 'users') fetchUsersList();
    if (activeTab === 'properties') fetchProperties();
    if (activeTab === 'rent') fetchRentPayments();
    if (activeTab === 'disputes') fetchDisputes();
  }, [activeTab, userRoleFilter, kycFilter]);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await api.get('/accounts/admin/dashboard');
      setMetrics(res.data?.metrics || {});
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await api.get('/accounts/admin/system-health/');
      setSystemHealth(res.data || {});
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    }
  };

  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/accounts/admin/system-activity/');
      setActivityLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchKycDocs = async () => {
    setLoadingKyc(true);
    try {
      const res = await api.get('/accounts/admin/kyc-documents');
      const docs = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setKycDocs(docs);
    } catch (err) {
      console.error('Failed to fetch KYC docs:', err);
    } finally {
      setLoadingKyc(false);
    }
  };

  const handleKycReview = async (docId, action) => {
    try {
      const res = await api.post('/accounts/admin/kyc-review/', { document_id: docId, action });
      setActionMsg({ type: 'success', text: res.data?.detail || `Document ${action}d successfully!` });
      fetchKycDocs();
      fetchMetrics();
    } catch (err) {
      setActionMsg({ type: 'error', text: parseApiError(err, `Failed to ${action} KYC document.`) });
    }
  };

  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      let url = '/accounts/users?';
      if (userRoleFilter !== 'all') url += `role=${userRoleFilter}&`;
      if (userSearchQuery) url += `search=${encodeURIComponent(userSearchQuery)}&`;
      const res = await api.get(url);
      setUsersList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await api.post('/accounts/admin/toggle-user-status/', { user_id: userId });
      setActionMsg({ type: 'success', text: res.data?.detail || 'User status updated.' });
      fetchUsersList();
      fetchMetrics();
    } catch (err) {
      setActionMsg({ type: 'error', text: parseApiError(err, 'Failed to update user status.') });
    }
  };

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await api.get('/properties/admin/all/');
      const props = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setPropertiesList(props);
    } catch (err) {
      console.error('Failed to fetch admin properties:', err);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleModerateProperty = async (propId, currentAvailability) => {
    try {
      const res = await api.post(`/properties/${propId}/admin-moderate/`, { is_available: !currentAvailability });
      setActionMsg({ type: 'success', text: res.data?.detail || 'Property listing status updated.' });
      fetchProperties();
      fetchMetrics();
    } catch (err) {
      setActionMsg({ type: 'error', text: parseApiError(err, 'Failed to update property status.') });
    }
  };

  const fetchRentPayments = async () => {
    setLoadingRent(true);
    try {
      const res = await api.get('/rent-payments/history/');
      const payments = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setRentPayments(payments);
    } catch (err) {
      console.error('Failed to fetch rent payments:', err);
    } finally {
      setLoadingRent(false);
    }
  };

  const fetchDisputes = async () => {
    setLoadingDisputes(true);
    try {
      const res = await api.get('/disputes/');
      const disputes = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setDisputesList(disputes);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
    } finally {
      setLoadingDisputes(false);
    }
  };

  const handleTestEmailSubmit = async (e) => {
    e.preventDefault();
    if (!testEmailAddr) return;
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await api.get(`/test-email/?email=${encodeURIComponent(testEmailAddr)}`);
      setTestEmailResult({ success: true, text: res.data?.logs?.join('\n') || 'Email sent successfully!' });
    } catch (err) {
      setTestEmailResult({ success: false, text: parseApiError(err, 'Failed to send test email.') });
    } finally {
      setTestEmailSending(false);
    }
  };

  const handlePublishBroadcast = (e) => {
    e.preventDefault();
    if (!systemAnnouncement.trim()) return;
    setActiveBroadcast(systemAnnouncement);
    setActionMsg({ type: 'success', text: 'System Broadcast Announcement published successfully!' });
  };

  const exportToCSV = (filename, dataArray, keys) => {
    if (!dataArray || dataArray.length === 0) return;
    const csvRows = [keys.join(',')];
    for (const item of dataArray) {
      const row = keys.map(k => `"${('' + (item[k] ?? '')).replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredKycDocs = kycDocs.filter(d => kycFilter === 'all' || d.status === kycFilter);
  const filteredProperties = propertiesList.filter(p => 
    !propSearchQuery || 
    p.title?.toLowerCase().includes(propSearchQuery.toLowerCase()) || 
    p.district?.toLowerCase().includes(propSearchQuery.toLowerCase()) ||
    p.landlord_email?.toLowerCase().includes(propSearchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={32} color="#6366f1" />
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                TenantPlus Executive Control Center
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
              Platform Governance, Identity Verification, Escrow Audit, and Compliance under Nepalese House Rent Act 2075.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: systemHealth?.status === 'healthy' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: systemHealth?.status === 'healthy' ? '#22c55e' : '#ef4444', padding: '0.4rem 0.85rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, border: `1px solid ${systemHealth?.status === 'healthy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
              <Activity size={16} /> {systemHealth?.status === 'healthy' ? `System Operational (${systemHealth?.database?.latency_ms || 1}ms)` : 'System Degradation'}
            </span>
            <button 
              onClick={() => { fetchMetrics(); fetchSystemHealth(); fetchActivityLogs(); if (activeTab === 'kyc') fetchKycDocs(); }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            >
              <RefreshCw size={16} className={loadingMetrics ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      {activeBroadcast && (
        <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
          <Megaphone size={20} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', background: '#f59e0b', color: '#000000', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', marginRight: '0.5rem' }}>Active System Notice</span>
            {activeBroadcast}
          </div>
          <button onClick={() => setActiveBroadcast('')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 700 }}>Dismiss</button>
        </div>
      )}

      {/* Action Toast Notice */}
      {actionMsg && (
        <div style={{
          background: actionMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMsg.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: actionMsg.type === 'success' ? '#22c55e' : '#ef4444',
          padding: '1rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Users</span>
            <Users size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{metrics?.total_users ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {metrics?.tenants_count ?? 0} Tenants &bull; {metrics?.landlords_count ?? 0} Landlords
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pending KYC Queue</span>
            <ShieldCheck size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: metrics?.pending_kyc_count > 0 ? '#f59e0b' : 'inherit' }}>
            {metrics?.pending_kyc_count ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {metrics?.verified_users_count ?? 0} KYC Verified Users
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Properties</span>
            <Building2 size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{metrics?.total_properties ?? 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {metrics?.available_properties ?? 0} Available &bull; {metrics?.rented_properties ?? 0} Rented
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Escrow Rent Paid</span>
            <DollarSign size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            Rs. {(metrics?.total_rent_collected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {metrics?.total_payments_count ?? 0} Completed Transactions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Open Disputes</span>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: metrics?.open_disputes_count > 0 ? '#ef4444' : 'inherit' }}>
            {metrics?.open_disputes_count ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Legal Oversight under Act 2075
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', marginBottom: '1.5rem', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Executive Overview', icon: Activity },
          { id: 'kyc', label: `KYC Review Queue (${metrics?.pending_kyc_count || 0})`, icon: ShieldCheck, badge: metrics?.pending_kyc_count },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'properties', label: 'Property Moderation', icon: Building2 },
          { id: 'rent', label: 'Escrow Rent Ledger', icon: DollarSign },
          { id: 'disputes', label: 'Dispute Resolution', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: activeTab === tab.id ? 'var(--primary-indigo)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Executive Overview & Competitor Parity Widgets */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
          
          {/* Real-time System Audit Activity Stream (Buildium / AppFolio Feature) */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Clock size={20} color="#6366f1" /> Live Platform Activity Stream
              </h3>
              <button onClick={fetchActivityLogs} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <RefreshCw size={14} className={loadingLogs ? 'spin' : ''} />
              </button>
            </div>

            {loadingLogs ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading activity logs...</div>
            ) : activityLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent platform activity.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {activityLogs.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: item.type === 'user_registered' ? 'rgba(99,102,241,0.15)' : item.type === 'payment_received' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', 
                      color: item.type === 'user_registered' ? '#6366f1' : item.type === 'payment_received' ? '#22c55e' : '#f59e0b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                      {item.type === 'user_registered' ? <Users size={16} /> : item.type === 'payment_received' ? <DollarSign size={16} /> : <Building2 size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Infrastructure Monitor Widget */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Server size={20} color="#10b981" /> System Infrastructure & Diagnostics
            </h3>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Database size={16} color="#6366f1" /> Database Status
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: systemHealth?.database?.connected ? '#22c55e' : '#ef4444' }}>
                  {systemHealth?.database?.engine?.toUpperCase()} ({systemHealth?.database?.latency_ms || 1} ms)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Mail size={16} color="#f59e0b" /> Email Backend Handshake
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                  {systemHealth?.environment?.email_backend || 'SMTP'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Layers size={16} color="#a855f7" /> Background Tasks Cluster
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22c55e' }}>
                  {systemHealth?.environment?.q_cluster_sync ? 'Thread Worker Active' : 'Task Queue Active'}
                </span>
              </div>
            </div>

            {/* Diagnostic Email Dispatch */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quick SMTP Connection Test:</div>
              <form onSubmit={handleTestEmailSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="email" 
                  placeholder="Enter email..."
                  value={testEmailAddr}
                  onChange={e => setTestEmailAddr(e.target.value)}
                  required
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
                <button type="submit" disabled={testEmailSending} className="btn btn-primary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                  {testEmailSending ? 'Testing...' : 'Test SMTP'}
                </button>
              </form>
              {testEmailResult && (
                <pre style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '0.375rem', color: testEmailResult.success ? '#22c55e' : '#ef4444', fontSize: '0.75rem', overflowX: 'auto' }}>
                  {testEmailResult.text}
                </pre>
              )}
            </div>
          </div>

          {/* System Broadcast Announcement Manager */}
          <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Megaphone size={20} color="#6366f1" /> System Broadcast Notice Manager
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Publish a platform-wide banner notification visible to all logged-in users.
            </p>
            <form onSubmit={handlePublishBroadcast} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="e.g., Scheduled system update tonight at 11 PM..."
                value={systemAnnouncement}
                onChange={e => setSystemAnnouncement(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>Publish</button>
            </form>
          </div>

        </div>
      )}

      {/* Tab 2: KYC Verification Queue */}
      {activeTab === 'kyc' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>User KYC Identity Verification Queue</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Inspect submitted Nepalese Citizenship or Passport details and update account verification status.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setKycFilter(status)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--border-color)',
                    background: kycFilter === status ? 'var(--primary-indigo)' : 'transparent',
                    color: kycFilter === status ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loadingKyc ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading KYC documents...</div>
          ) : filteredKycDocs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No KYC documents found matching filter "{kycFilter}".
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredKycDocs.map(doc => (
                <div key={doc.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{doc.user_full_name || 'Unnamed User'}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{doc.user_email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'capitalize', marginTop: '0.2rem' }}>Role: {doc.user_role}</div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      background: doc.status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : doc.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: doc.status === 'approved' ? '#22c55e' : doc.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${doc.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' : doc.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}>
                      {doc.status}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <div><strong>Doc Type:</strong> {doc.doc_type?.toUpperCase()}</div>
                    <div><strong>Doc Number:</strong> {doc.doc_number || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Submitted: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Document Image Previews */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {doc.doc_url ? (
                      <a href={doc.doc_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ height: '90px', background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={doc.doc_url} alt="Doc Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Front Photo ↗</span>
                        </div>
                      </a>
                    ) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Front Photo</div>}

                    {doc.back_doc_url ? (
                      <a href={doc.back_doc_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ height: '90px', background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={doc.back_doc_url} alt="Doc Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Back Photo ↗</span>
                        </div>
                      </a>
                    ) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Back Photo</div>}
                  </div>

                  {/* Action Controls */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleKycReview(doc.id, 'approve')}
                      disabled={doc.status === 'approved'}
                      className="btn"
                      style={{ flex: 1, background: '#10b981', color: '#ffffff', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ✓ Approve KYC
                    </button>
                    <button 
                      onClick={() => handleKycReview(doc.id, 'reject')}
                      disabled={doc.status === 'rejected'}
                      className="btn"
                      style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem' }}>User Accounts Governance</h2>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                onClick={() => exportToCSV('tenantplus_users', usersList, ['id', 'full_name', 'email', 'phone', 'role', 'is_verified', 'is_active', 'created_at'])}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                <Download size={15} /> Export CSV
              </button>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search user name or email..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchUsersList()}
                  style={{ padding: '0.45rem 1rem 0.45rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.875rem' }}
                />
              </div>

              <select 
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.875rem' }}
              >
                <option value="all">All Roles</option>
                <option value="tenant">Tenants Only</option>
                <option value="landlord">Landlords Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>User</th>
                    <th style={{ padding: '0.75rem' }}>Role</th>
                    <th style={{ padding: '0.75rem' }}>Phone</th>
                    <th style={{ padding: '0.75rem' }}>KYC Verified</th>
                    <th style={{ padding: '0.75rem' }}>Account Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{u.full_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{u.phone || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {u.is_verified ? (
                          <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={16} /> Verified
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>Unverified</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {u.is_active ? (
                          <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600 }}>Active</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>Disabled</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {!u.is_staff && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: u.is_active ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                              color: u.is_active ? '#ef4444' : '#22c55e',
                              border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                              cursor: 'pointer'
                            }}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Property Moderation */}
      {activeTab === 'properties' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Property Listings Audit & Moderation</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Audit rental prices, locations, and compliance across Kathmandu Valley and Nepal districts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => exportToCSV('tenantplus_properties', propertiesList, ['id', 'title', 'district', 'rent_amount', 'is_available', 'landlord_email'])}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                <Download size={15} /> Export CSV
              </button>

              <input 
                type="text" 
                placeholder="Search properties or district..."
                value={propSearchQuery}
                onChange={e => setPropSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {loadingProperties ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading property listings...</div>
          ) : filteredProperties.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No properties found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filteredProperties.map(p => (
                <div key={p.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{p.title}</h4>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 700, background: p.is_available ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: p.is_available ? '#22c55e' : '#ef4444' }}>
                        {p.is_available ? 'Available' : 'Rented / Suspended'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      📍 {p.address || p.district} &bull; Landlord: {p.landlord_email || 'N/A'}
                    </div>

                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6366f1', marginBottom: '0.75rem' }}>
                      Rs. {floatVal(p.rent_amount).toLocaleString()} / month
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => handleModerateProperty(p.id, p.is_available)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      {p.is_available ? 'Pause / Hide Listing' : 'Approve & Publish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Escrow Rent Ledger */}
      {activeTab === 'rent' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Platform Escrow & Rent Payment Ledger</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Audit log of all rental payments processed via eSewa digital wallet under Nepal financial regulations.
              </p>
            </div>

            <button 
              onClick={() => exportToCSV('tenantplus_escrow_ledger', rentPayments, ['id', 'receipt_no', 'payment_month', 'amount', 'status', 'transaction_id', 'paid_at'])}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          {loadingRent ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading rent payments...</div>
          ) : rentPayments.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No payment transactions recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Receipt #</th>
                    <th style={{ padding: '0.75rem' }}>Billing Month</th>
                    <th style={{ padding: '0.75rem' }}>Amount</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>eSewa Transaction ID</th>
                    <th style={{ padding: '0.75rem' }}>Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rentPayments.map(rp => (
                    <tr key={rp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{rp.receipt_no || rp.id}</td>
                      <td style={{ padding: '0.75rem' }}>{rp.payment_month}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#10b981' }}>Rs. {floatVal(rp.amount).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 700, fontSize: '0.8rem' }}>
                          {rp.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{rp.transaction_id || 'N/A'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {rp.paid_at ? new Date(rp.paid_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Disputes Oversight */}
      {activeTab === 'disputes' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.35rem' }}>Tenant-Landlord Dispute Oversight</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Administrative supervision of official grievances filed under Nepalese House Rent Act 2075.
          </p>

          {loadingDisputes ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dispute cases...</div>
          ) : disputesList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No disputes filed.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disputesList.map(d => (
                <div key={d.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{d.title}</h4>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', background: d.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: d.status === 'resolved' ? '#22c55e' : '#ef4444' }}>
                      {d.status}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>{d.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function floatVal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
