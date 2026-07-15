import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogIn, LogOut } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
      <Link to="/" className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--primary-indigo)', boxShadow: 'none' }}>
        <LayoutDashboard size={20} style={{ marginRight: '0.5rem' }} /> Dashboard
      </Link>
      
      <div style={{ flex: 1 }}></div>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Logged in as <strong>{user.email}</strong>
          </span>
          <button onClick={handleLogout} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-dark)', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)' }}>
            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
          </button>
        </div>
      ) : (
        <Link to="/login" className="btn-primary">
          <LogIn size={20} style={{ marginRight: '0.5rem' }} /> Login
        </Link>
      )}
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="layout-container">
        <Navigation />

        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <div className="premium-card">
                <h1>Welcome to TenantPlus Dashboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>You are successfully authenticated.</p>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
