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
  Upload,
  EyeOff,
  Eye
} from 'lucide-react';

// Nepal administrative divisions (Province → District → Municipalities)
const NEPAL_DIVISIONS = {
  'Bagmati Province': {
    'Kathmandu': ['Kathmandu Metropolitan City', 'Kageshwari Manohara Municipality', 'Kirtipur Municipality', 'Gokarneshwar Municipality', 'Chandragiri Municipality', 'Tokha Municipality', 'Tarakeshwar Municipality', 'Dakshinkali Municipality', 'Nagarjun Municipality', 'Budhanilkantha Municipality', 'Shankharapur Municipality'],
    'Lalitpur': ['Lalitpur Metropolitan City', 'Godawari Municipality', 'Mahalaxmi Municipality'],
    'Bhaktapur': ['Bhaktapur Municipality', 'Madhyapur Thimi Municipality', 'Suryabinayak Municipality', 'Changunarayan Municipality'],
    'Chitwan': ['Bharatpur Metropolitan City', 'Ratnanagar Municipality', 'Khairahani Municipality'],
    'Makwanpur': ['Hetauda Sub-Metropolitan City', 'Thaha Municipality'],
    'Kavrepalanchok': ['Dhulikhel Municipality', 'Banepa Municipality', 'Panauti Municipality'],
    'Nuwakot': ['Bidur Municipality', 'Belkotgadhi Municipality'],
    'Dhading': ['Nilkantha Municipality', 'Dhunibesi Municipality'],
  },
  'Koshi Province': {
    'Morang': ['Biratnagar Metropolitan City', 'Sundarharaicha Municipality', 'Belbari Municipality'],
    'Sunsari': ['Dharan Sub-Metropolitan City', 'Itahari Sub-Metropolitan City'],
    'Jhapa': ['Birtamode Municipality', 'Damak Municipality', 'Mechinagar Municipality'],
    'Ilam': ['Ilam Municipality', 'Suryodaya Municipality'],
  },
  'Madhesh Province': {
    'Dhanusha': ['Janakpurdham Sub-Metropolitan City', 'Mithila Municipality'],
    'Parsa': ['Birgunj Metropolitan City', 'Pokhariya Municipality'],
    'Bara': ['Kalaiya Sub-Metropolitan City', 'Jitpursimara Sub-Metropolitan City'],
  },
  'Gandaki Province': {
    'Kaski': ['Pokhara Metropolitan City', 'Annapurna Rural Municipality'],
    'Tanahun': ['Vyas Municipality', 'Shuklagandaki Municipality'],
    'Gorkha': ['Gorkha Municipality', 'Palungtar Municipality'],
  },
  'Lumbini Province': {
    'Rupandehi': ['Butwal Sub-Metropolitan City', 'Siddharthanagar Municipality', 'Tilottama Municipality'],
    'Banke': ['Nepalgunj Sub-Metropolitan City', 'Kohalpur Municipality'],
    'Dang': ['Ghorahi Sub-Metropolitan City', 'Tulsipur Sub-Metropolitan City'],
  },
  'Karnali Province': {
    'Surkhet': ['Birendranagar Municipality', 'Gurbhakot Municipality'],
    'Dailekh': ['Narayan Municipality', 'Dullu Municipality'],
  },
  'Sudurpashchim Province': {
    'Kanchanpur': ['Mahendranagar Municipality', 'Punarbas Municipality'],
    'Kailali': ['Dhangadhi Sub-Metropolitan City', 'Tikapur Municipality'],
  },
};

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

  // Confidential Document & Admin Moderation Modal State
  const [docPreviewModal, setDocPreviewModal] = useState(null);
  const [showAdminDelistModal, setShowAdminDelistModal] = useState(false);
  const [adminDelistReason, setAdminDelistReason] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Application State
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applicationSubmitLoading, setApplicationSubmitLoading] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applicationError, setApplicationError] = useState(null);

  // Add Property Form State
  const EMPTY_FORM = {
    title: '',
    description: '',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
    ward_no: '',
    tole: '',
    landmark: '',
    roomType: 'flat',
    furnishingStatus: 'unfurnished',
    rentAmount: '',
    mediaFiles: [],
    lalpurjaFile: null,
    electricityFile: null
  };
  const [addForm, setAddForm] = useState(EMPTY_FORM);
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
        province: addForm.province,
        district: addForm.district,
        municipality: addForm.municipality,
        ward_no: addForm.ward_no.trim(),
        tole: addForm.tole.trim(),
        landmark: addForm.landmark.trim(),
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
      setAddForm(EMPTY_FORM);

      await fetchProperties();
    } catch (err) {
      console.error(err);
      let errMsg = 'Failed to create property. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          const details = Object.entries(err.response.data).map(
            ([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
          );
          if (details.length > 0) errMsg = details.join(' | ');
        }
      }
      setAddError(errMsg);
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
      setSelectedProperty(null);
      await fetchProperties();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to delete property listing.';
      alert(`Deletion Failed: ${msg}`);
    }
  };

  const handleAdminVerifyProperty = async (propertyId) => {
    try {
      setAdminActionLoading(true);
      const res = await api.post(`/properties/${propertyId}/admin-moderate/`, { action: 'verify' });
      alert(res.data?.detail || 'Property listing verified successfully!');
      const updated = await api.get(`/properties/${propertyId}/`);
      setSelectedProperty(updated.data);
      await fetchProperties();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to verify property.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminDelistProperty = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    try {
      setAdminActionLoading(true);
      const res = await api.post(`/properties/${selectedProperty.id}/admin-moderate/`, { 
        action: 'delist', 
        reason: adminDelistReason.trim() 
      });
      alert(res.data?.detail || 'Property listing delisted.');
      setShowAdminDelistModal(false);
      setAdminDelistReason('');
      const updated = await api.get(`/properties/${selectedProperty.id}/`);
      setSelectedProperty(updated.data);
      await fetchProperties();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delist property.');
    } finally {
      setAdminActionLoading(false);
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
              onClick={() => handleOpenDetails(prop)} 
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

                  {/* Nepal Structured Address */}
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.65rem', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={13} /> Property Location
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Province *</label>
                        <select
                          className="form-input"
                          value={addForm.province}
                          onChange={(e) => {
                            const districts = Object.keys(NEPAL_DIVISIONS[e.target.value] || {});
                            const firstDistrict = districts[0] || '';
                            const municipalities = (NEPAL_DIVISIONS[e.target.value] || {})[firstDistrict] || [];
                            setAddForm({ ...addForm, province: e.target.value, district: firstDistrict, municipality: municipalities[0] || '' });
                          }}
                          required
                        >
                          {Object.keys(NEPAL_DIVISIONS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>District *</label>
                        <select
                          className="form-input"
                          value={addForm.district}
                          onChange={(e) => {
                            const municipalities = (NEPAL_DIVISIONS[addForm.province] || {})[e.target.value] || [];
                            setAddForm({ ...addForm, district: e.target.value, municipality: municipalities[0] || '' });
                          }}
                          required
                        >
                          {Object.keys(NEPAL_DIVISIONS[addForm.province] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Municipality / VDC *</label>
                      <select
                        className="form-input"
                        value={addForm.municipality}
                        onChange={(e) => setAddForm({ ...addForm, municipality: e.target.value })}
                        required
                      >
                        {((NEPAL_DIVISIONS[addForm.province] || {})[addForm.district] || []).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Ward No. *</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="e.g. 10"
                          min="1" max="33"
                          value={addForm.ward_no}
                          onChange={(e) => setAddForm({ ...addForm, ward_no: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Tole / Locality</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Baneshwor, Thamel, Jhamsikhel"
                          value={addForm.tole}
                          onChange={(e) => setAddForm({ ...addForm, tole: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <EyeOff size={12} color="#ef4444" /> Landmark <span style={{ color: '#ef4444' }}>(Private — revealed to tenant only after agreement)</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Near St. Xavier's College, Blue Gate House"
                        value={addForm.landmark}
                        onChange={(e) => setAddForm({ ...addForm, landmark: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Monthly Rent */}
                  <div className="form-group" style={{ margin: 0 }}>
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
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <MapPin size={13} color="var(--primary-indigo)" />
                      {selectedProperty.display_address || selectedProperty.fuzzy_address || selectedProperty.district}
                      {selectedProperty.address_is_full === false && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', fontWeight: 600 }}>
                          <Lock size={10} /> Full address after acceptance
                        </span>
                      )}
                      {selectedProperty.address_is_full === true && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', fontWeight: 600 }}>
                          <Eye size={10} /> Full address
                        </span>
                      )}
                    </div>
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

                {/* Delisting Reason Alert */}
                {selectedProperty.rejection_reason && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.65rem', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}>
                    <strong>Delisting Reason:</strong> {selectedProperty.rejection_reason}
                  </div>
                )}

                {/* CONFIDENTIAL VERIFICATION DOCUMENTS (ADMIN & LANDLORD OWNER ONLY) */}
                {(role === 'admin' || (role === 'landlord' && user?.id === selectedProperty.landlord)) && (
                  <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Lock size={12} /> Verification Proof Documents (Admin Audited)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {selectedProperty.lalpurja_doc_url ? (
                        <button
                          type="button"
                          onClick={() => setDocPreviewModal({ title: 'House Deed / Lalpurja', url: selectedProperty.lalpurja_doc_url, propertyTitle: selectedProperty.title })}
                          style={{ padding: '0.45rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.35rem', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer' }}
                        >
                          <FileText size={13} /> View Lalpurja <Eye size={11} />
                        </button>
                      ) : (
                        <div style={{ padding: '0.45rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.35rem', color: 'var(--text-muted)', fontSize: '0.725rem', textAlign: 'center' }}>
                          No Lalpurja Uploaded
                        </div>
                      )}

                      {selectedProperty.electricity_bill_url ? (
                        <button
                          type="button"
                          onClick={() => setDocPreviewModal({ title: 'NEA Electricity Bill', url: selectedProperty.electricity_bill_url, propertyTitle: selectedProperty.title })}
                          style={{ padding: '0.45rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.35rem', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer' }}
                        >
                          <Upload size={13} /> View NEA Bill <Eye size={11} />
                        </button>
                      ) : (
                        <div style={{ padding: '0.45rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.35rem', color: 'var(--text-muted)', fontSize: '0.725rem', textAlign: 'center' }}>
                          No NEA Bill Uploaded
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                {/* Footer Buttons & Admin Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  
                  {/* Landlord Delete */}
                  {role === 'landlord' && user?.id === selectedProperty.landlord && (
                    <button 
                      onClick={() => handleDeleteProperty(selectedProperty.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', padding: '0.4rem 0.85rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      <Trash2 size={14} /> Delete Listing
                    </button>
                  )}

                  {/* Admin Moderation Actions */}
                  {role === 'admin' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {selectedProperty.verification_status !== 'verified' && (
                        <button
                          onClick={() => handleAdminVerifyProperty(selectedProperty.id)}
                          disabled={adminActionLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.45rem 0.95rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}
                        >
                          <ShieldCheck size={14} /> Verify Property
                        </button>
                      )}
                      {selectedProperty.verification_status !== 'flagged' && (
                        <button
                          onClick={() => { setShowAdminDelistModal(true); setAdminDelistReason(''); }}
                          disabled={adminActionLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '0.45rem 0.95rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}
                        >
                          <X size={14} /> Delist Property
                        </button>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.4rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', marginLeft: 'auto' }}
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

      {/* CONFIDENTIAL DOCUMENT PREVIEW MODAL */}
      {docPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {docPreviewModal.title} — {docPreviewModal.propertyTitle}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidential Property Verification File</span>
              </div>
              <button onClick={() => setDocPreviewModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0c' }}>
              {docPreviewModal.url?.startsWith('data:image') || docPreviewModal.url?.match(/\.(jpeg|jpg|png|webp)/i) || docPreviewModal.url?.includes('http') ? (
                <img
                  src={docPreviewModal.url}
                  alt={docPreviewModal.title}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <div>Document File Available</div>
                  <button onClick={() => openMediaInNewTab(docPreviewModal.url)} className="btn-secondary" style={{ border: 'none', color: '#3b82f6', marginTop: '0.5rem', display: 'inline-block', fontWeight: 700, cursor: 'pointer', background: 'none', padding: 0 }}>
                    Open Document Link ↗
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)' }}>
              <button onClick={() => openMediaInNewTab(docPreviewModal.url)} className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                Open Original in New Tab ↗
              </button>
              <button onClick={() => setDocPreviewModal(null)} className="btn-primary" style={{ padding: '0.45rem 1.15rem', fontSize: '0.8rem' }}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DELIST PROPERTY MODAL WITH REASON */}
      {showAdminDelistModal && selectedProperty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', width: '100%', maxWidth: '560px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
              Delist Property: {selectedProperty.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: 1.45 }}>
              Specify why this property is being removed from the platform. The landlord will receive a system notification with this reason.
            </p>

            <form onSubmit={handleAdminDelistProperty}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Quick Delisting Reasons (Click to Select):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {[
                    '📄 Invalid or unverified Lalpurja (House Deed) document.',
                    '⚡ Electricity bill name or address mismatch.',
                    '❌ Landlord identity verification failed.',
                    '📍 Inaccurate or fake property address details.',
                    '⚠️ Property violates platform safety policies.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminDelistReason(preset)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '0.4rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 800 }}>Delisting / Removal Reason *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Type feedback for landlord explaining why listing was removed..."
                  value={adminDelistReason}
                  onChange={e => setAdminDelistReason(e.target.value)}
                  style={{ padding: '0.75rem', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdminDelistModal(false)}
                  style={{ padding: '0.65rem 1.15rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adminDelistReason.trim() || adminActionLoading}
                  style={{ padding: '0.65rem 1.35rem', borderRadius: '0.5rem', background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: !adminDelistReason.trim() ? 0.6 : 1 }}
                >
                  {adminActionLoading ? 'Delisting...' : 'Confirm Delist & Notify Landlord'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function openMediaInNewTab(dataUrl) {
  if (!dataUrl) return;
  try {
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      window.open(dataUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.error('Failed to open media in new tab:', err);
    window.open(dataUrl, '_blank');
  }
}
