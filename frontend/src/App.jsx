import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Properties from './pages/Dashboard/Properties';
import DashboardOverview from './pages/Dashboard/DashboardOverview';
import AgreementsList from './pages/Dashboard/AgreementsList';
import ApplicationsList from './pages/Dashboard/ApplicationsList';
import LandingPage from './pages/Public/LandingPage';
import EsewaVerify from './pages/Payment/EsewaVerify';
import EsewaFailure from './pages/Payment/EsewaFailure';
import Maintenance from './pages/Dashboard/Maintenance';
import Utilities from './pages/Dashboard/Utilities';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/verify-email" 
          element={
            <ProtectedRoute allowUnverified={true}>
              <VerifyEmail />
            </ProtectedRoute>
          } 
        />

        {/* eSewa Payment Redirect Landings */}
        <Route 
          path="/payment/esewa/verify" 
          element={
            <ProtectedRoute>
              <EsewaVerify />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment/esewa/failure" 
          element={
            <ProtectedRoute>
              <EsewaFailure />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default dashboard route points to DashboardOverview dispatcher */}
          <Route index element={<DashboardOverview />} />
          
          <Route path="properties" element={<Properties />} />
          
          <Route path="applications" element={<ApplicationsList />} />
          
          <Route path="agreements" element={<AgreementsList />} />
          
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="utilities" element={<Utilities />} />
          <Route path="settings" element={<div>Settings Page</div>} />
        </Route>
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
