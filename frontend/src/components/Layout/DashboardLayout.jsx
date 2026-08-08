import { useState, useEffect } from 'react';
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
  const navigate = useNavigate();

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
          
          {/* Footer Settings & Logout */}
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

            {/* Avatar Circle */}
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--text-main)', 
              color: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
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
    </div>
  );
}
