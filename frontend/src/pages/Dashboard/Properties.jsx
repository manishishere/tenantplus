import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PropertyCard from '../../components/Properties/PropertyCard';
import { 
  Building2, 
  PlusCircle, 
  Search, 
  Filter, 
  SlidersHorizontal,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Compass,
  ArrowUpDown,
  Maximize2,
  ShieldAlert,
  FileText,
  Lock,
  Upload
} from 'lucide-react';

export default function Properties() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [userCoords, setUserCoords] = useState(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showKycGateModal, setShowKycGateModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Application State
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applicationSubmitLoading, setApplicationSubmitLoading] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applicationError, setApplicationError] = useState(null);

  // Add Property Form State
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    district: 'Kathmandu',
    address: '',
    roomType: 'flat',
    furnishingStatus: 'unfurnished',
    rentAmount: '',
    latitude: '27.7172',
    longitude: '85.3240',
    mediaFiles: [],
    lalpurjaFile: null,
    electricityFile: null
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/properties/');
      const dataList = response.data.results || response.data || [];
      setProperties(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load property listings. Please try again.');
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

  const fileToDataUrl = (file) => {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
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
      let lalpurjaUrl = null;
      let electricityUrl = null;

      if (addForm.lalpurjaFile) {
        lalpurjaUrl = await fileToDataUrl(addForm.lalpurjaFile);
      }
      if (addForm.electricityFile) {
        electricityUrl = await fileToDataUrl(addForm.electricityFile);
      }

      // 1. Create Property with Verification Documents attached
      const response = await api.post('/properties/', {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        district: addForm.district.trim(),
        address: `${addForm.address.trim()} || ${addForm.latitude},${addForm.longitude}`,
        room_type: addForm.roomType,
        furnishing_status: addForm.furnishingStatus,
        rent_amount: rent,
        lalpurja_doc_url: lalpurjaUrl || null,
        electricity_bill_url: electricityUrl || null,
      });

      const createdProperty = response.data;

      // 2. Add Photos/Videos if provided
      if (addForm.mediaFiles && addForm.mediaFiles.length > 0) {
        for (let i = 0; i < addForm.mediaFiles.length; i++) {
          const file = addForm.mediaFiles[i];
          const mockKey = (await fileToDataUrl(file)) || `/media/properties/photo-${Date.now()}.jpg`;

          await api.post(`/properties/${createdProperty.id}/photos/`, {
            photo_url: mockKey,
            sort_order: i
          });
        }
      }

      setShowAddModal(false);
      setAddForm({
        title: '',
        description: '',
        district: 'Kathmandu',
        address: '',
        roomType: 'flat',
        furnishingStatus: 'unfurnished',
        rentAmount: '',
        latitude: '27.7172',
        longitude: '85.3240',
        mediaFiles: [],
        lalpurjaFile: null,
        electricityFile: null
      });

      await fetchProperties();
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.detail || err.response?.data?.title?.[0] || 'Failed to create property. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property listing? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/properties/${propertyId}/`);
      setShowDetailsModal(false);
      await fetchProperties();
    } catch (err) {
      console.error(err);
      alert('Failed to delete property listing.');
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (user && !user.is_verified) {
      setApplicationError('KYC Verification Required: You must complete identity verification under Settings before submitting rental applications.');
      return;
    }
    if (!selectedProperty) return;
    setApplicationSubmitLoading(true);
    setApplicationError(null);
    setApplicationSuccess(false);

    try {
      await api.post('/applications/', {
        property: selectedProperty.id,
        message: applicationMessage.trim() || 'I am interested in renting this property.'
      });
      setApplicationSuccess(true);
      setApplicationMessage('');
    } catch (err) {
      console.error(err);
      setApplicationError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to submit rental application.');
    } finally {
      setApplicationSubmitLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (user && !user.is_verified) {
      setShowKycGateModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleOpenDetails = async (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
    setApplicationSuccess(false);
    setApplicationError(null);

    try {
      const response = await api.get(`/properties/${property.id}/`);
      setSelectedProperty(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {role === 'landlord' ? 'My Property Listings' : 'Verified Rental Properties'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            {role === 'landlord' 
              ? 'Manage your rental properties, upload Lalpurja deeds, and handle tenant applications.' 
              : 'Browse verified, fraud-free rental flats & rooms across Kathmandu, Lalitpur, Bhaktapur & Nepal.'}
          </p>
        </div>

        {role === 'landlord' && (
          <button 
            onClick={handleOpenAddModal}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            <PlusCircle size={18} />
            <span>List New Property</span>
          </button>
        )}
      </div>

      {/* KYC Warning Banner - Only show to unverified Tenants/Landlords */}
      {user && role !== 'admin' && !user.is_verified && user.kyc_status !== 'pending' && (
        <div style={{ 
          background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', 
          color: '#ffffff', 
          padding: '1.15rem 1.5rem', 
          borderRadius: '0.85rem', 
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
          boxShadow: '0 8px 24px rgba(185, 28, 28, 0.35)',
          border: '1px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 300px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.55rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                <span style={{ background: '#ffffff', color: '#b91c1c', fontSize: '0.675rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  URGENT ACTION REQUIRED
                </span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800 }}>Compulsory KYC Identity Verification</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.92, lineHeight: 1.4 }}>
                {role === 'landlord' 
                  ? 'As a Landlord, you must submit your Nepalese Citizenship/Passport credentials under Settings before creating listings.' 
                  : 'As a Tenant, you must verify your identity under Settings before requesting or applying for rental properties.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings')}
            style={{ 
              fontSize: '0.85rem', 
              fontWeight: 800, 
              padding: '0.65rem 1.25rem', 
              backgroundColor: '#ffffff', 
              color: '#b91c1c',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            Complete Verification Now ↗
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Instant Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search title, district, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        <div style={{ flex: '0 1 160px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Room Type</label>
          <select 
            className="form-input" 
            value={roomTypeFilter} 
            onChange={(e) => setRoomTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="single">Single Room</option>
            <option value="double">Double Room</option>
            <option value="flat">Flat</option>
            <option value="house">Full House</option>
          </select>
        </div>

        <div style={{ flex: '0 1 160px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Max Rent (Rs.)</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="e.g. 25000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        <div style={{ flex: '0 1 160px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Sort By</label>
          <select 
            className="form-input" 
            value={sortBy} 
            onChange={handleSortChange}
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="nearest">Nearest Location</option>
          </select>
        </div>

        {(searchQuery || roomTypeFilter || maxPrice || sortBy !== 'newest') && (
          <button 
            onClick={clearFilters}
            style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', paddingBottom: '0.5rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Grid Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Building2 size={40} className="animate-spin" color="var(--primary-indigo)" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading verified property listings...</p>
        </div>
      ) : filteredProperties.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredProperties.map((prop) => (
            <PropertyCard 
              key={prop.id} 
              property={prop} 
              onSelect={handleOpenDetails} 
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>No Properties Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
            {properties.length === 0 
              ? (role === 'landlord' 
                  ? "You haven't added any properties yet. Click the 'List New Property' button above to create your first listing." 
                  : "No properties listed on the platform. Please check back later.")
              : "No properties match your current search filters. Try resetting them."}
          </p>
        </div>
      )}

      {/* Add New Property Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '920px', maxHeight: '95vh', overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--pill-border)', borderRadius: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={22} color="var(--primary-indigo)" /> List New Rental Property
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Publish your property with confidential Lalpurja land verification</span>
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

                  {/* Room Config */}
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
                </div>

                {/* Right Column: Photos & Confidential Verification Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  
                  {/* Property Photos (Shown to Tenants) */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Property Photos Showcase (Shown to Tenants) *</label>
                    <input 
                      type="file" 
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setAddForm({ ...addForm, mediaFiles: files });
                      }}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Upload high-resolution room photos (PNG, JPG).
                    </div>
                  </div>

                  {/* Confidential Property Document 1: Lalpurja Title Deed */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 800 }}>
                        <FileText size={16} /> Official Lalpurja Title Deed (जग्गाधनी प्रमाण पुर्जा) *
                      </label>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Lock size={11} /> Admin Only (Confidential Verification)
                      </span>
                    </div>

                    {/* Lalpurja Upload Guide Box */}
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(37, 99, 235, 0.06)',
                      border: '1px dashed rgba(37, 99, 235, 0.3)',
                      marginBottom: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-main)'
                    }}>
                      <div style={{ fontWeight: 800, color: '#2563eb', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileText size={15} /> How Lalpurja Title Deed Should Be Uploaded:
                      </div>
                      <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        <li><strong>Owner Name:</strong> Must match your verified Landlord profile name.</li>
                        <li><strong>Plot & Ward:</strong> Must display District, Ward No., and Kitta No. (कित्ता नं.).</li>
                        <li><strong>Government Stamp:</strong> Malpot Office (मालपोत कार्यालय) official red stamp visible.</li>
                      </ul>
                    </div>

                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setAddForm({ ...addForm, lalpurjaFile: file });
                      }}
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.825rem' }}
                      required
                    />
                  </div>

                  {/* Confidential Property Document 2: Electricity Bill */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 800 }}>
                        <FileText size={16} /> Property Electricity / NEA Bill *
                      </label>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Lock size={11} /> Admin Only (Confidential Verification)
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Upload recent NEA (Nepal Electricity Authority) or Khanepani water bill showing property location address.
                    </div>

                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setAddForm({ ...addForm, electricityFile: file });
                      }}
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.825rem' }}
                      required
                    />
                  </div>

                </div>

              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={addLoading}
                  style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem' }}
                >
                  {addLoading ? 'Creating Property Listing...' : 'Publish Property Listing ↗'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Property Details & Application Modal */}
      {showDetailsModal && selectedProperty && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--pill-border)', borderRadius: '1.25rem' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--primary-indigo)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedProperty.room_type} • {selectedProperty.furnishing_status}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0 0', color: 'var(--text-main)' }}>
                  {selectedProperty.title}
                </h2>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
              
              {/* Left Column: Media & Price Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ height: '170px', borderRadius: '0.65rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img 
                    src={selectedProperty.photos && selectedProperty.photos.length > 0 ? selectedProperty.photos[0].photo_url : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'} 
                    alt={selectedProperty.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Location</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{(selectedProperty.address || '').split(' || ')[0] || selectedProperty.district}</div>
                  </div>
                </div>
              </div>

              {/* Right Column: About, Contact & Apply */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>About Property</span>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.45, margin: '0.2rem 0 0 0', color: 'var(--text-main)', maxHeight: '70px', overflowY: 'auto' }}>
                    {selectedProperty.description || 'No description provided.'}
                  </p>
                </div>

                {/* Landlord Contact */}
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

                {/* Tenant Apply */}
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
            <ShieldAlert size={52} color="#b91c1c" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Compulsory KYC Required</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              To maintain platform trust and eliminate fake listings, all Landlords must complete identity and citizenship verification before creating property listings.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowKycGateModal(false)}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowKycGateModal(false);
                  navigate('/dashboard/settings');
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '0.65rem', backgroundColor: '#b91c1c' }}
              >
                Go to Settings ↗
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
