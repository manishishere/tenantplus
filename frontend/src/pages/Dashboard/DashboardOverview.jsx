import { useAuth } from '../../context/AuthContext';
import TenantOverview from './TenantOverview';
import LandlordOverview from './LandlordOverview';
import AdminOverview from './AdminOverview';

export default function DashboardOverview() {
  const { user, role, isInitializing } = useAuth();

  if (isInitializing || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading dashboard overview...</span>
      </div>
    );
  }

  if (role === 'tenant') {
    return <TenantOverview />;
  }

  if (role === 'landlord') {
    return <LandlordOverview />;
  }

  if (role === 'admin') {
    return <AdminOverview />;
  }

  return <LandlordOverview />;
}

