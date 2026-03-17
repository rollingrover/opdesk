import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TIERS, TIER_LIMITS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS_MAP, LABELS, ADDON_TYPES, getCurrencySymbol, getCompanyRegion, Icon } from '../lib/constants.jsx';
import PageHeader from '../components/PageHeader.jsx';
import AddOnPurchaseModal from '../components/AddOnPurchaseModal.jsx';

// Toast notification system
function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

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

// ─── USERS ───────────────────────────────
function UsersPage() {
  const { toast, showToast } = useToast();
  const { company, limits, profile, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email:'', full_name:'', role:'agent' });
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const seatLimit = limits?.seats;

  async function load() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => { if (company) load(); }, [company]);

  async function invite(e) {
    e.preventDefault();
    if (seatLimit !== null && users.length >= seatLimit) { 
      setShowUpgrade(true); 
      return; 
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('invites').insert({ 
        company_id: company.id, 
        email: form.email, 
        full_name: form.full_name, 
        role: form.role, 
        invited_by: profile.id 
      });
      if (error) throw error;
      showToast('Invite created — send them the sign-up link', 'success');
      setShowModal(false);
      load();
    } catch (error) {
      console.error('Error inviting user:', error);
      showToast(error.message || 'Failed to send invite', 'error');
    } finally {
      setSaving(false);
    }
  }
  
  async function removeUser(uid) {
    if (uid === profile.id) { 
      showToast("Can't remove yourself", 'error'); 
      return; 
    }
    if (!confirm('Remove this user from your company?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: null })
        .eq('id', uid);
      if (error) throw error;
      showToast('User removed', 'success');
      load();
    } catch (error) {
      console.error('Error removing user:', error);
      showToast('Failed to remove user', 'error');
    }
  }
  
  const roleColor = { 
    owner:'badge-navy', 
    agent:'badge-blue', 
    superadmin:'badge-gold' 
  };

  return (
    <div>
      <Toast toast={toast} />
      
      <PageHeader 
        title="Users" 
        subtitle={seatLimit ? `${users.length}/${seatLimit} seats` : `${users.length} users`}
        action={
          <button 
            className="btn-primary flex items-center gap-2" 
            onClick={() => { 
              if(seatLimit !== null && users.length >= seatLimit) {
                setShowUpgrade(true);
                return;
              } 
              setForm({email:'', full_name:'', role:'agent'}); 
              setShowModal(true); 
            }}
          >
            <Icon name="plus" size={16}/>Invite
          </button>
        }
      />
      
      {seatLimit !== null && users.length >= seatLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm flex items-center gap-2">
            <Icon name="alert" size={16}/>Seat limit reached
          </span>
          <button className="btn-primary text-xs py-1.5" onClick={() => setShowUpgrade(true)}>
            Upgrade
          </button>
        </div>
      )}
      
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Icon name="users" size={32} className="mx-auto mb-2 opacity-30"/>
            <p>No users yet. Invite team members to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">2FA</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="py-3 px-4 font-semibold text-navy">
                      {u.full_name || '—'}
                      {u.id === profile.id && (
                        <span className="ml-2 badge badge-gray text-xs">You</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{u.email || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${roleColor[u.role] || 'badge-gray'} capitalize`}>
                        {u.role || 'agent'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${u.totp_enabled ? 'badge-green' : 'badge-gray'}`}>
                        {u.totp_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.id !== profile.id && (
                        <button 
                          className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1" 
                          onClick={() => removeUser(u.id)}
                        >
                          <Icon name="trash" size={13}/>Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">Invite Team Member</h3>
              <button onClick={() => setShowModal(false)}>
                <Icon name="x" size={18} className="text-gray-400"/>
              </button>
            </div>
            <form onSubmit={invite} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Full Name</label>
                <input 
                  value={form.full_name} 
                  onChange={e => setForm({...form, full_name: e.target.value})} 
                  required 
                  placeholder="Team member name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Email</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  required 
                  placeholder="member@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Role</label>
                <select 
                  value={form.role} 
                  onChange={e => setForm({...form, role: e.target.value})}
                >
                  <option value="agent">Agent (bookings, guests, calendar)</option>
                  <option value="owner">Owner (full access)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Inviting...' : 'Create Invite'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showUpgrade && (
        <AddOnPurchaseModal 
          resource="seats" 
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

export default UsersPage;