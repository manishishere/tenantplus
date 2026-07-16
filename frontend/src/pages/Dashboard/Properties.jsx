import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PropertyCard from '../../components/Properties/PropertyCard';
import SkeletonGrid from '../../components/Properties/SkeletonGrid';
import { Search, Plus, FilterX, Building2 } from 'lucide-react';

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
    rentAmount: ''
  });

  useEffect(() => {
    fetchProperties();
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
      await api.post('/properties/', {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        district: addForm.district.trim(),
        address: addForm.address.trim(),
        room_type: addForm.roomType,
        furnishing_status: addForm.furnishingStatus,
        rent_amount: rent
      });

      setShowAddModal(false);
      setAddForm({
        title: '',
        description: '',
        district: '',
        address: '',
        roomType: 'single',
        furnishingStatus: 'unfurnished',
        rentAmount: ''
      });

      await fetchProperties();
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.detail || err.response?.data?.title?.[0] || err.response?.data?.rent_amount?.[0] || 'Failed to list property.');
    } finally {
      setAddLoading(false);
    }
  };

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
            <PropertyCard key={property.id} property={property} />
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
    </div>
  );
}
