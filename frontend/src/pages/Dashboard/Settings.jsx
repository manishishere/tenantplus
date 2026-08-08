import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { 
  User as UserIcon, Mail, Phone, Lock, ShieldCheck, 
  Upload, CheckCircle, AlertCircle, FileText, Camera, Building2, MapPin, Copy
} from 'lucide-react';

const NEPAL_ADMIN_DIVISIONS = {
  'Bagmati Province': {
    'Kathmandu': ['Kathmandu Metropolitan City', 'Kageshwari Manohara Municipality', 'Kirtipur Municipality', 'Gokarneshwar Municipality', 'Chandragiri Municipality', 'Tokha Municipality', 'Tarakeshwar Municipality', 'Dakshinkali Municipality', 'Nagarjun Municipality', 'Budhanilkantha Municipality', 'Shankharapur Municipality'],
    'Lalitpur': ['Lalitpur Metropolitan City', 'Godawari Municipality', 'Mahalaxmi Municipality', 'Bagmati Rural Municipality', 'Konjyosom Rural Municipality', 'Mahankal Rural Municipality'],
    'Bhaktapur': ['Bhaktapur Municipality', 'Madhyapur Thimi Municipality', 'Suryabinayak Municipality', 'Changunarayan Municipality'],
    'Chitwan': ['Bharatpur Metropolitan City', 'Ratnanagar Municipality', 'Khairahani Municipality', 'Madi Municipality', 'Rapti Municipality', 'Kalika Municipality'],
    'Makwanpur': ['Hetauda Sub-Metropolitan City', 'Thaha Municipality', 'Bhimfedi Rural Municipality'],
    'Kavrepalanchok': ['Dhulikhel Municipality', 'Banepa Municipality', 'Panauti Municipality', 'Namobuddha Municipality'],
    'Nuwakot': ['Bidur Municipality', 'Belkotgadhi Municipality'],
    'Dhading': ['Nilkantha Municipality', 'Dhunibesi Municipality'],
    'Sindhupalchok': ['Chautara Sangachokgadhi Municipality', 'Melamchi Municipality'],
    'Ramechhap': ['Manthali Municipality', 'Ramechhap Municipality'],
    'Dolakha': ['Bhimeshwar Municipality', 'Jiri Municipality'],
    'Rasuwa': ['Uttargaya Rural Municipality', 'Kalika Rural Municipality'],
    'Sindhuli': ['Kamalamai Municipality', 'Dudhouli Municipality']
  },
  'Koshi Province': {
    'Morang': ['Biratnagar Metropolitan City', 'Sundarharaicha Municipality', 'Belbari Municipality', 'Pathari Sanischare Municipality', 'Urlabari Municipality'],
    'Sunsari': ['Dharan Sub-Metropolitan City', 'Itahari Sub-Metropolitan City', 'Inaruwa Municipality', 'Duhabi Municipality'],
    'Jhapa': ['Birtamode Municipality', 'Damak Municipality', 'Mechinagar Municipality', 'Bhadrapur Municipality'],
    'Ilam': ['Ilam Municipality', 'Suryodaya Municipality', 'Mai Municipality'],
    'Udayapur': ['Triyuga Municipality', 'Katari Municipality'],
    'Dhankuta': ['Dhankuta Municipality', 'Pakhribas Municipality']
  },
  'Madhesh Province': {
    'Dhanusha': ['Janakpurdham Sub-Metropolitan City', 'Mithila Municipality', 'Chireshwarnath Municipality'],
    'Parsa': ['Birgunj Metropolitan City', 'Pokhariya Municipality'],
    'Bara': ['Kalaiya Sub-Metropolitan City', 'Jitpursimara Sub-Metropolitan City', 'Nijgadh Municipality'],
    'Rautahat': ['Gaur Municipality', 'Chandrapur Municipality'],
    'Sarlahi': ['Malangwa Municipality', 'Hariwan Municipality'],
    'Mahottari': ['Jaleshwar Municipality', 'Bardibas Municipality']
  },
  'Gandaki Province': {
    'Kaski': ['Pokhara Metropolitan City', 'Annapurna Rural Municipality', 'Machhapuchhre Rural Municipality', 'Madi Rural Municipality'],
    'Tanahun': ['Vyas Municipality', 'Shuklagandaki Municipality', 'Bhanu Municipality'],
    'Gorkha': ['Gorkha Municipality', 'Palungtar Municipality'],
    'Syangja': ['Putalibazar Municipality', 'Waling Municipality'],
    'Nawalpur': ['Kawasoti Municipality', 'Gaindakot Municipality', 'Devchuli Municipality'],
    'Lamjung': ['Besisahar Municipality', 'Sundarbazar Municipality'],
    'Parbat': ['Kusma Municipality', 'Phalebas Municipality'],
    'Baglung': ['Baglung Municipality', 'Galkot Municipality']
  },
  'Lumbini Province': {
    'Rupandehi': ['Butwal Sub-Metropolitan City', 'Siddharthanagar Municipality', 'Tilottama Municipality', 'Lumbini Sanskritik Municipality'],
    'Banke': ['Nepalgunj Sub-Metropolitan City', 'Kohalpur Municipality'],
    'Dang': ['Ghorahi Sub-Metropolitan City', 'Tulsipur Sub-Metropolitan City', 'Lamahi Municipality'],
    'Kapilvastu': ['Taulihawa (Kapilvastu) Municipality', 'Banganga Municipality'],
    'Nawalparasi West': ['Ramgram Municipality', 'Sunwal Municipality'],
    'Palpa': ['Tansen Municipality', 'Rampur Municipality']
  },
  'Karnali Province': {
    'Surkhet': ['Birendranagar Municipality', 'Gurbhakot Municipality', 'Bheriganga Municipality'],
    'Jumla': ['Chandan Nath Municipality'],
    'Dailekh': ['Narayan Municipality', 'Dullu Municipality'],
    'Salyan': ['Sharada Municipality', 'Bagchaur Municipality']
  },
  'Sudurpashchim Province': {
    'Kailali': ['Dhangadhi Sub-Metropolitan City', 'Tikapur Municipality', 'Lamki Chuha Municipality', 'Godawari Municipality'],
    'Kanchanpur': ['Bhimdatta Municipality', 'Shuklaphanta Municipality', 'Bedkot Municipality'],
    'Dadeldhura': ['Amargadhi Municipality', 'Parshuram Municipality'],
    'Doti': ['Dipayal Silgadhi Municipality', 'Shikhar Municipality']
  }
};

