import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── USERS ───────────────────────────────
function UsersPage() {
  const { company, limits, profile, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email:'', full_name:'', role:'agent' });
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const seatLimit = limits.seats;

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('company_id', company.id).order('created_at');
    setUsers(data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  async function invite(e) {
    e.preventDefault();
    if (seatLimit !== null && users.length >= seatLimit) { setShowUpgrade(true); return; }
    setSaving(true);
    const { error } = await supabase.from('invites').insert({ company_id:company.id, email:form.email, full_name:form.full_name, role:form.role, invited_by:profile.id });
    if (error) toast(error.message, 'error');
    else toast('Invite created — send them the sign-up link');
    setShowModal(false); setSaving(false); load();
  }
  async function removeUser(uid) {
    if (uid === profile.id) { toast("Can't remove yourself", 'error'); return; }
    if (!confirm('Remove this user?')) return;
    await supabase.from('profiles').update({ company_id: null }).eq('id', uid);
    toast('User removed'); load();
  }
  const roleColor = { owner:'badge-navy', agent:'badge-blue', superadmin:'badge-gold' };
  return (
    <div>
      <PageHeader title="Users" subtitle={seatLimit ? `${users.length}/${seatLimit} seats` : `${users.length} users`}
        action={<button className="btn-primary flex items-center gap-2" onClick={()=>{ if(seatLimit!==null&&users.length>=seatLimit){setShowUpgrade(true);return;} setForm({email:'',full_name:'',role:'agent'}); setShowModal(true); }}><Icon name="plus" size={16}/>Invite</button>}
      />
      {seatLimit!==null && users.length>=seatLimit && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center"><span className="text-amber-700 text-sm flex items-center gap-2"><Icon name="alert" size={16}/>Seat limit reached</span><button className="btn-primary text-xs py-1.5" onClick={()=>setShowUpgrade(true)}>Upgrade</button></div>}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.id}>
                <td className="font-semibold text-navy">{u.full_name||'—'}{u.id===profile.id&&<span className="ml-2 badge badge-gray text-xs">You</span>}</td>
                <td className="text-gray-500">{u.email||'—'}</td>
                <td><span className={`badge ${roleColor[u.role]||'badge-gray'} capitalize`}>{u.role||'agent'}</span></td>
                <td>{u.id!==profile.id && <button className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1" onClick={()=>removeUser(u.id)}><Icon name="trash" size={13}/>Remove</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-navy text-lg">Invite Team Member</h3><button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button></div>
            <form onSubmit={invite} className="space-y-4">
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Full Name</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required placeholder="Team member name"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required placeholder="member@email.com"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Role</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="agent">Agent (bookings, guests, calendar)</option></select></div>
              <div className="flex gap-3"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Inviting...':'Create Invite'}</button><button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
      {showUpgrade && <AddOnPurchaseModal resource='seats' onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}


export default UsersPage;
