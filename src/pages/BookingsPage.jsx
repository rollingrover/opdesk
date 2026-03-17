import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TIERS, TIER_LIMITS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS_MAP, LABELS, ADDON_TYPES, getCurrencySymbol, getCompanyRegion, Icon } from '../lib/constants.jsx';
import PageHeader from '../components/PageHeader.jsx';
import CrudPage from './CrudPage.jsx';

// ─── BOOKINGS ────────────────────────────

const ToursPage = () => <CrudPage title="Tours" icon="tours" table="tours" resourceKey="tours" fields={[
  { key:'name', label:'Tour Name', required:true, primary:true, placeholder:'Zululand Cultural Tour' },
  { key:'duration_hours', label:'Duration (hrs)', type:'number', placeholder:'6' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'750' },
  { key:'max_pax', label:'Max Guests', type:'number', placeholder:'12' },
  { key:'meeting_point', label:'Meeting Point', placeholder:'Durban Beach Front' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>;

const SafarisPage = () => <CrudPage title="Safaris" icon="safaris" table="safaris" resourceKey="safaris" fields={[
  { key:'name', label:'Safari Name', required:true, primary:true, placeholder:'Big 5 Safari' },
  { key:'park', label:'Park/Reserve', placeholder:'Hluhluwe-iMfolozi' },
  { key:'duration_days', label:'Duration (hrs)', type:'number', placeholder:'3' },
  { key:'price_per_person', label:'Price/Person (R)', type:'number', placeholder:'3500' },
  { key:'max_pax', label:'Max Guests', type:'number', placeholder:'8' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>;

const ShuttlesPage = () => <CrudPage title="Shuttles" icon="shuttles" table="shuttles" resourceKey="shuttles" fields={[
  { key:'name', label:'Route Name', required:true, primary:true, placeholder:'Durban Airport Shuttle' },
  { key:'from_location', label:'From', placeholder:'King Shaka Airport' },
  { key:'to_location', label:'To', placeholder:'Durban CBD' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'350' },
  { key:'vehicle_type', label:'Vehicle', placeholder:'Toyota Quantum' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>;

const ChartersPage = () => <CrudPage title="Charters" icon="charters" table="charters" resourceKey="charters" fields={[
  { key:'name', label:'Charter Name', required:true, primary:true, placeholder:'Deep Sea Fishing Charter' },
  { key:'charter_type', label:'Type', type:'select', options:['road','boat','deep_sea_fishing','yacht','light_aircraft','helicopter','other'] },
  { key:'duration_hours', label:'Duration (hrs)', type:'number', placeholder:'8' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'4500' },
  { key:'capacity', label:'Capacity', type:'number', placeholder:'10' },
  { key:'departure_point', label:'Departure', placeholder:'Durban Harbour' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>;

const GuestsPage = () => <CrudPage title="Guests" icon="guests" table="guests" resourceKey="guests" fields={[
  { key:'full_name',        label:'Name',            required:true, primary:true, placeholder:'John Dlamini' },
  { key:'email',            label:'Email',           type:'email',  placeholder:'guest@email.com' },
  { key:'phone',            label:'Phone',           placeholder:'+27 82 000 0000' },
  { key:'nationality',      label:'Nationality',     placeholder:'South African' },
  { key:'id_number',        label:'ID/Passport',     placeholder:'Identity number' },
  { key:'billing_company',  label:'Billing Company', placeholder:'ABC Tours (Pty) Ltd', display:false },
  { key:'billing_address',  label:'Billing Address', placeholder:'123 Main Street',     display:false },
  { key:'billing_city',     label:'City',            placeholder:'Durban',              display:false },
  { key:'billing_province', label:'Province',        placeholder:'KwaZulu-Natal',       display:false },
  { key:'billing_postcode', label:'Postal Code',     placeholder:'4001',                display:false },
  { key:'billing_country',  label:'Country',         placeholder:'South Africa',        display:false },
  { key:'vat_number',       label:'VAT Number',      placeholder:'4012345678',          display:false },
  { key:'notes',            label:'Notes',           type:'textarea',                   display:false },
]}/>;
function BookingsPage() {
  const { company, limits, features, companyRegion } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [guides,   setGuides]   = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [clientList, setClientList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editB, setEditB] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bookingLimit = limits.bookings;

  async function load() {
    const [bRes, vRes, gRes, dRes, cRes] = await Promise.all([
      supabase.from('bookings').select('*, vehicles(make,model,registration), guides(full_name), drivers(full_name)').eq('company_id', company.id).order('created_at', {ascending:false}),
      supabase.from('vehicles').select('id,make,model,registration').eq('company_id', company.id).eq('status','active').order('make'),
      supabase.from('guides').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
      supabase.from('drivers').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
      supabase.from('guests').select('id,full_name,email').eq('company_id', company.id).order('full_name'),
    ]);
    setBookings(bRes.data||[]);
    setVehicles(vRes.data||[]);
    setGuides(gRes.data||[]);
    setDrivers(dRes.data||[]);
    setClientList(cRes.data||[]);
    setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (bookingLimit !== null && bookings.length >= bookingLimit) { setShowUpgrade(true); return; }
    setEditB(null);
    setForm({ status:'pending', activity_type:'safari', pax:1, total_amount:0, vehicle_id:'', guide_id:'', driver_id:'' });
    setShowModal(true);
  }
  function openEdit(b) {
    setEditB(b);
    setForm({
      guest_name:b.guest_name, guest_email:b.guest_email||'', guest_phone:b.guest_phone||'',
      activity_type:b.activity_type, start_date:b.start_date?.split('T')[0]||'',
      end_date:b.end_date?.split('T')[0]||'', pax:b.pax||1, total_amount:b.total_amount||0,
      status:b.status, notes:b.notes||'',
      vehicle_id:b.vehicle_id||'', guide_id:b.guide_id||'', driver_id:b.driver_id||'',
    });
    setShowModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = {
      ...form,
      company_id: company.id,
      vehicle_id: form.vehicle_id || null,
      guide_id:   form.guide_id   || null,
      driver_id:  form.driver_id  || null,
    };
    if (!editB) payload.booking_ref = 'OD-' + Date.now().toString(36).toUpperCase();
    const { error } = editB
      ? await supabase.from('bookings').update(payload).eq('id', editB.id)
      : await supabase.from('bookings').insert(payload);
    if (error) toast(error.message, 'error');
    else { toast(editB?'Updated':'Booking created'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function del(id) {
    if (!confirm('Delete this booking?')) return;
    await supabase.from('bookings').delete().eq('id', id);
    toast('Deleted'); load();
  }

  const statusColor = { confirmed:'badge-green', pending:'badge-yellow', cancelled:'badge-red', completed:'badge-blue' };
  const filtered = filter==='all' ? bookings : bookings.filter(b=>b.status===filter);

  const AllocBadge = ({icon, label}) => label ? (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
      <Icon name={icon} size={11}/>{label}
    </span>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={bookingLimit ? `${bookings.length}/${bookingLimit}` : `${bookings.length} total`}
        action={<div className="flex gap-2">
          {features.csvExport && <button className="btn-secondary flex items-center gap-2 text-sm" onClick={()=>exportCSV(bookings,'bookings')}><Icon name="download" size={14}/>Export</button>}
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>New Booking</button>
        </div>}
      />
      <div className="flex gap-2 mb-4">
        {['all','pending','confirmed','completed','cancelled'].map(st=>(
          <button key={st} onClick={()=>setFilter(st)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter===st?'bg-navy text-white':'bg-white text-gray-500 hover:bg-gray-50'}`}>{st.charAt(0).toUpperCase()+st.slice(1)}</button>
        ))}
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : filtered.length===0 ? (
          <div className="p-12 text-center"><Icon name="bookings" size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400">No bookings</p><button className="btn-primary mt-4" onClick={openCreate}>Create First Booking</button></div>
        ) : (
          <table>
            <thead><tr><th>Ref</th><th>Guest</th><th>Activity</th><th>Date</th><th>Allocated</th><th>Pax</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(b => (
              <tr key={b.id}>
                <td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{b.booking_ref}</code></td>
                <td><div className="font-semibold text-navy">{b.guest_name}</div><div className="text-xs text-gray-400">{b.guest_email}</div></td>
                <td className="capitalize text-gray-500">{b.activity_type}</td>
                <td className="text-gray-500 text-sm">{b.start_date ? new Date(b.start_date).toLocaleDateString('en-ZA') : '—'}</td>
                <td>
                  <div className="flex flex-col gap-0.5">
                    <AllocBadge icon="vehicles" label={b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : null}/>
                    <AllocBadge icon="guides"   label={b.guides?.full_name}/>
                    <AllocBadge icon="drivers"  label={b.drivers?.full_name}/>
                  </div>
                </td>
                <td className="text-center">{b.pax}</td>
                <td className="font-semibold">R{(b.total_amount||0).toLocaleString()}</td>
                <td><span className={`badge ${statusColor[b.status]||'badge-gray'}`}>{b.status}</span></td>
                <td><div className="flex items-center gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(b)}><Icon name="edit" size={14}/></button>
                  <button className="text-purple-500 hover:text-purple-700" title="Invoice" onClick={()=>setViewInvoice(b)}><Icon name="invoice" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>del(b.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal max-w-lg w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">{editB?'Edit Booking':'New Booking'}</h3>
              <button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {clientList.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Select Existing Client / Guest</label>
                  <select onChange={e => {
                    const c = clientList.find(x => x.id === e.target.value);
                    if (c) setForm(f => ({ ...f, guest_id: c.id, guest_name: c.full_name, guest_email: c.email||f.guest_email, guest_phone: c.phone||f.guest_phone }));
                  }} defaultValue="">
                    <option value="">— New guest (fill in below) —</option>
                    {clientList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Guest Name *</label><input value={form.guest_name||''} onChange={e=>setForm({...form,guest_name:e.target.value})} required placeholder="John Dlamini"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={form.guest_email||''} onChange={e=>setForm({...form,guest_email:e.target.value})} placeholder="guest@email.com"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Phone</label><input value={form.guest_phone||''} onChange={e=>setForm({...form,guest_phone:e.target.value})} placeholder="+27 82 000 0000"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Activity *</label>
                  <select value={form.activity_type||'safari'} onChange={e=>setForm({...form,activity_type:e.target.value})} required>
                    {['safari','tour','shuttle','charter','trail'].map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'pending'} onChange={e=>setForm({...form,status:e.target.value})}>
                    {['pending','confirmed','completed','cancelled'].map(st=><option key={st} value={st}>{st.charAt(0).toUpperCase()+st.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Start Date</label><input type="date" value={form.start_date||''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">End Date</label><input type="date" value={form.end_date||''} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Passengers</label><input type="number" value={form.pax||1} onChange={e=>setForm({...form,pax:parseInt(e.target.value)})} min={1}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Total (R)</label><input type="number" value={form.total_amount||0} onChange={e=>setForm({...form,total_amount:parseFloat(e.target.value)})} min={0} step={0.01}/></div>

                {/* ── Resource Allocation ── */}
                <div className="col-span-2">
                  <div className="border-t border-gray-100 pt-3 mt-1 mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resource Allocation</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Vehicle</label>
                  <select value={form.vehicle_id||''} onChange={e=>setForm({...form,vehicle_id:e.target.value})}>
                    <option value="">— None —</option>
                    {vehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} ({v.registration})</option>)}
                  </select>
                  {vehicles.length===0 && <p className="text-xs text-gray-400 mt-1">No vehicles added yet — go to Vehicles to add one.</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Guide</label>
                  <select value={form.guide_id||''} onChange={e=>setForm({...form,guide_id:e.target.value})}>
                    <option value="">— None —</option>
                    {guides.map(g=><option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                  {guides.length===0 && <p className="text-xs text-gray-400 mt-1">No guides added yet.</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Driver</label>
                  <select value={form.driver_id||''} onChange={e=>setForm({...form,driver_id:e.target.value})}>
                    <option value="">— None —</option>
                    {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  {drivers.length===0 && <p className="text-xs text-gray-400 mt-1">No drivers added yet.</p>}
                </div>

                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Special requirements..."/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Save Booking'}</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewInvoice && <InvoiceModal booking={viewInvoice} onClose={()=>setViewInvoice(null)}/>}
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}



export { ToursPage, SafarisPage, ShuttlesPage, ChartersPage };

export default BookingsPage;
