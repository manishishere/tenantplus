import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { LayoutDashboard, LogIn } from 'lucide-react'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <div className="layout-container">
        <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <Link to="/" className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--primary-indigo)', boxShadow: 'none' }}>
            <LayoutDashboard size={20} style={{ marginRight: '0.5rem' }} /> Dashboard
          </Link>
          <Link to="/login" className="btn-primary">
            <LogIn size={20} style={{ marginRight: '0.5rem' }} /> Login
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={
            <div className="premium-card">
              <h1>Welcome to TenantPlus</h1>
              <p style={{ color: 'var(--text-muted)' }}>This is the dashboard placeholder.</p>
            </div>
          } />
          <Route path="/login" element={
            <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <h2>Login Placeholder</h2>
              <p>Authentication form goes here.</p>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
