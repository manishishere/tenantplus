import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FileText, Download, Building2, Calendar, AlertCircle } from 'lucide-react';

export default function AgreementsList() {
  const { role } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/agreements/');
      const list = response.data.results || response.data || [];
      setAgreements(list);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch agreements list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDownloadPDF = async (agreementId) => {
    try {
      const response = await api.get(`/agreements/${agreementId}/pdf/`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lease_agreement_${agreementId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download legal lease PDF. Please try again.');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { color: '#10B981', background: 'rgba(16, 185, 129, 0.1)' };
      case 'terminated':
        return { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' };
      case 'expired':
        return { color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' };
      default:
        return { color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)' };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--primary-indigo)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading agreements...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Tenancy Agreements</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {role === 'landlord' ? 'Review lease agreements with your tenants' : 'Access your current and past lease contracts'}
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {agreements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-darker)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Agreements Found</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            No lease agreements have been finalized yet. Agreements are generated automatically when a rental application is approved.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {agreements.map((agreement) => {
            const statusStyle = getStatusStyle(agreement.status);
            return (
              <div key={agreement.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{agreement.property.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{agreement.property.district}</p>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase', 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '1rem',
                      ...statusStyle
                    }}>
                      {agreement.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {role === 'landlord' ? 'Tenant Email' : 'Landlord'}
                      </span>
                      <span style={{ fontWeight: 500 }}>
                        {role === 'landlord' ? agreement.tenant.email : 'Landlord Partner'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Lease Term</span>
                      <span style={{ fontWeight: 500 }}>{formatDate(agreement.start_date)} - {formatDate(agreement.end_date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rent</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>Rs. {parseFloat(agreement.rent_amount).toLocaleString()} / month</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDownloadPDF(agreement.id)}
                  className="btn-primary"
                  style={{ width: '100%', display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}
                >
                  <Download size={16} />
                  Download Lease PDF
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
