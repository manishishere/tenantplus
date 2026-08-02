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
  Package
} from 'lucide-react';

export default function InspectionChecklist() {
  const { role } = useAuth();
  const [inspectionType, setInspectionType] = useState('move_in'); // 'move_in' or 'move_out'
  const [items, setItems] = useState([
    { id: 1, category: 'Walls & Paint', status: 'good', notes: 'Freshly painted, no cracks or water stains.', photoUrl: null },
    { id: 2, category: 'Plumbing & Taps', status: 'good', notes: 'Water flow normal, bathroom taps leak-free.', photoUrl: null },
    { id: 3, category: 'Electrical & Switches', status: 'good', notes: 'All light switches and sockets working.', photoUrl: null },
    { id: 4, category: 'Doors & Window Locks', status: 'fair', notes: 'Main door lock functional; bedroom window latch stiff.', photoUrl: null },
    { id: 5, category: 'Flooring & Tiles', status: 'good', notes: 'Clean tiles, no broken pieces.', photoUrl: null }
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSaveChecklist = () => {
    setErrorMsg('');
    // Check compulsory photo upload rule for damaged items
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
          <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Move-In / Move-Out Condition Inspection</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Timestamped digital condition reports to protect security deposits and prevent damage disputes.
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
            border: inspectionType === 'move_in' ? '2px solid var(--primary-indigo)' : '1px solid var(--border-color)',
            background: inspectionType === 'move_in' ? 'var(--pill-bg)' : 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Key size={26} color="var(--primary-indigo)" style={{ marginBottom: '0.4rem' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Move-In Inspection (Day 1)</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Log property state before tenancy begins</p>
        </button>

        <button
          onClick={() => setInspectionType('move_out')}
          className="premium-card"
          style={{
            flex: 1,
            padding: '1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: inspectionType === 'move_out' ? '2px solid var(--primary-indigo)' : '1px solid var(--border-color)',
            background: inspectionType === 'move_out' ? 'var(--pill-bg)' : 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Package size={26} color="var(--primary-indigo)" style={{ marginBottom: '0.4rem' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Move-Out Inspection (End Date)</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compare condition for deposit refund calculations</p>
        </button>
      </div>

      {/* Inspection Items List */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Property Areas Checklist</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5 Core Inspection Zones</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{
              background: 'var(--bg-input)',
              border: item.status === 'damaged' && !item.photoUrl ? '1.5px solid #ef4444' : '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {item.category}
                </div>
                
                {/* Status Radio Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleStatusChange(item.id, 'good')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'good' ? '1px solid #10b981' : '1px solid var(--border-color)',
                      background: item.status === 'good' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: item.status === 'good' ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <CheckCircle2 size={13} /> Good
                  </button>

                  <button
                    onClick={() => handleStatusChange(item.id, 'fair')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'fair' ? '1px solid #d97706' : '1px solid var(--border-color)',
                      background: item.status === 'fair' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: item.status === 'fair' ? '#d97706' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <AlertTriangle size={13} /> Fair
                  </button>

                  <button
                    onClick={() => handleStatusChange(item.id, 'damaged')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: item.status === 'damaged' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: item.status === 'damaged' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: item.status === 'damaged' ? '#ef4444' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <XCircle size={13} /> Damaged
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <input
                type="text"
                className="form-input"
                placeholder="Add condition notes or scratch location details..."
                value={item.notes}
                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                style={{ fontSize: '0.875rem' }}
              />

              {/* Photo Proof Attachment Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.35rem' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.5rem',
                  background: item.status === 'damaged' && !item.photoUrl ? 'rgba(239, 68, 68, 0.15)' : 'var(--pill-bg)',
                  border: item.status === 'damaged' && !item.photoUrl ? '1px solid #ef4444' : '1px solid var(--pill-border)',
                  color: item.status === 'damaged' && !item.photoUrl ? '#ef4444' : 'var(--primary-indigo)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  <Camera size={15} />
                  {item.photoUrl ? 'Change Photo Proof' : item.status === 'damaged' ? '📷 Upload Photo Proof (Compulsory)' : '📷 Upload Photo Proof (Optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])}
                  />
                </label>

                {item.photoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={item.photoUrl}
                      alt="Inspection Proof"
                      style={{ width: '40px', height: '40px', borderRadius: '0.35rem', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                    <span style={{ fontSize: '0.775rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Photo Attached
                    </span>
                  </div>
                ) : item.status === 'damaged' ? (
                  <span style={{ fontSize: '0.775rem', color: '#ef4444', fontWeight: 700 }}>
                    ⚠️ Photo proof required for damaged items
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
