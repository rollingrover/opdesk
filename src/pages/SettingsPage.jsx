import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';
import { verifyTOTP } from '../lib/totp.jsx';

// ─── SETTINGS ────────────────────────────

// ── UsageMeter ─────────────────────────────────────────────────────────────
function UsageMeter() {
  const { company } = useAuth();
  const [usage, setUsage] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!company?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_company_usage');
      if (!error && data) setUsage(data);
      setLoading(false);
    })();
  }, [company?.id]);

  if (loading) return (
    <div className="card p-6 mb-5">
      <h2 className="font-bold text-navy mb-4">Storage & Database Usage</h2>
      <div className="text-sm text-gray-400 animate-pulse">Calculating usage…</div>
    </div>
  );
  if (!usage) return null;

  const TIER_LABELS = { free:'Free', basic:'Basic', standard:'Standard', premium:'Premium' };

  function MeterBar({ label, usedMb, quotaMb, icon }) {
    const pct = Math.min(100, Math.round((usedMb / quotaMb) * 100));
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
    const usedLabel = usedMb < 1 ? `${Math.round(usedMb * 1024)} KB` : usedMb < 1024 ? `${usedMb} MB` : `${(usedMb/1024).toFixed(2)} GB`;
    const quotaLabel = quotaMb < 1024 ? `${quotaMb} MB` : `${(quotaMb/1024).toFixed(1)} GB`;
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Icon name={icon} size={14}/>{label}
          </span>
          <span className="text-xs text-gray-500">{usedLabel} / {quotaLabel} ({pct}%)</span>
        </div>
        <div style={{background:'#f3f4f6', borderRadius:999, height:10, overflow:'hidden'}}>
          <div style={{width:`${pct}%`, background:color, height:'100%', borderRadius:999, transition:'width 0.6s ease'}}/>
        </div>
        {pct >= 80 && (
          <p className="text-xs mt-1" style={{color}}>
            {pct >= 90 ? '\u26a0\ufe0f Almost full \u2014 consider upgrading your plan.' : '\u26a1 Usage is high \u2014 approaching your quota.'}
          </p>
        )}
      </div>
    );
  }

  const rows = usage.rows || {};
  const rowEntries = [
    { key:'bookings',  label:'Bookings',  icon:'calendar' },
    { key:'guests',    label:'Clients',   icon:'guests' },
    { key:'invoices',  label:'Invoices',  icon:'invoice' },
    { key:'guides',    label:'Guides',    icon:'guides' },
    { key:'drivers',   label:'Drivers',   icon:'drivers' },
    { key:'vehicles',  label:'Vehicles',  icon:'vehicles' },
    { key:'safaris',   label:'Safaris',   icon:'safaris' },
    { key:'shuttles',  label:'Shuttles',  icon:'shuttles' },
    { key:'charters',  label:'Charters',  icon:'charters' },
    { key:'firearm',   label:'Firearm Entries', icon:'shield' },
  ].filter(e => rows[e.key] > 0);

  return (
    <div className="card p-6 mb-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-navy">Storage & Database Usage</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {TIER_LABELS[usage.tier] || usage.tier} plan
          </p>
        </div>
        {(usage.db_used_mb / usage.db_quota_mb >= 0.8 || usage.storage_used_mb / usage.storage_quota_mb >= 0.8) && (
          <a href="/" className="btn-primary text-xs py-1.5 px-3">Upgrade Plan</a>
        )}
      </div>

      <MeterBar
        label="Database"
        usedMb={parseFloat(usage.db_used_mb) || 0}
        quotaMb={usage.db_quota_mb}
        icon="database"
      />
      <MeterBar
        label="File Storage"
        usedMb={parseFloat(usage.storage_used_mb) || 0}
        quotaMb={usage.storage_quota_mb}
        icon="upload"
      />

      {rowEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Record Counts</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'8px'}}>
            {rowEntries.map(e => (
              <div key={e.key} style={{background:'#f9fafb', borderRadius:8, padding:'8px 12px'}}>
                <div className="text-lg font-bold text-navy">{(rows[e.key]||0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">{e.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Database estimate is calculated from your record counts. Storage reflects uploaded files (logos, documents, certs).
      </p>
    </div>
  );
}
// ── End UsageMeter ──────────────────────────────────────────────────────────

function SettingsPage() {
  const { company, features, reload, profile } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASecret] = React.useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    return Array.from({length:32}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  });
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (company) setForm({ name:company.name||'', email:company.email||'', phone:company.phone||'', address:company.address||'', vat_number:company.vat_number||'', bank_name:company.bank_name||'', bank_account:company.bank_account||'', bank_branch:company.bank_branch||'', country:company.country||'South Africa', currency:company.currency||'ZAR', language:company.language||'en', region:company.region||getCompanyRegion(company.country||'South Africa') });
  }, [company]);

  function handleLogoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { toast('Logo must be under 2MB', 'error'); return; }
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file));
  }

  async function uploadLogo() {
    if (!logoFile) return;
    setUploadingLogo(true);
    const ext = logoFile.name.split('.').pop();
    const path = `logos/${company.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('company-assets').upload(path, logoFile, { upsert:true });
    if (error) { toast(error.message, 'error'); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(path);
    const { error: dbErr } = await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', company.id);
    if (dbErr) { toast('Upload ok but failed to save URL: ' + dbErr.message, 'error'); setUploadingLogo(false); return; }
    // Update logoPreview so it renders immediately without waiting for reload
    setLogoPreview(publicUrl);
    setLogoFile(null);
    toast('Logo uploaded successfully');
    reload();
    setUploadingLogo(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!company?.id) { toast('Company not loaded yet — please wait', 'error'); return; }
    setSaving(true);
    // Explicit safe column list — never overwrites logo_url, subscription fields, or system fields
    const payload = {
      name:         form.name         || null,
      email:        form.email        || null,
      phone:        form.phone        || null,
      address:      form.address      || null,
      vat_number:   form.vat_number   || null,
      bank_name:    form.bank_name    || null,
      bank_account: form.bank_account || null,
      bank_branch:  form.bank_branch  || null,
      country:      form.country      || 'South Africa',
      currency:     form.currency     || 'ZAR',
      language:     form.language     || 'en',
      region:       form.region       || 'south_africa',
    };
    const { error } = await supabase.from('companies').update(payload).eq('id', company.id);
    if (error) {
      console.error('Settings save error:', error);
      toast(error.message || error.details || 'Save failed', 'error');
    } else {
      toast('Settings saved');
      reload();
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company profile"/>
      {features.logo && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-navy mb-4">Company Logo</h2>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
              {logoPreview||company?.logo_url ? <img src={logoPreview||company.logo_url} alt="Logo" className="w-full h-full object-contain"/> : <span className="text-3xl text-gray-200">✦</span>}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">PNG, JPG, max 2MB — shown on invoices</p>
              <div className="flex items-center gap-2">
                <label className="btn-secondary text-sm cursor-pointer">Choose File<input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect}/></label>
                {logoFile && <button className="btn-primary text-sm" onClick={uploadLogo} disabled={uploadingLogo}>{uploadingLogo?'Uploading...':'Upload'}</button>}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="card p-6">
        <h2 className="font-bold text-navy mb-4">Company Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Company Name</label><input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your Company Name"/></div>
            <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="info@company.com"/></div>
            <div><label className="text-sm font-semibold text-gray-600 block mb-1">Phone</label><input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+27 31 000 0000"/></div>
            <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Address</label><textarea value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} rows={2} placeholder="Business address"/></div>
            <div><label className="text-sm font-semibold text-gray-600 block mb-1">VAT Number</label><input value={form.vat_number||''} onChange={e=>setForm({...form,vat_number:e.target.value})} placeholder="4123456789"/></div>
          </div>
          <div className="border-t pt-4"><h3 className="font-semibold text-navy mb-3">Banking Details <span className="text-xs font-normal text-gray-400">(for invoices)</span></h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Bank</label><input value={form.bank_name||''} onChange={e=>setForm({...form,bank_name:e.target.value})} placeholder="FNB"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Account No.</label><input value={form.bank_account||''} onChange={e=>setForm({...form,bank_account:e.target.value})} placeholder="62000000000"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Branch Code</label><input value={form.bank_branch||''} onChange={e=>setForm({...form,bank_branch:e.target.value})} placeholder="250655"/></div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold text-navy mb-3">Region & Language</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Country</label>
                <select value={form.country||'South Africa'} onChange={e=>setForm({...form,country:e.target.value,region:getCompanyRegion(e.target.value)})}>
                  {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Currency</label>
                <select value={form.currency||'ZAR'} onChange={e=>setForm({...form,currency:e.target.value})}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">App Language</label>
                <select value={form.language||'en'} onChange={e=>setForm({...form,language:e.target.value})}>
                  {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              <span className="font-semibold text-gray-500">Region:</span> {(REGION_CERTS[form.region||getCompanyRegion(form.country||'South Africa')]||REGION_CERTS['south_africa']).label} — guide &amp; driver qualifications are shown based on your country of operation.
            </p>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}><Icon name="check" size={16}/>{saving?'Saving...':'Save Settings'}</button>
        </form>
      </div>

      {/* Usage Meter */}
      <UsageMeter/>

      {/* 2FA Security Card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-navy">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.totp_enabled ? '2FA is active on your account' : 'Strongly recommended — required for Firearm Register users'}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile?.totp_enabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{profile?.totp_enabled ? 'Enabled' : 'Not Enabled'}</span>
        </div>
        {!profile?.totp_enabled && !show2FASetup && (
          <button className="btn-primary flex items-center gap-2" onClick={()=>setShow2FASetup(true)}><Icon name="shield" size={16}/>Enable 2FA</button>
        )}
        {!profile?.totp_enabled && show2FASetup && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-600">Scan with Google Authenticator or Authy, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center">
              <img src={`https://chart.googleapis.com/chart?chs=180x180&chld=M|0&cht=qr&chl=${encodeURIComponent(`otpauth://totp/OpDesk:${encodeURIComponent(profile?.email||'')}?secret=${twoFASecret}&issuer=OpDesk&digits=6&period=30`)}`} alt="QR" className="border-4 border-navy rounded-lg" style={{width:180,height:180}}/>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Manual entry secret:</p>
              <div className="flex items-center gap-2"><code className="text-xs font-mono text-navy bg-white px-2 py-1 rounded border flex-1">{twoFASecret}</code><button type="button" className="text-gold" onClick={()=>navigator.clipboard.writeText(twoFASecret)}><Icon name="copy" size={14}/></button></div>
            </div>
            <div><label className="text-sm font-semibold text-gray-600 block mb-1">Confirm 6-digit code</label><input value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} maxLength={6} placeholder="000000" className="text-center tracking-widest text-xl font-mono" inputMode="numeric" pattern="[0-9]*"/></div>
            <div className="flex gap-3">
              <button className="btn-primary flex items-center gap-2" disabled={twoFASaving||twoFACode.length!==6} onClick={async()=>{
                setTwoFASaving(true);
                const ok = await verifyTOTP(twoFASecret, twoFACode);
                if (!ok) { toast('Incorrect code — try again','error'); setTwoFASaving(false); return; }
                await supabase.from('profiles').update({totp_secret:twoFASecret,totp_enabled:true}).eq('id',profile.id);
                toast('2FA enabled'); reload(); setTwoFASaving(false); setShow2FASetup(false);
              }}><Icon name="shield" size={16}/>{twoFASaving?'Enabling...':'Enable 2FA'}</button>
              <button className="btn-secondary" onClick={()=>setShow2FASetup(false)}>Cancel</button>
            </div>
          </div>
        )}
        {profile?.totp_enabled && (
          <button className="btn-secondary text-red-600 flex items-center gap-2" onClick={async()=>{
            if (!confirm('Disable 2FA? This will reduce your account security.')) return;
            await supabase.from('profiles').update({totp_enabled:false,totp_secret:null}).eq('id',profile.id);
            toast('2FA disabled'); reload();
          }}><Icon name="alert" size={16}/>Disable 2FA</button>
        )}
      </div>
    </div>
  );
}

// ─── CSV EXPORT (FIXED) ───────────────────
function exportCSV(data, filename) {
  if (!data || data.length === 0) { toast('No data to export', 'error'); return; }
  const skip = new Set(['id','company_id']);
  const keys = Object.keys(data[0]).filter(k => !skip.has(k));
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const val = (row[k] === null || row[k] === undefined) ? '' : String(row[k]);
      return '"' + val.replace(/"/g, '""') + '"';
    }).join(',')
  );
  const csv = [header].concat(rows).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'opdesk_' + filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('CSV exported');
}



export default SettingsPage;
