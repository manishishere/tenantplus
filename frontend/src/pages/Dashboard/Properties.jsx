import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PropertyCard from '../../components/Properties/PropertyCard';
import SkeletonGrid from '../../components/Properties/SkeletonGrid';
import { Search, Plus, PlusCircle, FilterX, Building2, Trash2, ShieldAlert, ShieldCheck, Phone, Mail } from 'lucide-react';

// IndexedDB helper for local files persistence
const initAssetDB = () => {
  return new Promise((resolve) => {
    const request = indexedDB.open('tenantplus_media', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => resolve(null);
  });
};

const storeLocalMedia = async (key, file) => {
  try {
    const db = await initAssetDB();
    if (!db) return;
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').put(file, key);
  } catch (err) {
    console.error('Failed to store local media in DB:', err);
  }
};

const getLocalMedia = async (key) => {
  try {
    const db = await initAssetDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction('media', 'readonly');
      const req = tx.objectStore('media').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to retrieve local media:', err);
    return null;
  }
};

function PropertyMedia({ src, alt, style }) {
  const [resolvedSrc, setResolvedSrc] = useState('');
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    const loadMedia = async () => {
      const mediaUrl = typeof src === 'string' ? src : (src?.photo_url || src?.url || '');
      if (!mediaUrl) {
        setResolvedSrc('');
        return;
      }

      const lower = mediaUrl.toLowerCase();
      const isVid = lower.endsWith('.mp4') || 
                    lower.endsWith('.mov') || 
                    lower.endsWith('.webm') ||
                    lower.startsWith('data:video/');
      setIsVideo(isVid);

      if (mediaUrl.startsWith('/mock-media/')) {
        const file = await getLocalMedia(mediaUrl);
        if (file) {
          objectUrl = URL.createObjectURL(file);
          setResolvedSrc(objectUrl);
          setIsVideo(file.type.startsWith('video/'));
          return;
        }
        // Fallback
        if (isVid) {
          setResolvedSrc('https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-living-room-4815-large.mp4');
        } else {
          setResolvedSrc('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80');
        }
      } else {
        setResolvedSrc(mediaUrl);
      }
    };

    loadMedia();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!resolvedSrc) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary-indigo), var(--primary-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', ...style }}>
        <Building2 size={40} opacity={0.5} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <video 
        src={resolvedSrc} 
        controls 
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} 
      />
    );
  }

  return (
    <img 
      src={resolvedSrc} 
      alt={alt || 'Property media'} 
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} 
    />
  );
}

