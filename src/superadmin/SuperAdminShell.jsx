import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ══════════════════════════════════════════════
//  SUPERADMIN PANEL  (?admin URL trigger)
// ══════════════════════════════════════════════

// ─── SUPERADMIN AUTH ─────────────────────────
const SA_EMAIL = 'd2gborg@gmail.com';
// SA auth: real gate is Supabase auth + check_is_superadmin() RPC

function SuperAdminLogin({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('password'); // 'password' | 'totp'
  const [totpCode, setTotpCode] = useState('');
  const [pendingSecret, setPendingSecret] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  async function handle(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setLoading(false); return; }
    // Verify superadmin role
    const { data: isSA, error: saErr } = await supabase.rpc('check_is_superadmin');
    if (saErr || !isSA) {
      await supabase.auth.signOut();
      setErr('Not authorised — superadmin role required');
      setLoading(false); return;
    }
    // Check if 2FA is enrolled
    const { data: profileData } = await supabase.rpc('get_my_data');
    if (profileData?.profile?.totp_enabled && profileData?.profile?.totp_secret) {
      setPendingSecret(profileData.profile.totp_secret);
      setPendingUser(data.user);
      await supabase.auth.signOut();
      setStep('totp');
      setLoading(false);
      return;
    }
    // No 2FA enrolled — warn but allow (superadmin should have 2FA)
    onAuth(data.user);
    setLoading(false);
  }

  async function handleTotp(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    const ok = await verifyTOTP(pendingSecret, totpCode);
    if (!ok) { setErr('Incorrect code — try again'); setLoading(false); return; }
    // Re-sign-in to get session
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr('Session error — sign in again'); setStep('password'); setLoading(false); return; }
    onAuth(data.user);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0a0a0a'}}>
      <div style={{width:380,background:'#111',borderRadius:16,padding:36,border:'1px solid #222'}}>
        <div className="flex items-center gap-3 mb-6">
          <div style={{background:'#dc2626',borderRadius:8,padding:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Icon name="shield" size={20} className="text-white"/>
          </div>
          <div>
            <div style={{color:'white',fontWeight:900,fontSize:18}}>OpDesk Superadmin</div>
            <div style={{color:'#dc2626',fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase'}}>Restricted Access</div>
          </div>
        </div>
        {err && <div style={{background:'#1a0000',border:'1px solid #dc2626',color:'#f87171',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13}}>{err}</div>}

        {step === 'password' ? (
          <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={{color:'#9ca3af',fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Email</label><input style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%',outline:'none',fontSize:14}} type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="d2gborg@gmail.com"/></div>
            <div><label style={{color:'#9ca3af',fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Password</label><input style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%',outline:'none',fontSize:14}} type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/></div>
            <button type="submit" style={{background:'#dc2626',color:'white',fontWeight:700,border:'none',borderRadius:8,padding:'11px',cursor:'pointer',marginTop:4}} disabled={loading}>{loading?'Authenticating...':'Sign In as Superadmin'}</button>
          </form>
        ) : (
          <form onSubmit={handleTotp} style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#1a1a00',border:'1px solid #ca8a04',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#fde047',display:'flex',gap:8,alignItems:'center'}}>
              <Icon name="shield" size={14}/> Two-factor authentication required
            </div>
            <div>
              <label style={{color:'#9ca3af',fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Authenticator Code</label>
              <input style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'12px',width:'100%',outline:'none',fontSize:22,textAlign:'center',letterSpacing:'0.3em',fontFamily:'monospace',boxSizing:'border-box'}}
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={totpCode} onChange={e=>setTotpCode(e.target.value.replace(/\D/g,''))}
                placeholder="000000" autoFocus/>
            </div>
            <button type="submit" style={{background:'#dc2626',color:'white',fontWeight:700,border:'none',borderRadius:8,padding:'11px',cursor:'pointer',marginTop:4}} disabled={loading||totpCode.length!==6}>{loading?'Verifying...':'Verify & Enter'}</button>
            <button type="button" onClick={()=>{setStep('password');setTotpCode('');setErr('');}} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:4}}>← Back</button>
          </form>
        )}
        <p style={{color:'#333',fontSize:11,textAlign:'center',marginTop:20}}>Restricted: superadmin role required</p>
      </div>
    </div>
  );
}


// ─── SA: SHELL ────────────────────────────────

// ─── SA: REVENUE OVERVIEW ─────────────────────
function SARevenueOverview() {
  const [stats, setStats] = React.useState([]);
  const [companies, setCompanies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    const [s, c] = await Promise.all([
      supabase.rpc('sa_get_revenue_stats'),
      supabase.rpc('sa_get_all_companies'),
    ]);
    setStats(s.data || []);
    setCompanies(c.data || []);
    setLoading(false);
  }
  React.useEffect(() => { load(); }, []);

  if (loading) return <div style={{color:'#6b7280',padding:40,textAlign:'center'}}>Loading revenue data...</div>;

  const TIER_PRICE = { free:0, basic:349, standard:1099, premium:2499 };
  const tierColor = { free:'#6b7280', basic:'#3b82f6', standard:'#9333ea', premium:'#D4A853' };

  // Live totals from companies
  const liveMRR = companies.reduce((s,c) => s + (TIER_PRICE[c.subscription_tier||'free']||0), 0);
  const liveARR = liveMRR * 12;
  const byTier = { free:0, basic:0, standard:0, premium:0 };
  companies.forEach(c => { byTier[c.subscription_tier||'free']++; });
  const paying = companies.filter(c => c.subscription_tier !== 'free').length;
  const churned = companies.filter(c => (c.account_status||'active') === 'churned').length;
  const avgRevPerPaying = paying > 0 ? Math.round(liveMRR / paying) : 0;

  const cardStyle = {background:'#1a1a1a',borderRadius:12,padding:'16px 20px',border:'1px solid #222'};
  const labelStyle = {color:'#6b7280',fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6};

  return (
    <div>
      <h2 style={{color:'white',fontWeight:900,fontSize:20,marginBottom:20}}>Revenue Overview</h2>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          ['MRR', `R${liveMRR.toLocaleString()}`, '#D4A853'],
          ['ARR', `R${liveARR.toLocaleString()}`, '#9333ea'],
          ['Paying', paying, '#22c55e'],
          ['Avg Rev/Paying', `R${avgRevPerPaying}`, '#3b82f6'],
        ].map(([l,v,c]) => (
          <div key={l} style={cardStyle}>
            <div style={labelStyle}>{l}</div>
            <div style={{color:c,fontSize:26,fontWeight:900}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        {/* Tier breakdown */}
        <div style={{...cardStyle}}>
          <h3 style={{color:'white',fontWeight:700,fontSize:15,marginBottom:16}}>Companies by Tier</h3>
          {Object.entries(byTier).map(([tier, count]) => {
            const pct = companies.length > 0 ? Math.round(count / companies.length * 100) : 0;
            const tierMRR = count * (TIER_PRICE[tier]||0);
            return (
              <div key={tier} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{color:tierColor[tier],fontWeight:700,textTransform:'capitalize',fontSize:13}}>{tier}</span>
                  <span style={{color:'#9ca3af',fontSize:13}}>{count} companies · R{tierMRR.toLocaleString()}/mo</span>
                </div>
                <div style={{background:'#111',borderRadius:999,height:6,overflow:'hidden'}}>
                  <div style={{background:tierColor[tier],width:`${pct}%`,height:'100%',borderRadius:999,transition:'width 0.5s'}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Account status breakdown */}
        <div style={{...cardStyle}}>
          <h3 style={{color:'white',fontWeight:700,fontSize:15,marginBottom:16}}>Account Health</h3>
          {['active','trial','vip','churned','suspended'].map(status => {
            const count = companies.filter(c => (c.account_status||'active') === status).length;
            const pct = companies.length > 0 ? Math.round(count / companies.length * 100) : 0;
            const statusColor = {active:'#22c55e',trial:'#f59e0b',vip:'#D4A853',churned:'#6b7280',suspended:'#ef4444'}[status];
            return (
              <div key={status} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{color:statusColor,fontWeight:700,textTransform:'capitalize',fontSize:13}}>{status}</span>
                  <span style={{color:'#9ca3af',fontSize:13}}>{count}</span>
                </div>
                <div style={{background:'#111',borderRadius:999,height:6,overflow:'hidden'}}>
                  <div style={{background:statusColor,width:`${pct}%`,height:'100%',borderRadius:999}}/>
                </div>
              </div>
            );
          })}
          <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid #222',display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'#6b7280',fontSize:12}}>Churn rate</span>
            <span style={{color:'#ef4444',fontWeight:700,fontSize:13}}>
              {companies.length > 0 ? Math.round(churned/companies.length*100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Monthly cohort table */}
      <div style={{background:'#111',borderRadius:12,border:'1px solid #222',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #222'}}>
          <h3 style={{color:'white',fontWeight:700,fontSize:15,margin:0}}>Monthly Cohorts (signups by month)</h3>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#0d0d0d'}}>
              {['Month','New Signups','Basic','Standard','Premium','MRR from cohort'].map(h=>(
                <th key={h} style={{padding:'9px 16px',textAlign:'left',color:'#6b7280',fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #222'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr><td colSpan={6} style={{padding:20,textAlign:'center',color:'#6b7280',fontSize:13}}>No data yet</td></tr>
            ) : stats.map(row => (
              <tr key={row.month} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'10px 16px',color:'white',fontWeight:600}}>{row.month}</td>
                <td style={{padding:'10px 16px',color:'#9ca3af'}}>{row.new_companies}</td>
                <td style={{padding:'10px 16px',color:tierColor.basic}}>{row.basic_count||0}</td>
                <td style={{padding:'10px 16px',color:tierColor.standard}}>{row.standard_count||0}</td>
                <td style={{padding:'10px 16px',color:tierColor.premium}}>{row.premium_count||0}</td>
                <td style={{padding:'10px 16px',color:'#D4A853',fontWeight:700}}>R{Number(row.mrr_zar||0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuperAdminShell({ onExit }) {
  const [saUser, setSaUser] = useState(null);
  const [saPage, setSaPage] = useState('companies');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [globalPricing, setGlobalPricing] = useState([]);

  useEffect(() => {
    supabase.from('addon_pricing').select('*').then(({data})=>setGlobalPricing(data||[]));
  }, []);

  if (!saUser) return <SuperAdminLogin onAuth={setSaUser}/>;

  const saNav = [
    { id:'companies', label:'Companies', icon:'guests' },
    { id:'revenue', label:'Revenue', icon:'billing' },
    { id:'pricing', label:'Pricing Editor', icon:'billing' },
    { id:'packages', label:'Marketing Packages', icon:'invoice' },
    { id:'affiliates', label:'Affiliates', icon:'star' },
    { id:'discounts', label:'Discount Codes', icon:'invoice' },
    { id:'support', label:'Support Queue', icon:'shield' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:220,background:'#111',borderRight:'1px solid #1a1a1a',display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0}}>
        <div style={{padding:'20px 16px',borderBottom:'1px solid #1a1a1a'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{background:'#dc2626',borderRadius:8,padding:7,display:'flex'}}><Icon name="shield" size={18} className="text-white"/></div>
            <div><div style={{color:'white',fontWeight:900,fontSize:15}}>SuperAdmin</div><div style={{color:'#dc2626',fontSize:10,fontWeight:700,letterSpacing:'0.1em'}}>OPDESK · RESTRICTED</div></div>
          </div>
        </div>
        <nav style={{flex:1,padding:10}}>
          {saNav.map(item=>(
            <button key={item.id} onClick={()=>{setSaPage(item.id);setSelectedCompany(null);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:'none',cursor:'pointer',marginBottom:2,background:saPage===item.id?'rgba(220,38,38,0.15)':'transparent',color:saPage===item.id?'#f87171':'#9ca3af',fontWeight:600,fontSize:13,textAlign:'left'}}>
              <Icon name={item.icon} size={16}/>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:12,borderTop:'1px solid #1a1a1a'}}>
          <button onClick={onExit} style={{width:'100%',display:'flex',alignItems:'center',gap:8,color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'8px 12px'}}>
            <Icon name="logout" size={14}/>Back to App
          </button>
        </div>
      </div>
      <main style={{marginLeft:220,flex:1,padding:28,color:'white'}}>
        <div style={{maxWidth:1100}}>
          {saPage==='companies' && !selectedCompany && <SACompanies onSelect={c=>{setSelectedCompany(c);}}/>}
          {saPage==='companies' && selectedCompany && <SACompanyDetail company={selectedCompany} onBack={()=>setSelectedCompany(null)} globalPricing={globalPricing}/>}
          {saPage==='revenue' && <SARevenueOverview/>}
          {saPage==='pricing' && <SAPricingEditor/>}
          {saPage==='packages' && <SAMarketingPackages/>}
          {saPage==='affiliates' && <SAAffiliate/>}
          {saPage==='discounts' && <SADiscountCodes/>}
          {saPage==='support' && <SASupportQueue/>}
        </div>
      </main>
    </div>
  );
}

// ─── OPERATOR ADDON SHOP ──────────────────────
// This is the self-service add-on purchase flow shown inside the operator app
function AddonShop({ onClose }) {
  const { company, tier, limits } = useAuth();
  const [pricing, setPricing] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [p, a] = await Promise.all([
      supabase.from('addon_pricing').select('*').order('addon_key'),
      supabase.from('company_addons').select('*').eq('company_id', company.id).eq('active', true),
    ]);
    setPricing(p.data||[]); setAddons(a.data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function checkout(addon) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = PAYFAST_CONFIG.sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
    const fields = {
      merchant_id: PAYFAST_CONFIG.merchant_id,
      merchant_key: PAYFAST_CONFIG.merchant_key,
      return_url: PAYFAST_CONFIG.return_url,
      cancel_url: PAYFAST_CONFIG.cancel_url,
      notify_url: PAYFAST_CONFIG.notify_url,
      m_payment_id: `${company.id}_addon_${addon.addon_key}_${Date.now()}`,
      amount: addon.monthly_price.toFixed(2),
      item_name: `OpDesk Add-on: ${addon.addon_key.replace(/_/g,' ')}`,
    };
    Object.entries(fields).forEach(([k,v]) => {
      const i = document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; form.appendChild(i);
    });
    document.body.appendChild(form); form.submit();
  }

  const LABELS = {
    vehicles:'Extra Vehicle Slot', guides:'Extra Guide Slot', drivers:'Extra Driver Slot',
    shuttles:'Extra Shuttle Slot', safaris:'Extra Safari Listing', tours:'Extra Tour Listing',
    charters:'Extra Charter Listing', trails:'Extra Trail Listing', seats:'Extra User Seat',
    firearm_register:'Firearm Register Module', schedules_module:'Schedules Module', white_label:'White-Label Branding',
    client_list: 'Client List & Billing', no_watermark: 'Remove Watermark',
    storage_10gb:'Storage +10 GB', storage_50gb:'Storage +50 GB', storage_200gb:'Storage +200 GB',
    bandwidth_50gb:'Bandwidth +50 GB', bandwidth_200gb:'Bandwidth +200 GB', bandwidth_1tb:'Bandwidth +1 TB',
  };
  const ICONS = { vehicles:'vehicles', guides:'guides', drivers:'drivers', shuttles:'shuttles', safaris:'safaris', tours:'tours', charters:'charters', trails:'trails', seats:'users', firearm_register:'firearm', schedules_module:'schedules', white_label:'shield', client_list:'clients', no_watermark:'shield',
    storage_10gb:'database', storage_50gb:'database', storage_200gb:'database',
    bandwidth_50gb:'upload', bandwidth_200gb:'upload', bandwidth_1tb:'upload' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{background:'white',borderRadius:16,padding:28,maxWidth:680,width:'95%',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div><h2 style={{color:'#0F2540',fontWeight:900,fontSize:20,margin:0}}>Add-On Store</h2><p style={{color:'#64748b',fontSize:13,marginTop:2}}>Purchase individual upgrades — billed separately</p></div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><Icon name="x" size={20}/></button>
        </div>
        {loading ? <div style={{textAlign:'center',padding:24,color:'#94a3b8'}}>Loading...</div> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:12}}>
            {pricing.map(p => {
              const owned = addons.filter(a=>a.addon_key===p.addon_key).reduce((s,a)=>s+a.quantity,0);
              return (
                <div key={p.id} style={{border:'1.5px solid #e2e8f0',borderRadius:12,padding:16,display:'flex',flexDirection:'column',gap:8}}>
                  <Icon name={ICONS[p.addon_key]||'plus'} size={24} className="text-navy"/>
                  <div style={{fontWeight:700,color:'#0F2540',fontSize:14,lineHeight:1.3}}>{LABELS[p.addon_key]||p.addon_key}</div>
                  <div style={{color:'#D4A853',fontWeight:900,fontSize:18}}>R{p.monthly_price}<span style={{fontSize:11,fontWeight:400,color:'#94a3b8'}}>/mo</span></div>
                  {owned > 0 && <div style={{fontSize:11,color:'#22c55e',fontWeight:600}}>✓ You have {owned} active</div>}
                  <button onClick={()=>checkout(p)} style={{background:'#0F2540',color:'#D4A853',fontWeight:700,border:'none',borderRadius:8,padding:'8px',cursor:'pointer',fontSize:13,marginTop:'auto'}}>Buy Now</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── ADDON SHOP BUTTON (injected into Sidebar) ───
// Already handled via the AddonShop modal below

// ─── URL-BASED ROUTER ─────────────────────────────

export { SuperAdminShell, SuperAdminLogin };
export default SuperAdminShell;
