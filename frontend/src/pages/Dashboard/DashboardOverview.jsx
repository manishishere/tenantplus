import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TenantOverview from './TenantOverview';
import LandlordOverview from './LandlordOverview';

export default function DashboardOverview() {
  const { role } = useAuth();

  if (role === 'tenant') {
    return <TenantOverview />;
  }

  if (role === 'landlord') {
    return <LandlordOverview />;
  }

  // Admins default to properties directory
  return <Navigate to="/dashboard/properties" replace />;
}