export default function Properties() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [userCoords, setUserCoords] = useState(null);

  // Add Property & KYC Gate States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKycGateModal, setShowKycGateModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    district: '',
    address: '',
    roomType: 'single',
    furnishingStatus: 'unfurnished',
    rentAmount: '',
    mediaFiles: [], // Array of selected File objects (photos and videos)
    latitude: 27.7172,
    longitude: 85.3240
  });

  // Property Details & Application States
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applicationSubmitLoading, setApplicationSubmitLoading] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applicationError, setApplicationError] = useState(null);

  useEffect(() => {
    fetchProperties();

    // Dynamically load Leaflet CDN CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically load Leaflet CDN JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/properties/');
      const rawData = response.data?.results || response.data;
      setProperties(Array.isArray(rawData) ? rawData : []);
    } catch (err) {
      console.error('fetchProperties error:', err);
      setError('Failed to load properties. Please try again later.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    if (val === 'nearest' && !userCoords) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserCoords(pos.coords),
          () => console.log('Location permission denied, using district fallback')
        );
      }
    }
  };

  const filteredProperties = useMemo(() => {
    const list = Array.isArray(properties) ? properties : [];
    let result = list.filter((prop) => {
      if (!prop || typeof prop !== 'object') return false;
      const matchSearch = (prop.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (prop.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (prop.address || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRoomType = roomTypeFilter ? prop.room_type === roomTypeFilter : true;
      const matchPrice = maxPrice ? (parseFloat(prop.rent_amount) || 0) <= parseFloat(maxPrice) : true;
      
      return matchSearch && matchRoomType && matchPrice;
    });

    return result.sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === 'price_low') return (parseFloat(a.rent_amount) || 0) - (parseFloat(b.rent_amount) || 0);
      if (sortBy === 'price_high') return (parseFloat(b.rent_amount) || 0) - (parseFloat(a.rent_amount) || 0);
      if (sortBy === 'nearest') return (a.district || '').localeCompare(b.district || '');
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [properties, searchQuery, roomTypeFilter, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('newest');
    setRoomTypeFilter('');
    setMaxPrice('');
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (user && !user.is_verified) {
      setAddError('KYC Verification Required: You must complete identity verification under Settings before creating property listings.');
      return;
    }
    if (addLoading) return;
    setAddError(null);

    if (addForm.title.trim().length < 5) {
      setAddError('Title must be at least 5 characters long.');
      return;
    }

    const rent = parseFloat(addForm.rentAmount);
    if (isNaN(rent) || rent <= 0) {
      setAddError('Rent amount must be greater than zero.');
      return;
    }

    setAddLoading(true);
    try {
      // 1. Create Property
      const response = await api.post('/properties/', {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        district: addForm.district.trim(),
        address: `${addForm.address.trim()} || ${addForm.latitude},${addForm.longitude}`,
        room_type: addForm.roomType,
        furnishing_status: addForm.furnishingStatus,
        rent_amount: rent
      });

      const createdProperty = response.data;

      // 2. Add Photos/Videos if provided
      if (addForm.mediaFiles && addForm.mediaFiles.length > 0) {
        for (let i = 0; i < addForm.mediaFiles.length; i++) {
          const file = addForm.mediaFiles[i];
          const mockKey = `/mock-media/${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
          
          // Store actual blob in local IndexedDB
          await storeLocalMedia(mockKey, file);

          // Register in Django database
          try {
            await api.post(`/properties/${createdProperty.id}/photos/`, {
              photo_url: mockKey,
              sort_order: i
            });
          } catch (photoErr) {
            console.error('Failed to attach property photo record:', photoErr);
          }
        }
      }

      setShowAddModal(false);
      setAddForm({
        title: '',
        description: '',
        district: '',
        address: '',
        roomType: 'single',
        furnishingStatus: 'unfurnished',
        rentAmount: '',
        mediaFiles: [],
        latitude: 27.7172,
        longitude: 85.3240
      });

      await fetchProperties();
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.detail || err.response?.data?.title?.[0] || err.response?.data?.rent_amount?.[0] || 'Failed to list property.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleViewDetails = async (propertyId) => {
    setDetailsLoading(true);
    setApplicationSuccess(false);
    setApplicationError(null);
    setApplicationMessage('');
    try {
      const res = await api.get(`/properties/${propertyId}/`);
      setSelectedProperty(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load property details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (user && !user.is_verified) {
      setApplicationError('KYC Verification Required: You must complete identity verification under Settings before submitting rental applications.');
      return;
    }
    if (applicationSubmitLoading) return;
    setApplicationError(null);
    setApplicationSuccess(false);

    if (!applicationMessage.trim()) {
      setApplicationError('Please enter a message for the landlord.');
      return;
    }

    setApplicationSubmitLoading(true);
    try {
      await api.post('/applications/', {
        property: selectedProperty.id,
        message: applicationMessage.trim()
      });
      setApplicationSuccess(true);
      setApplicationMessage('');
    } catch (err) {
      console.error(err);
      setApplicationError(err.response?.data?.detail || 'Failed to submit application.');
    } finally {
      setApplicationSubmitLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm("Are you sure you want to permanently delete this property listing? This action cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/properties/${propertyId}/`);
      setShowDetailsModal(false);
      setSelectedProperty(null);
      await fetchProperties();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete property listing.');
    }
  };

  // Initialize Leaflet map in Add Property Modal
  useEffect(() => {
    if (!showAddModal) return;

    let mapInstance = null;

    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 100);
        return;
      }

      const mapContainer = document.getElementById('map-add');
      if (!mapContainer) return;

      try {
        if (mapContainer._leaflet_id) {
          mapContainer._leaflet_id = null;
          mapContainer.innerHTML = '';
        }

        const initialLat = 27.7172;
        const initialLng = 85.3240;

        mapInstance = window.L.map(mapContainer).setView([initialLat, initialLng], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Create a draggable marker
        const markerInstance = window.L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance);

        const updateCoords = (lat, lng) => {
          setAddForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
        };

        markerInstance.on('dragend', () => {
          const position = markerInstance.getLatLng();
          updateCoords(position.lat, position.lng);
        });

        mapInstance.on('click', (e) => {
          const { lat, lng } = e.latlng;
          markerInstance.setLatLng([lat, lng]);
          updateCoords(lat, lng);
        });
      } catch (err) {
        console.error('Add Property Map init error:', err);
      }
    };

    const timer = setTimeout(initMap, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {}
      }
    };
  }, [showAddModal]);

  // Initialize Leaflet map in Property Details Modal
  useEffect(() => {
    if (!showDetailsModal || !selectedProperty) return;

    let mapInstance = null;

    const initDetailMap = () => {
      if (!window.L) {
        setTimeout(initDetailMap, 100);
        return;
      }

      const mapContainer = document.getElementById('map-detail');
      if (!mapContainer) return;

      try {
        if (mapContainer._leaflet_id) {
          mapContainer._leaflet_id = null;
          mapContainer.innerHTML = '';
        }

        const [_, coordsStr] = (selectedProperty.address || '').split(' || ');
        let lat = 27.7172;
        let lng = 85.3240;
        if (coordsStr) {
          const [cLat, cLng] = coordsStr.split(',').map(Number);
          if (!isNaN(cLat) && !isNaN(cLng)) {
            lat = cLat;
            lng = cLng;
          }
        }

        mapInstance = window.L.map(mapContainer).setView([lat, lng], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        window.L.marker([lat, lng]).addTo(mapInstance);
      } catch (err) {
        console.error('Detail map init error:', err);
      }
    };

    const timer = setTimeout(initDetailMap, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {}
      }
    };
  }, [showDetailsModal, selectedProperty]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Properties</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {role === 'landlord' ? 'Manage your property listings' : 'Discover your next home'}
          </p>
        </div>

        {role === 'landlord' && (
          <button 
            onClick={() => {
              if (user && !user.is_verified) {
                setShowKycGateModal(true);
              } else {
                setShowAddModal(true);
              }
            }} 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={20} />
            Add New Property
          </button>
        )}
      </div>

      {/* COMPULSORY KYC STATUS BANNER */}
      {user && !user.is_verified && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={22} color="#f59e0b" />
            <div>
              <strong>Compulsory KYC Verification Required:</strong>{' '}
              {role === 'landlord' 
                ? 'As a Landlord, you must verify your citizenship/passport under Settings before creating property listings or performing landlord services.' 
                : 'As a Tenant, you must verify your identity under Settings before requesting or applying for rental properties.'}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', backgroundColor: '#f59e0b' }}
          >
            Complete Verification Now
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Filters Section (Mainly for Tenants, but Landlords with many properties could use it too) */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
          <label className="form-label">Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder="Search by title or area..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Sort By Dropdown */}
        <div className="form-group" style={{ margin: 0, flex: '1 1 170px' }}>
          <label className="form-label">Sort By</label>
          <select className="form-input" value={sortBy} onChange={handleSortChange}>
            <option value="newest">Newest First</option>
            <option value="nearest">📍 Nearest to Me (GPS)</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {/* Room Type */}
        <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
          <label className="form-label">Room Type</label>
          <select className="form-input" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="single">Single Room</option>
            <option value="double">Double Room</option>
            <option value="flat">Flat</option>
            <option value="house">Full House</option>
          </select>
        </div>

        {/* Max Price Range Slider */}
        <div className="form-group" style={{ margin: 0, flex: '1 1 210px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Max Price</label>
            <span style={{ fontSize: '0.775rem', fontWeight: 800, color: 'var(--primary-indigo)' }}>
              {maxPrice ? `Rs. ${parseFloat(maxPrice).toLocaleString()}` : 'Any Price'}
            </span>
          </div>
          <input 
            type="range" 
            min="3000" 
            max="100000" 
            step="1000"
            style={{ width: '100%', accentColor: 'var(--primary-indigo)', cursor: 'pointer' }} 
            value={maxPrice || 100000}
            onChange={(e) => setMaxPrice(e.target.value == 100000 ? '' : e.target.value)}
          />
        </div>

        {(searchQuery || sortBy !== 'newest' || roomTypeFilter || maxPrice) && (
          <button 
            onClick={clearFilters}
            className="btn-primary" 
            style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none', border: '1px solid var(--border-color)' }}
            aria-label="Clear filters"
          >
            <FilterX size={20} />
          </button>
        )}
      </div>

      {/* Content Section */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : filteredProperties.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredProperties.map(property => (
            <PropertyCard key={property.id} property={property} onClick={() => handleViewDetails(property.id)} />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>No Properties Available</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto' }}>
            {properties.length === 0 
              ? (role === 'landlord' 
                  ? "You haven't added any properties yet. Click the 'Add New Property' button above to create your first listing." 
                  : "To be completely honest, there are currently no properties listed on the platform. Please check back later or ask your landlord to create a listing.")
              : "No properties match your current search filters. Try resetting them."}
          </p>
        </div>
      )}

      {/* Add New Property Modal - Single Viewport 2-Column Wide Grid */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '920px', maxHeight: '95vh', overflow: 'hidden', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--pill-border)', borderRadius: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={22} color="var(--primary-indigo)" /> List New Rental Property
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Publish your property to verified tenants across Nepal</span>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>

            {addError && (
              <div style={{ padding: '0.6rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Left Column: Basic Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Property Title *</span>
                      <small style={{ color: 'var(--text-muted)' }}>Min. 5 chars</small>
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Spacious 2 BHK Flat in Jhamsikhel"
                      value={addForm.title}
                      onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Property Description *</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Describe amenities, location highlights, rules, balcony view, etc."
                      rows={3}
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      style={{ resize: 'none' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.85rem' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">District *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Lalitpur"
                        value={addForm.district}
                        onChange={(e) => setAddForm({ ...addForm, district: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Monthly Rent (Rs.) *</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="e.g. 18000"
                        value={addForm.rentAmount}
                        onChange={(e) => setAddForm({ ...addForm, rentAmount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Detailed Address *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Jhamsikhel, Ward 3, House 42"
                      value={addForm.address}
                      onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Right Column: Room Config, Photos & Map */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  
                  <div style={{ display: 'flex', gap: '0.85rem' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Room Type</label>
                      <select 
                        className="form-input"
                        value={addForm.roomType}
                        onChange={(e) => setAddForm({ ...addForm, roomType: e.target.value })}
                      >
                        <option value="single">Single Room</option>
                        <option value="double">Double Room</option>
                        <option value="flat">Flat</option>
                        <option value="house">Full House</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Furnishing Status</label>
                      <select 
                        className="form-input"
                        value={addForm.furnishingStatus}
                        onChange={(e) => setAddForm({ ...addForm, furnishingStatus: e.target.value })}
                      >
                        <option value="unfurnished">Unfurnished</option>
                        <option value="semi_furnished">Semi Furnished</option>
                        <option value="furnished">Furnished</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Photos & Video Showcase</span>
                      {addForm.mediaFiles && addForm.mediaFiles.length > 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-teal)', fontWeight: 600 }}>{addForm.mediaFiles.length} file(s) attached</span>
                      )}
                    </label>
                    <input 
                      type="file" 
                      className="form-input" 
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAddForm({ ...addForm, mediaFiles: files });
                      }}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Pinpoint Location Map *</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary-teal)', fontWeight: 500 }}>Click or drag marker</span>
                    </label>
                    <div id="map-add" style={{ height: '140px', width: '100%', borderRadius: '0.65rem', marginTop: '0.2rem', border: '1px solid var(--border-color)' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>Lat: {addForm.latitude}</span>
                      <span>Lng: {addForm.longitude}</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.55rem 1.5rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={addLoading}
                  style={{ padding: '0.55rem 2rem', fontWeight: 600 }}
                >
                  {addLoading ? 'Listing Property...' : '✨ Publish Property Listing'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Property Details Modal - Single Viewport 2-Column Layout */}
      {showDetailsModal && selectedProperty && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '920px', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>
                  {selectedProperty.room_type?.replace('_', ' ')} &bull; {selectedProperty.furnishing_status?.replace('_', ' ')}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: 'var(--text-main)' }}>{selectedProperty.title}</h3>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>

            {/* 2-Column Main Content Body (Single Screen View) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
              
              {/* Left Column: Media Gallery, Map & Rent Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ height: '170px', borderRadius: '0.65rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <PropertyMedia 
                    src={selectedProperty.photos && selectedProperty.photos.length > 0 ? selectedProperty.photos[0].photo_url : ''} 
                    alt={selectedProperty.title} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monthly Rent</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-indigo)' }}>
                      Rs. {parseFloat(selectedProperty.rent_amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location / Area</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{(selectedProperty.address || '').split(' || ')[0] || selectedProperty.district}</div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>GPS Location Map</span>
                  <div id="map-detail" style={{ height: '140px', width: '100%', borderRadius: '0.65rem', marginTop: '0.25rem', border: '1px solid var(--border-color)' }}></div>
                </div>
              </div>

              {/* Right Column: About, Landlord Contact & Apply Form */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                
                {/* About Section */}
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>About Property</span>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.45, margin: '0.2rem 0 0 0', color: 'var(--text-main)', maxHeight: '60px', overflowY: 'auto' }}>
                    {selectedProperty.description || 'No description provided.'}
                  </p>
                </div>

                {/* Landlord Contact Card */}
                <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Landlord Contact</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {selectedProperty.landlord_name}
                        {selectedProperty.landlord_is_verified && (
                          <span className="badge-verified" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                            <ShieldCheck size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Mail size={12} /> {selectedProperty.landlord_email}
                      </div>
                    </div>
                    <div style={{
                      background: 'var(--pill-bg)',
                      color: 'var(--primary-indigo)',
                      border: '1px solid var(--pill-border)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.5rem',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <Phone size={13} color="var(--primary-indigo)" /> {selectedProperty.landlord_phone || '+977 9801234567'}
                    </div>
                  </div>
                </div>

                {/* Tenant Apply Form */}
                {role === 'tenant' && selectedProperty.is_available && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>Apply for Tenancy</strong>
                    
                    {applicationSuccess ? (
                      <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: '0.5rem', fontSize: '0.825rem', textAlign: 'center', fontWeight: 700 }}>
                        ✅ Application submitted successfully! Landlord will review your request.
                      </div>
                    ) : (
                      <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {applicationError && (
                          <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.35rem', fontSize: '0.8rem' }}>
                            {applicationError}
                          </div>
                        )}
                        
                        <textarea 
                          className="form-input" 
                          placeholder="Introduce yourself & specify move-in date..."
                          rows={2}
                          value={applicationMessage}
                          onChange={(e) => setApplicationMessage(e.target.value)}
                          style={{ fontSize: '0.825rem', padding: '0.5rem' }}
                          required
                        />

                        <button 
                          type="submit" 
                          className="btn-primary" 
                          disabled={applicationSubmitLoading}
                          style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                        >
                          {applicationSubmitLoading ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: role === 'landlord' ? 'space-between' : 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
                  {role === 'landlord' && (
                    <button 
                      onClick={() => handleDeleteProperty(selectedProperty.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', padding: '0.4rem 0.85rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} /> Delete Listing
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.4rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Close Window
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* COMPULSORY KYC GATE MODAL */}
      {showKycGateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem', textAlign: 'center' }}>
            <ShieldAlert size={52} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Compulsory KYC Required</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              To maintain platform trust and eliminate fake listings, all Landlords must complete identity and citizenship verification before creating property listings or performing landlord services.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowKycGateModal(false); navigate('/dashboard/settings'); }}
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.9rem', backgroundColor: '#f59e0b' }}
              >
                Go to Settings & Verify Now
              </button>
              <button
                onClick={() => setShowKycGateModal(false)}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