const WARDS_LIST = Array.from({ length: 35 }, (_, i) => `Ward No. ${i + 1}`);

export default function Settings() {
  const { user, checkAuth, fetchUserProfile } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('input');
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });
  const [emailLoading, setEmailLoading] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState({ type: '', text: '' });
  const [securityLoading, setSecurityLoading] = useState(false);

  // COMPREHENSIVE NEPAL KYC FORM STATE
  const [gender, setGender] = useState('male');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // Permanent Address Cascading State
  const [permCountry, setPermCountry] = useState('Nepal');
  const [permProvince, setPermProvince] = useState('Bagmati Province');
  const [permDistrict, setPermDistrict] = useState('Kathmandu');
  const [permMunicipality, setPermMunicipality] = useState('Kathmandu Metropolitan City');
  const [permWard, setPermWard] = useState('Ward No. 10');
  const [permStreet, setPermStreet] = useState('');

  // Temporary Address Cascading State & Copy Checkbox
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [tempCountry, setTempCountry] = useState('Nepal');
  const [tempProvince, setTempProvince] = useState('Bagmati Province');
  const [tempDistrict, setTempDistrict] = useState('Kathmandu');
  const [tempMunicipality, setTempMunicipality] = useState('Kathmandu Metropolitan City');
  const [tempWard, setTempWard] = useState('Ward No. 10');
  const [tempStreet, setTempStreet] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Photos & Documents Upload State
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);

  const [docType, setDocType] = useState('citizenship');
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [backDocFile, setBackDocFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  const [docMsg, setDocMsg] = useState({ type: '', text: '' });
  const [docLoading, setDocLoading] = useState(false);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [existingDocStatus, setExistingDocStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(null);

  useEffect(() => {
    fetchExistingKyc();
  }, []);

  const fetchExistingKyc = async () => {
    try {
      const res = await api.get('/accounts/documents/');
      const docs = res.data?.results || res.data || [];
      if (Array.isArray(docs) && docs.length > 0) {
        const latest = docs[0];
        setExistingDocStatus(latest.status);
        setRejectionReason(latest.rejection_reason || null);
        setKycSubmitted(true);
        if (latest.status === 'rejected') {
          setIsEditingKyc(true);
        }
        if (latest.father_name) setFatherName(latest.father_name);
        if (latest.mother_name) setMotherName(latest.mother_name);
        if (latest.doc_number) setDocNumber(latest.doc_number);
        if (latest.doc_type) setDocType(latest.doc_type);
        if (latest.user_photo) setUserPhotoPreview(latest.user_photo);
        if (latest.doc_url) setFrontPreview(latest.doc_url);
        if (latest.back_doc_url) setBackPreview(latest.back_doc_url);
      }
    } catch (err) {
      console.error('Failed to fetch existing KYC documents:', err);
    }
  };

  // Cascading updates for Permanent Address
  const availablePermDistricts = Object.keys(NEPAL_ADMIN_DIVISIONS[permProvince] || {});
  const availablePermMunicipalities = (NEPAL_ADMIN_DIVISIONS[permProvince] && NEPAL_ADMIN_DIVISIONS[permProvince][permDistrict]) || [];

  // Cascading updates for Temporary Address
  const availableTempDistricts = Object.keys(NEPAL_ADMIN_DIVISIONS[tempProvince] || {});
  const availableTempMunicipalities = (NEPAL_ADMIN_DIVISIONS[tempProvince] && NEPAL_ADMIN_DIVISIONS[tempProvince][tempDistrict]) || [];

  // Auto-sync temporary address when sameAsPermanent is enabled
  useEffect(() => {
    if (sameAsPermanent) {
      setTempCountry(permCountry);
      setTempProvince(permProvince);
      setTempDistrict(permDistrict);
      setTempMunicipality(permMunicipality);
      setTempWard(permWard);
      setTempStreet(permStreet);
    }
  }, [sameAsPermanent, permCountry, permProvince, permDistrict, permMunicipality, permWard, permStreet]);

  const handlePermProvinceChange = (newProvince) => {
    setPermProvince(newProvince);
    const districts = Object.keys(NEPAL_ADMIN_DIVISIONS[newProvince] || {});
    const firstDistrict = districts[0] || '';
    setPermDistrict(firstDistrict);

    const muns = (NEPAL_ADMIN_DIVISIONS[newProvince] && NEPAL_ADMIN_DIVISIONS[newProvince][firstDistrict]) || [];
    setPermMunicipality(muns[0] || '');
  };

  const handlePermDistrictChange = (newDistrict) => {
    setPermDistrict(newDistrict);
    const muns = (NEPAL_ADMIN_DIVISIONS[permProvince] && NEPAL_ADMIN_DIVISIONS[permProvince][newDistrict]) || [];
    setPermMunicipality(muns[0] || '');
  };

  const handleTempProvinceChange = (newProvince) => {
    setTempProvince(newProvince);
    const districts = Object.keys(NEPAL_ADMIN_DIVISIONS[newProvince] || {});
    const firstDistrict = districts[0] || '';
    setTempDistrict(firstDistrict);

    const muns = (NEPAL_ADMIN_DIVISIONS[newProvince] && NEPAL_ADMIN_DIVISIONS[newProvince][firstDistrict]) || [];
    setTempMunicipality(muns[0] || '');
  };

  const handleTempDistrictChange = (newDistrict) => {
    setTempDistrict(newDistrict);
    const muns = (NEPAL_ADMIN_DIVISIONS[tempProvince] && NEPAL_ADMIN_DIVISIONS[tempProvince][newDistrict]) || [];
    setTempMunicipality(muns[0] || '');
  };

  const formatAddress = (country, province, district, municipality, ward, street) => {
    const parts = [
      country || 'Nepal',
      province,
      district ? `${district} District` : '',
      municipality,
      ward,
      street ? `Tole/Street: ${street}` : ''
    ].filter(Boolean);
    return parts.join(', ');
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

  const validateDocFile = (file, label) => {
    if (!file) return null;
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (file.size > MAX_SIZE) {
      return `${label} (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 5MB limit.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${label} format is not supported. Upload PNG, JPG, or PDF.`;
    }
    return null;
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!fatherName.trim() || !motherName.trim()) {
      setDocMsg({ type: 'error', text: "Please enter your Father's and Mother's names." });
      return;
    }

    const permFormatted = formatAddress(permCountry, permProvince, permDistrict, permMunicipality, permWard, permStreet);
    const tempFormatted = sameAsPermanent 
      ? permFormatted 
      : formatAddress(tempCountry, tempProvince, tempDistrict, tempMunicipality, tempWard, tempStreet);

    if (!docNumber.trim()) {
      setDocMsg({ type: 'error', text: 'Please enter your Document Number.' });
      return;
    }
    if (!userPhotoFile && !userPhotoPreview) {
      setDocMsg({ type: 'error', text: 'Please upload your profile photograph / selfie.' });
      return;
    }
    if (!docFile && !frontPreview) {
      setDocMsg({ type: 'error', text: 'Please upload your Government Identification Document photo.' });
      return;
    }
    // Only require back photo for Citizenship Certificate
    if (docType === 'citizenship' && !backDocFile && !backPreview) {
      setDocMsg({ type: 'error', text: 'Please upload the BACK photo of your Citizenship Certificate.' });
      return;
    }

    setDocLoading(true);
    setDocMsg({ type: '', text: '' });
    try {
      const userPhotoData = userPhotoFile ? await fileToDataUrl(userPhotoFile) : userPhotoPreview;
      const frontData = docFile ? await fileToDataUrl(docFile) : frontPreview;
      const backData = backDocFile ? await fileToDataUrl(backDocFile) : backPreview;

      await api.post('/accounts/documents/', {
        gender,
        father_name: fatherName.trim(),
        mother_name: motherName.trim(),
        permanent_address: permFormatted,
        temporary_address: tempFormatted,
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
        user_photo: userPhotoData || `/media/documents/selfie-${Date.now()}.jpg`,
        doc_type: docType,
        doc_number: docNumber.trim(),
        doc_url: frontData || `/media/documents/id-front-${Date.now()}.jpg`,
        back_doc_url: docType === 'citizenship' ? (backData || `/media/documents/id-back-${Date.now()}.jpg`) : null,
        house_doc_url: `/media/documents/kyc-verified-${Date.now()}.pdf`,
        electricity_bill_url: `/media/documents/kyc-utility-${Date.now()}.pdf`
      });

      setDocMsg({ type: 'success', text: 'Comprehensive KYC Verification documents submitted successfully! Admin will review your profile.' });
      setKycSubmitted(true);
      setIsEditingKyc(false);
      if (checkAuth) await checkAuth();
      if (fetchUserProfile) await fetchUserProfile();
    } catch (err) {
      setDocMsg({ type: 'error', text: parseApiError(err, 'Failed to submit KYC documents.') });
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Account & KYC Settings</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
          Manage your personal profile, email, security credentials, and Nepalese KYC verification documents.
        </p>
      </div>

      {/* COMPREHENSIVE NEPAL KYC VERIFICATION FORM */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <ShieldCheck size={22} color="#2563eb" /> Nepalese Statutory KYC Identity & Residence Verification
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.35rem 0 0 0' }}>
              Compliant with <em>House Rent Act 2075 of Nepal</em>. All document uploads are encrypted & audited by Platform Admin.
            </p>
          </div>

          {user?.is_verified ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.45rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle size={15} /> Verified Account
            </span>
          ) : kycSubmitted ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '0.45rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }}>
              <CheckCircle size={15} /> Submitted (Pending Admin Audit)
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#b91c1c', color: '#ffffff', padding: '0.45rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 800 }}>
              KYC Action Required
            </span>
          )}
        </div>

        {user?.is_verified ? (
          <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <ShieldCheck size={28} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Account Officially Verified</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 400, marginTop: '0.2rem' }}>
                Your government identity documents, profile photograph, and citizenship credentials have been verified and approved by TenantPlus Administration.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* REJECTION REASON ALERT BANNER */}
            {existingDocStatus === 'rejected' && (
              <div style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <AlertCircle size={22} style={{ flexShrink: 0 }} />
                  <strong style={{ fontSize: '1rem', fontWeight: 800 }}>
                    KYC Verification Submission Rejected by Admin
                  </strong>
                </div>
                {rejectionReason && (
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '0.5rem',
                    borderLeft: '4px solid #ef4444',
                    margin: '0.5rem 0',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.5
                  }}>
                    <strong>Reason for Rejection:</strong> {rejectionReason}
                  </div>
                )}
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  Please review the rejection details above, correct any errors in your personal details or re-upload clear photos, and click <strong>"Save & Re-submit Statutory KYC Profile"</strong> below.
                </p>
              </div>
            )}

            {/* SUBMITTED & PENDING AUDIT BANNER WITH EDIT TOGGLE */}
            {kycSubmitted && existingDocStatus !== 'rejected' && (
              <div style={{
                padding: '1.15rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-main)' }}>
                      Statutory KYC Profile Submitted & Pending Verification
                    </strong>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Your identity documents have been logged. Platform Admin is auditing your profile under House Rent Act 2075.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingKyc(!isEditingKyc)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '0.5rem',
                    background: isEditingKyc ? 'rgba(239,68,68,0.12)' : 'var(--pill-bg)',
                    color: isEditingKyc ? '#ef4444' : 'var(--primary-indigo)',
                    border: `1px solid ${isEditingKyc ? 'rgba(239,68,68,0.3)' : 'var(--pill-border)'}`,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {isEditingKyc ? 'Cancel Edit Mode' : 'Edit & Re-submit Profile'}
                </button>
              </div>
            )}

            {docMsg.text && (
              <div style={{
                padding: '0.85rem 1.15rem',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                background: docMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: docMsg.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                border: `1px solid ${docMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
              }}>
                {docMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{docMsg.text}</span>
              </div>
            )}

            {/* SECTION 1: PERSONAL DETAILS */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                1. Personal Details & Lineage
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Gender *</label>
                  <select className="form-input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Father's Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Ram Bahadur Shrestha"
                    value={fatherName} 
                    onChange={e => setFatherName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mother's Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Sita Devi Shrestha"
                    value={motherName} 
                    onChange={e => setMotherName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2A: PERMANENT ADDRESS (CASCADING NEPAL DIVISIONS) */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={17} color="#2563eb" /> 2A. Permanent Address Hierarchy *
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem' }}>
                
                {/* Country */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Country *</label>
                  <select className="form-input" value={permCountry} onChange={e => setPermCountry(e.target.value)}>
                    <option value="Nepal">Nepal</option>
                  </select>
                </div>

                {/* Province */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Province *</label>
                  <select className="form-input" value={permProvince} onChange={e => handlePermProvinceChange(e.target.value)}>
                    {Object.keys(NEPAL_ADMIN_DIVISIONS).map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">District *</label>
                  <select className="form-input" value={permDistrict} onChange={e => handlePermDistrictChange(e.target.value)}>
                    {availablePermDistricts.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* Metropolitan / Municipality */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Metropolitan / Municipality *</label>
                  <select className="form-input" value={permMunicipality} onChange={e => setPermMunicipality(e.target.value)}>
                    {availablePermMunicipalities.map(mun => (
                      <option key={mun} value={mun}>{mun}</option>
                    ))}
                  </select>
                </div>

                {/* Ward */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ward No. *</label>
                  <select className="form-input" value={permWard} onChange={e => setPermWard(e.target.value)}>
                    {WARDS_LIST.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Tole / Street */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tole / Street Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. New Baneshwor Marg-4"
                    value={permStreet} 
                    onChange={e => setPermStreet(e.target.value)} 
                    required 
                  />
                </div>

              </div>
            </div>

            {/* SECTION 2B: TEMPORARY / CURRENT RESIDENCE ADDRESS */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={17} color="#2563eb" /> 2B. Temporary / Current Residence Address *
                </h3>

                {/* COPY PERMANENT ADDRESS CHECKBOX */}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', cursor: 'pointer', background: 'rgba(37, 99, 235, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  <input 
                    type="checkbox" 
                    checked={sameAsPermanent} 
                    onChange={e => setSameAsPermanent(e.target.checked)} 
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <Copy size={14} /> Same as Permanent Address
                </label>
              </div>

              {sameAsPermanent ? (
                <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  ✓ Current Residence Location synced automatically with Permanent Address.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem' }}>
                  
                  {/* Temp Country */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Country *</label>
                    <select className="form-input" value={tempCountry} onChange={e => setTempCountry(e.target.value)}>
                      <option value="Nepal">Nepal</option>
                    </select>
                  </div>

                  {/* Temp Province */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Province *</label>
                    <select className="form-input" value={tempProvince} onChange={e => handleTempProvinceChange(e.target.value)}>
                      {Object.keys(NEPAL_ADMIN_DIVISIONS).map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temp District */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">District *</label>
                    <select className="form-input" value={tempDistrict} onChange={e => handleTempDistrictChange(e.target.value)}>
                      {availableTempDistricts.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temp Metropolitan / Municipality */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Metropolitan / Municipality *</label>
                    <select className="form-input" value={tempMunicipality} onChange={e => setTempMunicipality(e.target.value)}>
                      {availableTempMunicipalities.map(mun => (
                        <option key={mun} value={mun}>{mun}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temp Ward */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Ward No. *</label>
                    <select className="form-input" value={tempWard} onChange={e => setTempWard(e.target.value)}>
                      {WARDS_LIST.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temp Tole / Street */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tole / Street Address *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Pulchowk Marg-3"
                      value={tempStreet} 
                      onChange={e => setTempStreet(e.target.value)} 
                      required 
                    />
                  </div>

                </div>
              )}
            </div>

            {/* SECTION 2C: EMERGENCY CONTACT */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                2C. Emergency Contact
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Emergency Contact Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Emergency Contact Name"
                    value={emergencyContactName} 
                    onChange={e => setEmergencyContactName(e.target.value)} 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Emergency Contact Phone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 9841234567"
                    value={emergencyContactPhone} 
                    onChange={e => setEmergencyContactPhone(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: USER PROFILE PHOTOGRAPH */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                3. User Photograph / Passport Photo *
              </h3>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {userPhotoPreview ? (
                    <img src={userPhotoPreview} alt="User Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={32} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label className="form-label">Upload Clear Photograph (Selfie / Passport Size) *</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const err = validateDocFile(file, 'Profile Photo');
                        if (err) { setDocMsg({ type: 'error', text: err }); return; }
                        setUserPhotoFile(file);
                        setUserPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="form-input"
                    style={{ padding: '0.45rem' }}
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    JPG, PNG (Max 5MB). Photo must show your clear face for identity verification.
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: GOVERNMENT ID DOCUMENT */}
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                4. Government Identification Document *
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Document Type *</label>
                  <select className="form-input" value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="citizenship">Citizenship Certificate (Nagarikta)</option>
                    <option value="passport">Passport</option>
                    <option value="license">Driver's License</option>
                    <option value="national_id">National Identity Card (NID)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Document Number *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 27-01-78-12345"
                    value={docNumber} 
                    onChange={e => setDocNumber(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* ID Image Upload Fields (Only ask for BACK photo if docType is citizenship) */}
              <div style={{ display: 'grid', gridTemplateColumns: docType === 'citizenship' ? '1fr 1fr' : '1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
                <div>
                  <label className="form-label">
                    {docType === 'citizenship' ? 'Upload Citizenship FRONT Photo *' : `Upload ${docType === 'passport' ? 'Passport Main Page' : docType === 'license' ? 'Driver License' : 'National ID'} Photo *`}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const err = validateDocFile(file, 'Document Front');
                        if (err) { setDocMsg({ type: 'error', text: err }); return; }
                        setDocFile(file);
                        if (file.type.startsWith('image/')) setFrontPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="form-input"
                    style={{ padding: '0.45rem' }}
                    required
                  />
                  {frontPreview && (
                    <img src={frontPreview} alt="ID Preview" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border-color)' }} />
                  )}
                </div>

                {docType === 'citizenship' && (
                  <div>
                    <label className="form-label">Upload Citizenship BACK Photo *</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const err = validateDocFile(file, 'Document Back');
                          if (err) { setDocMsg({ type: 'error', text: err }); return; }
                          setBackDocFile(file);
                          if (file.type.startsWith('image/')) setBackPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="form-input"
                      style={{ padding: '0.45rem' }}
                      required
                    />
                    {backPreview && (
                      <img src={backPreview} alt="Back ID Preview" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border-color)' }} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={docLoading || (kycSubmitted && !isEditingKyc)}
              className="btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                justifyContent: 'center',
                background: kycSubmitted && !isEditingKyc 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                opacity: (kycSubmitted && !isEditingKyc) ? 0.95 : 1,
                cursor: (kycSubmitted && !isEditingKyc) ? 'default' : 'pointer',
                boxShadow: kycSubmitted && !isEditingKyc 
                  ? '0 8px 20px rgba(16, 185, 129, 0.35)' 
                  : '0 8px 20px rgba(37, 99, 235, 0.35)'
              }}
            >
              {docLoading 
                ? 'Submitting Verification Records...' 
                : kycSubmitted && !isEditingKyc 
                  ? '✓ Statutory KYC Profile Submitted (Click Edit to Update)' 
                  : kycSubmitted && isEditingKyc
                    ? '💾 Save & Re-submit Statutory KYC Profile ↗'
                    : 'Submit Complete Statutory KYC Profile ↗'}
            </button>

          </form>
        )}
      </div>

    </div>
  );
}
