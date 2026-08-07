import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { 
  Building2, ShieldCheck, Lock, FileText, Scale, Search, 
  MapPin, Check, ArrowRight, Sun, Moon, Compass,
  UserCheck, CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Nav state
  const [activeNav, setActiveNav] = useState('browse');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [geoLocating, setGeoLocating] = useState(false);

  // Properties State
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [selectedProp, setSelectedProp] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoadingProps(true);
    try {
      const res = await api.get('/properties/');
      const raw = res.data?.results || res.data;
      setProperties(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to fetch catalog properties:', err);
    } finally {
      setLoadingProps(false);
    }
  };

  const scrollToSection = (id, key) => {
    setActiveNav(key);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        setSelectedDistrict('Kathmandu');
        setSearchQuery('Kathmandu');
      },
      () => {
        setGeoLocating(false);
        alert('Unable to retrieve your location. Showing all districts.');
      }
    );
  };

  // Filter logic
  const filteredProperties = properties.filter((p) => {
    const matchesSearch = 
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedRoomType === 'all' || p.room_type === selectedRoomType;
    const matchesDistrict = selectedDistrict === 'all' || p.district?.toLowerCase() === selectedDistrict.toLowerCase();

    return matchesSearch && matchesType && matchesDistrict;
  });

  const uniqueDistricts = Array.from(new Set(properties.map(p => p.district).filter(Boolean)));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
      
      {/* 1. TOP NAVBAR */}
      <header style={{ 
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '2rem'
        }}>

          {/* BRAND LOGO */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flexShrink: 0 }} 
            onClick={() => navigate('/')}
          >
            <div style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.45rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <Building2 size={19} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.035em' }}>
              TenantPlus
            </span>
          </div>

          {/* CENTER NAVIGATION LINKS */}
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { id: 'public-properties-catalog', key: 'browse', label: 'Browse Properties', icon: Compass },
              { id: 'platform-security', key: 'security', label: 'Platform Security', icon: ShieldCheck },
              { id: 'legal-framework', key: 'legal', label: 'Legal Framework', icon: Scale }
            ].map(item => {
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.id, item.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isActive ? 'var(--pill-bg)' : 'transparent',
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <item.icon size={15} color={isActive ? '#2563eb' : 'var(--text-muted)'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTION CONTROLS */}
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--pill-border)',
                color: 'var(--pill-text)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.18s ease'
              }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user ? (
              <button 
                onClick={() => navigate('/dashboard')} 
                className="btn-apple btn-blue" 
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}
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
                    borderRadius: '980px', 
                    padding: '0.55rem 1.25rem', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.18s ease'
                  }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/register')} 
                  className="btn-apple btn-blue" 
                  style={{ padding: '0.55rem 1.35rem', fontSize: '0.875rem' }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{ 
        position: 'relative', 
        padding: '3rem 2rem 3rem 2rem', 
        maxWidth: '1280px', 
        margin: '0 auto', 
        width: '100%',
        minHeight: 'calc(100vh - 65px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
          
          {/* Left Text Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              background: 'rgba(37, 99, 235, 0.1)', 
              color: '#2563eb', 
              border: '1px solid rgba(37, 99, 235, 0.25)',
              padding: '0.35rem 0.85rem', 
              borderRadius: '980px', 
              fontSize: '0.775rem',
              fontWeight: 700,
              width: 'fit-content'
            }}>
              <ShieldCheck size={14} color="#2563eb" /> Verified Rental Escrow & Legal Lease Platform
            </div>

            <h1 className="apple-heading" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', margin: 0, lineHeight: 1.15 }}>
              Find Verified Rental Homes &<br />
              <span style={{ color: 'var(--text-muted)' }}>Execute Leases Without Fraud.</span>
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5, margin: 0, letterSpacing: '-0.015em', maxWidth: '520px' }}>
              Connect directly with verified landlords, sign legal lease agreements compliant with <em>House Rent Act 2075 of Nepal</em>, and process escrow rent payments safely.
            </p>

            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => scrollToSection('public-properties-catalog', 'browse')}
                className="btn-apple btn-blue" 
                style={{ 
                  padding: '0.75rem 1.75rem', 
                  fontSize: '0.9rem', 
                  display: 'inline-flex', 
                  gap: '0.45rem', 
                  alignItems: 'center'
                }}
              >
                <Compass size={17} /> Browse Rentals
              </button>
              
              <button 
                onClick={() => navigate('/register')} 
                style={{ 
                  background: 'var(--bg-card)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '980px', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.9rem',
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--card-shadow)'
                }}
              >
                Get Started <ArrowRight size={16} />
              </button>
            </div>

            {/* Clean Inline Trust Verification Points */}
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <ShieldCheck size={15} color="#2563eb" /> 100% Verified Ownership
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Lock size={15} color="#2563eb" /> eSewa Escrow Protected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <FileText size={15} color="#2563eb" /> House Rent Act 2075
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: 'var(--card-shadow-hover)',
              border: '1px solid var(--border-color)',
              height: '420px',
              position: 'relative'
            }}>
              <img 
                src="/hero_apartment.png" 
                alt="Modern Kathmandu Rental Apartment" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                bottom: '1.25rem',
                left: '1.25rem',
                right: '1.25rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '0.95rem 1.25rem',
                borderRadius: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1.25rem'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Kathmandu Residency</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Executive Suite</div>
                </div>
                <span className="badge-verified" style={{ flexShrink: 0, padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}>
                  <Check size={13} color="#2563eb" /> Verified
                </span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* 3. PUBLIC PROPERTY CATALOG SHOWCASE */}
      <section id="public-properties-catalog" style={{ 
        background: 'var(--bg-darker)', 
        borderTop: '1px solid var(--border-color)', 
        borderBottom: '1px solid var(--border-color)',
        padding: '4.5rem 2rem' 
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Instant Search
              </span>
              <h2 style={{ fontSize: '2rem', margin: '0.2rem 0 0 0', fontWeight: 800 }}>
                Explore Verified Rentals
              </h2>
            </div>

            {/* Room Type Category Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['all', 'single', 'double', 'flat', 'full_house'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedRoomType(type)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '980px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    border: selectedRoomType === type ? '1px solid #2563eb' : '1px solid var(--border-color)',
                    background: selectedRoomType === type ? '#2563eb' : 'var(--bg-card)',
                    color: selectedRoomType === type ? '#ffffff' : 'var(--text-main)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Search Controls */}
          <div className="premium-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="Search Kathmandu, Lalitpur, Pokhara, title..."
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

            <button
              onClick={handleGetLocation}
              disabled={geoLocating}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.15rem'
              }}
            >
              <MapPin size={16} color="#2563eb" />
              <span>{geoLocating ? 'Locating...' : 'Find Near Me'}</span>
            </button>
          </div>

          {/* Property Cards Grid */}
          {loadingProps ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading verified properties...
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="premium-card" style={{ padding: '3.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
              <Building2 size={36} color="var(--text-muted)" />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Properties Matched Your Search</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Try clearing filters or selecting another district.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
              {filteredProperties.map((prop) => (
                <div 
                  key={prop.id} 
                  className="premium-card"
                  style={{ 
                    borderRadius: '1rem', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ height: '210px', position: 'relative' }}>
                    <img 
                      src={prop.image || '/hero_apartment.png'} 
                      alt={prop.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = '/hero_apartment.png'; }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '0.75rem',
                      left: '0.75rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '980px',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {prop.room_type?.replace('_', ' ')}
                    </div>
                    {prop.landlord_is_verified && (
                      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                        <span className="badge-verified">
                          <Check size={12} color="#2563eb" /> Verified
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <MapPin size={14} color="#2563eb" />
                        <span>{prop.district}</span>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                        {prop.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Monthly Rent</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>
                          Rs. {parseFloat(prop.rent_amount).toLocaleString()}
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedProp(prop)}
                        className="btn-apple btn-blue" 
                        style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
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

      {/* 4. PLATFORM SECURITY SECTION */}
      <section id="platform-security" style={{ padding: '5rem 2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          
          <div style={{
            borderRadius: '1.25rem',
            overflow: 'hidden',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--border-color)',
            height: '380px'
          }}>
            <img 
              src="/key_exchange.png" 
              alt="Key Handover Safety" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trust & Verification
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: 0, fontWeight: 800 }}>
              Protected Key Handovers & Legal Contracts
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(37, 99, 235, 0.12)', padding: '0.65rem', borderRadius: '0.65rem', flexShrink: 0 }}>
                  <UserCheck size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Government ID Verified Identity</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    Landlords upload verified Nepalese Citizenship / Passport credentials and land deeds before listing.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(37, 99, 235, 0.12)', padding: '0.65rem', borderRadius: '0.65rem', flexShrink: 0 }}>
                  <Lock size={20} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Escrow Payment Protection</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    Rent and security deposits are held safely in platform escrow until tenancy physical inspection is complete.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. LEGAL FRAMEWORK SECTION */}
      <section id="legal-framework" style={{ 
        background: 'var(--bg-darker)', 
        borderTop: '1px solid var(--border-color)', 
        padding: '5rem 2rem' 
      }}>
        <div id="legal-rights" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              House Rent Act 2075
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0.2rem 0 0.5rem 0', fontWeight: 800 }}>
              Fully Compliant Nepalese Tenancy Framework
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
              Automated PDF lease generation under Nepalese law featuring 35-day mandatory eviction notice protection and statutory rent escalation caps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
            <div className="premium-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Scale size={28} color="#2563eb" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>35-Day Eviction Notice</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Statutory mandatory notice period protects tenants from arbitrary eviction and sudden lock changes.
              </p>
            </div>

            <div className="premium-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FileText size={28} color="#2563eb" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Dual Digital Signatures</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Legally binding PDF contract signed digitally by landlord and tenant with two witness verifications.
              </p>
            </div>

            <div className="premium-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ShieldCheck size={28} color="#2563eb" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Escrow Refund Guarantee</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Security deposit refunds processed strictly within 15-30 days of key handover with verified damage receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#2563eb" />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>TenantPlus Nepal</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Verified Landlords & Tenants, Escrow Protection, and Legal Rental Contracts.
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} TenantPlus Inc. All rights reserved.
          </div>
        </div>
      </footer>

      {/* PROPERTY INSPECTION MODAL */}
      {selectedProp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1.5rem' }}>
          <div className="premium-card" style={{ maxWidth: '520px', width: '100%', overflow: 'hidden', color: 'var(--text-main)', boxShadow: 'var(--card-shadow-hover)' }}>
            <div style={{ height: '220px', position: 'relative' }}>
              <img src={selectedProp.image || '/hero_apartment.png'} alt="Prop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => setSelectedProp(null)}
                style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.6)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textTransform: 'capitalize' }}>{selectedProp.room_type?.replace('_', ' ')}</span>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.35rem', fontWeight: 800 }}>{selectedProp.title}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <MapPin size={14} color="#2563eb" /> {selectedProp.district}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Monthly Rent</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>Rs. {parseFloat(selectedProp.rent_amount).toLocaleString()}</div>
                </div>
                {selectedProp.landlord_is_verified && (
                  <span className="badge-verified">
                    <Check size={12} color="#2563eb" /> Verified Owner
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                {selectedProp.description || 'Verified rental property listed on TenantPlus Nepal platform.'}
              </p>

              <button
                onClick={() => { setSelectedProp(null); navigate('/register'); }}
                className="btn-apple btn-blue"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', justifyContent: 'center' }}
              >
                Sign In to Apply & Rent Property ↗
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
