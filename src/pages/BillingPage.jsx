import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TIERS, TIER_LIMITS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS_MAP, LABELS, ADDON_TYPES, ADDON_DEFAULT_PRICES, getCurrencySymbol, getCompanyRegion, Icon } from '../lib/constants.jsx';
import PageHeader from '../components/PageHeader.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
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

// ─── BILLING ─────────────────────────────
function BillingPage() {
  const { tier, features, limits, baseLimits, addons, reloadAddons, company } = useAuth();
  const { toast, showToast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [addonResource, setAddonResource] = useState(null);
  const [pricing, setPricing] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  useEffect(() => {
    loadPricing();
    loadCompanyDiscounts();
  }, []);

  async function loadPricing() {
    const { data } = await supabase
      .from('addon_pricing')
      .select('*')
      .order('addon_key');
    setPricing(data || []);
  }

  async function loadCompanyDiscounts() {
  if (!company?.id) return;
  
  setLoadingDiscounts(true);
  try {
    // Check if table exists first
    const { error: checkError } = await supabase
      .from('company_discounts')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, just return without error
    if (checkError && checkError.code === 'PGRST205') {
      console.log('Company discounts table not yet created');
      setAvailableDiscounts([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('company_discounts')
      .select('*')
      .eq('company_id', company.id)
      .eq('active', true);
    
    if (error) throw error;
    setAvailableDiscounts(data || []);
  } catch (error) {
    console.error('Error loading discounts:', error);
    // Don't show toast for missing table
    if (error.code !== 'PGRST205') {
      showToast('Failed to load discounts', 'error');
    }
  } finally {
    setLoadingDiscounts(false);
  }
}

  async function applyDiscountCode() {
    if (!discountCode.trim()) {
      showToast('Please enter a discount code', 'error');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .rpc('validate_discount_code', {
          p_code: discountCode.toUpperCase(),
          p_tier: company?.subscription_tier || 'free'
        });
      
      if (error) throw error;
      
      if (!data?.valid) {
        showToast('Invalid or expired discount code', 'error');
        return;
      }
      
      setAppliedDiscount(data);
      showToast(`Discount applied: ${data.discount_type === 'percent' ? data.discount_value + '%' : 'R' + data.discount_value} off`, 'success');
      setDiscountCode('');
      
    } catch (error) {
      console.error('Error applying discount:', error);
      showToast('Failed to apply discount code', 'error');
    }
  }

  function calculatePriceWithDiscount(basePrice) {
    if (!appliedDiscount) return basePrice;
    
    if (appliedDiscount.discount_type === 'percent') {
      return basePrice * (1 - appliedDiscount.discount_value / 100);
    } else if (appliedDiscount.discount_type === 'fixed') {
      return Math.max(0, basePrice - appliedDiscount.discount_value);
    }
    return basePrice;
  }

  const badgeColor = { 
    free: 'badge-gray', 
    basic: 'badge-blue', 
    standard: 'badge-purple', 
    premium: 'badge-navy' 
  };

  const SLOT_RESOURCES = ['vehicles','guides','drivers','shuttles','safaris','tours','charters','trails','seats','schedules'];
  const SLOT_LABELS = { 
    vehicles:'Vehicles', guides:'Guides', drivers:'Drivers', shuttles:'Shuttles',
    safaris:'Safaris', tours:'Tours', charters:'Charters', trails:'Trails', 
    seats:'User Seats', schedules:'Schedules' 
  };

  function getUnitPrice(key) {
    const row = pricing.find(p => p.addon_key === key);
    return row?.monthly_price || ADDON_DEFAULT_PRICES[key] || 99;
  }

  function getActiveAddonQty(key) {
    return addons.filter(a => a.addon_key === key && a.active)
      .reduce((s, a) => s + (a.quantity || 1), 0);
  }

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="Billing" subtitle="Subscription, limits & add-ons"/>

      {/* Discount Code Section */}
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-navy text-lg mb-3">Have a discount code?</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            value={discountCode}
            onChange={e => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g. SUMMER50)"
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
          />
          <button
            onClick={applyDiscountCode}
            className="btn-primary px-6 py-2"
          >
            Apply Code
          </button>
        </div>
        
        {appliedDiscount && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Icon name="check" size={16} className="text-green-600" />
            <span className="text-sm text-green-700">
              Discount applied: {appliedDiscount.discount_type === 'percent' 
                ? `${appliedDiscount.discount_value}% off` 
                : `R${appliedDiscount.discount_value} off`}
            </span>
            <button
              onClick={() => setAppliedDiscount(null)}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Company-specific active discounts */}
      {availableDiscounts.length > 0 && (
        <div className="card p-6 mb-5 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="star" size={18} className="text-gold" />
            <h2 className="font-bold text-navy">Special Company Discounts</h2>
          </div>
          <div className="space-y-2">
            {availableDiscounts.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-amber-200 last:border-0">
                <div>
                  <span className="font-semibold text-navy">
                    {d.type === 'free' ? '100% FREE' : 
                     d.type === 'percentage' ? `${d.value}% off` : 
                     `R${d.value} off`}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {d.applies_to === 'subscription' ? 'on subscription' :
                     d.applies_to === 'addons' ? 'on add-ons' : 'on everything'}
                  </span>
                  {d.note && <p className="text-xs text-gray-400 mt-1">{d.note}</p>}
                </div>
                {d.valid_until && (
                  <span className="text-xs text-gray-400">
                    Valid until {new Date(d.valid_until).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Current Plan ── */}
      {(() => {
        const addonSpend = SLOT_RESOURCES.reduce((sum, key) => {
          const qty = getActiveAddonQty(key);
          return sum + (qty > 0 ? qty * getUnitPrice(key) : 0);
        }, 0);
        
        const isFreePlus = tier === 'free' && addonSpend > 0;
        const basicPrice = TIERS['basic']?.price || 349;
        const showNudge = isFreePlus && addonSpend >= basicPrice * 0.6;
        
        const discountedPrice = appliedDiscount ? calculatePriceWithDiscount(TIERS[tier]?.price || 0) : null;
        
        return (
          <div className="card p-6 mb-5">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-navy text-lg mb-2">Current Plan</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${isFreePlus ? 'badge-green' : badgeColor[tier]} text-base px-4 py-1`}>
                    {isFreePlus ? 'Free+' : TIERS[tier]?.label || tier}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {tier === 'free'
                      ? (isFreePlus ? `Free base · R${addonSpend.toLocaleString('en-ZA')}/mo in add-ons` : 'Free forever — add slots as you need them')
                      : tier === 'premium' ? 'R2,499/month'
                      : `R${TIERS[tier]?.price?.toLocaleString() || 0}/month`}
                  </span>
                  {appliedDiscount && (
                    <span className="badge badge-green text-sm">
                      {discountedPrice?.toFixed(2)} after discount
                    </span>
                  )}
                </div>
                {showNudge && (
                  <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Icon name="info" size={14} className="text-amber-500 flex-shrink-0"/>
                    <p className="text-xs text-amber-700">
                      You're spending <strong>R{addonSpend.toLocaleString('en-ZA')}/mo</strong> on add-ons.
                      Basic plan at <strong>R{basicPrice.toLocaleString('en-ZA')}/mo</strong> includes far more slots — and could save you money.
                      <button className="ml-2 underline font-semibold text-amber-800" onClick={()=>setShowUpgrade(true)}>Switch to Basic →</button>
                    </p>
                  </div>
                )}
              </div>
              {tier !== 'premium' && (
                <button className="btn-primary flex items-center gap-2" onClick={()=>setShowUpgrade(true)}>
                  <Icon name="upgrade" size={16}/>{isFreePlus ? 'Upgrade to Basic' : 'Upgrade Plan'}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Features ── */}
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-navy mb-4">Included Features</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['No invoice watermark',   tier !== 'free'],
            ['Company logo on invoices', features?.logo],
            ['CSV data export',          features?.csvExport],
            ['Firearm Register',         features?.firearmRegister],
            ['White-label branding',     features?.whiteLabel],
            ['Auto email backup',        features?.autoBackup],
          ].map(([label, enabled]) => (
            <div key={label} className={`flex items-center gap-2 text-sm ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
              <Icon name={enabled ? 'check' : 'x'} size={14} className={enabled ? 'text-green-500' : 'text-gray-200'}/>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Slot Usage + Buy More ── */}
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-navy mb-1">Resource Slots</h2>
        <p className="text-sm text-gray-400 mb-4">
          Base plan limits · purchased extras shown separately · click Buy to add more
          {tier === 'free' ? ' · On Free, each slot is charged at add-on rates' : ''}
          {appliedDiscount && appliedDiscount.applies_to !== 'subscription' && ' · Discount applies to add-ons'}
        </p>
        <div className="space-y-3">
          {SLOT_RESOURCES.map(key => {
            const base = baseLimits?.[key];
            const extra = getActiveAddonQty(key);
            const total = limits?.[key]; // null = unlimited
            const price = getUnitPrice(key);
            const discountedPrice = appliedDiscount && appliedDiscount.applies_to !== 'subscription' 
              ? calculatePriceWithDiscount(price) 
              : price;
            
            return (
              <div key={key} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 flex-wrap">
                <div className="w-28 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700">{SLOT_LABELS[key]}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <span className="text-sm text-gray-500">
                    {base === null ? '∞' : base} base
                  </span>
                  {extra > 0 && (
                    <span className="text-xs bg-gold/20 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                      +{extra} extra
                    </span>
                  )}
                  {total !== null && (
                    <span className="text-xs text-gray-400">= {total} total</span>
                  )}
                  {total === null && extra === 0 && (
                    <span className="text-xs text-gray-400">unlimited</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {discountedPrice !== price ? (
                      <>
                        <span className="line-through mr-1">R{price}</span>
                        <span className="text-green-600">R{discountedPrice.toFixed(0)}</span>
                      </>
                    ) : (
                      `R${price}`
                    )}/mo per slot
                  </span>
                  <button
                    className="text-xs px-3 py-1 bg-navy text-white rounded-full hover:bg-navy/80 font-semibold"
                    onClick={() => setAddonResource(key)}>
                    + Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active purchased add-ons ── */}
      {addons.length > 0 && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-navy mb-4">Active Add-ons</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Price/mo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Total/mo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Added</th>
                </tr>
              </thead>
              <tbody>
                {addons.map(a => (
                  <tr key={a.id} className="border-b">
                    <td className="px-4 py-3 capitalize font-medium">{SLOT_LABELS[a.addon_key] || a.addon_key.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{a.quantity || 1} slot{(a.quantity || 1) > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-gray-500">R{a.price_per_unit || 0}</td>
                    <td className="px-4 py-3 font-semibold">R{((a.price_per_unit || 0) * (a.quantity || 1)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{a.created_at ? new Date(a.created_at).toLocaleDateString('en-ZA') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500">Total add-ons</span>
            <span className="font-bold text-navy">
              R{addons.reduce((s, a) => s + (a.price_per_unit || 0) * (a.quantity || 1), 0).toLocaleString()}/month
              {appliedDiscount && appliedDiscount.applies_to !== 'subscription' && (
                <span className="ml-2 text-sm text-green-600">
                  (R{calculatePriceWithDiscount(addons.reduce((s, a) => s + (a.price_per_unit || 0) * (a.quantity || 1), 0)).toFixed(0)} after discount)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ── Feature Add-ons ── */}
      {tier === 'free' && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-navy mb-1">Feature Add-ons</h2>
          <p className="text-sm text-gray-400 mb-4">One-click upgrades · billed monthly · cancel anytime</p>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-navy text-sm">Remove Invoice Watermark</p>
              <p className="text-xs text-gray-400 mt-0.5">Remove the "Powered by OpDesk" watermark from all your PDF invoices</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              {addons.some(a => a.addon_key === 'no_watermark' && a.active) ? (
                <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Active</span>
              ) : (
                <>
                  <span className="text-xs text-gray-400">
                    {appliedDiscount && appliedDiscount.applies_to !== 'subscription' ? (
                      <>
                        <span className="line-through mr-1">R49</span>
                        <span className="text-green-600">R{calculatePriceWithDiscount(49).toFixed(0)}</span>
                      </>
                    ) : 'R49'}/mo
                  </span>
                  <button
                    className="text-xs px-3 py-1 bg-navy text-white rounded-full hover:bg-navy/80 font-semibold"
                    onClick={() => setAddonResource('no_watermark')}>
                    + Add
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} />}
      {addonResource && (
        <AddOnPurchaseModal 
          resource={addonResource} 
          onClose={() => { 
            setAddonResource(null); 
            reloadAddons();
            loadCompanyDiscounts(); // Reload discounts in case they affect new add-ons
          }} 
        />
      )}
    </div>
  );
}

export { BillingPage };
export default BillingPage;