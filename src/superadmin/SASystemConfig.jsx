import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';

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

function SASystemConfig() {
  const { toast, showToast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [featureFlags, setFeatureFlags] = useState({
    referralProgram: false,
    limitedTimeOffers: false,
    earlyBirdPricing: false
  });
  const [defaultLimits, setDefaultLimits] = useState({
    vehicles: 1,
    guides: 1,
    drivers: 1,
    bookings: 20
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      // Load from a config table if you have one
      // For now, we'll use localStorage as a simple store
      const saved = localStorage.getItem('system_config');
      if (saved) {
        const config = JSON.parse(saved);
        setMaintenanceMode(config.maintenanceMode || false);
        setFeatureFlags(config.featureFlags || {
          referralProgram: false,
          limitedTimeOffers: false,
          earlyBirdPricing: false
        });
        setDefaultLimits(config.defaultLimits || {
          vehicles: 1,
          guides: 1,
          drivers: 1,
          bookings: 20
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const config = {
        maintenanceMode,
        featureFlags,
        defaultLimits
      };
      localStorage.setItem('system_config', JSON.stringify(config));
      
      // If you have a system_config table in Supabase, save there too
      // await supabase.from('system_config').upsert({ id: 1, ...config });
      
      showToast('System configuration saved', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showToast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) {
    return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading system configuration...</div>;
  }

  return (
    <div>
      <Toast toast={toast} />
      
      <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>System Configuration</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
        {/* Maintenance Mode */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
          <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16 }}>Maintenance</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                background: maintenanceMode ? '#dc2626' : '#22c55e',
                color: 'white',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 700
              }}>
                {maintenanceMode ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                style={{
                  background: maintenanceMode ? '#222' : '#dc2626',
                  color: maintenanceMode ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {maintenanceMode ? 'Disable' : 'Enable'}
              </button>
            </div>
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
              When enabled, only superadmins can access the app.
            </p>
          </div>
        </div>

        {/* Default Company Limits */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222' }}>
          <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16 }}>Default Company Limits</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Vehicles</label>
              <input
                type="number"
                min="0"
                value={defaultLimits.vehicles}
                onChange={e => setDefaultLimits({ ...defaultLimits, vehicles: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Guides</label>
              <input
                type="number"
                min="0"
                value={defaultLimits.guides}
                onChange={e => setDefaultLimits({ ...defaultLimits, guides: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Drivers</label>
              <input
                type="number"
                min="0"
                value={defaultLimits.drivers}
                onChange={e => setDefaultLimits({ ...defaultLimits, drivers: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bookings/mo</label>
              <input
                type="number"
                min="0"
                value={defaultLimits.bookings}
                onChange={e => setDefaultLimits({ ...defaultLimits, bookings: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #222', gridColumn: 'span 2' }}>
          <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16 }}>Feature Flags</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={featureFlags.referralProgram}
                onChange={e => setFeatureFlags({ ...featureFlags, referralProgram: e.target.checked })}
                style={{ accentColor: '#D4A853' }}
              />
              Enable referral program
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={featureFlags.limitedTimeOffers}
                onChange={e => setFeatureFlags({ ...featureFlags, limitedTimeOffers: e.target.checked })}
                style={{ accentColor: '#D4A853' }}
              />
              Enable limited-time offers
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={featureFlags.earlyBirdPricing}
                onChange={e => setFeatureFlags({ ...featureFlags, earlyBirdPricing: e.target.checked })}
                style={{ accentColor: '#D4A853' }}
              />
              Enable early-bird pricing
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={saveConfig}
          disabled={saving}
          style={{
            background: '#D4A853',
            color: '#0F2540',
            border: 'none',
            borderRadius: 8,
            padding: '10px 28px',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Icon name="check" size={16} />
          {saving ? 'Saving...' : 'Save System Settings'}
        </button>
      </div>
    </div>
  );
}

export default SASystemConfig;