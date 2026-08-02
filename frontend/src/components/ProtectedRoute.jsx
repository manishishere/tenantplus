import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    // Render a sophisticated skeleton loader to prevent login flash
    return (
      <div 
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
        aria-busy="true"
        aria-live="polite"
      >
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid rgba(99, 102, 241, 0.2)', 
              borderTopColor: 'var(--primary-indigo)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto'
            }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Verifying session...</p>
          
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the attempted location so we can redirect them back later
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
