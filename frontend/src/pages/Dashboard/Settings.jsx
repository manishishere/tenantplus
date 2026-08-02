import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { parseApiError } from '../../utils/errorUtils';
import { 
  User, 
  Sun, 
  Moon, 
  Lock, 
  Bell, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Upload,
  Save,
  Building2
} from 'lucide-react';

export default function Settings() {
  const { user, role, checkAuth, fetchUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  // Active tab: 'profile' | 'appearance' | 'security' | 'payouts' | 'notifications'
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('input'); // 'input' | 'otp'
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });
  const [emailLoading, setEmailLoading] = useState(false);

  // Security Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState({ type: '', text: '' });
  const [securityLoading, setSecurityLoading] = useState(false);

  // Verification Document Form State
  const [docType, setDocType] = useState('citizenship');
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [backDocFile, setBackDocFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [docMsg, setDocMsg] = useState({ type: '', text: '' });
  const [docLoading, setDocLoading] = useState(false);

  // Payout Bank State
  const [bankName, setBankName] = useState('Nabil Bank');
  const [accountHolder, setAccountHolder] = useState(user?.full_name || '');
  const [accountNumber, setAccountNumber] = useState('0120010023456');
  const [payoutMsg, setPayoutMsg] = useState({ type: '', text: '' });

  // Notification Preferences State
  const [notifs, setNotifs] = useState({
    emailRentDue: true,
    emailMaintenance: true,
    emailAgreements: true
  });

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailMsg({ type: '', text: '' });
    try {
      const res = await api.post('/accounts/request-email-change/', { new_email: newEmail.trim() });
      setEmailMsg({ type: 'success', text: res.data.detail || 'Verification code sent to new email!' });
      setEmailStep('otp');
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to request email change.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    if (!emailOtp.trim()) return;
    setEmailLoading(true);
    setEmailMsg({ type: '', text: '' });
    try {
      const res = await api.post('/accounts/confirm-email-change/', { new_email: newEmail.trim(), otp: emailOtp.trim() });
      setEmailMsg({ type: 'success', text: 'Email address updated & verified successfully!' });
      setNewEmail('');
      setEmailOtp('');
      setEmailStep('input');
      if (fetchUserProfile) await fetchUserProfile();
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.detail || 'Invalid or expired verification code.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (user?.is_verified) return;
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await api.put('/accounts/profile/', {
        full_name: fullName,
        phone: phone
      });
      if (fetchUserProfile) await fetchUserProfile();
      setProfileMsg({ type: 'success', text: 'Profile details updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSecurityLoading(true);
    setSecurityMsg({ type: '', text: '' });
    try {
      await api.post('/accounts/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: confirmPassword
      });
      setSecurityMsg({ type: 'success', text: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const validateDocFile = (file, label) => {
    if (!file) return null;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (file.size > MAX_SIZE) {
      return `${label} (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit. Please select a smaller file.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${label} format is not supported. Please upload a PNG, JPG, or PDF file.`;
    }
    return null;
  };

  const handleFrontFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const err = validateDocFile(file, docType === 'citizenship' ? 'Citizenship Front photo' : 'Document file');
      if (err) {
        setDocMsg({ type: 'error', text: err });
        setDocFile(null);
        setFrontPreview(null);
        return;
      }
      setDocMsg({ type: '', text: '' });
      setDocFile(file);
      if (file.type.startsWith('image/')) {
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setFrontPreview(null);
      }
    }
  };

  const handleBackFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const err = validateDocFile(file, 'Citizenship Back photo');
      if (err) {
        setDocMsg({ type: 'error', text: err });
        setBackDocFile(null);
        setBackPreview(null);
        return;
      }
      setDocMsg({ type: '', text: '' });
      setBackDocFile(file);
      if (file.type.startsWith('image/')) {
        setBackPreview(URL.createObjectURL(file));
      } else {
        setBackPreview(null);
      }
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setDocMsg({ type: 'error', text: 'Please enter your document identification number.' });
      return;
    }
    if (!docFile) {
      setDocMsg({ type: 'error', text: docType === 'citizenship' ? 'Please select the FRONT photo of your citizenship.' : 'Please select a document file to upload.' });
      return;
    }
    if (docType === 'citizenship' && !backDocFile) {
      setDocMsg({ type: 'error', text: 'Please select the BACK photo of your citizenship certificate.' });
      return;
    }

    const frontErr = validateDocFile(docFile, 'Front document');
    if (frontErr) {
      setDocMsg({ type: 'error', text: frontErr });
      return;
    }
    if (backDocFile) {
      const backErr = validateDocFile(backDocFile, 'Back document');
      if (backErr) {
        setDocMsg({ type: 'error', text: backErr });
        return;
      }
    }

    setDocLoading(true);
    setDocMsg({ type: '', text: '' });
    try {
      await api.post('/accounts/documents/', {
        doc_type: docType,
        doc_number: docNumber.trim(),
        doc_url: `/media/documents/${docFile.name}`,
        back_doc_url: backDocFile ? `/media/documents/${backDocFile.name}` : null
      });
      setDocMsg({ type: 'success', text: 'KYC Document submitted successfully! Admin will review and verify your account.' });
      setDocNumber('');
      setDocFile(null);
      setBackDocFile(null);
      setFrontPreview(null);
      setBackPreview(null);
      if (checkAuth) await checkAuth();
      if (fetchUserProfile) await fetchUserProfile();
    } catch (err) {
      setDocMsg({ type: 'error', text: parseApiError(err, 'Failed to submit document for review.') });
    } finally {
      setDocLoading(false);
    }
  };

  const handleSavePayouts = (e) => {
    e.preventDefault();
    setPayoutMsg({ type: 'success', text: 'Escrow Payout bank account saved securely.' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.875rem' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Manage your personal details, verification badges, dark/light themes, and escrow payout settings.
        </p>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem' }}>
        {/* Navigation Tabs */}
        <div className="glass-panel" style={{ padding: '0.75rem', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <User size={18} /> Profile & Verification
          </button>

          <button
            className={`nav-link ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Appearance & Theme
          </button>

          <button
            className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Lock size={18} /> Security & Password
          </button>

          <button
            className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Bell size={18} /> Notifications
          </button>

          {role === 'landlord' && (
            <button
              className={`nav-link ${activeTab === 'payouts' ? 'active' : ''}`}
              onClick={() => setActiveTab('payouts')}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <CreditCard size={18} /> Escrow Bank Payouts
            </button>
          )}
        </div>

        {/* Tab Content Panel */}
        <div>
          {/* 1. PROFILE & VERIFICATION TAB */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Personal Profile</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role: <strong style={{ textTransform: 'capitalize' }}>{role}</strong></span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <ShieldCheck size={14} /> Verified Account
                </div>
              </div>

              {/* KYC Verified Lock Banner */}
              {user?.is_verified && (
                <div style={{
                  padding: '0.85rem 1.2rem',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid var(--pill-border)',
                  borderRadius: '0.65rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Lock size={20} color="var(--primary-indigo)" />
                  <div>
                    <strong style={{ color: 'var(--primary-indigo)' }}>🔒 Personal Identification Details Locked</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Your account has been officially <strong>KYC Verified by Admin</strong>. To prevent identity fraud, personal details (Full Name & Phone) are locked and cannot be edited. You can still change and verify your email address below.
                    </div>
                  </div>
                </div>
              )}

              {profileMsg.text && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: profileMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: profileMsg.type === 'success' ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              {/* Personal Details Form */}
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Full Name</span>
                    {user?.is_verified && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Locked (KYC Verified)</span>}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={user?.is_verified}
                    style={user?.is_verified ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phone Number</span>
                    {user?.is_verified && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Locked (KYC Verified)</span>}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={user?.is_verified}
                    style={user?.is_verified ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                    placeholder="+977 9800000000"
                  />
                </div>

                {!user?.is_verified && (
                  <button type="submit" className="btn-primary" disabled={profileLoading} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                    <Save size={16} style={{ marginRight: '0.4rem' }} />
                    {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                )}
              </form>

              {/* Email Change Section with Email Verification OTP */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>✉️ Email Address & Verification</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Current Email: <strong style={{ color: 'var(--text-main)' }}>{user?.email}</strong>. Changing your email requires verifying the new address via a 6-digit OTP verification code.
                </p>

                {emailMsg.text && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    background: emailMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: emailMsg.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {emailMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{emailMsg.text}</span>
                  </div>
                )}

                {emailStep === 'input' ? (
                  <form onSubmit={handleRequestEmailChange} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1 1 280px' }}>
                      <label className="form-label">New Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="enter.new.email@example.com"
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={emailLoading} style={{ height: '42px' }}>
                      {emailLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmEmailChange} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>📩 Enter 6-Digit OTP Verification Code</strong>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                        A 6-digit code was sent to <strong>{newEmail}</strong>. Enter the code to verify your new email.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        style={{ width: '160px', letterSpacing: '0.25em', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                        required
                      />
                      <button type="submit" className="btn-primary" disabled={emailLoading} style={{ padding: '0.6rem 1.25rem' }}>
                        {emailLoading ? 'Verifying...' : 'Verify OTP & Change Email'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEmailStep('input'); setEmailOtp(''); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Cancel / Use Different Email
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Document Verification Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={20} color="var(--primary-indigo)" /> Identity Verification & KYC
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                      Submit official Government ID documents to earn the <strong>🛡️ Verified Badge</strong> on your profile.
                    </p>
                  </div>
                  {user?.is_verified ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(16,185,129,0.3)' }}>
                      <CheckCircle size={14} /> Verified Account
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
                      <ShieldCheck size={14} /> Compulsory KYC Required
                    </span>
                  )}
                </div>

                {user?.is_verified ? (
                  <div style={{ padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <ShieldCheck size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Account Officially Verified ✅</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 400, marginTop: '0.15rem' }}>
                        Your government identification documents have been verified and approved by TenantPlus Admin.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-dark, rgba(255,255,255,0.02))', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    {docMsg.text && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        marginBottom: '1.25rem',
                        background: docMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: docMsg.type === 'success' ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: docMsg.type === 'success' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)'
                      }}>
                        {docMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{docMsg.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>Document Type *</label>
                          <select className="form-input" value={docType} onChange={(e) => {
                            setDocType(e.target.value);
                            setDocFile(null);
                            setBackDocFile(null);
                            setFrontPreview(null);
                            setBackPreview(null);
                          }}>
                            <option value="citizenship">Citizenship Certificate (🇳🇵 Front & Back)</option>
                            <option value="passport">Passport (🛂 Single Page)</option>
                            <option value="license">Driver's License (🚗 Front Photo)</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            {docType === 'citizenship' ? 'Citizenship Number *' : docType === 'passport' ? 'Passport Number *' : 'License Number *'}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder={docType === 'citizenship' ? 'e.g. 12-01-78-01234' : 'e.g. PA123456'}
                            value={docNumber}
                            onChange={(e) => setDocNumber(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* File Upload Dropzones */}
                      {docType === 'citizenship' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          {/* Front Side */}
                          <div style={{ border: '2px dashed var(--border-color)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
                            <label style={{ cursor: 'pointer', display: 'block' }}>
                              <Upload size={22} color="var(--primary-indigo)" style={{ margin: '0 auto 0.5rem' }} />
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Citizenship Front Photo *</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PNG, JPG or PDF</div>
                              <input type="file" accept="image/*,.pdf" onChange={handleFrontFileChange} style={{ display: 'none' }} />
                              <span style={{ fontSize: '0.75rem', background: 'var(--primary-indigo)', color: 'white', padding: '0.3rem 0.75rem', borderRadius: '0.25rem', display: 'inline-block' }}>Choose Front File</span>
                            </label>
                            {frontPreview && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <img src={frontPreview} alt="Front Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                              </div>
                            )}
                            {docFile && !frontPreview && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>📁 {docFile.name}</div>
                            )}
                          </div>

                          {/* Back Side */}
                          <div style={{ border: '2px dashed var(--border-color)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
                            <label style={{ cursor: 'pointer', display: 'block' }}>
                              <Upload size={22} color="var(--primary-indigo)" style={{ margin: '0 auto 0.5rem' }} />
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Citizenship Back Photo *</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PNG, JPG or PDF</div>
                              <input type="file" accept="image/*,.pdf" onChange={handleBackFileChange} style={{ display: 'none' }} />
                              <span style={{ fontSize: '0.75rem', background: 'var(--primary-indigo)', color: 'white', padding: '0.3rem 0.75rem', borderRadius: '0.25rem', display: 'inline-block' }}>Choose Back File</span>
                            </label>
                            {backPreview && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <img src={backPreview} alt="Back Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                              </div>
                            )}
                            {backDocFile && !backPreview && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>📁 {backDocFile.name}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ border: '2px dashed var(--border-color)', padding: '1.25rem', borderRadius: '0.5rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
                          <label style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload size={24} color="var(--primary-indigo)" style={{ margin: '0 auto 0.5rem' }} />
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Upload Document File *</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PNG, JPG or PDF format</div>
                            <input type="file" accept="image/*,.pdf" onChange={handleFrontFileChange} style={{ display: 'none' }} />
                            <span style={{ fontSize: '0.75rem', background: 'var(--primary-indigo)', color: 'white', padding: '0.35rem 0.85rem', borderRadius: '0.25rem', display: 'inline-block' }}>Select Document Image</span>
                          </label>
                          {frontPreview && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <img src={frontPreview} alt="Document Preview" style={{ maxWidth: '200px', maxHeight: '120px', objectFit: 'cover', borderRadius: '0.25rem', margin: '0 auto' }} />
                            </div>
                          )}
                          {docFile && !frontPreview && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>📁 {docFile.name}</div>
                          )}
                        </div>
                      )}

                      <button type="submit" className="btn-primary" disabled={docLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                        <Upload size={18} />
                        {docLoading ? 'Submitting KYC Verification...' : 'Submit KYC Documents for Admin Review'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. APPEARANCE & THEME TAB */}
          {activeTab === 'appearance' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Appearance & Theme Settings</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Customize the look and feel of your TenantPlus dashboard workspace.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Dark Theme Option */}
                <div
                  onClick={() => setTheme('dark')}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                    border: theme === 'dark' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: theme === 'dark' ? '0 0 15px rgba(99,102,241,0.4)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <Moon size={28} color="#818cf8" />
                    {theme === 'dark' && <CheckCircle size={20} color="#10b981" />}
                  </div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>Dark Theme</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Sleek dark mode with glassmorphic slate overlays and glowing vibrant accents.
                  </p>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => setTheme('light')}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
                    border: theme === 'light' ? '2px solid #4f46e5' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: theme === 'light' ? '0 0 15px rgba(79,70,229,0.3)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#0f172a'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <Sun size={28} color="#f59e0b" />
                    {theme === 'light' && <CheckCircle size={20} color="#10b981" />}
                  </div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Light Theme</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Bright, clean modern theme optimized for high-contrast daytime clarity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Security & Authentication</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Update your password and maintain secure session access.
                </p>
              </div>

              {securityMsg.text && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: securityMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: securityMsg.type === 'success' ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {securityMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{securityMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={securityLoading} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                  <Lock size={16} style={{ marginRight: '0.4rem' }} />
                  {securityLoading ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* 4. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Notification Preferences</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Configure your email and mobile push notifications for rent payments and lease updates.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Rent & Escrow Payment Alerts</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get notified when rent payments or escrow disbursements occur</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifs.emailRentDue}
                    onChange={(e) => setNotifs({ ...notifs, emailRentDue: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Maintenance Ticket Notifications</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updates when repair requests change status</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifs.emailMaintenance}
                    onChange={(e) => setNotifs({ ...notifs, emailMaintenance: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Lease Agreement Statuses</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notifications on lease signatures, renewals, or termination</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifs.emailAgreements}
                    onChange={(e) => setNotifs({ ...notifs, emailAgreements: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 5. ESCROW PAYOUT BANK DETAILS TAB (LANDLORD) */}
          {activeTab === 'payouts' && role === 'landlord' && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Escrow Bank Payout Account</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Register your bank details for direct payout disbursals from <strong>TenantPlus Escrow</strong>.
                </p>
              </div>

              {payoutMsg.text && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={16} />
                  <span>{payoutMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSavePayouts} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Nabil Bank, NIC Asia, Everest Bank"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Bank Account Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                  <Save size={16} style={{ marginRight: '0.4rem' }} /> Save Escrow Payout Bank
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
