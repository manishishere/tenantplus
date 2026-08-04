import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TenantOverview from './TenantOverview';
import LandlordOverview from './LandlordOverview';
import AdminOverview from './AdminOverview';

export default function DashboardOverview() {
  const { role } = useAuth();

  if (role === 'tenant') {
    return <TenantOverview />;
  }

  if (role === 'landlord') {
    return <LandlordOverview />;
  }

  if (role === 'admin') {
    return <AdminOverview />;
  }

  // Fallback for admins or other staff
  return <AdminOverview />;
}

