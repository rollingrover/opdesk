import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';

// ─── CALENDAR ────────────────────────────
function CalendarPage() {
  const { company, limits, companyRegion} = useAuth();
  const [bookings, setBookings] = useState([]);
  const [cur, setCur] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [newBookingDate, setNewBookingDate] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [guides,   setGuides]   = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [clientList, setClientList] = useState([]);

  const bookingLimit = limits.bookings;

  async function load() {
    if (!company) return;
    const start = new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString();
    const end   = new Date(cur.getFullYear(), cur.getMonth()+1, 0, 23, 59).toISOString();
    const [bRes, vRes, gRes, dRes, cRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('company_id', company.id).gte('start_date', start).lte('start_date', end),
      supabase.from('vehicles').select('id,make,model,registration').eq('company_id', company.id).eq('status','active').order('make'),
      supabase.from('guides').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
      supabase.from('drivers').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
      supabase.from('guests').select('id,full_name,email,phone').eq('company_id', company.id).order('full_name'),
    ]);
    setBookings(bRes.data||[]);
    setVehicles(vRes.data||[]); setGuides(gRes.data||[]); setDrivers(dRes.data||[]);
    setClientList(cRes.data||[]);
  }
  useEffect(() => { load(); }, [company, cur]);

  function handleDayClick(day) {
    if (bookingLimit !== null && bookings.length >= bookingLimit) { toast('Booking limit reached — upgrade to add more','error'); return; }
    const date = new Date(cur.getFullYear(), cur.getMonth(), day);
    const iso  = date.toISOString().split('T')[0];
    setNewBookingDate(iso);
    setForm({ status:'pending', activity_type:'safari', pax:1, total_amount:0, start_date:iso, vehicle_id:'', guide_id:'', driver_id:'' });
    setShowBookingModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = {
      ...form,
      company_id: company.id,
      vehicle_id: form.vehicle_id || null,
      guide_id:   form.guide_id   || null,
      driver_id:  form.driver_id  || null,
      booking_ref: 'OD-' + Date.now().toString(36).toUpperCase(),
    };
    const { error } = await supabase.from('bookings').insert(payload);
    if (error) toast(error.message,'error');
    else { toast('Booking created'); setShowBookingModal(false); load(); }
    setSaving(false);
  }

  const y = cur.getFullYear(), m = cur.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const monthName = cur.toLocaleDateString('en-ZA', {month:'long', year:'numeric'});
  const byDay = {};
  bookings.forEach(b => { if (b.start_date) { const d=new Date(b.start_date).getDate(); if (!byDay[d]) byDay[d]=[]; byDay[d].push(b); }});
  const statusBg = { confirmed:'#22c55e', pending:'#eab308', cancelled:'#ef4444', completed:'#3b82f6' };
  const today = new Date();

  return (
    <div>
      <PageHeader title="Calendar" subtitle={`${bookings.length} bookings`}
        action={<div className="flex gap-2">
          <button className="btn-secondary py-1.5 px-3" onClick={()=>setCur(new Date(y,m-1,1))}>‹</button>
          <button className="btn-secondary py-1.5 px-3" onClick={()=>setCur(new Date())}>Today</button>
          <button className="btn-secondary py-1.5 px-3" onClick={()=>setCur(new Date(y,m+1,1))}>›</button>
        </div>}
      />
      <div className="card p-5">
        <h2 className="text-lg font-bold text-navy mb-4">{monthName}</h2>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length:firstDay},(_,i)=><div key={'e'+i}/>)}
          {Array.from({length:days},(_,i)=>i+1).map(day => {
            const db = byDay[day]||[];
            const isToday = today.getDate()===day && today.getMonth()===m && today.getFullYear()===y;
            return (
              <div key={day} onClick={()=>handleDayClick(day)}
                className="min-h-16 p-1.5 rounded-lg border cursor-pointer transition-all hover:border-yellow-300 hover:bg-amber-50"
                style={{borderColor: isToday ? '#D4A853' : '#f1f5f9', background: isToday ? '#fffbf0' : 'white'}}
                title="Click to add booking">
                <span className="text-xs font-bold" style={{color: isToday ? '#D4A853' : '#64748b'}}>{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {db.slice(0,2).map(b=><div key={b.id} className="text-white text-xs rounded px-1 py-0.5 truncate" style={{background:statusBg[b.status]||'#94a3b8',fontSize:'10px'}}>{b.guest_name?.split(' ')[0]}</div>)}
                  {db.length>2 && <div className="text-xs text-gray-400">+{db.length-2}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Click any date to create a booking</p>
      </div>

      {showBookingModal && (
        <div className="modal-overlay" onClick={()=>setShowBookingModal(false)}>
          <div className="modal max-w-lg w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">New Booking — {newBookingDate}</h3>
              <button onClick={()=>setShowBookingModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              
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
                <div className="col-span-2 border-t border-gray-100 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resource Allocation</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Vehicle</label>
                  <select value={form.vehicle_id||''} onChange={e=>setForm({...form,vehicle_id:e.target.value})}>
                    <option value="">— None —</option>
                    {vehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} ({v.registration})</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Guide</label>
                  <select value={form.guide_id||''} onChange={e=>setForm({...form,guide_id:e.target.value})}>
                    <option value="">— None —</option>
                    {guides.map(g=><option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Driver</label>
                  <select value={form.driver_id||''} onChange={e=>setForm({...form,driver_id:e.target.value})}>
                    <option value="">— None —</option>
                    {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Special requirements..."/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Create Booking'}</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowBookingModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



export default CalendarPage;
