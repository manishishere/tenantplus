import { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, RotateCcw, PenTool, Type } from 'lucide-react';

export default function DigitalSignatureModal({ agreement, onClose, onSaveSignature }) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'type'
  const [typedName, setTypedName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState('');

  // Canvas Refs & Drawing state
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#6366f1';
    }
  }, [activeTab]);

  const startDrawing = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    setError('');
    let signatureDataUrl = '';

    if (activeTab === 'draw') {
      if (!canvasRef.current) return;
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        setError('Please enter your full name to generate an e-signature stamp.');
        return;
      }
      // Generate signature DataURL from typed name
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      ctx.font = 'italic bold 32px "Brush Script MT", cursive, Georgia';
      ctx.fillStyle = '#6366f1';
      ctx.fillText(typedName.trim(), 20, 70);
      signatureDataUrl = tempCanvas.toDataURL('image/png');
    }

    setIsSigning(true);
    try {
      await onSaveSignature(signatureDataUrl);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record signature.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legal E-Sign Pad
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0 0 0' }}>
              Sign Tenancy Contract
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              {agreement?.property?.title} &bull; House Rent Act 2075
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('draw')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.35rem',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: activeTab === 'draw' ? 'var(--primary-indigo)' : 'transparent',
              color: activeTab === 'draw' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <PenTool size={16} /> Draw Signature
          </button>
          <button
            onClick={() => setActiveTab('type')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.35rem',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: activeTab === 'type' ? 'var(--primary-indigo)' : 'transparent',
              color: activeTab === 'type' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Type size={16} /> Type E-Signature
          </button>
        </div>

        {/* Draw Pad Canvas */}
        {activeTab === 'draw' ? (
          <div>
            <div style={{
              background: 'var(--bg-card)',
              border: '2px dashed var(--border-color)',
              borderRadius: '0.75rem',
              position: 'relative',
              touchAction: 'none'
            }}>
              <canvas
                ref={canvasRef}
                width={450}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ width: '100%', height: '150px', cursor: 'crosshair' }}
              />
              <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
                <button
                  type="button"
                  onClick={clearCanvas}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RotateCcw size={12} /> Clear Canvas
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'center' }}>
              Sign above using mouse or touch screen.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Type Legal Full Name:</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Manish Gautam"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
              />
            </div>
            {typedName.trim() && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signature Certificate Preview:</span>
                <div style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontSize: '1.6rem',
                  color: 'var(--primary-indigo)',
                  marginTop: '0.35rem'
                }}>
                  {typedName.trim()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legal Acknowledgment Check */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid var(--pill-border)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.4
        }}>
          🔒 By executing this digital signature, I legally bind myself to the terms & conditions of the <strong>House Rent Agreement</strong> under the <em>House Rent Act 2075 of Nepal</em>.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSigning}
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}
          >
            <CheckCircle2 size={18} />
            {isSigning ? 'Attaching Digital Signature...' : 'Confirm & Sign Agreement'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
