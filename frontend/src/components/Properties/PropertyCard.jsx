import { useState, useEffect } from 'react';
import { MapPin, Home as HomeIcon, Image as ImageIcon, Video as VideoIcon, ShieldCheck, Lock, Clock, XCircle } from 'lucide-react';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
];

export default function PropertyCard({ property, onClick }) {
  if (!property || typeof property !== 'object') return null;

  const [mediaSrc, setMediaSrc] = useState('');
  const [isVideo, setIsVideo] = useState(false);

  // Deterministic fallback photo based on property title / ID
  const defaultFallback = property.id 
    ? FALLBACK_IMAGES[Math.abs(property.id.toString().charCodeAt(0)) % FALLBACK_IMAGES.length]
    : FALLBACK_IMAGES[0];

  useEffect(() => {
    let objectUrl = '';
    const loadMedia = async () => {
      const rawSrc = property.first_photo || (property.photos && property.photos[0] ? property.photos[0].photo_url : '');
      const src = typeof rawSrc === 'string' ? rawSrc : (rawSrc?.photo_url || rawSrc?.url || '');
      
      if (!src) {
        setMediaSrc(defaultFallback);
        return;
      }

      const lower = src.toLowerCase();
      const isVid = lower.endsWith('.mp4') || 
                    lower.endsWith('.mov') || 
                    lower.endsWith('.webm') ||
                    lower.startsWith('data:video/');
      setIsVideo(isVid);

      if (src.startsWith('/mock-media/')) {
        try {
          const request = indexedDB.open('tenantplus_media', 1);
          request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('media')) {
              setMediaSrc(defaultFallback);
              return;
            }
            const tx = db.transaction('media', 'readonly');
            const getReq = tx.objectStore('media').get(src);
            getReq.onsuccess = () => {
              const file = getReq.result;
              if (file) {
                objectUrl = URL.createObjectURL(file);
                setMediaSrc(objectUrl);
                setIsVideo(file.type.startsWith('video/'));
              } else {
                setMediaSrc(isVid 
                  ? 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-living-room-4815-large.mp4' 
                  : defaultFallback
                );
              }
            };
          };
        } catch (err) {
          console.error(err);
          setMediaSrc(defaultFallback);
        }
      } else {
        setMediaSrc(src);
      }
    };

    loadMedia();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [property.first_photo, property.photos, property.id, defaultFallback]);

  const formatPrice = (amount) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) return 'Rs. 0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(parsed).replace('NPR', 'Rs.');
  };

  const formatRoomType = (type) => {
    const types = {
      'single': 'Single Room',
      'double': 'Double Room',
      'flat': 'Flat',
      'house': 'Full House'
    };
    return types[type] || type || 'Room';
  };

  return (
    <div 
      className="premium-card" 
      onClick={onClick}
      style={{ 
        padding: 0, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
    >
      {/* Image Placeholder Container */}
      <div style={{ 
        height: '190px', 
        background: 'linear-gradient(135deg, var(--primary-indigo), var(--primary-teal))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {mediaSrc ? (
          isVideo ? (
            <video 
              src={mediaSrc} 
              muted 
              loop 
              autoPlay 
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <img 
              src={mediaSrc} 
              alt={property.title || 'Property'} 
              onError={() => setMediaSrc(defaultFallback)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          )
        ) : (
          <img 
            src={defaultFallback} 
            alt={property.title || 'Property'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        )}

        {property.photo_count > 0 && (
          <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(0,0,0,0.65)', color: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '1rem', backdropFilter: 'blur(4px)' }}>
            {isVideo ? <VideoIcon size={12} /> : <ImageIcon size={12} />}
            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{property.photo_count} file{property.photo_count > 1 ? 's' : ''}</span>
          </div>
        )}
        
        {/* Verification Status Badge Overlay */}
        {property.verification_status === 'verified' || (!property.verification_status && property.landlord_is_verified) ? (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#ffffff',
            padding: '0.25rem 0.65rem',
            borderRadius: '1rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <ShieldCheck size={13} /> Verified Property
          </div>
        ) : property.verification_status === 'flagged' ? (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '0.25rem 0.65rem',
            borderRadius: '1rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <XCircle size={13} /> Listing Delisted
          </div>
        ) : (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            background: 'rgba(245, 158, 11, 0.95)',
            color: '#ffffff',
            padding: '0.25rem 0.65rem',
            borderRadius: '1rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <Clock size={13} /> Unverified Listing
          </div>
        )}

        {!property.is_available && (
          <span style={{ 
            position: 'absolute', 
            top: '1rem', 
            right: '1rem', 
            background: 'rgba(239, 68, 68, 0.9)', 
            color: 'white', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            Rented
          </span>
        )}
      </div>

      {/* Details Container */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-dark)' }}>{property.title || 'Untitled Property'}</h3>
          <span style={{ fontWeight: 700, color: 'var(--primary-indigo)', fontSize: '1.125rem' }}>
            {formatPrice(property.rent_amount)}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/mo</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <MapPin size={16} />
          <span>{property.district || 'Location N/A'}</span>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
          <span style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {formatRoomType(property.room_type)}
          </span>
          <span style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'capitalize'
          }}>
            {(property.furnishing_status || 'unfurnished').replace('_', ' ')}
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Lock size={12} /> Escrow Protected
          </span>
        </div>
      </div>
    </div>
  );
}
