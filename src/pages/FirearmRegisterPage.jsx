import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import AddOnPurchaseModal from '../components/AddOnPurchaseModal';

function FirearmRegisterPage() {
  const { company, features, addons } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    serial_number: '',
    make: '',
    model: '',
    caliber: '',
    type: 'rifle',
    status: 'active',
    assigned_to: '',
    license_number: '',
    license_expiry: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [guides, setGuides] = useState([]);

  // Check if user has access to firearm register
  const hasAccess = features?.firearmRegister || addons?.some(a => a.addon_key === 'firearm_register' && a.active);

  useEffect(() => {
    if (!company) return;
    
    if (hasAccess) {
      loadFirearms();
      loadGuides();
    } else {
      setLoading(false);
    }
  }, [company, hasAccess]);

  async function loadFirearms() {
    try {
      const { data, error } = await supabase
        .from('firearms')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data);
      }
    } catch (error) {
      console.error('Error loading firearms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGuides() {
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('id, full_name')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('full_name');

      if (!error && data) {
        setGuides(data);
      }
    } catch (error) {
      console.error('Error loading guides:', error);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      company_id: company.id
    };

    const { error } = editItem
      ? await supabase.from('firearms').update(payload).eq('id', editItem.id)
      : await supabase.from('firearms').insert(payload);

    if (error) {
      alert('Error saving firearm: ' + error.message);
    } else {
      setShowForm(false);
      setEditItem(null);
      setForm({
        serial_number: '',
        make: '',
        model: '',
        caliber: '',
        type: 'rifle',
        status: 'active',
        assigned_to: '',
        license_number: '',
        license_expiry: '',
        notes: ''
      });
      loadFirearms();
    }
    setSaving(false);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      serial_number: item.serial_number || '',
      make: item.make || '',
      model: item.model || '',
      caliber: item.caliber || '',
      type: item.type || 'rifle',
      status: item.status || 'active',
      assigned_to: item.assigned_to || '',
      license_number: item.license_number || '',
      license_expiry: item.license_expiry || '',
      notes: item.notes || ''
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this firearm record?')) return;
    
    const { error } = await supabase.from('firearms').delete().eq('id', id);
    if (!error) {
      loadFirearms();
    }
  }

  // If no access, show upgrade prompt
  if (!hasAccess) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="lock" size={32} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Firearm Register</h2>
          <p className="text-gray-600 mb-6">
            The Firearm Register module helps you track and manage all firearms in your operation, 
            including licenses, expiry dates, and assignments to guides.
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-navy mb-3">Features include:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="check" size={16} className="text-green-500" /> Track serial numbers and models
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="check" size={16} className="text-green-500" /> License management with expiry alerts
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="check" size={16} className="text-green-500" /> Assign firearms to specific guides
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="check" size={16} className="text-green-500" /> Caliber and type tracking
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            This module is available as an add-on for R99/month or included in the Premium plan.
          </p>
          <button
            onClick={() => setShowAddonModal(true)}
            className="btn-primary px-8 py-3 text-lg"
          >
            Enable Firearm Register
          </button>
        </div>

        {showAddonModal && (
          <AddOnPurchaseModal
            resource="firearm_register"
            onClose={() => setShowAddonModal(false)}
          />
        )}
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400">Loading firearm register...</div>
      </div>
    );
  }

  // Main firearm register view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Firearm Register</h1>
          <p className="text-sm text-gray-500">Track and manage firearms, licenses, and assignments</p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({
              serial_number: '',
              make: '',
              model: '',
              caliber: '',
              type: 'rifle',
              status: 'active',
              assigned_to: '',
              license_number: '',
              license_expiry: '',
              notes: ''
            });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Icon name="plus" size={16} />
          Add Firearm
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-navy">{editItem ? 'Edit Firearm' : 'Add New Firearm'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Serial Number *</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={e => setForm({...form, serial_number: e.target.value})}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full"
                  >
                    <option value="rifle">Rifle</option>
                    <option value="shotgun">Shotgun</option>
                    <option value="handgun">Handgun</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Make</label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={e => setForm({...form, make: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={e => setForm({...form, model: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Caliber</label>
                  <input
                    type="text"
                    value={form.caliber}
                    onChange={e => setForm({...form, caliber: e.target.value})}
                    placeholder="e.g. .375 H&H"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Assigned To</label>
                  <select
                    value={form.assigned_to}
                    onChange={e => setForm({...form, assigned_to: e.target.value})}
                    className="w-full"
                  >
                    <option value="">— Unassigned —</option>
                    {guides.map(guide => (
                      <option key={guide.id} value={guide.id}>{guide.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">License Number</label>
                  <input
                    type="text"
                    value={form.license_number}
                    onChange={e => setForm({...form, license_number: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={form.license_expiry}
                    onChange={e => setForm({...form, license_expiry: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Saving...' : (editItem ? 'Save Changes' : 'Add Firearm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Firearms List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Serial/Model</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type/Caliber</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">License</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                  No firearms registered yet. Click "Add Firearm" to get started.
                </td>
              </tr>
            ) : (
              items.map(item => {
                const assignedGuide = guides.find(g => g.id === item.assigned_to);
                const expiryDate = item.license_expiry ? new Date(item.license_expiry) : null;
                const today = new Date();
                const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-navy">{item.serial_number || '—'}</div>
                      <div className="text-xs text-gray-400">{item.make} {item.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{item.type}</span>
                      {item.caliber && <span className="text-xs text-gray-400 ml-1">· {item.caliber}</span>}
                    </td>
                    <td className="px-6 py-4">
                      {assignedGuide?.full_name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {item.license_number || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {expiryDate ? (
                        <span className={`text-sm ${daysUntilExpiry < 30 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                          {expiryDate.toLocaleDateString('en-ZA')}
                          {daysUntilExpiry < 30 && daysUntilExpiry >= 0 && (
                            <span className="block text-xs">({daysUntilExpiry} days)</span>
                          )}
                          {daysUntilExpiry < 0 && (
                            <span className="block text-xs text-red-600">Expired</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        item.status === 'active' ? 'badge-green' :
                        item.status === 'maintenance' ? 'badge-yellow' :
                        'badge-gray'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-gold hover:text-amber-600"
                          title="Edit"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expiry alerts section */}
      {items.filter(i => {
        if (!i.license_expiry) return false;
        const days = Math.ceil((new Date(i.license_expiry) - new Date()) / (1000 * 60 * 60 * 24));
        return days < 30;
      }).length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-700 mb-2">
            <Icon name="alert" size={18} />
            <h3 className="font-semibold">License Expiry Alerts</h3>
          </div>
          <div className="space-y-2">
            {items.filter(i => {
              if (!i.license_expiry) return false;
              const days = Math.ceil((new Date(i.license_expiry) - new Date()) / (1000 * 60 * 60 * 24));
              return days < 30;
            }).map(item => {
              const days = Math.ceil((new Date(item.license_expiry) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={item.id} className="text-sm">
                  <span className="font-medium">{item.serial_number || `${item.make} ${item.model}`}</span>
                  <span className="text-gray-600 ml-2">
                    {days < 0 ? 'License expired' : `License expires in ${days} days`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default FirearmRegisterPage;