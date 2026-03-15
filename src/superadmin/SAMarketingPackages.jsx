import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';

// ─── SA: MARKETING PACKAGES ───────────────────
function SAMarketingPackages() {

  // ── Add-on extras (purchasable on top of base limits) ──────────────
  const ADDON_OPTS = [
    { key:'vehicles',         label:'Extra Vehicle Slot',         group:'resources' },
    { key:'guides',           label:'Extra Guide Slot',           group:'resources' },
    { key:'drivers',          label:'Extra Driver Slot',          group:'resources' },
    { key:'shuttles',         label:'Extra Shuttle Slot',         group:'resources' },
    { key:'tours',            label:'Extra Tour Listing',         group:'resources' },
    { key:'safaris',          label:'Extra Safari Listing',       group:'resources' },
    { key:'charters',         label:'Extra Charter Listing',      group:'resources' },
    { key:'trails',           label:'Extra Trail Listing',        group:'resources' },
    { key:'seats',            label:'Extra User Seat',            group:'resources' },
    { key:'schedules_module', label:'Schedules Module',           group:'modules' },
    { key:'firearm_register', label:'Firearm Register Module',    group:'modules' },
    { key:'white_label',      label:'White-Label Branding',       group:'modules' },
  ];

  // ── Per-resource limit fields shown in the limits grid ─────────────
  const LIMIT_FIELDS = [
    { key:'bookings',   label:'Bookings/mo',    note:'null = unlimited' },
    { key:'vehicles',   label:'Vehicles',       note:'' },
    { key:'guides',     label:'Guides',         note:'' },
    { key:'drivers',    label:'Drivers',        note:'' },
    { key:'shuttles',   label:'Shuttles',       note:'' },
    { key:'safaris',    label:'Safaris',        note:'' },
    { key:'tours',      label:'Tours',          note:'' },
    { key:'charters',   label:'Charters',       note:'' },
    { key:'trails',     label:'Trails',         note:'' },
    { key:'schedules',  label:'Schedules',      note:'' },
    { key:'seats',      label:'User Seats',     note:'' },
  ];
  const FEATURE_FLAGS = [
    { key:'csvExport',        label:'CSV Data Export' },
    { key:'firearmRegister',  label:'Firearm Register' },
    { key:'whiteLabelMode',   label:'White-Label Branding' },
    { key:'invoiceWatermark', label:'Invoice Watermark ("Powered by OpDesk")' },
  ];

  const emptyLimits = () => Object.fromEntries([
    ...LIMIT_FIELDS.map(f=>[f.key, '']),
    ...FEATURE_FLAGS.map(f=>[f.key, false]),
  ]);

  const emptyForm = {
    name:'', description:'', price:0, billing_cycle:'monthly',
    limits: emptyLimits(), extra_addons:[], active:true,
  };

  const [packages, setPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    const { data } = await supabase.from('marketing_packages').select('*').order('price', {ascending:true});
    setPackages(data||[]);
  }
  useEffect(() => { load(); }, []);

  function parsePkg(pkg) {
    const lim = pkg.limits || {};
    const limits = {};
    LIMIT_FIELDS.forEach(f => { limits[f.key] = lim[f.key] === null ? '' : (lim[f.key] ?? ''); });
    FEATURE_FLAGS.forEach(f => { limits[f.key] = lim[f.key] ?? false; });
    const extra_addons = pkg.extra_addons ? pkg.extra_addons.split(',').map(a=>a.trim()).filter(Boolean) : [];
    return { name:pkg.name, description:pkg.description||'', price:pkg.price||0,
             billing_cycle:pkg.billing_cycle||'monthly', limits, extra_addons, active:pkg.active };
  }

  function openNew()    { setEditPkg(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(p)  { setEditPkg(p);  setForm(parsePkg(p)); setShowModal(true); }

  function setLimit(key, val) {
    setForm(f => ({ ...f, limits: { ...f.limits, [key]: val } }));
  }
  function toggleFlag(key) {
    setForm(f => ({ ...f, limits: { ...f.limits, [key]: !f.limits[key] } }));
  }
  function toggleAddon(key) {
    setForm(f => ({
      ...f,
      extra_addons: f.extra_addons.includes(key)
        ? f.extra_addons.filter(k=>k!==key)
        : [...f.extra_addons, key],
    }));
  }

  async function save(e) {
    e.preventDefault(); setSaving(true);
    // Serialise limits: blank string → null (unlimited), else parseInt
    const limOut = {};
    LIMIT_FIELDS.forEach(f => {
      const v = form.limits[f.key];
      limOut[f.key] = (v === '' || v === null) ? null : parseInt(v)||0;
    });
    FEATURE_FLAGS.forEach(f => { limOut[f.key] = !!form.limits[f.key]; });
    const payload = {
      name: form.name, description: form.description,
      price: parseFloat(form.price)||0, billing_cycle: form.billing_cycle,
      limits: limOut,
      extra_addons: form.extra_addons.join(','),
      active: form.active,
    };
    if (editPkg) {
      await supabase.from('marketing_packages').update(payload).eq('id', editPkg.id);
      toast('Package updated');
    } else {
      await supabase.from('marketing_packages').insert(payload);
      toast('Package created');
    }
    setShowModal(false); setSaving(false); load();
  }
  async function toggleActive(id, active) {
    await supabase.from('marketing_packages').update({ active: !active }).eq('id', id);
    load();
  }
  async function deletePkg(id) {
    if (!confirm('Delete this package?')) return;
    setDeleting(id);
    await supabase.from('marketing_packages').delete().eq('id', id);
    toast('Package deleted'); setDeleting(null); load();
  }

  const addonMap = Object.fromEntries(ADDON_OPTS.map(a=>[a.key, a.label]));
  const fmtLimit = v => v === null ? '∞' : v;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 style={{color:'white',fontWeight:700,fontSize:16}}>Marketing Packages</h3>
        <button onClick={openNew} style={{background:'#D4A853',color:'#0F2540',fontWeight:700,border:'none',borderRadius:8,padding:'8px 18px',cursor:'pointer'}}>+ New Package</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {packages.map(pkg => {
          const lim = pkg.limits || {};
          const extras = pkg.extra_addons ? pkg.extra_addons.split(',').map(a=>a.trim()).filter(Boolean) : [];
          return (
            <div key={pkg.id} style={{background:'#1a1a1a',borderRadius:12,padding:20,border:`1px solid ${pkg.active?'#D4A85444':'#222'}`,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{color:'white',fontWeight:700,fontSize:15,flex:1,marginRight:8}}>{pkg.name}</div>
                <span style={{background:pkg.active?'#22c55e22':'#33333322',color:pkg.active?'#22c55e':'#6b7280',borderRadius:999,padding:'2px 9px',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{pkg.active?'Active':'Inactive'}</span>
              </div>
              <div style={{color:'#D4A853',fontWeight:900,fontSize:22}}>
                {pkg.price>0 ? `R${Number(pkg.price).toLocaleString()}` : 'Free'}
                {pkg.price>0 && <span style={{fontSize:13,fontWeight:400,color:'#6b7280'}}>/{pkg.billing_cycle}</span>}
              </div>
              {pkg.description && <div style={{color:'#9ca3af',fontSize:13}}>{pkg.description}</div>}

              {/* Base limits grid */}
              <div style={{background:'#111',borderRadius:8,padding:'10px 12px'}}>
                <div style={{color:'#6b7280',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Base Limits</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px'}}>
                  {LIMIT_FIELDS.map(f => (
                    lim[f.key] !== undefined && (
                      <div key={f.key} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                        <span style={{color:'#6b7280'}}>{f.label}</span>
                        <span style={{color:'#D4A853',fontWeight:700}}>{fmtLimit(lim[f.key])}</span>
                      </div>
                    )
                  ))}
                </div>
                <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>
                  {FEATURE_FLAGS.map(f => lim[f.key] && (
                    <span key={f.key} style={{background:'#22c55e22',color:'#22c55e',borderRadius:6,padding:'1px 7px',fontSize:10,fontWeight:700}}>✓ {f.label}</span>
                  ))}
                </div>
              </div>

              {/* Extra add-ons */}
              {extras.length > 0 && (
                <div>
                  <div style={{color:'#6b7280',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>+ Extra Add-ons</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {extras.map(k=>(
                      <span key={k} style={{background:'#1e3a5f',color:'#D4A853',border:'1px solid #D4A85344',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:600}}>
                        {addonMap[k]||k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:8,marginTop:4}}>
                <button onClick={()=>openEdit(pkg)} style={{flex:1,background:'#1e3a5f',color:'#D4A853',border:'1px solid #D4A85344',borderRadius:7,padding:'7px 0',fontSize:12,fontWeight:700,cursor:'pointer'}}>✏ Edit</button>
                <button onClick={()=>toggleActive(pkg.id,pkg.active)} style={{flex:1,background:'#222',color:pkg.active?'#f59e0b':'#22c55e',border:'1px solid #333',borderRadius:7,padding:'7px 0',fontSize:12,fontWeight:700,cursor:'pointer'}}>{pkg.active?'Deactivate':'Activate'}</button>
                <button onClick={()=>deletePkg(pkg.id)} disabled={deleting===pkg.id} style={{background:'#2a0000',color:'#f87171',border:'1px solid #7f1d1d44',borderRadius:7,padding:'7px 10px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{deleting===pkg.id?'…':'🗑'}</button>
              </div>
            </div>
          );
        })}
        {packages.length===0 && <div style={{color:'#6b7280',padding:24}}>No packages yet.</div>}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:20,overflowY:'auto'}}>
          <div style={{background:'#111',borderRadius:16,padding:28,width:580,maxWidth:'100%',border:'1px solid #222',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3 style={{color:'white',fontWeight:700,fontSize:16}}>{editPkg?'Edit Package':'New Package'}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:18}}>✕</button>
            </div>

            <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* ─ Basic info ─ */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Package Name *</label>
                  <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    placeholder="e.g. Safari Starter" style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%'}}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Description</label>
                  <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                    placeholder="What does this package include?" rows={2}
                    style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%',resize:'vertical'}}/>
                </div>
                <div>
                  <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Price (R)</label>
                  <input type="number" min="0" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}
                    style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%'}}/>
                </div>
                <div>
                  <label style={{color:'#9ca3af',fontSize:12,display:'block',marginBottom:4}}>Billing Cycle</label>
                  <select value={form.billing_cycle} onChange={e=>setForm({...form,billing_cycle:e.target.value})}
                    style={{background:'#1a1a1a',border:'1px solid #333',color:'white',borderRadius:8,padding:'9px 12px',width:'100%'}}>
                    <option value="free">Free</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="once">Once-off</option>
                  </select>
                </div>
              </div>

              {/* ─ Base Limits ─ */}
              <div>
                <div style={{borderTop:'1px solid #222',paddingTop:14,marginBottom:10}}>
                  <div style={{color:'#D4A853',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Base Resource Limits</div>
                  <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>Leave blank for unlimited (∞). Set 0 to disable.</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 16px'}}>
                  {LIMIT_FIELDS.map(f => (
                    <div key={f.key}>
                      <label style={{color:'#9ca3af',fontSize:11,display:'block',marginBottom:3}}>{f.label}</label>
                      <input type="number" min="0" placeholder="∞ unlimited"
                        value={form.limits[f.key] === null ? '' : (form.limits[f.key] ?? '')}
                        onChange={e => setLimit(f.key, e.target.value)}
                        style={{background:'#1a1a1a',border:'1px solid #2a2a2a',color:'white',borderRadius:7,padding:'7px 10px',width:'100%',fontSize:13}}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─ Feature Flags ─ */}
              <div>
                <div style={{color:'#D4A853',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Feature Flags</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {FEATURE_FLAGS.map(f => {
                    const on = !!form.limits[f.key];
                    return (
                      <label key={f.key} onClick={()=>toggleFlag(f.key)}
                        style={{display:'flex',alignItems:'center',gap:8,background:on?'#1e3a5f':'#1a1a1a',
                          border:`1px solid ${on?'#D4A853':'#333'}`,borderRadius:8,padding:'8px 10px',cursor:'pointer',userSelect:'none'}}>
                        <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${on?'#D4A853':'#555'}`,
                          background:on?'#D4A853':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                          flexShrink:0,color:'#0F2540',fontSize:10,fontWeight:900}}>{on?'✓':''}</div>
                        <span style={{color:on?'#D4A853':'#9ca3af',fontSize:12,fontWeight:on?700:400}}>{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ─ Extra Add-ons (purchasable on top) ─ */}
              <div>
                <div style={{borderTop:'1px solid #222',paddingTop:14,marginBottom:8}}>
                  <div style={{color:'#D4A853',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Extra Add-ons Included</div>
                  <div style={{color:'#6b7280',fontSize:11,marginTop:2}}>Optional additional slots/modules bundled on top of base limits.</div>
                </div>
                {['resources','modules'].map(grp => (
                  <div key={grp} style={{marginBottom:10}}>
                    <div style={{color:'#555',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:5}}>{grp}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                      {ADDON_OPTS.filter(a=>a.group===grp).map(opt => {
                        const chk = form.extra_addons.includes(opt.key);
                        return (
                          <label key={opt.key} onClick={()=>toggleAddon(opt.key)}
                            style={{display:'flex',alignItems:'center',gap:8,background:chk?'#1a2a1a':'#161616',
                              border:`1px solid ${chk?'#22c55e44':'#2a2a2a'}`,borderRadius:7,padding:'7px 9px',cursor:'pointer',userSelect:'none'}}>
                            <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${chk?'#22c55e':'#444'}`,
                              background:chk?'#22c55e':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                              flexShrink:0,color:'#0F2540',fontSize:9,fontWeight:900}}>{chk?'✓':''}</div>
                            <span style={{color:chk?'#22c55e':'#9ca3af',fontSize:11,fontWeight:chk?600:400}}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ─ Active toggle ─ */}
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" id="pkg-active" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{width:16,height:16,cursor:'pointer'}}/>
                <label htmlFor="pkg-active" style={{color:'#9ca3af',fontSize:13,cursor:'pointer'}}>Active (visible to customers)</label>
              </div>

              <div style={{display:'flex',gap:10,paddingTop:4}}>
                <button type="submit" style={{flex:1,background:'#D4A853',color:'#0F2540',fontWeight:700,border:'none',borderRadius:8,padding:11,cursor:'pointer'}} disabled={saving}>
                  {saving ? 'Saving...' : editPkg ? 'Save Changes' : 'Create Package'}
                </button>
                <button type="button" onClick={()=>setShowModal(false)} style={{flex:1,background:'#222',color:'#9ca3af',fontWeight:700,border:'none',borderRadius:8,padding:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



export default SAMarketingPackages;
