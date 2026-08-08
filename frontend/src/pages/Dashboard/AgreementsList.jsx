import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import DigitalSignatureModal from '../../components/Agreements/DigitalSignatureModal';
import { 
  FileText, 
  Download, 
  Building2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  PenTool,
  Lock,
  ChevronRight,
  Undo2,
  MessageSquare
} from 'lucide-react';

export default function AgreementsList() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Digital Signature, Witness & Renewal Modal State
  const [sigModalAgreement, setSigModalAgreement] = useState(null);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState(false);
  const [witnessForm, setWitnessForm] = useState({
    witness1_name: '',
    witness1_citizenship: '',
    witness2_name: '',
    witness2_citizenship: ''
  });
  const [witnessSubmitting, setWitnessSubmitting] = useState(false);

  // Advance Payment State
  const [advancePayLoading, setAdvancePayLoading] = useState(false);
  const [advancePayError, setAdvancePayError] = useState('');
  const [lateFeeLoading, setLateFeeLoading] = useState({});

  // Countdown timer state (seconds remaining until 24h deadline)
  const [advanceCountdowns, setAdvanceCountdowns] = useState({});

  // Lease Renewal Grace Period & Status State
  const [renewalState, setRenewalState] = useState({});

  // Advance payment countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const newCountdowns = {};
      agreements.forEach(ag => {
        if (ag.status === 'pending_advance' && ag.advance_payment_deadline) {
          const deadline = new Date(ag.advance_payment_deadline);
          const diffMs = deadline - now;
          newCountdowns[ag.id] = diffMs > 0 ? diffMs : 0;
        }
      });
      setAdvanceCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(tick);
  }, [agreements]);

  const formatCountdown = (ms) => {
    if (!ms || ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRenewalState((prev) => {
        let updated = false;
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (next[id]?.status === 'grace') {
            updated = true;
            if (next[id].timer > 1) {
              next[id] = { ...next[id], timer: next[id].timer - 1 };
            } else {
              next[id] = { ...next[id], status: 'submitted', timer: 0 };
            }
          }
        });
        return updated ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfirmRenewal = (agreementId) => {
    setRenewalState((prev) => ({
      ...prev,
      [agreementId]: { status: 'grace', timer: 30, requestedBy: role }
    }));
    setRenewalSuccess(true);
  };

  const handleUndoRenewal = (agreementId) => {
    setRenewalState((prev) => ({
      ...prev,
      [agreementId]: { status: 'none', timer: 0, requestedBy: null }
    }));
  };

  const handleAcceptRenewal = (agreementId) => {
    setRenewalState((prev) => ({
      ...prev,
      [agreementId]: { status: 'accepted', timer: 0, requestedBy: prev[agreementId]?.requestedBy }
    }));
  };

  const handleDeclineRenewal = (agreementId) => {
    setRenewalState((prev) => ({
      ...prev,
      [agreementId]: { status: 'none', timer: 0, requestedBy: null }
    }));
  };

  const handleStartChat = async (otherUserId, propertyId) => {
    if (!otherUserId) {
      alert('Unable to identify chat recipient.');
      return;
    }
    try {
      await api.post('/chat/conversations/', {
        other_user_id: otherUserId,
        property_id: propertyId
      });
      navigate('/dashboard/chat');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to start chat session.');
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/agreements/');
      const data = response.data.results || response.data || [];
      setAgreements(data);
      if (data.length > 0) {
        setSelectedAgreementId(data[0].id);
        const first = data[0];
        setWitnessForm({
          witness1_name: first.witness1_name || '',
          witness1_citizenship: first.witness1_citizenship || '',
          witness2_name: first.witness2_name || '',
          witness2_citizenship: first.witness2_citizenship || ''
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load tenancy agreements.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWitnesses = async (e) => {
    e.preventDefault();
    if (!activeAgreement) return;
    setWitnessSubmitting(true);
    try {
      await api.patch(`/agreements/${activeAgreement.id}/upload-signed/`, witnessForm);
      await fetchAgreements();
      setShowWitnessModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save witness details.');
    } finally {
      setWitnessSubmitting(false);
    }
  };

  const handleDownloadPDF = async (agreementId) => {
    try {
      const response = await api.get(`/agreements/${agreementId}/pdf/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `House_Rent_Agreement_${agreementId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download legal PDF template.');
    }
  };

  const handleSaveDigitalSignature = async (sigDataUrl) => {
    if (!sigModalAgreement) return;
    const payload = {
      signed_document_url: sigDataUrl
    };
    if (role === 'landlord') {
      payload.landlord_signature_url = sigDataUrl;
    } else {
      payload.tenant_signature_url = sigDataUrl;
    }

    await api.patch(`/agreements/${sigModalAgreement.id}/upload-signed/`, payload);
    await api.patch(`/agreements/${sigModalAgreement.id}/acknowledge/`, {
      action: 'approve'
    });
    await fetchAgreements();
  };

  const handleAcknowledge = async (agreementId, action, reason = '') => {
    try {
      await api.patch(`/agreements/${agreementId}/acknowledge/`, {
        action: action,
        reason: reason
      });
      setActiveRejectId(null);
      setRejectReason('');
      await fetchAgreements();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} agreement.`);
    }
  };

  const handlePayAdvance = async (agreementId) => {
    setAdvancePayLoading(true);
    setAdvancePayError('');
    try {
      await api.post(`/agreements/${agreementId}/pay-advance/`);
      await fetchAgreements();
    } catch (err) {
      setAdvancePayError(err.response?.data?.detail || 'Failed to process advance payment.');
    } finally {
      setAdvancePayLoading(false);
    }
  };

  const handleApplyLateFee = async (paymentId) => {
    setLateFeeLoading(prev => ({ ...prev, [paymentId]: true }));
    try {
      await api.post(`/rent-payments/${paymentId}/apply-late-fee/`);
      await fetchAgreements();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to apply late fee.');
    } finally {
      setLateFeeLoading(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const activeAgreement = agreements.find(a => a.id === selectedAgreementId) || agreements[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        Loading Tenancy Agreements...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'var(--font-family)' }}>
      
      {/* 1. TOP HEADER & PROPERTY TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Tenancy Leases & Signature Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.15rem 0 0 0' }}>
            Digital contracts signed under Nepalese House Rent Act 2075.
          </p>
        </div>

        {/* Tab Selection Bar for Multiple Properties */}
        {agreements.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.3rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)' }}>
            {agreements.map((ag) => (
              <button
                key={ag.id}
                onClick={() => setSelectedAgreementId(ag.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.4rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: ag.id === activeAgreement?.id ? 'var(--primary-indigo)' : 'transparent',
                  color: ag.id === activeAgreement?.id ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                {ag.property.title} • Tenant: {ag.tenant?.full_name || ag.tenant?.email}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ADVANCE PAYMENT BANNER — shown when agreement is pending_advance */}
      {activeAgreement && activeAgreement.status === 'pending_advance' && (
        <div style={{
          background: role === 'tenant' 
            ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)' 
            : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          color: '#fff',
          padding: '1.25rem 1.5rem',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '50%', padding: '0.6rem', display: 'flex' }}>
              <Clock size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem' }}>
                {role === 'tenant' 
                  ? 'Advance Payment Required to Activate Agreement' 
                  : 'Awaiting Tenant Advance Payment'}
              </div>
              <div style={{ fontSize: '0.83rem', opacity: 0.9 }}>
                {role === 'tenant' 
                  ? `Pay Rs. ${parseFloat(activeAgreement.advance_amount || activeAgreement.rent_amount).toLocaleString()} advance rent within 24 hours or the application will be auto-cancelled.`
                  : `The tenant must pay Rs. ${parseFloat(activeAgreement.advance_amount || activeAgreement.rent_amount).toLocaleString()} within 24 hours to activate this agreement.`}
              </div>
              {advanceCountdowns[activeAgreement.id] !== undefined && (
                <div style={{ marginTop: '0.4rem', fontWeight: 800, fontSize: '1.35rem', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  {advanceCountdowns[activeAgreement.id] > 0 
                    ? `${formatCountdown(advanceCountdowns[activeAgreement.id])} remaining`
                    : 'Window Expired — Contact Support'}
                </div>
              )}
            </div>
          </div>
          {role === 'tenant' && advanceCountdowns[activeAgreement.id] > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '200px' }}>
              {advancePayError && (
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', textAlign: 'right' }}>{advancePayError}</div>
              )}
              <button
                onClick={() => handlePayAdvance(activeAgreement.id)}
                disabled={advancePayLoading}
                style={{
                  background: '#ffffff',
                  color: '#b45309',
                  border: 'none',
                  borderRadius: '0.6rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: advancePayLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  opacity: advancePayLoading ? 0.7 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {advancePayLoading ? 'Processing...' : `Pay Rs. ${parseFloat(activeAgreement.advance_amount || activeAgreement.rent_amount).toLocaleString()} Advance Now`}
              </button>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, textAlign: 'right' }}>
                Deadline: {activeAgreement.advance_payment_deadline ? new Date(activeAgreement.advance_payment_deadline).toLocaleString() : 'N/A'}
              </span>
            </div>
          )}
        </div>
      )}

      {!activeAgreement ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
          <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>No Active Lease Agreements</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
            Lease contracts generate automatically upon landlord approval of a rental application.
          </p>
        </div>
      ) : (
        /* 2. COMPACT ZERO-SCROLL 2-COLUMN WORKSPACE */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: AGREEMENT SUMMARY & VERIFICATION PANEL */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Lease Specification
                  </span>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, background: 'var(--pill-bg)', color: 'var(--primary-indigo)', border: '1px solid var(--pill-border)', padding: '0.1rem 0.5rem', borderRadius: '0.75rem' }}>
                    Landlord: {activeAgreement.landlord?.full_name || activeAgreement.landlord?.email || 'Verified Landlord'}
                  </span>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, background: 'var(--pill-bg)', color: '#10b981', border: '1px solid var(--pill-border)', padding: '0.1rem 0.5rem', borderRadius: '0.75rem' }}>
                    Tenant: {activeAgreement.tenant?.full_name || activeAgreement.tenant?.email}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', margin: '0.15rem 0 0 0', fontWeight: 800 }}>{activeAgreement.property.title}</h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>{activeAgreement.property.district}</p>
              </div>

              {/* Status Badge */}
              {activeAgreement.tenant_acknowledged && activeAgreement.landlord_acknowledged ? (
                <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={13} /> Active & Verified
                </span>
              ) : activeAgreement.signed_doc_status === 'rejected' ? (
                <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <XCircle size={13} /> Signature Rejected
                </span>
              ) : (
                <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} /> Signature Action Required
                </span>
              )}
            </div>

            {/* Spec Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Landlord (First Party)</span>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {activeAgreement.landlord?.full_name || activeAgreement.landlord?.email || 'Verified Landlord'}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Tenant (Second Party)</span>
                <div style={{ fontWeight: 800, color: 'var(--primary-indigo)', marginTop: '0.15rem' }}>
                  {activeAgreement.tenant?.full_name || activeAgreement.tenant?.email}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Lease Period</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {formatDate(activeAgreement.start_date)} - {formatDate(activeAgreement.end_date)}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Monthly Rent</span>
                <div style={{ fontWeight: 800, color: 'var(--primary-indigo)', fontSize: '1.05rem', marginTop: '0.15rem' }}>
                  Rs. {parseFloat(activeAgreement.rent_amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Mutual Signature Verification Panel */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.825rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                Mutual Signature Verification:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Landlord Signature ({activeAgreement.landlord?.full_name || activeAgreement.landlord?.email || 'Landlord'}):</span>
                <span style={{ fontWeight: 600, color: activeAgreement.landlord_acknowledged ? '#10b981' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  {activeAgreement.landlord_acknowledged ? <><CheckCircle2 size={13} /> Approved & Signed</> : <><Clock size={13} /> Action Needed</>}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tenant Signature ({activeAgreement.tenant?.full_name || activeAgreement.tenant?.email}):</span>
                <span style={{ fontWeight: 600, color: activeAgreement.tenant_acknowledged ? '#10b981' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  {activeAgreement.tenant_acknowledged ? <><CheckCircle2 size={13} /> Approved & Signed</> : <><Clock size={13} /> Action Needed</>}
                </span>
              </div>
            </div>

            {/* Legal Witness Section (Nepal House Rent Act 2075) */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              border: '1px dashed var(--primary-indigo)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.825rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-indigo)' }}>
                  👥 Legal Witnesses (Nepal Rent Act 2075):
                </div>
                <button
                  onClick={() => setShowWitnessModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-indigo)',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  {activeAgreement.witness1_name ? 'Edit Witness Details' : '+ Add Witness 1 & 2'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Witness 1:</span>
                <span style={{ fontWeight: 600, color: activeAgreement.witness1_name ? '#10b981' : 'var(--text-muted)' }}>
                  {activeAgreement.witness1_name || 'Not Specified'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Witness 2:</span>
                <span style={{ fontWeight: 600, color: activeAgreement.witness2_name ? '#10b981' : 'var(--text-muted)' }}>
                  {activeAgreement.witness2_name || 'Not Specified'}
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: 1-STEP PRIMARY ACTION HUB */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              Action Hub
            </h3>

            {((role === 'tenant' && !activeAgreement.tenant_acknowledged) || (role === 'landlord' && !activeAgreement.landlord_acknowledged) || activeAgreement.signed_doc_status === 'rejected') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {activeAgreement.signed_doc_status === 'rejected' && activeAgreement.rejection_reason && (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
                    Signature Rejected: {activeAgreement.rejection_reason} Please re-sign below.
                  </div>
                )}

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Click below to open the <strong>In-App E-Signature Canvas</strong> and sign your House Rent Agreement under <em>House Rent Act 2075</em>.
                </p>

                <button
                  onClick={() => setSigModalAgreement(activeAgreement)}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  <PenTool size={18} /> Sign Agreement Now
                </button>

                <button
                  onClick={() => handleDownloadPDF(activeAgreement.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.65rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Download size={16} /> Preview Legal PDF Template
                </button>
              </div>
            ) : (
              /* CASE 2: User HAS Signed (Show Locked Certificate + PDF Download + 1-Click Renewal) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Locked Certificate Card */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Lock size={14} /> Signature Certified & Locked
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  </div>

                  {/* Dual Signature Showcase (Landlord & Tenant) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '0.25rem 0' }}>
                    {/* Landlord Signature Box */}
                    <div style={{ background: '#ffffff', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Landlord Signature</span>
                      {activeAgreement.landlord_signature_url && activeAgreement.landlord_signature_url.startsWith('data:image') ? (
                        <img src={activeAgreement.landlord_signature_url} alt="Landlord Signature" style={{ maxHeight: '38px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 700 }}>✅ Certified</span>
                      )}
                    </div>

                    {/* Tenant Signature Box */}
                    <div style={{ background: '#ffffff', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Tenant Signature</span>
                      {activeAgreement.tenant_signature_url && activeAgreement.tenant_signature_url.startsWith('data:image') ? (
                        <img src={activeAgreement.tenant_signature_url} alt="Tenant Signature" style={{ maxHeight: '38px', objectFit: 'contain' }} />
                      ) : activeAgreement.signed_document_url && activeAgreement.signed_document_url.startsWith('data:image') ? (
                        <img src={activeAgreement.signed_document_url} alt="Tenant Signature" style={{ maxHeight: '38px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 700 }}>✅ Certified</span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Mutual legal signatures locked & binding under House Rent Act 2075.
                  </p>
                </div>

                {/* Primary Action 1: Pay Advance & Activate Lease (For Tenants) */}
                {role === 'tenant' && activeAgreement.status !== 'active' && (
                  <button 
                    onClick={() => {
                      navigate('/dashboard');
                    }}
                    className="btn-primary btn-emerald"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <CreditCard size={18} /> Pay Advance & Activate Lease ↗
                  </button>
                )}

                {/* Primary Action 2: Download PDF */}
                <button 
                  onClick={() => handleDownloadPDF(activeAgreement.id)}
                  className={role === 'tenant' && activeAgreement.status !== 'active' ? "btn-secondary" : "btn-primary"}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Download size={16} /> Download Signed Legal PDF
                </button>

                {/* Direct Chat Button */}
                <button
                  onClick={() => handleStartChat(
                    role === 'landlord' ? activeAgreement.tenant?.id : activeAgreement.landlord?.id,
                    activeAgreement.property?.id
                  )}
                  style={{
                    width: '100%',
                    background: 'var(--pill-bg)',
                    border: '1px solid var(--pill-border)',
                    color: 'var(--primary-indigo)',
                    padding: '0.65rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <MessageSquare size={15} /> Chat with {role === 'landlord' ? activeAgreement.tenant?.full_name || 'Tenant' : activeAgreement.landlord?.full_name || 'Landlord'}
                </button>

                {/* 1-Click Lease Renewal Bilateral Workflow */}
                {(() => {
                  const info = renewalState[activeAgreement.id] || { status: 'none', timer: 0, requestedBy: null };

                  // Case 1: Active 30s Grace Period (for user who requested it)
                  if (info.status === 'grace') {
                    const isMyRequest = info.requestedBy === role;
                    if (isMyRequest) {
                      return (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#fbbf24',
                          padding: '0.75rem 0.85rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={15} /> {role === 'landlord' ? 'Renewal Offer Sent' : 'Renewal Requested'} ({info.timer}s)
                          </span>
                          <button
                            onClick={() => handleUndoRenewal(activeAgreement.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '0.35rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Undo2 size={12} /> Undo
                          </button>
                        </div>
                      );
                    }
                  }

                  // Case 2: Submitted / Pending Approval
                  if (info.status === 'submitted' || (info.status === 'grace' && info.requestedBy !== role)) {
                    const isMyRequest = info.requestedBy === role;
                    if (isMyRequest) {
                      return (
                        <div style={{
                          background: 'var(--pill-bg)',
                          border: '1px solid var(--pill-border)',
                          color: 'var(--primary-indigo)',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}>
                          <Clock size={15} /> {role === 'landlord' ? '📩 Renewal Offer Sent to Tenant (Pending Response)' : '📩 Renewal Request Submitted & Pending Landlord Approval'}
                        </div>
                      );
                    } else {
                      // Other party requested it! Show Approve / Decline buttons!
                      const requesterName = info.requestedBy === 'landlord' ? 'Landlord' : 'Tenant';
                      return (
                        <div style={{
                          background: 'var(--pill-bg)',
                          border: '1px solid var(--pill-border)',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-indigo)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <RefreshCw size={14} /> 📩 {requesterName} Requested 1-Year Lease Renewal (+10%)
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleAcceptRenewal(activeAgreement.id)}
                              className="btn-primary"
                              style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', background: '#10b981', borderColor: '#10b981' }}
                            >
                              <CheckCircle2 size={13} /> Accept Renewal
                            </button>
                            <button
                              onClick={() => handleDeclineRenewal(activeAgreement.id)}
                              style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    }
                  }

                  // Case 3: Accepted
                  if (info.status === 'accepted') {
                    return (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        textAlign: 'center',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}>
                        <CheckCircle2 size={15} /> Lease Renewal Accepted (+10%)
                      </div>
                    );
                  }

                  // Case 4: No request yet
                  return (
                    <button
                      onClick={() => {
                        setRenewalSuccess(false);
                        setShowRenewalModal(true);
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--pill-bg)',
                        border: '1px solid var(--pill-border)',
                        color: 'var(--primary-indigo)',
                        padding: '0.65rem',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <RefreshCw size={15} /> Request 1-Year Lease Renewal (+10%)
                    </button>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}

      {/* IN-APP DIGITAL SIGNATURE E-SIGN PAD MODAL */}
      {sigModalAgreement && (
        <DigitalSignatureModal
          agreement={sigModalAgreement}
          onClose={() => setSigModalAgreement(null)}
          onSaveSignature={handleSaveDigitalSignature}
        />
      )}

      {/* WITNESS DETAILS MODAL */}
      {showWitnessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Register Legal Witnesses</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Under Nepal House Rent Act 2075, tenancy contracts require 2 Witnesses. Enter their full names and citizenship numbers to automatically stamp them into your legal PDF.
            </p>

            <form onSubmit={handleSaveWitnesses} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Witness 1 Details</strong>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Witness 1 Full Name (e.g. Rohan Shrestha)"
                  value={witnessForm.witness1_name}
                  onChange={(e) => setWitnessForm({ ...witnessForm, witness1_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Witness 1 Citizenship / Passport No (e.g. 27-01-78-12345)"
                  value={witnessForm.witness1_citizenship}
                  onChange={(e) => setWitnessForm({ ...witnessForm, witness1_citizenship: e.target.value })}
                  required
                />
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Witness 2 Details</strong>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Witness 2 Full Name (e.g. Sita Adhikari)"
                  value={witnessForm.witness2_name}
                  onChange={(e) => setWitnessForm({ ...witnessForm, witness2_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Witness 2 Citizenship / Passport No (e.g. 12-02-75-98765)"
                  value={witnessForm.witness2_citizenship}
                  onChange={(e) => setWitnessForm({ ...witnessForm, witness2_citizenship: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowWitnessModal(false)} className="btn-primary" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={witnessSubmitting} style={{ flex: 1 }}>
                  {witnessSubmitting ? 'Saving...' : 'Save & Stamp PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEASE RENEWAL REQUEST MODAL */}
      {showRenewalModal && activeAgreement && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--pill-bg)', color: 'var(--primary-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>1-Year Lease Renewal</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>House Rent Act 2075 Compliance</p>
              </div>
            </div>

            {renewalSuccess ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto' }} />
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#10b981' }}>Lease Renewal Submitted!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Renewal request for <strong>{activeAgreement.property.title}</strong> has been logged. The new escalated monthly rent is <strong>Rs. {(parseFloat(activeAgreement.rent_amount) * 1.1).toLocaleString()}</strong> (+10%).
                </p>
                <button onClick={() => setShowRenewalModal(false)} className="btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
                  Close Window
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Property:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{activeAgreement.property.title}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Current Monthly Rent:</span>
                    <span style={{ fontWeight: 600 }}>Rs. {parseFloat(activeAgreement.rent_amount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                    <span style={{ color: 'var(--primary-indigo)', fontWeight: 700 }}>New Rent (+10% Escalation):</span>
                    <strong style={{ color: 'var(--primary-indigo)', fontSize: '1rem' }}>Rs. {(parseFloat(activeAgreement.rent_amount) * 1.1).toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--pill-border)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Under Nepalese law, standard 1-year tenancy extensions carry a 10% rent adjustment clause unless mutually revised by both parties.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setShowRenewalModal(false)} className="btn-primary" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleConfirmRenewal(activeAgreement.id)} 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
