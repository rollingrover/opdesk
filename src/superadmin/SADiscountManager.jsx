import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';

function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

function Toast({ toast }) {
  if (!toast) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      padding: '12px 20px',
      borderRadius: 8,
      backgroundColor: toast.type === 'success' ? '#22c55e' : 
                     toast.type === 'error' ? '#ef4444' : '#3b82f6',
      color: 'white',
      fontWeight: 600,
      fontSize: 14,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <Icon name={toast.type === 'success' ? 'check' : 'alert'} size={16} />
      {toast.message}
    </div>
  );
}

function SADiscountManager({ companyId, companyName, onClose }) {
  const { toast, showToast } = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    type: 'percentage', // percentage, fixed, free
    value: '',
    applies_to: 'subscription', // subscription, addons, all
    addon_key: '',
    valid_from: '',
    valid_until: '',
    note: ''
  });
  const [saving, setSaving] = useState(false);
  const [addons, setAddons] = useState([]);

  useEffect(() => {
    loadDiscounts();
    loadAddons();
  }, [companyId]);

  async function loadDiscounts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_discounts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error loading discounts:', error);
      showToast('Failed to load discounts', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAddons() {
    try {
      const { data, error } = await supabase
        .from('addon_pricing')
        .select('*')
        .order('addon_key');
      
      if (error) throw error;
      setAddons(data || []);
    } catch (error) {
      console.error('Error loading addons:', error);
    }
  }

  async function saveDiscount(e) {
    e.preventDefault();
    if (!form.value) {
      showToast('Please enter a discount value', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        type: form.type,
        value: parseFloat(form.value),
        applies_to: form.applies_to,
        addon_key: form.addon_key || null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        note: form.note || null,
        active: true
      };

      const { error } = await supabase
        .from('company_discounts')
        .insert([payload]);

      if (error) throw error;

      showToast('Discount added successfully', 'success');
      setForm({
        type: 'percentage',
        value: '',
        applies_to: 'subscription',
        addon_key: '',
        valid_from: '',
        valid_until: '',
        note: ''
      });
      loadDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      showToast('Failed to save discount', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleDiscount(id, active) {
    try {
      const { error } = await supabase
        .from('company_discounts')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      showToast(`Discount ${!active ? 'activated' : 'deactivated'}`, 'success');
      loadDiscounts();
    } catch (error) {
      console.error('Error toggling discount:', error);
      showToast('Failed to update discount', 'error');
    }
  }

  async function deleteDiscount(id) {
    if (!confirm('Delete this discount? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('company_discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Discount deleted', 'success');
      loadDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      showToast('Failed to delete discount', 'error');
    }
  }

  const inputStyle = {
    background: '#111',
    border: '1px solid #333',
    color: 'white',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 600,
    display: 'block',
    marginBottom: 4
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 70,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: 16,
        padding: 28,
        width: 600,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #222'
      }} onClick={e => e.stopPropagation()}>
        <Toast toast={toast} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: 'white', fontSize: 20, margin: 0 }}>
            Discounts for {companyName}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Add Discount Form */}
        <div style={{ background: '#111', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'white', fontSize: 15, marginBottom: 16 }}>Add New Discount</h3>
          
          <form onSubmit={saveDiscount}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Discount Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (R)</option>
                  <option value="free">100% Free</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Value</label>
                <input
                  type="number"
                  min="0"
                  max={form.type === 'percentage' ? 100 : undefined}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'percentage' ? 'e.g. 50' : 'e.g. 500'}
                  style={inputStyle}
                  required={form.type !== 'free'}
                  disabled={form.type === 'free'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Applies To</label>
              <select
                value={form.applies_to}
                onChange={e => setForm({ ...form, applies_to: e.target.value })}
                style={inputStyle}
              >
                <option value="subscription">Subscription Only</option>
                <option value="addons">Add-ons Only</option>
                <option value="all">Everything (Subscription + Add-ons)</option>
              </select>
            </div>

            {form.applies_to !== 'subscription' && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Specific Add-on (optional)</label>
                <select
                  value={form.addon_key}
                  onChange={e => setForm({ ...form, addon_key: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">All Add-ons</option>
                  {addons.map(a => (
                    <option key={a.id} value={a.addon_key}>
                      {a.addon_key.replace(/_/g, ' ')} (R{a.monthly_price}/mo)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Valid From</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={e => setForm({ ...form, valid_from: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Valid Until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={e => setForm({ ...form, valid_until: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Note (internal)</label>
              <input
                type="text"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. Founder discount, special offer"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#D4A853',
                color: '#0F2540',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
                width: '100%'
              }}
            >
              {saving ? 'Adding...' : 'Add Discount'}
            </button>
          </form>
        </div>

        {/* Existing Discounts */}
        <div>
          <h3 style={{ color: 'white', fontSize: 15, marginBottom: 12 }}>Active Discounts</h3>
          
          {loading ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Loading discounts...</div>
          ) : discounts.length === 0 ? (
            <div style={{ background: '#111', borderRadius: 8, padding: 20, textAlign: 'center', color: '#6b7280' }}>
              No discounts for this company yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {discounts.map(d => (
                <div key={d.id} style={{
                  background: '#111',
                  borderRadius: 8,
                  padding: 16,
                  border: `1px solid ${d.active ? '#D4A85344' : '#222'}`,
                  opacity: d.active ? 1 : 0.6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{
                        background: d.type === 'free' ? '#7c3aed33' :
                                  d.type === 'percentage' ? '#3b82f633' : '#22c55e33',
                        color: d.type === 'free' ? '#a78bfa' :
                               d.type === 'percentage' ? '#60a5fa' : '#4ade80',
                        borderRadius: 20,
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        marginRight: 8
                      }}>
                        {d.type === 'free' ? '100% FREE' : 
                         d.type === 'percentage' ? `${d.value}%` : 
                         `R${d.value}`}
                      </span>
                      <span style={{
                        background: d.applies_to === 'all' ? '#D4A85333' : '#6b728033',
                        color: d.applies_to === 'all' ? '#D4A853' : '#9ca3af',
                        borderRadius: 20,
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {d.applies_to}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => toggleDiscount(d.id, d.active)}
                        style={{
                          background: d.active ? '#713f12' : '#14532d',
                          color: d.active ? '#fde68a' : '#4ade80',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {d.active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteDiscount(d.id)}
                        style={{
                          background: '#1a0000',
                          color: '#f87171',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {d.note && (
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>
                      📝 {d.note}
                    </div>
                  )}
                  
                  {d.addon_key && (
                    <div style={{ color: '#D4A853', fontSize: 12, marginBottom: 4 }}>
                      Add-on: {d.addon_key.replace(/_/g, ' ')}
                    </div>
                  )}
                  
                  {(d.valid_from || d.valid_until) && (
                    <div style={{ color: '#6b7280', fontSize: 11 }}>
                      Valid: {d.valid_from ? new Date(d.valid_from).toLocaleDateString() : 'anytime'}
                      {d.valid_until && ` → ${new Date(d.valid_until).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SADiscountManager;