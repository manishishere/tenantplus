import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Bell, CheckCircle2, FileText, DollarSign, Wrench, Users, Clock, AlertCircle } from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (isNaN(diffSec) || diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchRealNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [appsRes, agsRes, utilsRes, maintRes] = await Promise.allSettled([
        api.get('/applications/'),
        api.get('/agreements/'),
        api.get('/utilities/bills/'),
        api.get('/maintenance/')
      ]);

      const realList = [];

      const apps = appsRes.status === 'fulfilled' ? (appsRes.value.data?.results || appsRes.value.data || []) : [];
      const ags = agsRes.status === 'fulfilled' ? (agsRes.value.data?.results || agsRes.value.data || []) : [];
      const utils = utilsRes.status === 'fulfilled' ? (utilsRes.value.data?.results || utilsRes.value.data || []) : [];
      const maints = maintRes.status === 'fulfilled' ? (maintRes.value.data?.results || maintRes.value.data || []) : [];

      const safeApps = Array.isArray(apps) ? apps : [];
      const safeAgs = Array.isArray(ags) ? ags : [];
      const safeUtils = Array.isArray(utils) ? utils : [];
      const safeMaints = Array.isArray(maints) ? maints : [];

      if (role === 'landlord') {
        // Landlord Real Notifications
        safeApps.forEach(app => {
          if (app.status === 'pending') {
            realList.push({
              id: `app-landlord-${app.id}`,
              title: 'New Rental Application',
              message: `${app.tenant?.full_name || app.tenant?.email || 'An applicant'} applied for ${app.property?.title || 'your property'}.`,
              timestamp: formatRelativeTime(app.created_at),
              rawDate: new Date(app.created_at || Date.now()),
              type: 'application',
              link: '/dashboard/applications'
            });
          }
        });

        safeAgs.forEach(ag => {
          if (ag.status === 'pending_advance') {
            realList.push({
              id: `ag-adv-${ag.id}`,
              title: 'Awaiting Advance Payment',
              message: `Tenant has 24h to pay advance rent for ${ag.property?.title || 'property'}.`,
              timestamp: formatRelativeTime(ag.created_at),
              rawDate: new Date(ag.created_at || Date.now()),
              type: 'agreement',
              link: '/dashboard/agreements'
            });
          } else if (!ag.landlord_acknowledged && ag.status === 'active') {
            realList.push({
              id: `ag-sig-${ag.id}`,
              title: 'Signature Required',
              message: `Tenancy agreement for ${ag.property?.title || 'property'} requires your digital signature.`,
              timestamp: formatRelativeTime(ag.created_at),
              rawDate: new Date(ag.created_at || Date.now()),
              type: 'agreement',
              link: '/dashboard/agreements'
            });
          }
        });

        safeMaints.forEach(m => {
          if (m.status === 'pending') {
            realList.push({
              id: `maint-landlord-${m.id}`,
              title: 'New Maintenance Request',
              message: `"${m.title}" requested by tenant.`,
              timestamp: formatRelativeTime(m.created_at),
              rawDate: new Date(m.created_at || Date.now()),
              type: 'maintenance',
              link: '/dashboard/maintenance'
            });
          }
        });

      } else {
        // Tenant Real Notifications
        safeAgs.forEach(ag => {
          if (ag.status === 'pending_advance') {
            realList.push({
              id: `ag-adv-tenant-${ag.id}`,
              title: 'Advance Rent Payment Required',
              message: `Pay Rs. ${parseFloat(ag.advance_amount || ag.rent_amount || 0).toLocaleString()} advance within 24h to activate agreement for ${ag.property?.title || 'property'}.`,
              timestamp: formatRelativeTime(ag.created_at),
              rawDate: new Date(ag.created_at || Date.now()),
              type: 'agreement',
              link: '/dashboard/agreements'
            });
          }
          if (!ag.tenant_acknowledged && ag.status === 'active') {
            realList.push({
              id: `ag-sig-tenant-${ag.id}`,
              title: 'Agreement Ready for Signature',
              message: `Your tenancy agreement for ${ag.property?.title || 'property'} is ready to sign.`,
              timestamp: formatRelativeTime(ag.created_at),
              rawDate: new Date(ag.created_at || Date.now()),
              type: 'agreement',
              link: '/dashboard/agreements'
            });
          }
        });

        safeApps.forEach(app => {
          if (app.status === 'accepted') {
            realList.push({
              id: `app-accepted-${app.id}`,
              title: 'Application Accepted!',
              message: `Your application for ${app.property?.title || 'property'} was accepted by the landlord.`,
              timestamp: formatRelativeTime(app.updated_at || app.created_at),
              rawDate: new Date(app.updated_at || app.created_at || Date.now()),
              type: 'application',
              link: '/dashboard/agreements'
            });
          }
        });

        safeUtils.forEach(u => {
          if (u.status === 'unpaid' || u.status === 'overdue') {
            realList.push({
              id: `util-unpaid-${u.id}`,
              title: `Utility Bill ${u.status === 'overdue' ? 'Overdue' : 'Issued'}`,
              message: `Monthly utility bill of Rs. ${parseFloat(u.total_amount || 0).toLocaleString()} is ${u.status === 'overdue' ? 'overdue' : 'due'}.`,
              timestamp: formatRelativeTime(u.created_at),
              rawDate: new Date(u.created_at || Date.now()),
              type: 'utility',
              link: '/dashboard/utilities'
            });
          }
        });

        safeMaints.forEach(m => {
          if (m.status === 'in_progress' || m.status === 'completed') {
            realList.push({
              id: `maint-tenant-${m.id}`,
              title: 'Maintenance Update',
              message: `"${m.title}" status updated to ${m.status.replace('_', ' ')}.`,
              timestamp: formatRelativeTime(m.updated_at || m.created_at),
              rawDate: new Date(m.updated_at || m.created_at || Date.now()),
              type: 'maintenance',
              link: '/dashboard/maintenance'
            });
          }
        });
      }

      // Sort by newest first
      realList.sort((a, b) => b.rawDate - a.rawDate);
      setNotifications(realList);

    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNotifications();
    const interval = setInterval(fetchRealNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, role]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('read_notification_ids', JSON.stringify(allIds));
  };

  const handleNotificationClick = (item) => {
    const updated = [...new Set([...readIds, item.id])];
    setReadIds(updated);
    localStorage.setItem('read_notification_ids', JSON.stringify(updated));
    setIsOpen(false);
    navigate(item.link);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--pill-bg)',
          border: '1px solid var(--pill-border)',
          color: 'var(--pill-text)',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.18s ease'
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: 800,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-surface)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="glass-panel" style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 0.5rem)',
          width: '340px',
          maxHeight: '420px',
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 300,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Notifications {unreadCount > 0 && <span style={{ fontSize: '0.75rem', background: 'var(--pill-bg)', color: 'var(--primary-indigo)', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-indigo)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5, color: '#10b981' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>All caught up!</div>
              <div style={{ fontSize: '0.775rem', marginTop: '0.25rem' }}>No new notifications at this time.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {notifications.map((n) => {
                const isRead = readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      background: isRead ? 'transparent' : 'var(--bg-input)',
                      border: isRead ? '1px solid transparent' : '1px solid var(--pill-border)',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: isRead ? 'var(--text-main)' : 'var(--primary-indigo)' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.timestamp}</span>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                      {n.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
