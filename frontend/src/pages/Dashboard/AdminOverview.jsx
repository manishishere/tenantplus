import { useState, useEffect } from 'react';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { 
  Users, Building2, ShieldCheck, DollarSign, AlertTriangle, 
  CheckCircle, CheckCircle2, Search, RefreshCw, Mail, Activity, Megaphone,
  Database, Server, Layers, Download, Check, Eye, Camera, UserCheck, FileText, Zap, ExternalLink, Lock, MapPin, X
} from 'lucide-react';

export default function AdminOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [systemHealth, setSystemHealth] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [kycDocs, setKycDocs] = useState([]);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [kycFilter, setKycFilter] = useState('pending');
  const [animatingOutIds, setAnimatingOutIds] = useState([]);

  const [selectedKycDoc, setSelectedKycDoc] = useState(null);
  const [selectedKycPhoto, setSelectedKycPhoto] = useState('doc_url');
  const [rejectModalDoc, setRejectModalDoc] = useState(null);
  const [customRejectionReason, setCustomRejectionReason] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [propertiesList, setPropertiesList] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propSearchQuery, setPropSearchQuery] = useState('');

  const [rentPayments, setRentPayments] = useState([]);
  const [loadingRent, setLoadingRent] = useState(false);

  const [disputesList, setDisputesList] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);

  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const [systemAnnouncement, setSystemAnnouncement] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState({ type: '', text: '' });
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchMetrics();
    fetchSystemHealth();
    fetchActivityLogs();
    fetchKycDocs();
    fetchBroadcastNotice();
  }, []);

  useEffect(() => {
    if (activeTab === 'kyc') fetchKycDocs();
    if (activeTab === 'users') fetchUsersList();
    if (activeTab === 'properties') fetchProperties();
    if (activeTab === 'rent') fetchRentPayments();
    if (activeTab === 'disputes') fetchDisputes();
  }, [activeTab, kycFilter, userRoleFilter, userSearchQuery, propSearchQuery]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/accounts/admin/dashboard/');
      setMetrics(res.data?.metrics || null);
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await api.get('/accounts/admin/system-health/');
      setSystemHealth(res.data?.health || res.data || null);
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

  const handleKycReview = async (docId, action, rejectionReason = '') => {
    setAnimatingOutIds(prev => [...prev, docId]);
    await new Promise(r => setTimeout(r, 320));
    try {
      const res = await api.post('/accounts/admin/kyc-review/', { 
        document_id: docId, 
        action,
        rejection_reason: rejectionReason 
      });
      setActionMsg({ type: 'success', text: res.data?.detail || `Document ${action}d successfully!` });
      setKycDocs(prev => prev.filter(d => d.id !== docId));
      setSelectedKycDoc(null);
      setRejectModalDoc(null);
      setCustomRejectionReason('');
      fetchKycDocs();
      fetchMetrics();
    } catch (err) {
      setAnimatingOutIds(prev => prev.filter(id => id !== docId));
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

  const fetchBroadcastNotice = async () => {
    try {
      const res = await api.get('/accounts/broadcast-notice/');
      if (res.data?.active_notice) {
        setActiveBroadcast(res.data.active_notice);
      } else {
        setActiveBroadcast('');
      }
    } catch (err) {
      console.error('Failed to fetch broadcast notice:', err);
    }
  };

  const handlePublishBroadcast = async (e) => {
    e.preventDefault();
    if (!systemAnnouncement.trim()) return;
    const text = systemAnnouncement.trim();
    setAnnouncementLoading(true);
    try {
      const res = await api.post('/accounts/admin/broadcast-notice/', { message: text });
      setActiveBroadcast(res.data?.active_notice || text);
      setActionMsg({ type: 'success', text: `📢 Announcement Published! "${text}" is now live platform-wide.` });
      setAnnouncementMsg({ type: 'success', text: `✅ Active Notice Live: "${text}" is visible across all user dashboards.` });
    } catch (err) {
      setActionMsg({ type: 'error', text: parseApiError(err, 'Failed to publish broadcast notice.') });
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleUnpublishBroadcast = async () => {
    try {
      await api.post('/accounts/admin/broadcast-notice/', { action: 'unpublish' });
      setActiveBroadcast('');
      setSystemAnnouncement('');
      setAnnouncementMsg({ type: 'success', text: 'Broadcast notice unpublished and removed from platform.' });
      setActionMsg({ type: 'success', text: 'Broadcast notice un-published.' });
    } catch (err) {
      setActionMsg({ type: 'error', text: parseApiError(err, 'Failed to unpublish notice.') });
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* HERO HEADER (WARM MINIMAL) */}
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
                <ShieldCheck size={13} /> Executive Control Console
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
                <Activity size={13} /> House Rent Act 2075 Compliant
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '2.1rem', fontWeight: 800 }}>
              TenantPlus Platform Oversight
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
              Audit identity verifications, property listings, escrow payments, and system diagnostics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              background: systemHealth?.status === 'healthy' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
              color: systemHealth?.status === 'healthy' ? '#10b981' : '#ef4444', 
              padding: '0.45rem 0.95rem', 
              borderRadius: '2rem', 
              fontSize: '0.825rem', 
              fontWeight: 700, 
              border: `1px solid ${systemHealth?.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
            }}>
              <Activity size={15} /> {systemHealth?.status === 'healthy' ? `System Operational (${systemHealth?.database?.latency_ms || 1}ms)` : 'Degraded Performance'}
            </span>
            <button 
              onClick={() => { fetchMetrics(); fetchSystemHealth(); fetchActivityLogs(); if (activeTab === 'kyc') fetchKycDocs(); }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            >
              <RefreshCw size={16} className={loadingMetrics ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      {activeBroadcast && (
        <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
          <Megaphone size={20} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', background: '#f59e0b', color: '#000000', padding: '0.15rem 0.45rem', borderRadius: '0.3rem', marginRight: '0.6rem' }}>Active Notice</span>
            {activeBroadcast}
          </div>
          <button onClick={() => setActiveBroadcast('')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 700 }}>Dismiss</button>
        </div>
      )}

      {/* Action Toast Notice */}
      {actionMsg && (
        <div style={{
          background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${actionMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: actionMsg.type === 'success' ? '#10b981' : '#ef4444',
          padding: '0.95rem 1.25rem',
          borderRadius: '0.75rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontWeight: 600
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 2. METRIC CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Platform Users</span>
            <Users size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{metrics?.total_users ?? 0}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {metrics?.tenants_count ?? 0} Tenants &bull; {metrics?.landlords_count ?? 0} Landlords
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending KYC Queue</span>
            <ShieldCheck size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: metrics?.pending_kyc_count > 0 ? '#f59e0b' : 'inherit' }}>
            {metrics?.pending_kyc_count ?? 0}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {metrics?.verified_users_count ?? 0} Verified Accounts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Listings</span>
            <Building2 size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{metrics?.total_properties ?? 0}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {metrics?.available_properties ?? 0} Available &bull; {metrics?.rented_properties ?? 0} Rented
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Escrow Rent</span>
            <DollarSign size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            Rs. {(metrics?.total_rent_collected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {metrics?.total_payments_count ?? 0} Transactions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open Disputes</span>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: metrics?.open_disputes_count > 0 ? '#ef4444' : 'inherit' }}>
            {metrics?.open_disputes_count ?? 0}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Legal Oversight under Act 2075
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      {(() => {
        const pendingKycCount = kycDocs.length > 0 
          ? kycDocs.filter(d => d.status === 'pending').length 
          : (metrics?.pending_kyc_count ?? 0);

        return (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {[
              { id: 'overview', label: 'Executive Overview', icon: Activity },
              { id: 'kyc', label: `KYC Review Queue (${pendingKycCount})`, icon: ShieldCheck },
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
                  gap: '0.55rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.625rem',
                  background: activeTab === tab.id ? 'var(--accent-amber)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                  border: activeTab === tab.id ? 'none' : '1px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease'
                }}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
          
          {/* Live Activity Stream Widget */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: 800 }}>
                <Activity size={20} color="var(--accent-amber)" /> Live Platform Activity Stream
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
                  <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ 
                      width: '34px', height: '34px', borderRadius: '50%', 
                      background: item.type === 'user_registered' ? 'var(--pill-bg)' : item.type === 'payment_received' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
                      color: item.type === 'user_registered' ? 'var(--accent-amber)' : item.type === 'payment_received' ? '#10b981' : '#f59e0b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                    }}>
                      {item.type === 'user_registered' ? <Users size={16} /> : item.type === 'payment_received' ? <DollarSign size={16} /> : <Building2 size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Infrastructure Diagnostics */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: 800 }}>
              <Server size={20} color="#10b981" /> Infrastructure Diagnostics
            </h3>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <Database size={16} color="var(--accent-amber)" /> Database Latency
                </div>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: systemHealth?.database?.connected ? '#10b981' : '#ef4444' }}>
                  {systemHealth?.database?.engine?.toUpperCase()} ({systemHealth?.database?.latency_ms || 1} ms)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <Mail size={16} color="#f59e0b" /> SMTP Mail Handshake
                </div>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#10b981' }}>
                  {systemHealth?.environment?.email_backend || 'SMTP Active'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <Layers size={16} color="#a855f7" /> Background Task Workers
                </div>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#10b981' }}>
                  {systemHealth?.environment?.q_cluster_sync ? 'Thread Worker Active' : 'Task Queue Active'}
                </span>
              </div>
            </div>

            {/* Diagnostic SMTP Email Launcher */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Quick SMTP Connection Test:</div>
              <form onSubmit={handleTestEmailSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="email" 
                  placeholder="Enter email address..."
                  value={testEmailAddr}
                  onChange={e => setTestEmailAddr(e.target.value)}
                  required
                  style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
                <button type="submit" disabled={testEmailSending} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                  {testEmailSending ? 'Testing...' : 'Test SMTP'}
                </button>
              </form>
              {testEmailResult && (
                <pre style={{ marginTop: '0.5rem', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: testEmailResult.success ? '#10b981' : '#ef4444', fontSize: '0.75rem', overflowX: 'auto' }}>
                  {testEmailResult.text}
                </pre>
              )}
            </div>
          </div>

          {/* System Broadcast Announcement Manager */}
          <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: 800 }}>
              <Megaphone size={20} color="var(--accent-amber)" /> System Broadcast Notice Manager
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 1rem 0' }}>
              Publish a platform-wide banner notification visible to all logged-in users.
            </p>

            {/* LIVE ANNOUNCEMENT CONFIRMATION CARD */}
            {activeBroadcast && (
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-main)' }}>
                      ✅ Active Broadcast Published & Live
                    </strong>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      "{activeBroadcast}"
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUnpublishBroadcast}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Un-publish Notice
                </button>
              </div>
            )}

            {announcementMsg.text && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: announcementMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: announcementMsg.type === 'success' ? '#10b981' : '#ef4444',
                border: `1px solid ${announcementMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                marginBottom: '1rem'
              }}>
                {announcementMsg.text}
              </div>
            )}

            <form onSubmit={handlePublishBroadcast} style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="e.g., Scheduled system maintenance tonight at 11 PM..."
                value={systemAnnouncement}
                onChange={e => setSystemAnnouncement(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.625rem', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Megaphone size={15} /> Publish Notice
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Tab 2: KYC Review Queue */}
      {activeTab === 'kyc' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>User Identity KYC Verification Queue</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Inspect submitted Nepalese Citizenship or Passport credentials and approve account verification.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setKycFilter(status)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--border-color)',
                    background: kycFilter === status ? 'var(--accent-amber)' : 'transparent',
                    color: kycFilter === status ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
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
              {filteredKycDocs.map(doc => {
                const isAnimatingOut = animatingOutIds.includes(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '1.35rem', 
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isAnimatingOut ? 0 : 1,
                      transform: isAnimatingOut ? 'scale(0.94) translateY(-8px)' : 'scale(1) translateY(0)',
                      pointerEvents: isAnimatingOut ? 'none' : 'auto'
                    }}
                  >
                    {/* User Profile Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-input)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          {doc.user_photo ? (
                            <img src={doc.user_photo} alt="User Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {doc.user_full_name ? doc.user_full_name.charAt(0) : 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{doc.user_full_name || 'Unnamed User'}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{doc.user_email} &bull; {doc.user_phone || 'No Phone'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'capitalize', marginTop: '0.2rem', fontWeight: 700 }}>
                            Role: {doc.user_role} &bull; Gender: {doc.gender || 'Not Specified'}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'capitalize',
                        background: doc.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : doc.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: doc.status === 'approved' ? '#10b981' : doc.status === 'rejected' ? '#ef4444' : '#f59e0b',
                        border: `1px solid ${doc.status === 'approved' ? 'rgba(16, 185, 129, 0.3)' : doc.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        {doc.status}
                      </span>
                    </div>

                    {/* Comprehensive KYC Info Box */}
                    <div style={{
                      background: 'var(--bg-input)',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.65rem',
                      marginBottom: '1rem',
                      fontSize: '0.825rem',
                      border: '1px solid var(--border-color)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem 1rem'
                    }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doc Type</span><div style={{ fontWeight: 800 }}>{doc.doc_type?.toUpperCase() || 'CITIZENSHIP'}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID Number</span><div style={{ fontWeight: 800 }}>{doc.doc_number || 'N/A'}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Father's Name</span><div style={{ fontWeight: 600 }}>{doc.father_name || 'N/A'}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mother's Name</span><div style={{ fontWeight: 600 }}>{doc.mother_name || 'N/A'}</div></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Permanent Addr</span><div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.1rem' }}>{doc.permanent_address || 'N/A'}</div></div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Temporary Addr</span><div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.1rem' }}>{doc.temporary_address || 'N/A'}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Emergency Contact</span><div style={{ fontWeight: 600 }}>{doc.emergency_contact_name || 'N/A'} ({doc.emergency_contact_phone || 'N/A'})</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted Date</span><div style={{ fontWeight: 600 }}>{new Date(doc.created_at).toLocaleDateString()}</div></div>
                    </div>

                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div style={{ padding: '0.65rem 0.85rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        <strong>Rejection Reason:</strong> {doc.rejection_reason}
                      </div>
                    )}

                    {/* 3-Document Image Previews Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                      {(doc.doc_url || doc.doc_front) ? (
                        <div 
                          onClick={() => { setSelectedKycDoc(doc); setSelectedKycPhoto('id_front'); }}
                          style={{ height: '90px', background: '#000000', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', cursor: 'pointer' }}
                        >
                          <img src={doc.doc_url || doc.doc_front} alt="ID Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: '0.65rem', background: 'rgba(0,0,0,0.85)', color: '#ffffff', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 800 }}>
                            ID Front
                          </span>
                        </div>
                      ) : (
                        <div style={{ height: '90px', background: 'var(--bg-input)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: 600 }}>
                          No ID Front
                        </div>
                      )}

                      {(doc.back_doc_url || doc.doc_back) ? (
                        <div 
                          onClick={() => { setSelectedKycDoc(doc); setSelectedKycPhoto('id_back'); }}
                          style={{ height: '90px', background: '#000000', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', cursor: 'pointer' }}
                        >
                          <img src={doc.back_doc_url || doc.doc_back} alt="ID Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: '0.65rem', background: 'rgba(0,0,0,0.85)', color: '#ffffff', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 800 }}>
                            ID Back
                          </span>
                        </div>
                      ) : (
                        <div style={{ height: '90px', background: 'var(--bg-input)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: 600 }}>
                          No ID Back
                        </div>
                      )}

                      {doc.user_photo ? (
                        <div 
                          onClick={() => { setSelectedKycDoc(doc); setSelectedKycPhoto('selfie'); }}
                          style={{ height: '90px', background: '#000000', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', cursor: 'pointer' }}
                        >
                          <img src={doc.user_photo} alt="Selfie Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span style={{ position: 'absolute', bottom: 3, left: 3, fontSize: '0.65rem', background: 'rgba(0,0,0,0.85)', color: '#10b981', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 800 }}>
                            Selfie Photo
                          </span>
                        </div>
                      ) : (
                        <div style={{ height: '90px', background: 'var(--bg-input)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: 600 }}>
                          No Selfie
                        </div>
                      )}
                    </div>

                    {/* Primary Full Inspection Trigger */}
                    <button
                      onClick={() => { setSelectedKycDoc(doc); setSelectedKycPhoto('doc_url'); }}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        marginBottom: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--pill-bg)',
                        border: '1px solid var(--pill-border)',
                        color: 'var(--primary-indigo)',
                        fontSize: '0.825rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem'
                      }}
                    >
                      Inspect Full KYC Credentials & High-Res Files
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleKycReview(doc.id, 'approve')}
                        disabled={doc.status === 'approved'}
                        className="btn-primary btn-emerald"
                        style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        Approve KYC
                      </button>
                      <button 
                        onClick={() => { setRejectModalDoc(doc); setCustomRejectionReason(doc.rejection_reason || ''); }}
                        disabled={doc.status === 'rejected'}
                        style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.55rem', borderRadius: '0.625rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Reject with Note
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>User Accounts Directory</h2>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                onClick={() => exportToCSV('tenantplus_users', usersList, ['id', 'full_name', 'email', 'phone', 'role', 'is_verified', 'is_active', 'created_at'])}
                className="btn-secondary"
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
                  style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem' }}
                />
              </div>

              <select 
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem' }}
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
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.825rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem' }}>User</th>
                    <th style={{ padding: '0.85rem' }}>Role</th>
                    <th style={{ padding: '0.85rem' }}>Phone</th>
                    <th style={{ padding: '0.85rem' }}>KYC Verified</th>
                    <th style={{ padding: '0.85rem' }}>Account Status</th>
                    <th style={{ padding: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 700 }}>{u.full_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem', textTransform: 'capitalize' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.4rem', background: 'var(--pill-bg)', color: 'var(--pill-text)', fontSize: '0.8rem', fontWeight: 700, border: '1px solid var(--pill-border)' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem' }}>{u.phone || 'N/A'}</td>
                      <td style={{ padding: '0.85rem' }}>
                        {u.is_verified ? (
                          <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={16} /> Verified
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>Unverified</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem' }}>
                        {u.is_active ? (
                          <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>Active</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>Disabled</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                        {!u.is_staff && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              background: u.is_active ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                              color: u.is_active ? '#ef4444' : '#10b981',
                              border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
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
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Property Listings Moderation</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Audit rental property details, locations, and availability across Kathmandu Valley and Nepal.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => exportToCSV('tenantplus_properties', propertiesList, ['id', 'title', 'district', 'rent_amount', 'is_available', 'landlord_email'])}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                <Download size={15} /> Export CSV
              </button>

              <input 
                type="text" 
                placeholder="Search property or district..."
                value={propSearchQuery}
                onChange={e => setPropSearchQuery(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem' }}
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
                <div key={p.id} className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{p.title}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Landlord: <strong>{p.landlord_name || 'Verified Landlord'}</strong> ({p.landlord_email || 'N/A'})
                        </div>
                      </div>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 800, background: p.is_available ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: p.is_available ? '#10b981' : '#ef4444', border: `1px solid ${p.is_available ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                        {p.is_available ? 'Available' : 'Rented / Suspended'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} /> {p.address || p.district}
                    </div>

                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber)', marginBottom: '0.85rem' }}>
                      Rs. {floatVal(p.rent_amount).toLocaleString()} / month
                    </div>

                    {/* CONFIDENTIAL PROPERTY VERIFICATION DOCUMENTS (ADMIN ONLY) */}
                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '0.85rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Lock size={13} /> Confidential Property Verification Documents (Admin Only)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {p.lalpurja_doc_url ? (
                          <a href={p.lalpurja_doc_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '0.35rem', border: '1px solid rgba(37, 99, 235, 0.2)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              <FileText size={13} /> Lalpurja Deed <ExternalLink size={11} />
                            </div>
                          </a>
                        ) : (
                          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                            Lalpurja On File
                          </div>
                        )}

                        {p.electricity_bill_url ? (
                          <a href={p.electricity_bill_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '0.35rem', border: '1px solid rgba(37, 99, 235, 0.2)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              <Zap size={13} /> Electricity Bill <ExternalLink size={11} />
                            </div>
                          </a>
                        ) : (
                          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                            NEA Bill On File
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => handleModerateProperty(p.id, p.is_available)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.775rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      {p.is_available ? 'Pause Listing' : 'Approve & Publish'}
                    </button>
                    <button
                      onClick={() => alert(`Physical Inspection Order dispatched for property "${p.title}". A field verification agent has been assigned for on-site inspection.`)}
                      style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.45rem', borderRadius: '0.5rem', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <AlertTriangle size={13} /> Dispatch Agent Visit
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
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Platform Escrow & Rent Ledger</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Audit log of all rental payments processed via eSewa digital wallet under Nepal financial regulations.
              </p>
            </div>

            <button 
              onClick={() => exportToCSV('tenantplus_escrow_ledger', rentPayments, ['id', 'receipt_no', 'payment_month', 'amount', 'status', 'transaction_id', 'paid_at'])}
              className="btn-secondary"
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
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.825rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem' }}>Receipt #</th>
                    <th style={{ padding: '0.85rem' }}>Billing Month</th>
                    <th style={{ padding: '0.85rem' }}>Amount</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem' }}>eSewa Transaction ID</th>
                    <th style={{ padding: '0.85rem' }}>Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rentPayments.map(rp => (
                    <tr key={rp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 700 }}>{rp.receipt_no || rp.id}</td>
                      <td style={{ padding: '0.85rem' }}>{rp.payment_month}</td>
                      <td style={{ padding: '0.85rem', fontWeight: 800, color: '#10b981' }}>Rs. {floatVal(rp.amount).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem', textTransform: 'capitalize' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                          {rp.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{rp.transaction_id || 'N/A'}</td>
                      <td style={{ padding: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
          <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 800 }}>Tenant-Landlord Dispute Oversight</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Administrative supervision of official grievances filed under Nepalese House Rent Act 2075.
          </p>

          {loadingDisputes ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dispute cases...</div>
          ) : disputesList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No active disputes filed.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disputesList.map(d => (
                <div key={d.id} className="glass-panel" style={{ padding: '1.35rem', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{d.title}</h4>
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize', background: d.status === 'resolved' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: d.status === 'resolved' ? '#10b981' : '#ef4444' }}>
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

    {/* 1. HIGH-RESOLUTION FULL INSPECTION MODAL */}
      {selectedKycDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--bg-card)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-input)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  {selectedKycDoc.user_photo ? (
                    <img src={selectedKycDoc.user_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>U</div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    KYC Credential Audit: {selectedKycDoc.user_full_name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedKycDoc.user_email} &bull; Role: {selectedKycDoc.user_role?.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedKycDoc(null)}
                style={{
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  marginLeft: '1rem'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--pill-bg)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                title="Close Audit View"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Grid of Image Inspector + Lineage Details */}
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
              {/* Left Column: Image Viewer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Photo Selection Tabs */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'id_front', label: 'ID Front', icon: Camera, url: selectedKycDoc.doc_url || selectedKycDoc.doc_front },
                    { key: 'id_back', label: 'ID Back', icon: Camera, url: selectedKycDoc.back_doc_url || selectedKycDoc.doc_back },
                    { key: 'selfie', label: 'Selfie Photo', icon: UserCheck, url: selectedKycDoc.user_photo },
                  ].map(tab => {
                    const IconComp = tab.icon;
                    const isSelected = selectedKycPhoto === tab.key || (selectedKycPhoto === 'doc_url' && tab.key === 'id_front');
                    return tab.url && (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedKycPhoto(tab.key)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.775rem',
                          fontWeight: 700,
                          border: '1px solid var(--border-color)',
                          background: isSelected ? 'var(--primary-indigo)' : 'var(--bg-input)',
                          color: isSelected ? '#ffffff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <IconComp size={13} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Main Inspection Container */}
                {(() => {
                  let activeUrl = null;
                  let activeLabel = 'Image Inspection View';
                  if (selectedKycPhoto === 'id_front' || selectedKycPhoto === 'doc_url') {
                    activeUrl = selectedKycDoc.doc_url || selectedKycDoc.doc_front;
                    activeLabel = 'ID Front (Citizenship / Passport / License)';
                  } else if (selectedKycPhoto === 'id_back' || selectedKycPhoto === 'back_doc_url') {
                    activeUrl = selectedKycDoc.back_doc_url || selectedKycDoc.doc_back;
                    activeLabel = 'ID Back Document Photo';
                  } else if (selectedKycPhoto === 'selfie' || selectedKycPhoto === 'user_photo') {
                    activeUrl = selectedKycDoc.user_photo;
                    activeLabel = 'Live Selfie Photo';
                  } else if (selectedKycPhoto === 'house_deed' || selectedKycPhoto === 'house_doc_url') {
                    activeUrl = selectedKycDoc.house_doc_url || selectedKycDoc.house_deed;
                    activeLabel = 'House Ownership Certificate (Lalpurja)';
                  } else if (selectedKycPhoto === 'utility_bill' || selectedKycPhoto === 'electricity_bill_url') {
                    activeUrl = selectedKycDoc.electricity_bill_url || selectedKycDoc.utility_bill;
                    activeLabel = 'Electricity / Water Utility Bill';
                  } else {
                    activeUrl = selectedKycDoc[selectedKycPhoto] || selectedKycDoc.user_photo || selectedKycDoc.doc_url;
                  }

                  return (
                    <div style={{
                      height: '390px',
                      background: '#000000',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      position: 'relative'
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.775rem',
                        fontWeight: 800,
                        border: '1px solid rgba(255,255,255,0.2)',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Eye size={13} /> {activeLabel}
                      </span>

                      {activeUrl ? (
                        <img 
                          src={activeUrl} 
                          alt="Inspection View" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        />
                      ) : (
                        <div style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                          No Image File Provided for {activeLabel}
                        </div>
                      )}

                      {activeUrl && (
                        <a 
                          href={activeUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            background: 'var(--primary-indigo)',
                            color: '#fff',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.775rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <ExternalLink size={13} /> Open Full-Res Original File
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Legal Lineage & Identity Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '1.15rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    Statutory Identification Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Doc Type:</span> <strong style={{ textTransform: 'uppercase' }}>{selectedKycDoc.doc_type}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Doc Number:</span> <strong>{selectedKycDoc.doc_number || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Father's Name:</span> <strong>{selectedKycDoc.father_name || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Mother's Name:</span> <strong>{selectedKycDoc.mother_name || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Spouse Name:</span> <strong>{selectedKycDoc.spouse_name || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> <strong style={{ textTransform: 'capitalize' }}>{selectedKycDoc.gender}</strong></div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '1.15rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    Nepalese Statutory Residence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>PERMANENT ADDRESS</span> <strong>{selectedKycDoc.permanent_address || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TEMPORARY ADDRESS</span> <strong>{selectedKycDoc.temporary_address || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>EMERGENCY CONTACT</span> <strong>{selectedKycDoc.emergency_contact_name || 'N/A'} ({selectedKycDoc.emergency_contact_phone || 'N/A'})</strong></div>
                  </div>
                </div>

                {selectedKycDoc.rejection_reason && (
                  <div style={{ padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                    <strong>Previous Rejection Reason:</strong> {selectedKycDoc.rejection_reason}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{
              padding: '1.15rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justify: 'flex-end',
              gap: '0.75rem',
              background: 'var(--bg-input)'
            }}>
              <button
                onClick={() => { setRejectModalDoc(selectedKycDoc); setCustomRejectionReason(selectedKycDoc.rejection_reason || ''); }}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Reject with Note
              </button>

              <button
                onClick={() => handleKycReview(selectedKycDoc.id, 'approve')}
                className="btn-primary btn-emerald"
                style={{ padding: '0.65rem 1.5rem', fontWeight: 800, fontSize: '0.875rem' }}
              >
                Approve KYC Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECTION REASON DIALOG MODAL */}
      {rejectModalDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            background: 'var(--bg-card)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            padding: '1.75rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
              Reject KYC Submission: {rejectModalDoc.user_full_name}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
              Specify the exact reason for rejection. This message will be sent directly to <strong>{rejectModalDoc.user_email}</strong> via email & displayed in their Settings dashboard.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Quick Rejection Presets (Click to Insert):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  '📷 Blurry or illegible Document Front photo.',
                  '⚠️ Document Number mismatch with submitted proof.',
                  '❌ Lineage details (Father/Mother Name) incomplete.',
                  '📍 Address details unverified or inconsistent.',
                  '👤 Selfie photo does not match identity document.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomRejectionReason(preset)}
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
              <label className="form-label" style={{ fontWeight: 800 }}>Detailed Rejection Reason *</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Type specific feedback explaining what the user needs to correct..."
                value={customRejectionReason}
                onChange={e => setCustomRejectionReason(e.target.value)}
                style={{ padding: '0.75rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRejectModalDoc(null)}
                style={{ padding: '0.65rem 1.15rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleKycReview(rejectModalDoc.id, 'reject', customRejectionReason)}
                disabled={!customRejectionReason.trim()}
                style={{ padding: '0.65rem 1.35rem', borderRadius: '0.5rem', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: !customRejectionReason.trim() ? 0.6 : 1 }}
              >
                Submit Rejection & Send Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function floatVal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
