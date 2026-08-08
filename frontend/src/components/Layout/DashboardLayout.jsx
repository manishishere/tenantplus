import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import NotificationBell from '../Notifications/NotificationBell';
import { 
  Home, FileText, Wrench, Settings, Menu, X, LogOut, 
  Building2, Users, DollarSign, Sun, Moon, ClipboardCheck, 
  MessageSquare, Megaphone
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadMaintenanceCount, setUnreadMaintenanceCount] = useState(0);
  const [activeBroadcastNotice, setActiveBroadcastNotice] = useState('');
  const [dismissedNotice, setDismissedNotice] = useState(false);

  // KYC photo + avatar dropdown
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  // Fetch KYC passport photo
  useEffect(() => {
    const fetchKycPhoto = async () => {
      try {
        const res = await api.get('/accounts/documents/');
        const docs = res.data?.results || res.data || [];
        const arr = Array.isArray(docs) ? docs : [];
        const withPhoto = arr.find(d => d.user_photo && d.user_photo.startsWith('data:'));
        if (withPhoto) setProfilePhoto(withPhoto.user_photo);
      } catch { /* silent */ }
    };
    fetchKycPhoto();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchNavCounts();
    fetchBroadcastNotice();
    const interval = setInterval(() => {
      fetchNavCounts();
      fetchBroadcastNotice();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBroadcastNotice = async () => {
    try {
      const res = await api.get('/accounts/broadcast-notice/');
      const msg = res.data?.active_notice || '';
      if (msg !== activeBroadcastNotice) {
        setActiveBroadcastNotice(msg);
      }
    } catch (err) {
      // silent catch for notice polling
    }
  };

  const fetchNavCounts = async () => {
    try {
      const [chatRes, maintRes] = await Promise.allSettled([
        api.get('/chat/conversations/'),
        api.get('/maintenance/')
      ]);

      if (chatRes.status === 'fulfilled') {
        const rawConvs = chatRes.value.data?.results || chatRes.value.data;
        const convs = Array.isArray(rawConvs) ? rawConvs : [];
        const total = convs.reduce((acc, c) => acc + (c?.unread_count || 0), 0);
        setUnreadChatCount(total);
      }

      if (maintRes.status === 'fulfilled') {
        const rawTickets = maintRes.value.data?.results || maintRes.value.data;
        const tickets = Array.isArray(rawTickets) ? rawTickets : [];
        const activeCount = tickets.filter(t => t && (t.status === 'pending' || t.status === 'in_progress')).length;
        setUnreadMaintenanceCount(activeCount);
      }
    } catch (err) {
      // silent catch for nav polling
    }
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const navItems = role === 'admin' ? [
    { name: 'Executive Console', icon: Home, path: '/dashboard' },
    { name: 'Property Moderation', icon: Building2, path: '/dashboard/properties' },
    { name: 'Agreements Audit', icon: FileText, path: '/dashboard/agreements' },
    { name: 'Maintenance Oversight', icon: Wrench, path: '/dashboard/maintenance' },
  ] : [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Properties', icon: Building2, path: '/dashboard/properties' },
    ...(role === 'landlord' ? [{ name: 'Applications', icon: Users, path: '/dashboard/applications' }] : []),
    { name: 'Agreements', icon: FileText, path: '/dashboard/agreements' },
    { name: 'Direct Chat', icon: MessageSquare, path: '/dashboard/chat' },
    { name: 'Inspection Audit', icon: ClipboardCheck, path: '/dashboard/inspection' },
    { name: 'Maintenance', icon: Wrench, path: '/dashboard/maintenance' },
    { name: 'Utilities', icon: DollarSign, path: '/dashboard/utilities' },
  ];

  const initials = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase();

  return (
    <div className="dashboard-root">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 35 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '0.55rem',
            borderRadius: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              TenantPlus
            </span>
          </div>
          <button 
            className="mobile-menu-btn" 
            style={{ marginLeft: 'auto' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={19} />
              <span>{item.name}</span>
              
              {item.path === '/dashboard/chat' && unreadChatCount > 0 && (
                <span style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem',
                  marginLeft: 'auto',
                  lineHeight: 1
                }}>
                  {unreadChatCount}
                </span>
              )}

              {item.path === '/dashboard/maintenance' && unreadMaintenanceCount > 0 && (
                <span style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem',
                  marginLeft: 'auto',
                  lineHeight: 1
                }}>
                  {unreadMaintenanceCount}
                </span>
              )}
            </NavLink>
          ))}
          
          {/* Footer Settings & Logout — now also accessible from avatar dropdown */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <NavLink to="/dashboard/settings" className="nav-link">
              <Settings size={19} /> Settings
            </NavLink>
            <button 
              onClick={handleLogout} 
              className="nav-link" 
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--accent-rose)' }}
            >
              <LogOut size={19} color="var(--accent-rose)" /> Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ padding: 0 }}
            >
              <Menu size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Notification Bell Dropdown */}
            <NotificationBell />

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--pill-border)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              {theme === 'dark' ? <Sun size={17} color="var(--text-main)" /> : <Moon size={17} color="var(--text-main)" />}
            </button>

            {/* Clean Professional Profile Info */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                {user?.full_name || user?.email}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {role}
              </div>
            </div>

            {/* ── Avatar Circle with dropdown ── */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(o => !o)}
                title="Account options"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: profileDropdownOpen ? '2px solid var(--primary-indigo)' : '2px solid transparent',
                  backgroundColor: profilePhoto ? 'transparent' : 'var(--text-main)', 
                  color: 'var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'border-color 0.18s ease',
                }}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setProfilePhoto(null)}
                  />
                ) : initials}
              </button>

              {/* Dropdown */}
              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  minWidth: '210px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.85rem',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  zIndex: 9999,
                  overflow: 'hidden',
                  animation: 'ddFadeIn 0.15s ease'
                }}>
                  <div style={{ padding: '0.4rem' }}>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); navigate('/dashboard/settings'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.8rem', background: 'none', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Settings size={15} /> Settings & Profile
                    </button>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.3rem 0' }} />
                    <button
                      onClick={handleLogout}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.8rem', background: 'none', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--accent-rose)', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={15} color="var(--accent-rose)" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* PLATFORM BROADCAST NOTICE BANNER */}
        {activeBroadcastNotice && !dismissedNotice && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.14)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
            padding: '0.75rem 1.5rem',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}>
            <Megaphone size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{
                fontWeight: 800,
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                background: '#f59e0b',
                color: '#000000',
                padding: '0.15rem 0.45rem',
                borderRadius: '0.3rem',
                marginRight: '0.6rem'
              }}>
                Platform Notice
              </span>
              {activeBroadcastNotice}
            </div>
            <button
              onClick={() => setDismissedNotice(true)}
              style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="content-area">
          <Outlet />
        </div>
      </main>

      <style>{`
        @keyframes ddFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
