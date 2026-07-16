import { MapPin, Home as HomeIcon, Image as ImageIcon } from 'lucide-react';

export default function PropertyCard({ property, onClick }) {
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount).replace('NPR', 'Rs.');
  };

  const formatRoomType = (type) => {
    const types = {
      'single': 'Single Room',
      'double': 'Double Room',
      'flat': 'Flat',
      'house': 'Full House'
    };
    return types[type] || type;
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
      {/* Image Placeholder */}
      <div style={{ 
        height: '180px', 
        background: 'linear-gradient(135deg, var(--primary-indigo), var(--primary-teal))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        position: 'relative'
      }}>
        {property.photo_count > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
            <ImageIcon size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{property.photo_count} Photos</span>
          </div>
        ) : (
          <HomeIcon size={48} opacity={0.5} />
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

      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-dark)' }}>{property.title}</h3>
          <span style={{ fontWeight: 700, color: 'var(--primary-indigo)', fontSize: '1.125rem' }}>
            {formatPrice(property.rent_amount)}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/mo</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <MapPin size={16} />
          <span>{property.district}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
          <span style={{ background: 'var(--bg-offwhite)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 500 }}>
            {formatRoomType(property.room_type)}
          </span>
          <span style={{ background: 'var(--bg-offwhite)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' }}>
            {property.furnishing_status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
