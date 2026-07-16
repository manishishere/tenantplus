import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PropertyCard from '../../components/Properties/PropertyCard';
import SkeletonGrid from '../../components/Properties/SkeletonGrid';
import { Search, Plus, FilterX, Building2, Trash2 } from 'lucide-react';

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
      if (!src) {
        setResolvedSrc('');
        return;
      }

      const isVid = src.toLowerCase().endsWith('.mp4') || 
                    src.toLowerCase().endsWith('.mov') || 
                    src.toLowerCase().endsWith('.webm') ||
                    src.startsWith('data:video/');
      setIsVideo(isVid);

      if (src.startsWith('/mock-media/')) {
        const file = await getLocalMedia(src);
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
        setResolvedSrc(src);
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
  const { role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Add Property States
  const [showAddModal, setShowAddModal] = useState(false);
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
      // For landlords, the backend usually filters to their own properties implicitly
      // if not, we can adjust the API or send a query param. 
      // Assuming /api/properties/ returns all available for tenants, and owned for landlords.
      const response = await api.get('/properties/');
      setProperties(response.data.results || response.data || []);
    } catch (err) {
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const list = Array.isArray(properties) ? properties : [];
    return list.filter((prop) => {
      const matchSearch = (prop.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (prop.district || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchDistrict = districtFilter ? prop.district === districtFilter : true;
      const matchRoomType = roomTypeFilter ? prop.room_type === roomTypeFilter : true;
      const matchPrice = maxPrice ? parseFloat(prop.rent_amount) <= parseFloat(maxPrice) : true;
      
      return matchSearch && matchDistrict && matchRoomType && matchPrice;
    });
  }, [properties, searchQuery, districtFilter, roomTypeFilter, maxPrice]);

  // Extract unique districts for the dropdown
  const uniqueDistricts = useMemo(() => {
    const list = Array.isArray(properties) ? properties : [];
    const districts = new Set(list.map(p => p.district).filter(Boolean));
    return Array.from(districts).sort();
  }, [properties]);

  const clearFilters = () => {
    setSearchQuery('');
    setDistrictFilter('');
    setRoomTypeFilter('');
    setMaxPrice('');
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
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
    let markerInstance = null;

    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 100);
        return;
      }

      const mapContainer = document.getElementById('map-add');
      if (!mapContainer) return;

      const initialLat = 27.7172;
      const initialLng = 85.3240;

      // Set initial values in addForm coordinates
      setAddForm(f => ({ ...f, latitude: initialLat, longitude: initialLng }));

      mapInstance = window.L.map('map-add').setView([initialLat, initialLng], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      // Create a draggable marker
      markerInstance = window.L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance);

      const updateCoords = (lat, lng) => {
        setAddForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
      };

      markerInstance.on('dragend', (e) => {
        const position = markerInstance.getLatLng();
        updateCoords(position.lat, position.lng);
      });

      mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerInstance.setLatLng([lat, lng]);
        updateCoords(lat, lng);
      });
    };

    const timer = setTimeout(initMap, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
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

      mapInstance = window.L.map('map-detail').setView([lat, lng], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      window.L.marker([lat, lng]).addTo(mapInstance);
    };

    const timer = setTimeout(initDetailMap, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
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
            onClick={() => setShowAddModal(true)} 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={20} />
            Add New Property
          </button>
        )}
      </div>

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

        <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
          <label className="form-label">District</label>
          <select className="form-input" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
            <option value="">All Districts</option>
            {uniqueDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

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

        <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
          <label className="form-label">Max Price (Rs.)</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="e.g. 15000" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        {(searchQuery || districtFilter || roomTypeFilter || maxPrice) && (
          <button 
            onClick={clearFilters}
            className="btn-primary" 
            style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)' }}
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

      {/* Add New Property Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>List New Property</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>

            {addError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Property Title *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Spacious 2 BHK Flat in Lalitpur"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  required
                />
                <small style={{ color: 'var(--text-muted)' }}>Min. 5 characters</small>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description *</label>
                <textarea 
                  className="form-input" 
                  placeholder="Describe your property (amenities, location highlights, rules, etc.)"
                  rows={3}
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
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
                  <label className="form-label">Rent Amount (Rs. / month) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 15000"
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

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Pinpoint Location on Map *</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-teal)', fontWeight: 500 }}>Drag marker or click to place</span>
                </label>
                <div id="map-add" style={{ height: '180px', width: '100%', borderRadius: '0.5rem', marginTop: '0.35rem', border: '1px solid rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Lat: {addForm.latitude}</span>
                  <span>Lng: {addForm.longitude}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
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
                <label className="form-label">Upload Property Photos & Videos</label>
                <input 
                  type="file" 
                  className="form-input" 
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAddForm({ ...addForm, mediaFiles: files });
                  }}
                />
                <small style={{ color: 'var(--text-muted)' }}>Select one or more photos or videos to showcase your property listing.</small>
                {addForm.mediaFiles && addForm.mediaFiles.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-teal)' }}>Selected files ({addForm.mediaFiles.length}):</span>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {addForm.mediaFiles.map((f, idx) => (
                        <li key={idx}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 1.5rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={addLoading}
                  style={{ padding: '0.5rem 1.5rem' }}
                >
                  {addLoading ? 'Listing Property...' : 'List Property'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {showDetailsModal && selectedProperty && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>
                  {selectedProperty.room_type?.replace('_', ' ')} &bull; {selectedProperty.furnishing_status?.replace('_', ' ')}
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>{selectedProperty.title}</h3>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>

            {/* Photo Gallery / Video Tour */}
            <div style={{ height: '260px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <PropertyMedia 
                src={selectedProperty.photos && selectedProperty.photos.length > 0 ? selectedProperty.photos[0].photo_url : ''} 
                alt={selectedProperty.title} 
              />
            </div>

            {/* Description & Specs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Rent</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-indigo)' }}>
                    Rs. {parseFloat(selectedProperty.rent_amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location / Area</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{(selectedProperty.address || '').split(' || ')[0] || selectedProperty.district}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location Map</span>
                <div id="map-detail" style={{ height: '180px', width: '100%', borderRadius: '0.5rem', marginTop: '0.35rem', border: '1px solid rgba(255,255,255,0.1)' }}></div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>About this property</span>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.8)' }}>
                  {selectedProperty.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Listed by Landlord</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>{selectedProperty.landlord_name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedProperty.landlord_email}</span>
                </div>
              </div>

            </div>

            {/* Tenant Apply Form */}
            {role === 'tenant' && selectedProperty.is_available && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Apply for Tenancy</h4>
                
                {applicationSuccess ? (
                  <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '0.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>
                    Application submitted successfully! The landlord will review your request.
                  </div>
                ) : (
                  <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {applicationError && (
                      <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
                        {applicationError}
                      </div>
                    )}
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Message to Landlord *</label>
                      <textarea 
                        className="form-input" 
                        placeholder="Introduce yourself and specify when you'd like to move in..."
                        rows={3}
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={applicationSubmitLoading}
                      style={{ width: '100%' }}
                    >
                      {applicationSubmitLoading ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: role === 'landlord' ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: '1.5rem' }}>
              {role === 'landlord' && (
                <button 
                  onClick={() => handleDeleteProperty(selectedProperty.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Trash2 size={16} />
                  Delete Listing
                </button>
              )}
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 1.5rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
