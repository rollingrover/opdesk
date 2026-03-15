import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── GENERIC CRUD ────────────────────────
function CrudPage({ title, icon, table, fields, resourceKey }) {
  const { company, limits, companyRegion} = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const limit = limits[resourceKey];

  async function load() {
    const { data } = await supabase.from(table).select('*').eq('company_id', company.id).order('created_at', {ascending:false});
    setItems(data||[]);
    setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setShowUpgrade(true); return; }
    setEditItem(null); setForm({}); setShowModal(true);
  }
  function openEdit(item) {
    setEditItem(item);
    const f = {};
    fields.forEach(fi => { f[fi.key] = item[fi.key] || ''; });
    setForm(f); setShowModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id };
    const { error } = editItem
      ? await supabase.from(table).update(payload).eq('id', editItem.id)
      : await supabase.from(table).insert(payload);
    if (error) toast(error.message, 'error');
    else { toast(editItem ? 'Updated' : 'Created'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return;
    await supabase.from(table).delete().eq('id', id);
    toast('Deleted'); load();
  }

  const displayFields = fields.filter(f => f.display !== false);
  const formFields = fields.filter(f => f.form !== false);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={limit ? `${items.length}/${limit} used` : `${items.length} total`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm flex items-center gap-2"><Icon name="alert" size={16}/>Limit reached ({limit}/{limit})</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setShowUpgrade(true)}>Upgrade</button>
        </div>
      )}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name={icon} size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400">No {title.toLowerCase()} yet</p>
            <button className="btn-primary mt-4" onClick={openCreate}>Add First</button>
          </div>
        ) : (
          <table>
            <thead><tr>{displayFields.map(f=><th key={f.key}>{f.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id}>
                {displayFields.map(f => (
                  <td key={f.key}>
                    {f.badge ? <span className={`badge ${f.badge(item[f.key])}`}>{item[f.key]||'—'}</span>
                    : f.format ? f.format(item[f.key], item)
                    : <span className={f.primary?'font-semibold text-navy':'text-gray-600'}>{item[f.key]||'—'}</span>}
                  </td>
                ))}
                <td><div className="flex items-center gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(item)}><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(item.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">{editItem?'Edit':'Add'} {title.slice(0,-1)}</h3>
              <button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {formFields.map(f => (
                <div key={f.key}>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                  {f.type==='select' ? (
                    <select value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required}>
                      <option value="">Select {f.label}</option>
                      {f.options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
                    </select>
                  ) : f.type==='textarea' ? (
                    <textarea value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} rows={3} placeholder={f.placeholder}/>
                  ) : (
                    <input type={f.type||'text'} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required} placeholder={f.placeholder}/>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Save'}</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}


export default CrudPage;
