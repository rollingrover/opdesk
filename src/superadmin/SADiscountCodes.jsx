import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── SUPERADMIN: DISCOUNT CODES ──────────────────────────────────────────────
function SADiscountCodes() {
  const [codes, setCodes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code:'', description:'', discount_type:'percent', discount_value:'',
    applies_to:'all', max_uses:'', valid_from:'', valid_until:'',
    affiliate_handle:'', active:true
  });
  const [editId, setEditId] = React.useState(null);
  const [msg, setMsg] = React.useState('');

  async function load() {
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', {ascending:false});
    setCodes(data||[]); setLoading(false);
  }
  React.useEffect(()=>{ load(); },[]);

  function resetForm() {
    setForm({ code:'', description:'', discount_type:'percent', discount_value:'',
      applies_to:'all', max_uses:'', valid_from:'', valid_until:'',
      affiliate_handle:'', active:true });
    setEditId(null);
  }

  function startEdit(c) {
    setEditId(c.id);
    setForm({
      code: c.code, description: c.description||'',
      discount_type: c.discount_type, discount_value: String(c.discount_value),
      applies_to: c.applies_to||'all', max_uses: c.max_uses ? String(c.max_uses) : '',
      valid_from: c.valid_from ? c.valid_from.slice(0,10) : '',
      valid_until: c.valid_until ? c.valid_until.slice(0,10) : '',
      affiliate_handle: c.affiliate_handle||'', active: c.active
    });
    window.scrollTo({top:0, behavior:'smooth'});
  }

  async function save(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return;
    setSaving(true); setMsg('');
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description||null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      applies_to: form.applies_to||'all',
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      affiliate_handle: form.affiliate_handle||null,
      active: form.active
    };
    let err;
    if (editId) {
      ({ error: err } = await supabase.from('discount_codes').update(payload).eq('id', editId));
    } else {
      ({ error: err } = await supabase.from('discount_codes').insert(payload));
    }
    if (err) { setMsg('Error: '+err.message); }
    else { setMsg(editId ? 'Code updated!' : 'Code created!'); resetForm(); load(); }
    setSaving(false);
  }

  async function toggleActive(id, active) {
    await supabase.from('discount_codes').update({active}).eq('id',id);
    load();
  }

  async function deleteCode(id, code) {
    if (!confirm(`Delete code "${code}"? This cannot be undone.`)) return;
    await supabase.from('discount_codes').delete().eq('id',id);
    load();
  }

  const totalActive = codes.filter(c=>c.active).length;
  const totalUses = codes.reduce((s,c)=>s+(c.uses_count||0),0);

  const inp = {background:'#111',border:'1px solid #333',color:'white',borderRadius:6,padding:'8px 12px',fontSize:13,width:'100%'};
  const lbl = {color:'#9ca3af',fontSize:12,fontWeight:600,display:'block',marginBottom:4};

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h2 style={{color:'white',margin:0,fontSize:20}}>Discount Codes</h2>
          <p style={{color:'#9ca3af',fontSize:13,margin:'4px 0 0'}}>Create promo codes for signups, affiliates, or campaigns.</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[{label:'Total Codes',value:codes.length},{label:'Active',value:totalActive},{label:'Total Uses',value:totalUses}].map(s=>(
          <div key={s.label} style={{background:'#1a1a1a',borderRadius:10,padding:'14px 18px',border:'1px solid #222'}}>
            <div style={{color:'#D4A853',fontWeight:900,fontSize:22}}>{s.value}</div>
            <div style={{color:'#9ca3af',fontSize:12,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{background:'#1a1a1a',borderRadius:12,padding:20,border:'1px solid #333',marginBottom:20}}>
        <h3 style={{color:'white',margin:'0 0 16px',fontSize:15}}>{editId ? 'Edit Code' : 'Create New Code'}</h3>
        {msg && <div style={{background: msg.startsWith('Error') ? '#1a0000':'#001a00', border:`1px solid ${msg.startsWith('Error')?'#dc2626':'#16a34a'}`, color: msg.startsWith('Error') ? '#f87171':'#4ade80', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:13}}>{msg}</div>}
        <form onSubmit={save}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={lbl}>Code *</label>
              <input style={inp} placeholder="e.g. LAUNCH25" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} required/>
            </div>
            <div>
              <label style={lbl}>Description</label>
              <input style={inp} placeholder="e.g. Launch promo — 25% off" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={lbl}>Type *</label>
              <select style={inp} value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed Amount (R)</option>
                <option value="months_free">Free Months</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Value *</label>
              <input type="number" style={inp} placeholder={form.discount_type==='percent'?'e.g. 25':form.discount_type==='months_free'?'e.g. 1':'e.g. 100'} value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:e.target.value}))} min="0" required/>
            </div>
            <div>
              <label style={lbl}>Applies To</label>
              <select style={inp} value={form.applies_to} onChange={e=>setForm(f=>({...f,applies_to:e.target.value}))}>
                <option value="all">All Tiers</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:16}}>
            <div>
              <label style={lbl}>Max Uses</label>
              <input type="number" style={inp} placeholder="Unlimited" value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} min="1"/>
            </div>
            <div>
              <label style={lbl}>Valid From</label>
              <input type="date" style={inp} value={form.valid_from} onChange={e=>setForm(f=>({...f,valid_from:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Valid Until</label>
              <input type="date" style={inp} value={form.valid_until} onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Affiliate Handle</label>
              <input style={inp} placeholder="Optional" value={form.affiliate_handle} onChange={e=>setForm(f=>({...f,affiliate_handle:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <button type="submit" disabled={saving} style={{background:'#D4A853',color:'#0F2540',border:'none',borderRadius:8,padding:'10px 24px',fontWeight:700,cursor:'pointer',fontSize:14}}>
              {saving ? 'Saving…' : editId ? 'Update Code' : 'Create Code'}
            </button>
            {editId && <button type="button" onClick={resetForm} style={{background:'#222',color:'#9ca3af',border:'1px solid #333',borderRadius:8,padding:'10px 18px',cursor:'pointer',fontSize:14}}>Cancel</button>}
            <label style={{display:'flex',alignItems:'center',gap:8,color:'#9ca3af',fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{accentColor:'#D4A853'}}/>
              Active
            </label>
          </div>
        </form>
      </div>

      {/* Table */}
      {loading ? <div style={{color:'#9ca3af',padding:20}}>Loading…</div> : codes.length===0 ? (
        <div style={{textAlign:'center',padding:40,color:'#6b7280'}}>No codes yet. Create your first discount code above.</div>
      ) : (
        <div style={{background:'#1a1a1a',borderRadius:12,border:'1px solid #222',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#0d0d0d'}}>
              {['Code','Type','Value','Applies To','Uses','Valid Until','Affiliate','Status',''].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#9ca3af',fontSize:12,fontWeight:600,borderBottom:'1px solid #1a1a1a'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{codes.map(c=>(
              <tr key={c.id} style={{borderTop:'1px solid #1a1a1a'}}>
                <td style={{padding:'10px 14px',color:'#D4A853',fontWeight:700,fontFamily:'monospace',fontSize:14}}>{c.code}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13,textTransform:'capitalize'}}>{c.discount_type.replace('_',' ')}</td>
                <td style={{padding:'10px 14px',color:'white',fontSize:13,fontWeight:600}}>
                  {c.discount_type==='percent' ? `${c.discount_value}%` : c.discount_type==='months_free' ? `${c.discount_value} mo free` : `R${c.discount_value}`}
                </td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13,textTransform:'capitalize'}}>{c.applies_to}</td>
                <td style={{padding:'10px 14px',color:'white',fontSize:13}}>{c.uses_count||0}{c.max_uses ? ` / ${c.max_uses}`:''}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:12}}>{c.valid_until ? c.valid_until.slice(0,10) : '—'}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:12}}>{c.affiliate_handle||'—'}</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{background:c.active?'#052e16':'#1a0000',color:c.active?'#4ade80':'#f87171',border:`1px solid ${c.active?'#166534':'#991b1b'}`,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>
                    {c.active?'Active':'Inactive'}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>startEdit(c)} style={{background:'#222',color:'#D4A853',border:'1px solid #333',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Edit</button>
                    <button onClick={()=>toggleActive(c.id,!c.active)} style={{background:'#222',color:'#9ca3af',border:'1px solid #333',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>
                      {c.active?'Disable':'Enable'}
                    </button>
                    <button onClick={()=>deleteCode(c.id,c.code)} style={{background:'#1a0000',color:'#f87171',border:'1px solid #991b1b',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Del</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}



export default SADiscountCodes;
