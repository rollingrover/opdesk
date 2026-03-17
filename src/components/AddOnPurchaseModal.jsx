import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import { useAuth } from '../context/AuthContext';

const ADDON_SLOT_LABELS = {
  vehicles: 'Vehicle', guides: 'Guide', drivers: 'Driver',
  shuttles: 'Shuttle', safaris: 'Safari', tours: 'Tour',
  charters: 'Charter', trails: 'Trail', seats: 'User Seat',
  schedules: 'Schedule', firearm_register: 'Firearm Register', 
  white_label: 'White-label',
  no_watermark: 'Remove Invoice Watermark',
};

const FEATURE_ADDONS = new Set(['firearm_register', 'white_label', 'no_watermark']);

const ADDON_DEFAULT_PRICES = {
  vehicles: 99, guides: 99, drivers: 99, shuttles: 99,
  safaris: 99, tours: 99, charters: 99, trails: 149,
  seats: 79, schedules: 199, firearm_register: 299, 
  white_label: 499, no_watermark: 49,
};

// PayFast configuration - should come from environment variables
const PAYFAST_CONFIG = {
  merchant_id: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '10000100',
  merchant_key: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '46f0cd694581a',
  sandbox: import.meta.env.VITE_PAYFAST_SANDBOX === 'true' || true,
  return_url: `${window.location.origin}/billing?success=1`,
  cancel_url: `${window.location.origin}/billing?cancelled=1`,
  notify_url: `${window.location.origin}/api/notify-ticket`, // Your webhook endpoint
};

function AddOnPurchaseModal({ resource, onClose }) {
  const { company, tier, baseLimits, addons, reloadAddons } = useAuth();
  const [qty, setQty] = useState(1);
  const [pricing, setPricing] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPricing();
  }, []);

  async function loadPricing() {
    const { data } = await supabase
      .from('addon_pricing')
      .select('*')
      .eq('addon_key', resource);
    setPricing(data || []);
  }

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const label = ADDON_SLOT_LABELS[resource] || resource;
  const priceRow = pricing.find(p => p.addon_key === resource);
  const unitPrice = priceRow?.monthly_price || ADDON_DEFAULT_PRICES[resource] || 99;
  const totalPrice = unitPrice * qty;

  const baseLimit = baseLimits?.[resource];
  const currentExtra = addons?.filter(a => a.addon_key === resource && a.active)
    .reduce((s, a) => s + (a.quantity || 1), 0) || 0;
  const newTotal = baseLimit === null ? '∞' : (baseLimit || 0) + currentExtra + qty;

  async function handleBuy() {
    setPurchasing(true);
    
    if (PAYFAST_CONFIG.sandbox) {
      // Sandbox mode - instant grant
      await handleSandboxGrant();
    } else {
      // Live mode - redirect to PayFast
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.payfast.co.za/eng/process';
      
      const fields = {
        merchant_id: PAYFAST_CONFIG.merchant_id,
        merchant_key: PAYFAST_CONFIG.merchant_key,
        return_url: PAYFAST_CONFIG.return_url,
        cancel_url: PAYFAST_CONFIG.cancel_url,
        notify_url: PAYFAST_CONFIG.notify_url,
        m_payment_id: `${company?.id}_addon_${resource}_${qty}_${Date.now()}`,
        amount: totalPrice.toFixed(2),
        item_name: FEATURE_ADDONS.has(resource) 
          ? `OpDesk: ${label}` 
          : `OpDesk: ${qty}x Extra ${label} Slot`,
        item_description: FEATURE_ADDONS.has(resource) 
          ? `${label} add-on for your ${tier} plan` 
          : `Add ${qty} extra ${label.toLowerCase()} slot(s) to your ${tier} plan`,
        subscription_type: '1',
        billing_date: new Date().toISOString().slice(0,10),
        recurring_amount: totalPrice.toFixed(2),
        frequency: '3', // monthly
        cycles: '0', // indefinite
      };
      
      Object.entries(fields).forEach(([k, v]) => {
        const i = document.createElement('input');
        i.type = 'hidden';
        i.name = k;
        i.value = v;
        form.appendChild(i);
      });
      
      document.body.appendChild(form);
      form.submit();
    }
  }

  async function handleSandboxGrant() {
    try {
      const { error } = await supabase
        .from('company_addons')
        .insert([{
          company_id: company.id,
          addon_key: resource,
          addon_type: resource,
          quantity: qty,
          price_per_unit: unitPrice,
          billing_cycle: 'monthly',
          active: true,
          note: 'Self-purchased via in-app store (sandbox)',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      showToast(`${qty}x ${label} slot${qty > 1 ? 's' : ''} added`, 'success');
      await reloadAddons();
      onClose();
    } catch (error) {
      console.error('Error adding addon:', error);
      showToast('Failed to add addon', 'error');
    } finally {
      setPurchasing(false);
    }
  }

  const maxQty = FEATURE_ADDONS.has(resource) ? 1 : 
                 resource === 'trails' ? 10 :
                 resource === 'seats' ? 20 :
                 resource === 'schedules' ? 5 : 10;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 
            toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-navy">Buy Extra {label} Slots</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Current state */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-black text-navy">{baseLimit ?? '∞'}</div>
              <div className="text-xs text-gray-400">Base ({tier})</div>
            </div>
            <div>
              <div className="text-2xl font-black text-gold">{currentExtra}</div>
              <div className="text-xs text-gray-400">Current extras</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-600">{newTotal}</div>
              <div className="text-xs text-gray-400">After purchase</div>
            </div>
          </div>
        </div>

        {/* Qty selector */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            How many extra {label.toLowerCase()} slots?
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-navy"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
            >−</button>
            <input
              type="number"
              min="1"
              max={maxQty}
              value={qty}
              onChange={e => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-xl py-2"
            />
            <button
              className="w-10 h-10 rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-navy"
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
            >+</button>
            <span className="text-sm text-gray-400">max {maxQty}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-navy text-white rounded-xl p-4 mb-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm opacity-70">{qty}x {label} slot{qty > 1 ? 's' : ''} × R{unitPrice}/mo</div>
              <div className="text-2xl font-black mt-0.5">R{totalPrice.toLocaleString()}<span className="text-sm font-normal opacity-70">/month</span></div>
            </div>
            <div className="text-xs opacity-50 text-right">
              Added to your<br/>monthly billing
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            className="btn-primary w-full py-3 text-base" 
            onClick={handleBuy} 
            disabled={purchasing}
          >
            {purchasing ? 'Processing…' : PAYFAST_CONFIG.sandbox 
              ? `Add ${qty} Slot${qty > 1 ? 's' : ''} (Sandbox)` 
              : `Pay R${totalPrice} via PayFast`}
          </button>
          <button className="btn-secondary w-full" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Billed monthly · Cancel anytime from Billing settings
        </p>
      </div>
    </div>
  );
}

export default AddOnPurchaseModal;