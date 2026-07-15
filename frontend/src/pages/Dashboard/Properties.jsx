import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PropertyCard from '../../components/Properties/PropertyCard';
import SkeletonGrid from '../../components/Properties/SkeletonGrid';
import { Search, Plus, FilterX } from 'lucide-react';

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
      setProperties(response.data);
    } catch (err) {
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      const matchSearch = prop.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prop.district.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDistrict = districtFilter ? prop.district === districtFilter : true;
      const matchRoomType = roomTypeFilter ? prop.room_type === roomTypeFilter : true;
      const matchPrice = maxPrice ? parseFloat(prop.rent_amount) <= parseFloat(maxPrice) : true;
      
      return matchSearch && matchDistrict && matchRoomType && matchPrice;
    });
  }, [properties, searchQuery, districtFilter, roomTypeFilter, maxPrice]);

  // Extract unique districts for the dropdown
  const uniqueDistricts = useMemo(() => {
    const districts = new Set(properties.map(p => p.district));
    return Array.from(districts).sort();
  }, [properties]);

  const clearFilters = () => {
    setSearchQuery('');
    setDistrictFilter('');
    setRoomTypeFilter('');
    setMaxPrice('');
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
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-light)', borderRadius: '1rem', border: '1px dashed rgba(0,0,0,0.1)' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No properties found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {properties.length === 0 
              ? (role === 'landlord' ? "You haven't added any properties yet." : "There are currently no properties available.")
              : "No properties match your current filters. Try adjusting them."}
          </p>
        </div>
      )}
    </div>
  );
}
