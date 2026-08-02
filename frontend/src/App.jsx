import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import InspectionChecklist from './pages/Dashboard/InspectionChecklist';
import Maintenance from './pages/Dashboard/Maintenance';
import Utilities from './pages/Dashboard/Utilities';
import Settings from './pages/Dashboard/Settings';
import ChatHub from './pages/Dashboard/ChatHub';
import AiRightsChatbot from './components/AiRightsChatbot';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
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
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              {/* Default dashboard route points to DashboardOverview dispatcher */}
              <Route index element={<ErrorBoundary><DashboardOverview /></ErrorBoundary>} />
              
              <Route path="properties" element={<ErrorBoundary><Properties /></ErrorBoundary>} />
              
              <Route path="applications" element={<ErrorBoundary><ApplicationsList /></ErrorBoundary>} />
              
              <Route path="agreements" element={<ErrorBoundary><AgreementsList /></ErrorBoundary>} />
              
              <Route path="inspection" element={<ErrorBoundary><InspectionChecklist /></ErrorBoundary>} />
              
              <Route path="maintenance" element={<ErrorBoundary><Maintenance /></ErrorBoundary>} />
              <Route path="utilities" element={<ErrorBoundary><Utilities /></ErrorBoundary>} />
              <Route path="chat" element={<ErrorBoundary><ChatHub /></ErrorBoundary>} />
              <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* Global AI Rights Chatbot */}
          <AiRightsChatbot />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
