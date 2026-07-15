import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Properties from './pages/Dashboard/Properties';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard/properties" replace />} />

        {/* Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default dashboard route can be something else, for now redirect to properties */}
          <Route index element={<Navigate to="/dashboard/properties" replace />} />
          
          <Route path="properties" element={<Properties />} />
          
          {/* Placeholders for future routes */}
          <Route path="agreements" element={<div>Agreements Page</div>} />
          <Route path="maintenance" element={<div>Maintenance Page</div>} />
          <Route path="settings" element={<div>Settings Page</div>} />
        </Route>
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard/properties" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
