import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import NotificationBell from '../Notifications/NotificationBell';
import { Home, FileText, Wrench, Settings, Menu, X, LogOut, Building2, Users, DollarSign, Sun, Moon, ClipboardCheck, MessageSquare } from 'lucide-react';

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadMaintenanceCount, setUnreadMaintenanceCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNavCounts();
    const interval = setInterval(fetchNavCounts, 3000);
    return () => clearInterval(interval);
  }, []);

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
        // Pending or in-progress tickets requiring action/addressing
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

  const navItems = [
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
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 35 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Building2 size={24} color="var(--primary-indigo)" />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)' }}>TenantPlus</span>
          <button 
            className="mobile-menu-btn" 
            style={{ marginLeft: 'auto' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
              
              {item.path === '/dashboard/chat' && unreadChatCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '1rem',
                  marginLeft: 'auto',
                  lineHeight: 1
                }}>
                  {unreadChatCount}
                </span>
              )}

              {item.path === '/dashboard/maintenance' && unreadMaintenanceCount > 0 && (
                <span style={{
                  background: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '1rem',
                  marginLeft: 'auto',
                  lineHeight: 1
                }}>
                  {unreadMaintenanceCount}
                </span>
              )}
            </NavLink>
          ))}
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
            <NavLink to="/dashboard/settings" className="nav-link">
              <Settings size={20} /> Settings
            </NavLink>
            <button 
              onClick={handleLogout} 
              className="nav-link" 
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ padding: 0 }}
            >
              <Menu size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell Dropdown */}
            <NotificationBell />

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{
                background: 'var(--pill-bg, rgba(255,255,255,0.08))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
            </button>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-dark)' }}>{user?.full_name || user?.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</div>
            </div>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-indigo)', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600
            }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
