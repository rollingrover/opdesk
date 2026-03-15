import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';

// ─── FIREARM REGISTER ────────────────────
function FirearmRegisterPage() {
  const { company, features } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  if (!features.firearmRegister) return (
    <div className="card p-12 text-center">
      <Icon name="firearm" size={48} className="mx-auto mb-3 text-gray-200"/>
      <h2 className="text-xl font-bold text-navy mb-2">Firearm Register</h2>
      <p className="text-gray-500 mb-4">Premium plan only. Legally compliant register for safari-licensed firearms.</p>
      <button className="btn-primary">Upgrade to Premium — R2,499/mo</button>
    </div>
  );

  const fields = [
    { key:'serial_number', label:'Serial Number', required:true, primary:true, placeholder:'ABC123456' },
    { key:'make', label:'Make/Model', placeholder:'Ruger M77' },
    { key:'calibre', label:'Calibre', placeholder:'.375 H&H' },
    { key:'license_number', label:'License No.', placeholder:'W 12345 ZN' },
    { key:'license_expiry', label:'License Expiry', type:'date' },
    { key:'holder_name', label:'Licensed Holder', placeholder:'Operator Name' },
    { key:'storage_location', label:'Storage', placeholder:'Gun safe Room 1', display:false },
    { key:'status', label:'Status', type:'select', options:['active','decommissioned','lost'], badge:v=>({active:'badge-green',decommissioned:'badge-gray',lost:'badge-red'}[v]||'badge-gray') },
  ];

  async function load() {
    const { data } = await supabase.from('firearm_register').select('*').eq('company_id', company.id).order('created_at', {ascending:false});
    setItems(data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() { setEditItem(null); setForm({}); setShowModal(true); }
  function openEdit(item) { setEditItem(item); const f={}; fields.forEach(fi=>{ f[fi.key]=item[fi.key]||''; }); setForm(f); setShowModal(true); }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const { error } = editItem
      ? await supabase.from('firearm_register').update({...form, company_id:company.id}).eq('id', editItem.id)
      : await supabase.from('firearm_register').insert({...form, company_id:company.id});
    if (error) toast(error.message, 'error');
    else { toast(editItem?'Updated':'Registered'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function del(id) {
    if (!confirm('Remove from register?')) return;
    await supabase.from('firearm_register').delete().eq('id', id);
    toast('Removed'); load();
  }

  const displayFields = fields.filter(f => f.display !== false);

  return (
    <div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
        <Icon name="alert" size={16}/>Licensed firearms only. Ensure compliance with Firearms Control Act No. 60 of 2000.
      </div>
      <PageHeader title="Firearm Register" subtitle={`${items.length} on register`}
        action={<div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={()=>exportCSV(items,'firearm_register')}><Icon name="download" size={14}/>Export</button>
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Register</button>
        </div>}
      />
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length===0 ? (
          <div className="p-12 text-center"><Icon name="firearm" size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400">No firearms registered</p><button className="btn-primary mt-4" onClick={openCreate}>Register First Firearm</button></div>
        ) : (
          <table>
            <thead><tr>{displayFields.map(f=><th key={f.key}>{f.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id}>
                {displayFields.map(f => <td key={f.key}>{f.badge ? <span className={`badge ${f.badge(item[f.key])}`}>{item[f.key]||'—'}</span> : <span className={f.primary?'font-semibold text-navy':'text-gray-600'}>{item[f.key]||'—'}</span>}</td>)}
                <td><div className="flex items-center gap-2"><button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(item)}><Icon name="edit" size={14}/></button><button className="text-red-400 hover:text-red-600" onClick={()=>del(item.id)}><Icon name="trash" size={14}/></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-navy text-lg">{editItem?'Edit':'Register'} Firearm</h3><button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button></div>
            <form onSubmit={handleSave} className="space-y-3">
              {fields.map(f=>(
                <div key={f.key}>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">{f.label}{f.required&&<span className="text-red-400 ml-0.5">*</span>}</label>
                  {f.type==='select' ? <select value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Select</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>
                  : <input type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required} placeholder={f.placeholder}/>}
                </div>
              ))}
              <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Save'}</button><button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default FirearmRegisterPage;
