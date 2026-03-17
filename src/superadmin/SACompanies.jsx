import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import { check2FARequirement } from '../lib/totp.jsx';
import SADiscountManager from './SADiscountManager';

// Toast notification system
function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

// Toast component
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

// ─── SA: COMPANIES LIST ───────────────────────
function SACompanies({ onSelect }) {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast, showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sa_get_all_companies');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('sa_get_all_companies error', error);
      showToast('Failed to load companies', 'error');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => { load(); }, []);

  const tierColor = { free: '#6b7280', basic: '#3b82f6', standard: '#9333ea', premium: '#D4A853' };
  const statusColor = { active: '#22c55e', suspended: '#ef4444', trial: '#f59e0b', churned: '#6b7280', vip: '#D4A853' };

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    const matchTier = filterTier === 'all' || c.subscription_tier === filterTier;
    const matchStatus = filterStatus === 'all' || (c.account_status || 'active') === filterStatus;
    return matchSearch && matchTier && matchStatus;
  });

  // MRR calculation using actual pricing from database
  const [tierPrices, setTierPrices] = useState({ free: 0, basic: 349, standard: 1099, premium: 2499 });

  useEffect(() => {
    async function loadPrices() {
      const { data } = await supabase.from('tier_pricing').select('tier, monthly_price');
      if (data) {
        const prices = { free: 0 };
        data.forEach(p => { prices[p.tier] = parseFloat(p.monthly_price) || 0; });
        setTierPrices(prices);
      }
    }
    loadPrices();
  }, []);

  const mrr = companies.reduce((s, c) => s + (tierPrices[c.subscription_tier || 'free'] || 0), 0);
  const arr = mrr * 12;
  const paying = companies.filter(c => c.subscription_tier !== 'free').length;

  return (
    <div>
      <Toast toast={toast} />
      
      {/* MRR Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          ['Total Companies', companies.length, '#6b7280'],
          ['Paying', paying, '#22c55e'],
          ['MRR', `R${mrr.toLocaleString()}`, '#D4A853'],
          ['ARR', `R${arr.toLocaleString()}`, '#9333ea'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#1a1a1a', borderRadius: 12, padding: '16px 20px', border: '1px solid #222' }}>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{l}</div>
            <div style={{ color: c, fontSize: 24, fontWeight: 900 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company or email..."
          style={{
            flex: 1,
            minWidth: 200,
            background: '#1a1a1a',
            border: '1px solid #333',
            color: 'white',
            borderRadius: 8,
            padding: '9px 14px',
            fontSize: 13
          }}
        />
        <select
          value={filterTier}
          onChange={e => setFilterTier(e.target.value)}
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            color: '#9ca3af',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13
          }}
        >
          <option value="all">All Tiers</option>
          {['free', 'basic', 'standard', 'premium'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            color: '#9ca3af',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13
          }}
        >
          <option value="all">All Statuses</option>
          {['active', 'trial', 'suspended', 'churned', 'vip'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d0d' }}>
              {['Company', 'Tier', 'Status', 'Bookings', 'Users', 'Add-ons', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #222' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No companies found</td></tr>
            ) : filtered.map(c => {
              const status = c.account_status || 'active';
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }} onClick={() => onSelect(c)}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ color: 'white', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{c.email || '—'} · {c.country || '—'}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: tierColor[c.subscription_tier || 'free'] + '22',
                      color: tierColor[c.subscription_tier || 'free'],
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>{c.subscription_tier || 'free'}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: statusColor[status] + '22',
                      color: statusColor[status],
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>{status}</span>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#9ca3af', fontWeight: 600 }}>{c.booking_count || 0}</td>
                  <td style={{ padding: '11px 14px', color: '#9ca3af' }}>{c.user_count || 0}</td>
                  <td style={{ padding: '11px 14px', color: '#9ca3af' }}>{c.addon_count || 0}</td>
                  <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 13 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-ZA') : '—'}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>Manage →</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SA: COMPANY DETAIL ───────────────────────
function SACompanyDetail({ company, onBack, globalPricing }) {
  const { toast, showToast } = useToast();
  const [co, setCo] = useState(company);
  const [profiles, setProfiles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [addons, setAddons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');
  const [addonForm, setAddonForm] = useState({ type: 'vehicles', qty: 1, price_override: null, note: '' });
  const [adminNotes, setAdminNotes] = useState(company.admin_notes || '');
  const [accountStatus, setAccountStatus] = useState(company.account_status || 'active');
  const [dbQuota, setDbQuota] = useState(String(company.db_quota_mb || 200));
  const [storageQuota, setStorageQuota] = useState(String(company.storage_quota_mb || 100));
  const [savingSettings, setSavingSettings] = useState(false);
  const [upgradeExpiry, setUpgradeExpiry] = useState('');
  const [forcing2FA, setForcing2FA] = useState(false);
  const [showDiscountManager, setShowDiscountManager] = useState(false);

  const tiers = ['free', 'basic', 'standard', 'premium'];
  const tierColor = { free: '#6b7280', basic: '#3b82f6', standard: '#9333ea', premium: '#D4A853' };

  async function load() {
    try {
      const [p, b, a] = await Promise.all([
        supabase.from('profiles').select('*').eq('company_id', co.id),
        supabase.from('bookings').select('id,booking_ref,guest_name,total_amount,status,created_at').eq('company_id', co.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('company_addons').select('*').eq('company_id', co.id).eq('active', true),
      ]);
      setProfiles(p.data || []);
      setBookings(b.data || []);
      setAddons(a.data || []);
    } catch (error) {
      console.error('Error loading company details:', error);
      showToast('Failed to load company details', 'error');
    }
  }
  
  useEffect(() => { load(); }, [co.id]);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const { error } = await supabase.rpc('sa_update_company', {
        p_company_id: co.id,
        p_admin_notes: adminNotes,
        p_account_status: accountStatus,
        p_db_quota_mb: parseInt(dbQuota) || null,
        p_storage_quota_mb: parseInt(storageQuota) || null,
      });
      if (error) throw error;
      
      setCo({ ...co, admin_notes: adminNotes, account_status: accountStatus, db_quota_mb: parseInt(dbQuota), storage_quota_mb: parseInt(storageQuota) });
      showToast('Company settings saved', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error: ' + error.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  }

  async function deleteCompany() {
    const confirmName = prompt(`Type the company name exactly to confirm deletion:\n\n${co.name}`);
    if (confirmName !== co.name) {
      showToast('Name did not match — deletion cancelled', 'error');
      return;
    }
    if (!confirm('FINAL WARNING: This will permanently delete all company data including bookings, invoices, staff, and auth accounts. This cannot be undone.')) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase.rpc('sa_delete_company', { p_company_id: co.id });
      if (error) throw error;
      
      showToast('Company deleted permanently', 'success');
      onBack();
    } catch (error) {
      console.error('Error deleting company:', error);
      showToast('Error: ' + error.message, 'error');
      setSavingSettings(false);
    }
  }

  async function suspendCompany() {
    if (!confirm(`${accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'} ${co.name}?`)) return;
    const newStatus = accountStatus === 'suspended' ? 'active' : 'suspended';
    setAccountStatus(newStatus);
    try {
      await supabase.rpc('sa_update_company', { p_company_id: co.id, p_account_status: newStatus });
      setCo({ ...co, account_status: newStatus });
      showToast(`Company ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  }

  async function changeTier(tier) {
    setSaving(true);
    try {
      let expiresAt = null;
      if (upgradeExpiry) {
        expiresAt = new Date(upgradeExpiry).toISOString();
      } else if (tier !== 'free') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        expiresAt = d.toISOString();
      }
      const { error } = await supabase.rpc('sa_update_company', {
        p_company_id: co.id,
        p_tier: tier,
        p_expires_at: expiresAt,
      });
      if (error) throw error;
      
      setCo({ ...co, subscription_tier: tier, subscription_expires_at: expiresAt });
      showToast('Tier updated to ' + tier + (expiresAt ? ' (expires ' + new Date(expiresAt).toLocaleDateString('en-ZA') + ')' : ''), 'success');
      setUpgradeExpiry('');
    } catch (error) {
      console.error('Error changing tier:', error);
      showToast('Failed to update tier: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function grantAddon(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const priceRow = globalPricing.find(p => p.addon_key === addonForm.type);
      const { error } = await supabase.from('company_addons').insert({
        company_id: co.id,
        addon_type: addonForm.type,
        addon_key: addonForm.type,
        quantity: parseInt(addonForm.qty),
        price_per_unit: addonForm.price_override || priceRow?.monthly_price || 49,
        billing_cycle: 'monthly',
        note: addonForm.note,
        active: true,
        granted_by_superadmin: true,
      });
      if (error) throw error;
      
      showToast('Add-on granted', 'success');
      setAddonForm({ type: 'vehicles', qty: 1, price_override: null, note: '' });
      load();
    } catch (error) {
      console.error('Error granting addon:', error);
      showToast('Failed to grant addon: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function revokeAddon(id) {
    if (!confirm('Revoke this add-on?')) return;
    try {
      const { error } = await supabase.from('company_addons').update({ active: false }).eq('id', id);
      if (error) throw error;
      
      showToast('Add-on revoked', 'success');
      load();
    } catch (error) {
      console.error('Error revoking addon:', error);
      showToast('Failed to revoke addon', 'error');
    }
  }

  async function enforce2FAForUser(userId, email) {
    setForcing2FA(true);
    try {
      const needs2FA = await check2FARequirement(userId);
      if (!needs2FA) {
        showToast('User already has 2FA or doesn\'t require it', 'info');
        setForcing2FA(false);
        return;
      }
      
      showToast('2FA enforcement initiated for ' + email, 'success');
    } catch (error) {
      console.error('Error enforcing 2FA:', error);
      showToast('Failed to enforce 2FA', 'error');
    } finally {
      setForcing2FA(false);
    }
  }

  const ADDON_TYPES = [
    { key: 'vehicles', label: 'Extra Vehicle slot' }, { key: 'guides', label: 'Extra Guide slot' },
    { key: 'drivers', label: 'Extra Driver slot' }, { key: 'shuttles', label: 'Extra Shuttle slot' },
    { key: 'safaris', label: 'Extra Safari slot' }, { key: 'tours', label: 'Extra Tour slot' },
    { key: 'charters', label: 'Extra Charter slot' }, { key: 'trails', label: 'Extra Trail slot' },
    { key: 'seats', label: 'Extra User Seat' }, { key: 'firearm_register', label: 'Firearm Register module' },
    { key: 'schedules_module', label: 'Schedules module' }, { key: 'white_label', label: 'White-label branding' },
    { key: 'no_watermark', label: 'Remove Watermark' },
    { key: 'client_list', label: 'Client List & Invoicing' },
    { key: 'storage_10gb', label: 'Storage +10 GB' }, { key: 'storage_50gb', label: 'Storage +50 GB' },
    { key: 'storage_200gb', label: 'Storage +200 GB' },
    { key: 'bandwidth_50gb', label: 'Bandwidth +50 GB' }, { key: 'bandwidth_200gb', label: 'Bandwidth +200 GB' },
    { key: 'bandwidth_1tb', label: 'Bandwidth +1 TB' },
  ];

  const statusColor = { confirmed: '#22c55e', pending: '#eab308', cancelled: '#ef4444', completed: '#3b82f6' };
  const sl = (s) => ({ background: s + '22', color: s, borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 });

  return (
    <div>
      <Toast toast={toast} />
      
      <button onClick={onBack} style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        ← Back to Companies
      </button>
      
      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: 24, marginBottom: 20, border: '1px solid #222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>{co.name}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{co.email} · {co.phone}</div>
            {co.vat_number && <div style={{ color: '#6b7280', fontSize: 12 }}>VAT: {co.vat_number}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ ...sl(tierColor[co.subscription_tier || 'free']), fontSize: 14, padding: '4px 14px', textTransform: 'capitalize' }}>
              {co.subscription_tier || 'free'}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: 13, marginRight: 6, alignSelf: 'center' }}>Change tier:</span>
          {tiers.map(t => (
            <button
              key={t}
              onClick={() => changeTier(t)}
              disabled={t === co.subscription_tier || saving}
              style={{
                background: t === co.subscription_tier ? tierColor[t] + '33' : '#222',
                color: t === co.subscription_tier ? tierColor[t] : '#9ca3af',
                border: `1px solid ${t === co.subscription_tier ? tierColor[t] : '#333'}`,
                borderRadius: 8,
                padding: '6px 16px',
                cursor: t === co.subscription_tier ? 'default' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>Expires (optional — defaults to 1 yr for paid tiers):</span>
          <input
            type="date"
            value={upgradeExpiry}
            onChange={e => setUpgradeExpiry(e.target.value)}
            style={{ background: '#111', border: '1px solid #333', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 13 }}
          />
          {co.subscription_expires_at && (
            <span style={{ color: '#f59e0b', fontSize: 12 }}>Current: {new Date(co.subscription_expires_at).toLocaleDateString('en-ZA')}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['overview', 'addons', 'bookings', 'users', 'discounts', 'settings'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? '#D4A853' : '#1a1a1a',
              color: tab === t ? '#0F2540' : '#9ca3af',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'capitalize'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[['Bookings', bookings.length, 'bookings'], ['Users', profiles.length, 'users'], ['Active Add-ons', addons.length, 'upgrade']].map(([l, v, ic]) => (
              <div key={l} style={{ background: '#1a1a1a', borderRadius: 12, padding: 18, border: '1px solid #222', display: 'flex', alignItems: 'center', gap: 14 }}>
                <Icon name={ic} size={28} className="text-gold" />
                <div>
                  <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                  <div style={{ color: 'white', fontSize: 28, fontWeight: 900 }}>{v}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Impersonate / Login-As panel */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Icon name="eye" size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>Login As / Impersonate</h3>
              <span style={{ background: '#78350f22', color: '#f59e0b', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>AUDIT</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 14 }}>
              Open the app as this company's owner to diagnose issues. Actions taken will be under their account — use with care.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {profiles.filter(p => p.role === 'owner' || p.role === 'superadmin').slice(0, 3).map(p => (
                <div key={p.id} style={{ background: '#111', borderRadius: 8, padding: '12px 16px', border: '1px solid #333', flex: 1, minWidth: 200 }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.full_name || 'Owner'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>{p.email || 'No email'} · {p.role}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(p.email || '');
                        showToast('Email copied', 'success');
                      }}
                      style={{
                        flex: 1,
                        background: '#222',
                        color: '#9ca3af',
                        border: '1px solid #333',
                        borderRadius: 6,
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      Copy Email
                    </button>
                    <button
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.search = ''; // remove ?admin
                        sessionStorage.setItem('sa_viewing_company', JSON.stringify({ id: co.id, name: co.name, email: p.email }));
                        window.open(url.toString(), '_blank');
                        showToast('Opened app in new tab — sign in as ' + (p.email || 'owner'), 'success');
                      }}
                      style={{
                        flex: 1,
                        background: '#f59e0b22',
                        color: '#f59e0b',
                        border: '1px solid #f59e0b',
                        borderRadius: 6,
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      Open App ↗
                    </button>
                  </div>
                </div>
              ))}
              {profiles.filter(p => p.role === 'owner' || p.role === 'superadmin').length === 0 && (
                <div style={{ color: '#6b7280', fontSize: 13 }}>No owner accounts found for this company.</div>
              )}
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#111', borderRadius: 6, border: '1px solid #222' }}>
              <div style={{ color: '#4b5563', fontSize: 11 }}>
                💡 For full impersonation, use Supabase dashboard → Authentication → Users → "Send magic link"
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'addons' && (
        <div>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222', marginBottom: 16 }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 14 }}>Grant Add-on to {co.name}</h3>
            <form onSubmit={grantAddon} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Add-on Type</label>
                <select
                  value={addonForm.type}
                  onChange={e => setAddonForm({ ...addonForm, type: e.target.value })}
                  style={{ background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%' }}
                >
                  {ADDON_TYPES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Qty</label>
                <input
                  type="number"
                  min={1}
                  value={addonForm.qty}
                  onChange={e => setAddonForm({ ...addonForm, qty: e.target.value })}
                  style={{ background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Price/unit (R, blank=default)</label>
                <input
                  type="number"
                  placeholder="Default"
                  value={addonForm.price_override || ''}
                  onChange={e => setAddonForm({ ...addonForm, price_override: e.target.value || null })}
                  style={{ background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 4 }}>Note</label>
                <input
                  placeholder="e.g. Q1 promo"
                  value={addonForm.note}
                  onChange={e => setAddonForm({ ...addonForm, note: e.target.value })}
                  style={{ background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%' }}
                />
              </div>
              <button
                type="submit"
                style={{ background: '#D4A853', color: '#0F2540', fontWeight: 700, border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer' }}
                disabled={saving}
              >
                Grant
              </button>
            </form>
          </div>
          <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0d0d0d' }}>
                  {['Add-on', 'Qty', 'Price/unit', 'Note', 'Granted by', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #222' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addons.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No active add-ons</td></tr>
                ) : addons.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '10px 14px', color: 'white', fontWeight: 600, textTransform: 'capitalize' }}>{a.addon_type?.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '10px 14px', color: '#D4A853', fontWeight: 700 }}>{a.quantity}</td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af' }}>R{a.price_per_unit}/mo</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 13 }}>{a.note || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: a.granted_by_superadmin ? '#dc2626' : '#22c55e', fontSize: 12, fontWeight: 600 }}>
                        {a.granted_by_superadmin ? 'Admin' : 'Self-service'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => revokeAddon(a.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Ref', 'Guest', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #222' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No bookings</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <code style={{ background: '#222', color: '#D4A853', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>{b.booking_ref}</code>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'white', fontWeight: 600 }}>{b.guest_name}</td>
                  <td style={{ padding: '10px 14px', color: '#22c55e', fontWeight: 700 }}>R{(b.total_amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ ...sl(statusColor[b.status] || '#6b7280'), textTransform: 'capitalize' }}>{b.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 13 }}>
                    {b.created_at ? new Date(b.created_at).toLocaleDateString('en-ZA') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Name', 'Email', 'Role', '2FA', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #222' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 14px', color: 'white', fontWeight: 600 }}>{p.full_name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{p.email || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#1a1a2a', color: '#818cf8', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                      {p.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: p.totp_enabled ? '#22c55e22' : '#6b728022',
                      color: p.totp_enabled ? '#22c55e' : '#6b7280',
                      borderRadius: 999,
                      padding: '2px 9px',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {p.totp_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 13 }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-ZA') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {!p.totp_enabled && (
                      <button
                        onClick={() => enforce2FAForUser(p.id, p.email)}
                        disabled={forcing2FA}
                        style={{
                          background: '#dc262622',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 6,
                          padding: '4px 12px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Force 2FA
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'discounts' && (
        <div>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'white', fontSize: 16, margin: 0 }}>Company Discounts</h3>
              <button
                onClick={() => setShowDiscountManager(true)}
                style={{
                  background: '#D4A853',
                  color: '#0F2540',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Icon name="plus" size={14} /> Add Discount
              </button>
            </div>
            
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
              Manage custom discounts for this company. Discounts can be applied to subscriptions, add-ons, or everything.
            </p>
            
            <div style={{ background: '#111', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#6b7280', fontSize: 12 }}>
                Click "Add Discount" to create a custom pricing rule for this company.
              </div>
            </div>
          </div>
          
          {showDiscountManager && (
            <SADiscountManager
              companyId={co.id}
              companyName={co.name}
              onClose={() => setShowDiscountManager(false)}
            />
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Account Status */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Account Status</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 6 }}>Status</label>
              <select
                value={accountStatus}
                onChange={e => setAccountStatus(e.target.value)}
                style={{ width: '100%', background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}
              >
                {['active', 'trial', 'vip', 'churned', 'suspended'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 6 }}>Admin Notes (internal)</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes — not visible to the company..."
                style={{ width: '100%', background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                style={{
                  flex: 1,
                  background: '#D4A853',
                  color: '#0F2540',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={suspendCompany}
                style={{
                  background: accountStatus === 'suspended' ? '#22c55e22' : '#dc262622',
                  color: accountStatus === 'suspended' ? '#22c55e' : '#ef4444',
                  fontWeight: 700,
                  border: `1px solid ${accountStatus === 'suspended' ? '#22c55e' : '#dc2626'}`,
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                {accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>Danger Zone</div>
              <button
                onClick={deleteCompany}
                style={{
                  width: '100%',
                  background: '#1a0000',
                  color: '#ef4444',
                  fontWeight: 700,
                  border: '1px solid #ef4444',
                  borderRadius: 8,
                  padding: '10px 0',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                🗑 Delete Company Permanently
              </button>
            </div>
          </div>

          {/* Quota Overrides */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 4, fontSize: 15 }}>Quota Overrides</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 14 }}>Defaults set by tier — override per company if needed.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 6 }}>Database quota (MB)</label>
              <input
                type="number"
                value={dbQuota}
                onChange={e => setDbQuota(e.target.value)}
                min={1}
                style={{ width: '100%', background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[['Free', 50], ['Basic', 200], ['Std', 1024], ['Pro', 5120], ['10GB', 10240]].map(([l, v]) => (
                  <button
                    key={l}
                    onClick={() => setDbQuota(String(v))}
                    style={{ background: '#222', color: '#9ca3af', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {l} ({v < 1024 ? v + 'MB' : (v / 1024) + 'GB'})
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6b7280', fontSize: 12, display: 'block', marginBottom: 6 }}>Storage quota (MB)</label>
              <input
                type="number"
                value={storageQuota}
                onChange={e => setStorageQuota(e.target.value)}
                min={1}
                style={{ width: '100%', background: '#111', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[['Free', 10], ['Basic', 100], ['Std', 500], ['Pro', 2048], ['10GB', 10240]].map(([l, v]) => (
                  <button
                    key={l}
                    onClick={() => setStorageQuota(String(v))}
                    style={{ background: '#222', color: '#9ca3af', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {l} ({v < 1024 ? v + 'MB' : (v / 1024) + 'GB'})
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: '#111', borderRadius: 8, padding: 12, border: '1px solid #222' }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>Current usage</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ color: '#9ca3af', fontSize: 13 }}>DB quota: <strong style={{ color: 'white' }}>{co.db_quota_mb || 200} MB</strong></span>
                <span style={{ color: '#9ca3af', fontSize: 13, marginLeft: 16 }}>Storage quota: <strong style={{ color: 'white' }}>{co.storage_quota_mb || 100} MB</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export both components
export { SACompanies, SACompanyDetail };
export default SACompanies;