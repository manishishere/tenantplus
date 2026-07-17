export default function SkeletonGrid({ count = 6 }) {
  const skeletons = Array.from({ length: count });

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
      gap: '1.5rem',
      marginTop: '1.5rem'
    }}>
      {skeletons.map((_, i) => (
        <div key={i} className="premium-card skeleton-pulse" style={{ padding: 0, height: '350px', display: 'flex', flexDirection: 'column' }}>
          <div className="skeleton-box" style={{ height: '180px', borderRadius: '1rem 1rem 0 0' }}></div>
          <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-box" style={{ height: '24px', width: '60%' }}></div>
              <div className="skeleton-box" style={{ height: '24px', width: '30%' }}></div>
            </div>
            <div className="skeleton-box" style={{ height: '16px', width: '40%' }}></div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <div className="skeleton-box" style={{ height: '24px', width: '80px', borderRadius: '1rem' }}></div>
              <div className="skeleton-box" style={{ height: '24px', width: '100px', borderRadius: '1rem' }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
