import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';

// Toast notification system
function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

// Toast component
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

function SAOperatorProfiles() {
  const { toast, showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  
  // Form state for editing user
  const [userForm, setUserForm] = useState({
    id: '',
    email: '',
    full_name: '',
    role: 'user',
    company_id: '',
    totp_enabled: false
  });
  const [saving, setSaving] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  function openEditUser(user) {
    setSelectedUser(user);
    setUserForm({
      id: user.id,
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role || 'user',
      company_id: user.company_id || '',
      totp_enabled: user.totp_enabled || false
    });
    setShowUserModal(true);
  }

  function closeUserModal() {
    setShowUserModal(false);
    setSelectedUser(null);
  }

  async function saveUser() {
    if (!userForm.full_name) {
      showToast('Full name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userForm.full_name,
          role: userForm.role,
          company_id: userForm.company_id || null
        })
        .eq('id', userForm.id);

      if (error) throw error;

      showToast('User updated successfully', 'success');
      closeUserModal();
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function resetUserPassword(email) {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      showToast('Password reset email sent', 'success');
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('Failed to send reset email', 'error');
    }
  }

  async function toggle2FA(userId, enabled) {
    const action = enabled ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} 2FA for this user?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          totp_enabled: !enabled,
          totp_secret: enabled ? null : undefined // Clear secret when disabling
        })
        .eq('id', userId);

      if (error) throw error;
      
      showToast(`2FA ${!enabled ? 'enabled' : 'disabled'} for user`, 'success');
      loadUsers();
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      showToast('Failed to update 2FA status', 'error');
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || 
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    const matchesCompany = filterCompany === 'all' || u.company_id === filterCompany;
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesCompany && matchesRole;
  });

  const stats = {
    total: users.length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
    owners: users.filter(u => u.role === 'owner').length,
    users: users.filter(u => u.role === 'user').length,
    twoFAEnabled: users.filter(u => u.totp_enabled).length
  };

  const inputStyle = {
    background: '#111',
    border: '1px solid #333',
    color: 'white',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 600,
    display: 'block',
    marginBottom: 4
  };

  return (
    <div>
      <Toast toast={toast} />
      
      <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>User Management</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: stats.total, color: '#D4A853' },
          { label: 'Super Admins', value: stats.superadmin, color: '#dc2626' },
          { label: 'Owners', value: stats.owners, color: '#3b82f6' },
          { label: 'Regular Users', value: stats.users, color: '#22c55e' },
          { label: '2FA Enabled', value: stats.twoFAEnabled, color: '#a855f7' }
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '14px 18px', border: '1px solid #222' }}>
            <div style={{ color: s.color, fontWeight: 900, fontSize: 22 }}>{s.value}</div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          style={{ ...inputStyle, width: 150 }}
        >
          <option value="all">All Companies</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ ...inputStyle, width: 150 }}
        >
          <option value="all">All Roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="owner">Owner</option>
          <option value="user">User</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>
          {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <Icon name="users" size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No users found</p>
        </div>
      ) : (
        <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['User', 'Role', 'Company', '2FA', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#9ca3af', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #1a1a1a' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{u.full_name || '—'}</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{u.email || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: u.role === 'superadmin' ? '#7c3aed33' : 
                                 u.role === 'owner' ? '#3b82f633' : '#6b728033',
                      color: u.role === 'superadmin' ? '#a78bfa' : 
                             u.role === 'owner' ? '#60a5fa' : '#9ca3af',
                      borderRadius: 20,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 13 }}>
                    {u.companies?.name || '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: u.totp_enabled ? '#14532d' : '#1a1a1a',
                      color: u.totp_enabled ? '#4ade80' : '#6b7280',
                      border: `1px solid ${u.totp_enabled ? '#166534' : '#333'}`,
                      borderRadius: 20,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      {u.totp_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditUser(u)}
                        style={{
                          background: '#222',
                          color: '#D4A853',
                          border: '1px solid #333',
                          borderRadius: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => resetUserPassword(u.email)}
                        style={{
                          background: '#222',
                          color: '#3b82f6',
                          border: '1px solid #333',
                          borderRadius: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => toggle2FA(u.id, u.totp_enabled)}
                        style={{
                          background: u.totp_enabled ? '#1a0000' : '#14532d',
                          color: u.totp_enabled ? '#f87171' : '#4ade80',
                          border: '1px solid',
                          borderColor: u.totp_enabled ? '#991b1b' : '#166534',
                          borderRadius: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        {u.totp_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: 20
        }} onClick={closeUserModal}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: 16,
            padding: 28,
            width: 500,
            maxWidth: '100%',
            border: '1px solid #222'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ color: 'white', fontSize: 16, margin: 0 }}>Edit User</h3>
              <button onClick={closeUserModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputStyle, background: '#0a0a0a', color: '#6b7280' }}>{userForm.email}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={userForm.full_name}
                onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                style={inputStyle}
              >
                <option value="user">User</option>
                <option value="owner">Owner</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Company</label>
              <select
                value={userForm.company_id}
                onChange={e => setUserForm({ ...userForm, company_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">No Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>2FA Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: userForm.totp_enabled ? '#14532d' : '#1a1a1a',
                  color: userForm.totp_enabled ? '#4ade80' : '#6b7280',
                  border: `1px solid ${userForm.totp_enabled ? '#166534' : '#333'}`,
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontSize: 12
                }}>
                  {userForm.totp_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span style={{ color: '#6b7280', fontSize: 12 }}>
                  (Toggle in main table)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveUser}
                disabled={saving}
                style={{
                  flex: 1,
                  background: '#D4A853',
                  color: '#0F2540',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={closeUserModal}
                style={{
                  flex: 1,
                  background: '#222',
                  color: '#9ca3af',
                  border: '1px solid #333',
                  borderRadius: 8,
                  padding: '10px 0',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SAOperatorProfiles;