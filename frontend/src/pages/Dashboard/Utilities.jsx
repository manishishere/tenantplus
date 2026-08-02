import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  DollarSign, 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Zap,
  Droplet,
  Globe,
  Trash,
  Camera
} from 'lucide-react';

export default function Utilities() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  const [bills, setBills] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bill Form State
  const [form, setForm] = useState({
    agreement: '',
    billingMonth: '',
    totalAmount: '',
    dueDate: '',
    status: 'unpaid'
  });

  // Reading Form State (Optional details)
  const [addReading, setAddReading] = useState(false);
  const [reading, setReading] = useState({
    utilityType: 'electricity',
    previousReading: '',
    currentReading: '',
    readingDate: ''
  });

  // Meter Photo Proof State
  const [meterPhoto, setMeterPhoto] = useState(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bills
      const billsRes = await api.get('/utilities/bills/');
      setBills(billsRes.data.results || billsRes.data || []);

      if (isLandlord) {
        // Landlords need to see active agreements to select which lease to issue a bill for
        const agreementsRes = await api.get('/agreements/');
        const active = (agreementsRes.data.results || agreementsRes.data || []).filter(
          a => a.status === 'active'
        );
        setAgreements(active);
        if (active.length > 0) {
          setForm(f => ({ ...f, agreement: active[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load utilities data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isLandlord]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit new utility bill
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;
    setError(null);

    if (!form.agreement || !form.billingMonth || !form.totalAmount || !form.dueDate) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      // 1. Create the Utility Bill
      const billPayload = {
        agreement: form.agreement,
        billing_month: form.billingMonth, // expecting "YYYY-MM-DD"
        total_amount: parseFloat(form.totalAmount),
        due_date: form.dueDate,
        status: form.status
      };

      const billRes = await api.post('/utilities/bills/', billPayload);
      const createdBill = billRes.data;

      // 2. Optional: Create Meter Reading
      if (addReading && reading.previousReading && reading.currentReading && reading.readingDate) {
        const readingPayload = {
          agreement: form.agreement,
          bill: createdBill.id,
          utility_type: reading.utilityType,
          previous_reading: parseFloat(reading.previousReading),
          current_reading: parseFloat(reading.currentReading),
          reading_date: reading.readingDate
        };
        await api.post('/utilities/readings/', readingPayload);
      }

      // Reset form
      setForm({
        agreement: agreements[0]?.id || '',
        billingMonth: '',
        totalAmount: '',
        dueDate: '',
        status: 'unpaid'
      });
      setAddReading(false);
      setReading({
        utilityType: 'electricity',
        previousReading: '',
        currentReading: '',
        readingDate: ''
      });

      // Refresh list
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to issue utility bill.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Mark bill as Paid / Unpaid
  const handleToggleStatus = async (billId, currentStatus) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.patch(`/utilities/bills/${billId}/`, { status: nextStatus });
      // Refresh list
      const billsRes = await api.get('/utilities/bills/');
      setBills(billsRes.data.results || billsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to update bill status.');
    }
  };

  // Download PDF Invoice
  const handleDownloadBillPDF = async (billId) => {
    try {
      const response = await api.get(`/utilities/bills/${billId}/pdf/`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utility_bill_${billId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download utility bill PDF. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={12}/> Paid</span>;
      case 'overdue':
        return <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12}/> Overdue</span>;
      default:
        return <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> Unpaid</span>;
    }
  };

  const getUtilityIcon = (type) => {
    switch (type) {
      case 'water':
        return <Droplet size={14} color="#3b82f6" />;
      case 'electricity':
        return <Zap size={14} color="#f59e0b" />;
      case 'internet':
        return <Globe size={14} color="#8b5cf6" />;
      default:
        return <FileText size={14} color="#10b981" />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        Loading Utility Invoices...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'var(--font-family)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <DollarSign size={32} color="var(--primary-indigo)" />
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Utility Bills</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {isLandlord ? 'Issue and monitor utility invoices for your tenants' : 'View and settle your utility invoices'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isLandlord ? '1fr 1.5fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Issue Utility Bill Form (Landlord Only) */}
        {isLandlord && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} color="var(--primary-indigo)" /> Issue New Utility Bill
            </h2>

            {agreements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                No active lease agreements found. You can only issue utility bills to tenants under active lease agreements.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Lease Agreement (Tenant) *</label>
                  <select 
                    className="form-input"
                    value={form.agreement}
                    onChange={(e) => setForm({ ...form, agreement: e.target.value })}
                    required
                  >
                    {agreements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tenant?.full_name || a.tenant_email} ({a.property?.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Billing Month *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={form.billingMonth}
                    onChange={(e) => setForm({ ...form, billingMonth: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Select any date within the billing month</small>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="form-label">Total Amount (Rs.) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      placeholder="e.g. 2400.00"
                      value={form.totalAmount}
                      onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="form-label">Due Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Meter Dial Photo Attachment Proof */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Camera size={14} color="var(--primary-indigo)" /> NEA/KUKL Meter Dial Photo Proof
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setMeterPhoto(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Attach clear photo of the meter dial to eliminate tenant bill disputes.
                  </span>
                </div>

                {/* Meter Reading Option */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={addReading} 
                      onChange={(e) => setAddReading(e.target.checked)}
                      style={{ accentColor: 'var(--primary-indigo)' }}
                    />
                    Include Meter Reading Details
                  </label>
                </div>

                {addReading && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Utility Type</label>
                      <select 
                        className="form-input"
                        value={reading.utilityType}
                        onChange={(e) => setReading({ ...reading, utilityType: e.target.value })}
                      >
                        <option value="electricity">Electricity</option>
                        <option value="water">Water</option>
                        <option value="internet">Internet</option>
                        <option value="garbage">Garbage</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label className="form-label">Previous Reading</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="form-input" 
                          placeholder="e.g. 1042.4"
                          value={reading.previousReading}
                          onChange={(e) => setReading({ ...reading, previousReading: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label className="form-label">Current Reading</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="form-input" 
                          placeholder="e.g. 1168.9"
                          value={reading.currentReading}
                          onChange={(e) => setReading({ ...reading, currentReading: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Reading Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={reading.readingDate}
                        onChange={(e) => setReading({ ...reading, readingDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitLoading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {submitLoading ? 'Issuing Bill...' : 'Issue Utility Bill'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Right Column: Bill List History */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Utility Invoice Records</h2>

          {bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No utility bills found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Property & Tenant</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Billing Month</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Due Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const billMonth = new Date(bill.billing_month).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                  const isPaid = bill.status === 'paid';
                  
                  return (
                    <tr key={bill.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>
                          {bill.agreement_detail?.property?.title || bill.agreement?.property?.title || 'Sanagaun Property'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Tenant: {bill.agreement_detail?.tenant?.full_name || bill.agreement?.tenant?.full_name || 'Manish Gautam'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{billMonth}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Rs. {parseFloat(bill.total_amount).toLocaleString()}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                        {new Date(bill.due_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{getStatusBadge(bill.status)}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                          <button 
                            onClick={() => handleDownloadBillPDF(bill.id)}
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f1', borderRadius: '0.25rem', padding: '0.35rem 0.6rem', color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Download Utility Bill PDF"
                          >
                            <FileText size={14} /> PDF
                          </button>

                          {/* Landlord Toggle Payment Action */}
                          {isLandlord ? (
                            <>
                              <button 
                                onClick={() => handleToggleStatus(bill.id, bill.status)}
                                style={{ background: isPaid ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', border: `1px solid ${isPaid ? '#f59e0b' : '#10b981'}`, borderRadius: '0.25rem', padding: '0.35rem 0.75rem', color: isPaid ? '#f59e0b' : '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
                              >
                                {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                              </button>
                              <button 
                                onClick={() => handleDeleteBill(bill.id)}
                                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid #ef4444', borderRadius: '0.25rem', padding: '0.35rem 0.5rem', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                <Trash size={14} />
                              </button>
                            </>
                          ) : (
                            // Tenant static details/readings display
                            bill.readings?.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.05)', minWidth: '130px' }}>
                                {bill.readings.map((r) => (
                                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {getUtilityIcon(r.utility_type)}
                                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.utility_type}:</span> 
                                    <span>{parseFloat(r.current_reading) - parseFloat(r.previous_reading)} units</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No meter readings</span>
                            )
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
