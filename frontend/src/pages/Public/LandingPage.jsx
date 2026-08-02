import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { 
  Building2, 
  Search, 
  ShieldCheck, 
  CreditCard, 
  Wrench, 
  Calendar, 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  UserCheck, 
  FileText, 
  Sun, 
  Moon, 
  ExternalLink, 
  Lock, 
  Scale,
  X,
  Filter
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Public Property Catalog State
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // GPS Location Near Me State
  const [geoLocating, setGeoLocating] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearMeActive(true);
        setGeoLocating(false);
      },
      (error) => {
        // Fallback for simulation or permissions
        setNearMeActive(true);
        setGeoLocating(false);
      }
    );
  };
  
  // Property Detail Modal for Public Visitors
  const [selectedProp, setSelectedProp] = useState(null);

  useEffect(() => {
    fetchPublicProperties();
  }, []);

  const fetchPublicProperties = async () => {
    try {
      setLoadingProps(true);
      const res = await api.get('/properties/');
      const list = res.data.results || res.data || [];
      setProperties(list);
    } catch (err) {
      console.error('Failed to load public properties:', err);
    } finally {
      setLoadingProps(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(prop => {
      const matchesSearch = !searchQuery || 
        prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.district.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedRoomType === 'all' || prop.room_type === selectedRoomType;
      const matchesDistrict = selectedDistrict === 'all' || prop.district === selectedDistrict;
      return matchesSearch && matchesType && matchesDistrict;
    });
  }, [properties, searchQuery, selectedRoomType, selectedDistrict]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set(properties.map(p => p.district).filter(Boolean));
    return Array.from(set).sort();
  }, [properties]);

  const scrollToCatalog = () => {
    const catalogEl = document.getElementById('public-properties-catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // High-res fallback images for property cards
  const getPropertyPhoto = (prop) => {
    if (prop.first_photo && !prop.first_photo.startsWith('/mock-media/')) {
      return prop.first_photo;
    }
    const fallbackPhotos = [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
    ];
    const index = Math.abs(prop.id.charCodeAt(0) || 0) % fallbackPhotos.length;
    return fallbackPhotos[index];
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      
      {/* 1. TOP STICKY NAVBAR */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.15rem 2.5rem', 
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary-indigo), #4338ca)', padding: '0.6rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center' }}>
            <Building2 size={24} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            Tenant<span style={{ color: 'var(--primary-indigo)' }}>Plus</span>
          </span>
        </div>

        {/* Center Quick Navigation Links */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.925rem', fontWeight: 600 }}>
          <span onClick={scrollToCatalog} style={{ cursor: 'pointer', color: 'var(--text-main)', transition: 'color 0.2s' }}>
            🏠 Browse Properties
          </span>
          <a href="#why-tenantplus" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Why TenantPlus
          </a>
          <a href="#escrow-security" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Escrow Security
          </a>
          <a href="#legal-rights" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Legal Rights
          </a>
        </nav>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--pill-bg)',
              border: '1px solid var(--pill-border)',
              color: 'var(--pill-text)',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-primary" 
              style={{ padding: '0.6rem 1.35rem', fontSize: '0.9rem' }}
            >
              Dashboard ↗
            </button>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')} 
                style={{ 
                  background: 'transparent', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '0.5rem', 
                  padding: '0.6rem 1.25rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')} 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.35rem', fontSize: '0.9rem' }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{ 
        position: 'relative', 
        padding: '5rem 2rem 4rem 2rem', 
        maxWidth: '1280px', 
        margin: '0 auto', 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '2.5rem'
      }}>
        
        {/* Animated Pill Announcement */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.6rem', 
          background: 'var(--pill-bg)', 
          color: 'var(--primary-indigo)', 
          border: '1px solid var(--pill-border)',
          padding: '0.45rem 1rem', 
          borderRadius: '2rem', 
          fontSize: '0.875rem',
          fontWeight: 700
        }}>
          <Sparkles size={16} /> Nepal's #1 Verified Rental Escrow & Legal Lease Platform
        </div>

        {/* Main Headline */}
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 4.2rem)', 
          lineHeight: 1.15, 
          margin: 0, 
          fontWeight: 800,
          letterSpacing: '-0.03em',
          maxWidth: '900px'
        }}>
          Find Verified Rental Rooms & <br/>
          <span style={{ 
            background: 'linear-gradient(135deg, var(--primary-indigo) 0%, #a5b4fc 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Execute Leases Without Fraud.
          </span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1.6, margin: 0, maxWidth: '720px' }}>
          Connect directly with <strong>🛡️ Verified Landlords</strong>, sign legal contracts compliant with <em>House Rent Act 2075</em>, pay rent via <strong>TenantPlus Escrow</strong>, and enjoy 24/7 AI legal rights guidance.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={scrollToCatalog}
            className="btn-primary" 
            style={{ 
              padding: '0.9rem 2.25rem', 
              fontSize: '1.05rem', 
              display: 'inline-flex', 
              gap: '0.6rem', 
              alignItems: 'center',
              boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)'
            }}
          >
            🏠 Browse Available Properties
          </button>
          
          <button 
            onClick={() => navigate('/register')} 
            style={{ 
              background: 'var(--bg-card)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '0.5rem', 
              padding: '0.9rem 2rem', 
              fontSize: '1.05rem',
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>

        {/* Platform Trust Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1.5rem', 
          width: '100%', 
          marginTop: '2rem' 
        }}>
          <div className="premium-card" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ShieldCheck size={28} color="var(--primary-indigo)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>100% Verified</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Government ID & Ownership Proof</div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Lock size={28} color="var(--primary-indigo)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary-indigo)' }}>Managing Escrow</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Funds Protected Until Verification</div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <FileText size={28} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>Legal Contracts</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Dual Signature PDF Generation</div>
          </div>

          <div className="premium-card" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Scale size={28} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#f59e0b' }}>AI Rights Assistant</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>24/7 Nepalese Tenancy Law Guide</div>
          </div>
        </div>
      </section>

      {/* 3. 🔥 FRICTIONLESS PUBLIC PROPERTY CATALOG SHOWCASE */}
      <section id="public-properties-catalog" style={{ 
        background: 'var(--bg-darker)', 
        borderTop: '1px solid var(--border-color)', 
        borderBottom: '1px solid var(--border-color)',
        padding: '5rem 2rem' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Instant Room & Flat Discovery
              </span>
              <h2 style={{ fontSize: '2.25rem', margin: '0.25rem 0 0 0', fontWeight: 800 }}>
                Explore Verified Rentals Right Away
              </h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
                Browse live available properties across Nepal. Click any property to inspect photos, map coordinates, and landlord contacts.
              </p>
            </div>

            {/* Room Type Category Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['all', 'single', 'double', 'flat', 'full_house'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedRoomType(type)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    border: selectedRoomType === type ? '1px solid var(--primary-indigo)' : '1px solid var(--border-color)',
                    background: selectedRoomType === type ? 'var(--primary-indigo)' : 'var(--bg-card)',
                    color: selectedRoomType === type ? '#ffffff' : 'var(--text-main)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Search & District Filter Controls */}
          <div className="premium-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                placeholder="Search location, Kathmandu, Lalitpur, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ width: '160px' }}>
              <select 
                className="form-input" 
                value={selectedDistrict} 
                onChange={(e) => setSelectedDistrict(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">All Districts</option>
                {uniqueDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* GPS Location Button */}
            <button
              onClick={handleGetLocation}
              disabled={geoLocating}
              style={{
                background: nearMeActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--pill-bg)',
                border: nearMeActive ? '1px solid #10b981' : '1px solid var(--pill-border)',
                color: nearMeActive ? '#10b981' : 'var(--primary-indigo)',
                padding: '0.6rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <MapPin size={16} />
              {geoLocating ? 'Locating...' : nearMeActive ? '📍 Near Me Active' : '📍 Find Properties Near Me'}
            </button>
          </div>

          {/* Property Cards Grid */}
          {loadingProps ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{
                width: '40px', height: '40px',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--primary-indigo)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem auto'
              }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading live rental properties...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
              <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>No Properties Matched Your Search</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try clearing filters or searching for different districts.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {filteredProperties.map((prop) => (
                <div 
                  key={prop.id} 
                  className="premium-card" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: 0, 
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedProp(prop)}
                >
                  {/* Property Image Container */}
                  <div style={{ height: '210px', position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={getPropertyPhoto(prop)} 
                      alt={prop.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                    />
                    <div style={{ 
                      position: 'absolute', 
                      top: '0.75rem', 
                      left: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {prop.room_type?.replace('_', ' ')}
                    </div>
                    {prop.landlord_is_verified && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '0.75rem', 
                        right: '0.75rem'
                      }}>
                        <span className="badge-verified">
                          🛡️ Verified
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <MapPin size={14} color="var(--primary-indigo)" />
                        <span>{prop.district}</span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                        {prop.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Rent</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-indigo)' }}>
                          Rs. {parseFloat(prop.rent_amount).toLocaleString()}
                        </div>
                      </div>

                      <button 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.35rem' }}
                      >
                        Inspect ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. WHY TENANTPLUS (FEATURES & SECURITY) */}
      <section id="why-tenantplus" style={{ padding: '5rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem auto' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-indigo)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Built For Trust & Transparency
          </span>
          <h2 style={{ fontSize: '2.25rem', margin: '0.35rem 0 0.5rem 0', fontWeight: 800 }}>
            Solving Nepal's Biggest Rental Scams
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6 }}>
            Say goodbye to fake property agents, sudden rent hikes, and unreturned security deposits.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '52px', height: '52px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck color="var(--primary-indigo)" size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>🛡️ Verified Landlords & Tenants</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>
              Landlords upload citizenship and land ownership deeds to get verified. Tenants earn genuine applicant badges via OTP verification.
            </p>
          </div>

          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '52px', height: '52px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock color="#10b981" size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>🔒 Escrow Payment Safety</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>
              Rent payments are held safely in TenantPlus Escrow until move-in verification, eliminating upfront deposit theft and fraud.
            </p>
          </div>

          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '52px', height: '52px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText color="#f59e0b" size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>📜 Digital 2-Page Agreements</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>
              Automated PDF generation under Nepalese House Rent Act 2075 featuring 35-day eviction notice limits and 10% rent escalation caps.
            </p>
          </div>

        </div>
      </section>

      {/* 5. PUBLIC PROPERTY DETAIL MODAL */}
      {selectedProp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>
                  {selectedProp.room_type?.replace('_', ' ')} &bull; {selectedProp.district}
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0 0' }}>{selectedProp.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedProp(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ height: '240px', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <img src={getPropertyPhoto(selectedProp)} alt={selectedProp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Rent</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-indigo)' }}>
                  Rs. {parseFloat(selectedProp.rent_amount).toLocaleString()} / month
                </div>
              </div>

              {selectedProp.landlord_is_verified && (
                <span className="badge-verified">
                  🛡️ Verified Landlord Listing
                </span>
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>About this listing:</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {selectedProp.description || 'Verified rental property listed on TenantPlus platform.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => { setSelectedProp(null); navigate('/register'); }}
                className="btn-primary"
                style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
              >
                Apply for this Property ↗
              </button>
              <button
                onClick={() => setSelectedProp(null)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. FOOTER */}
      <footer style={{ 
        padding: '3rem 2.5rem', 
        borderTop: '1px solid var(--border-color)', 
        background: 'var(--bg-surface)', 
        textAlign: 'center', 
        color: 'var(--text-muted)', 
        fontSize: '0.9rem' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Building2 size={20} color="var(--primary-indigo)" />
          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>TenantPlus Nepal</span>
        </div>
        <p style={{ margin: '0 0 0.5rem 0' }}>Empowering Landlords & Tenants with Escrow Protection, Legal Leases, and AI Guidance.</p>
        <p style={{ margin: 0, fontSize: '0.8rem' }}>&copy; {new Date().getFullYear()} TenantPlus Inc. All rights reserved. Support: inquire@tenantplus.com</p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
