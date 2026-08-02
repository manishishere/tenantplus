import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCircle2, Clock, AlertCircle, FileText, DollarSign, ArrowRight, X } from 'lucide-react';

export default function NotificationBell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Generate dynamic role-based notifications
    const initialNotifications = role === 'landlord' ? [
      {
        id: '1',
        title: 'New Rental Application',
        message: 'Manish Gautam applied for Sanagaun Property (Lalitpur).',
        timestamp: '10 mins ago',
        read: false,
        type: 'application',
        link: '/dashboard/applications'
      },
      {
        id: '2',
        title: 'Digital Signature Received',
        message: 'Tenant has signed the House Rent Agreement PDF.',
        timestamp: '1 hour ago',
        read: false,
        type: 'agreement',
        link: '/dashboard/agreements'
      },
      {
        id: '3',
        title: 'Rent Paid via eSewa',
        message: 'Rs. 15,000 rent payment received for July 2026.',
        timestamp: 'Yesterday',
        read: true,
        type: 'payment',
        link: '/dashboard'
      }
    ] : [
      {
        id: '1',
        title: 'Agreement Ready for Signature',
        message: 'Landlord partner has initialized your House Rent Agreement.',
        timestamp: '15 mins ago',
        read: false,
        type: 'agreement',
        link: '/dashboard/agreements'
      },
      {
        id: '2',
        title: 'Utility Bill Generated',
        message: 'Monthly electricity & water bill (Rs. 1,450) added.',
        timestamp: '2 hours ago',
        read: false,
        type: 'utility',
        link: '/dashboard/utilities'
      },
      {
        id: '3',
        title: 'Rent Due Reminder',
        message: 'Monthly rent for August 2026 due on August 7th.',
        timestamp: '1 day ago',
        read: true,
        type: 'payment',
        link: '/dashboard'
      }
    ];

    setNotifications(initialNotifications);
  }, [role]);

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

  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const unreadCount = notifications.filter(n => !n.read && !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('read_notification_ids', JSON.stringify(allIds));
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item) => {
    const updated = [...new Set([...readIds, item.id])];
    setReadIds(updated);
    localStorage.setItem('read_notification_ids', JSON.stringify(updated));
    setNotifications(notifications.map(n => n.id === item.id ? { ...n, read: true } : n));
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
          position: 'relative'
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
          border: '1px solid var(--border-color)'
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => {
              const isRead = n.read || readIds.includes(n.id);
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
        </div>
      )}
    </div>
  );
}
