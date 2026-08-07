import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  ShieldCheck, 
  FileText,
  Plus,
  Save,
  Key,
  Package,
  Scale,
  Flag,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function InspectionChecklist() {
  const { role } = useAuth();
  const [inspectionType, setInspectionType] = useState('move_in'); // 'move_in' or 'move_out'
  const [items, setItems] = useState([
    { id: 1, category: 'Walls & Paint', status: 'good', notes: 'Freshly painted, no cracks or water stains.', photoUrl: null, isContested: false },
    { id: 2, category: 'Plumbing & Taps', status: 'good', notes: 'Water flow normal, bathroom taps leak-free.', photoUrl: null, isContested: false },
    { id: 3, category: 'Electrical & Switches', status: 'good', notes: 'All light switches and sockets working.', photoUrl: null, isContested: false },
    { id: 4, category: 'Doors & Window Locks', status: 'fair', notes: 'Main door lock functional; bedroom window latch stiff.', photoUrl: null, isContested: false },
    { id: 5, category: 'Flooring & Tiles', status: 'good', notes: 'Clean tiles, no broken pieces.', photoUrl: null, isContested: false }
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showResolutionGuide, setShowResolutionGuide] = useState(true);

  const handleStatusChange = (id, newStatus) => {
    setItems(items.map(item => item.id === id ? { ...item, status: newStatus } : item));
    setSavedSuccess(false);
    setErrorMsg('');
  };

  const handleNotesChange = (id, newNotes) => {
    setItems(items.map(item => item.id === id ? { ...item, notes: newNotes } : item));
    setSavedSuccess(false);
    setErrorMsg('');
  };

  const handlePhotoUpload = (id, file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setItems(items.map(item => item.id === id ? { ...item, photoUrl: objectUrl } : item));
    setSavedSuccess(false);
    setErrorMsg('');
  };

  const handleContestItem = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, isContested: !item.isContested } : item));
  };

  const handleSaveChecklist = () => {
    setErrorMsg('');
    const missingPhotoItem = items.find(item => item.status === 'damaged' && !item.photoUrl);
    if (missingPhotoItem) {
      setErrorMsg(`Compulsory Photo Required: Please upload a photo proof for '${missingPhotoItem.category}' marked as Damaged before saving.`);
      return;
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'good':
        return (
          <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={12} /> Good Condition
          </span>
        );
      case 'fair':
        return (
          <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertTriangle size={12} /> Fair / Normal Wear
          </span>
        );
      case 'damaged':
        return (
          <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <XCircle size={12} /> Damaged / Repair Needed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 800 }}>Move-In / Move-Out Condition Inspection</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Timestamped digital condition reports to protect security deposits and resolve condition disputes legally.
          </p>
        </div>

        <button 
          onClick={handleSaveChecklist}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} /> Save Condition Audit
        </button>
      </div>

      {/* RESOLUTION ARCHITECTURE EXPLANATION BANNER */}
      {showResolutionGuide && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid #2563eb', padding: '1.25rem', borderRadius: '0.85rem', position: 'relative' }}>
          <button 
            onClick={() => setShowResolutionGuide(false)}
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ✕
          </button>
          
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <Scale size={26} color="#2563eb" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                How Inspection Audits & Disagreements Work
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <strong>1. Photo Uploaders:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Either the <strong>Tenant</strong> or <strong>Landlord</strong> uploads timestamped room photos at Move-In (key handover) and Move-Out (lease exit).
                  </p>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <strong>2. Fair vs. Damaged Grading Rules:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    • <strong>Fair (Normal Wear):</strong> Aged paint, minor wall scuffs, natural sun fading. Deposit CANNOT be deducted.<br/>
                    • <strong>Damaged:</strong> Broken fixtures, door holes, water leaks. Deposit deduction requires repair invoice.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <strong>3. What If There Is Disagreement?</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Click <strong>"Contest Grade"</strong> on the item. Platform Admin compares the Move-In baseline photo vs Move-Out photo, or dispatches a <strong>Field Inspection Agent</strong> for binding physical audit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={20} />
          <span>Condition report saved! Immutable audit record created for security deposit protection.</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
          <XCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inspection Type Selector */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setInspectionType('move_in')}
          className="premium-card"
          style={{
            flex: 1,
            padding: '1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: inspectionType === 'move_in' ? '2px solid #2563eb' : '1px solid var(--border-color)',
            background: inspectionType === 'move_in' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Key size={26} color="#2563eb" style={{ marginBottom: '0.4rem' }} />
          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Move-In Inspection (Baseline)</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Executed during key handover</span>
        </button>

        <button
          onClick={() => setInspectionType('move_out')}
          className="premium-card"
          style={{
            flex: 1,
            padding: '1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: inspectionType === 'move_out' ? '2px solid #2563eb' : '1px solid var(--border-color)',
            background: inspectionType === 'move_out' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Package size={26} color="#2563eb" style={{ marginBottom: '0.4rem' }} />
          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Move-Out Inspection (Lease Exit)</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Executed during deposit refund</span>
        </button>
      </div>

      {/* Items Checklist Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800 }}>
          {inspectionType === 'move_in' ? 'Move-In Baseline Checklist' : 'Move-Out Damage Audit Checklist'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              style={{ 
                background: item.isContested ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-input)', 
                padding: '1.25rem', 
                borderRadius: '0.75rem', 
                border: item.isContested ? '1px solid #ef4444' : '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.category}</strong>
                  <div style={{ marginTop: '0.35rem' }}>{getStatusBadge(item.status)}</div>
                </div>

                {/* Grade Selector Radio Group */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'good')}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'good' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: item.status === 'good' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: item.status === 'good' ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🟢 Good
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'fair')}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'fair' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      background: item.status === 'fair' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: item.status === 'fair' ? '#d97706' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🟡 Fair (Wear & Tear)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'damaged')}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'damaged' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                      background: item.status === 'damaged' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: item.status === 'damaged' ? '#ef4444' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🔴 Damaged
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContestItem(item.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: item.isContested ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: item.isContested ? '#ef4444' : 'transparent',
                      color: item.isContested ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Flag size={13} /> {item.isContested ? 'Grade Contested' : 'Contest Grade'}
                  </button>
                </div>
              </div>

              {item.isContested && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.825rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <AlertCircle size={15} />
                  <span>Grade Disagreement Flagged: Admin will cross-reference Move-In baseline vs Move-Out photo or dispatch a Field Inspection Agent for arbitration.</span>
                </div>
              )}

              {/* Notes & Photo Attachment */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter detailed description / condition notes..."
                  value={item.notes}
                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      padding: '0.45rem 0.85rem', 
                      borderRadius: '0.5rem', 
                      background: item.photoUrl ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)', 
                      border: item.photoUrl ? '1px solid #10b981' : '1px solid var(--border-color)', 
                      color: item.photoUrl ? '#10b981' : 'var(--text-main)', 
                      fontSize: '0.8rem', 
                      fontWeight: 600, 
                      cursor: 'pointer' 
                    }}
                  >
                    <Camera size={14} /> {item.photoUrl ? 'Photo Attached ✓' : 'Attach Photo Proof'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  {item.photoUrl && (
                    <a href={item.photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <img src={item.photoUrl} alt="Inspection Proof" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
