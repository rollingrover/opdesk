import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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

// PayFast configuration
const PAYFAST_CONFIG = {
  merchant_id: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '10000100',
  merchant_key: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '46f0cd694581a',
  sandbox: import.meta.env.VITE_PAYFAST_SANDBOX === 'true' || true,
  return_url: `${window.location.origin}/billing?success=1`,
  cancel_url: `${window.location.origin}/billing?cancelled=1`,
  notify_url: `${window.location.origin}/api/notify-payment`,
};

// ─── UPGRADE MODAL ───────────────────────
function UpgradeModal({ onClose }) {
  const { toast, showToast } = useToast();
  const { tier, company } = useAuth();
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'annual'
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [companyDiscounts, setCompanyDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanyDiscounts();
  }, [company?.id]);

  async function loadCompanyDiscounts() {
    if (!company?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_discounts')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true);
      
      if (error) throw error;
      
      // Filter discounts that apply to subscriptions
      const subscriptionDiscounts = (data || []).filter(d => 
        d.applies_to === 'subscription' || d.applies_to === 'all'
      );
      
      setCompanyDiscounts(subscriptionDiscounts);
      
      // Auto-apply the best discount if available
      if (subscriptionDiscounts.length > 0) {
        const bestDiscount = subscriptionDiscounts.reduce((best, current) => {
          if (current.type === 'free') return current;
          if (current.type === 'percentage' && (!best || current.value > best.value)) return current;
          if (current.type === 'fixed' && (!best || current.value > best.value)) return current;
          return best;
        }, null);
        
        setAppliedDiscount(bestDiscount);
      }
    } catch (error) {
      console.error('Error loading company discounts:', error);
    }
  }

  const plans = [
    { 
      key: 'basic', 
      label: 'Basic',
      monthly: 349, 
      annual: 3490, 
      features: [
        'Unlimited bookings',
        '5 Vehicles & Guides',
        '3 Safaris/Tours/Charters',
        '2 User seats',
        'Logo on invoices'
      ] 
    },
    { 
      key: 'standard', 
      label: 'Standard',
      monthly: 1099, 
      annual: 10990, 
      features: [
        '10 Vehicles & Guides',
        '5 Drivers',
        '10 Shuttles',
        '5 User seats',
        'CSV export'
      ] 
    },
    { 
      key: 'premium', 
      label: 'Premium',
      monthly: 2499, 
      annual: 24990, 
      features: [
        'Unlimited everything',
        'Firearm Register',
        'White-label branding',
        'Auto email backup',
        'Priority support'
      ] 
    },
  ];

  function calculatePriceWithDiscount(price) {
    if (!appliedDiscount) return price;
    
    if (appliedDiscount.type === 'free') return 0;
    if (appliedDiscount.type === 'percentage') {
      return price * (1 - appliedDiscount.value / 100);
    }
    if (appliedDiscount.type === 'fixed') {
      return Math.max(0, price - appliedDiscount.value);
    }
    return price;
  }

  function planPrice(p) {
    const basePrice = billing === 'annual' ? p.annual : p.monthly;
    const discountedPrice = calculatePriceWithDiscount(basePrice);
    const hasDiscount = discountedPrice !== basePrice;
    
    if (p.key === 'premium') {
      return { 
        label: hasDiscount ? `R${discountedPrice.toLocaleString('en-ZA')}` : 'R2,499/month', 
        amount: hasDiscount ? discountedPrice : 2499,
        original: hasDiscount ? 2499 : null
      };
    }
    
    if (billing === 'annual') {
      const monthlyEquivalent = Math.round(p.annual / 12);
      return { 
        label: hasDiscount 
          ? `R${discountedPrice.toLocaleString('en-ZA')}/year` 
          : `R${p.annual.toLocaleString('en-ZA')}/year`,
        amount: hasDiscount ? discountedPrice : p.annual,
        sub: hasDiscount 
          ? `~R${Math.round(discountedPrice/12).toLocaleString('en-ZA')}/mo after discount` 
          : `~R${monthlyEquivalent.toLocaleString('en-ZA')}/mo · 2 months free`,
        original: hasDiscount ? p.annual : null
      };
    }
    
    return { 
      label: hasDiscount 
        ? `R${discountedPrice.toLocaleString('en-ZA')}/month` 
        : `R${p.monthly.toLocaleString('en-ZA')}/month`,
      amount: hasDiscount ? discountedPrice : p.monthly,
      original: hasDiscount ? p.monthly : null
    };
  }

  function pay(p) {
    if (p.key === tier) {
      showToast('You are already on this plan', 'info');
      return;
    }

    const { amount } = planPrice(p);
    
    if (PAYFAST_CONFIG.sandbox) {
      // Sandbox mode - simulate payment
      handleSandboxUpgrade(p, amount);
      return;
    }
    
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
      email_address: company?.billing_email || company?.email || '',
      amount: amount.toFixed(2),
      item_name: `OpDesk ${p.label} plan - ${billing === 'annual' ? 'Annual' : 'Monthly'}`,
      item_description: `Upgrade to ${p.label} plan for ${company?.name || 'your company'}`,
      subscription_type: '1',
      billing_date: new Date().toISOString().slice(0, 10),
      recurring_amount: amount.toFixed(2),
      frequency: billing === 'annual' ? '6' : '3',
      cycles: '0',
      custom_str1: company?.id || '',
      custom_str2: p.key,
      custom_str3: billing,
      custom_int1: appliedDiscount?.id || ''
    };
    
    Object.entries(fields).forEach(([k, v]) => { 
      if (v) {
        const i = document.createElement('input'); 
        i.type = 'hidden'; 
        i.name = k; 
        i.value = v; 
        form.appendChild(i);
      }
    });
    
    document.body.appendChild(form); 
    form.submit();
  }

  async function handleSandboxUpgrade(p, amount) {
    setLoading(true);
    try {
      // Simulate payment success
      showToast(`Sandbox: Upgraded to ${p.label} plan`, 'success');
      
      // Update company tier in sandbox mode
      const { error } = await supabase
        .rpc('sa_update_company', {
          p_company_id: company.id,
          p_tier: p.key
        });
      
      if (error) throw error;
      
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Sandbox upgrade error:', error);
      showToast('Failed to upgrade in sandbox mode', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <Toast toast={toast} />
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy">Upgrade Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Company-specific discounts banner */}
        {companyDiscounts.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="star" size={16} className="text-gold" />
              <span className="font-semibold text-navy">Special discount applied!</span>
            </div>
            {appliedDiscount && (
              <p className="text-sm text-amber-700">
                {appliedDiscount.type === 'free' ? '100% FREE upgrade' :
                 appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% off` :
                 `R${appliedDiscount.value} off`} your subscription
                {appliedDiscount.note && ` — ${appliedDiscount.note}`}
              </p>
            )}
          </div>
        )}
        
        {/* Billing toggle */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            <button 
              onClick={() => setBilling('monthly')} 
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                billing === 'monthly' ? 'bg-navy text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBilling('annual')} 
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                billing === 'annual' ? 'bg-navy text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual 
              <span className="ml-1 text-xs bg-gold/80 text-navy px-1.5 py-0.5 rounded-full font-bold">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(p => {
            const { label, sub, original } = planPrice(p);
            const isCurrentPlan = p.key === tier;
            const isDisabled = isCurrentPlan || loading;
            
            return (
              <div 
                key={p.key} 
                className={`border-2 rounded-xl p-4 transition-all ${
                  isCurrentPlan ? 'border-gold bg-amber-50' : 
                  'border-gray-200 hover:border-gold hover:shadow-md'
                } ${isDisabled ? 'opacity-75' : ''}`}
              >
                <div className="font-bold text-navy text-lg capitalize mb-1">{p.label}</div>
                
                <div className="mb-2">
                  {original ? (
                    <>
                      <span className="text-sm text-gray-400 line-through mr-2">
                        R{original.toLocaleString('en-ZA')}
                      </span>
                      <span className="text-gold font-bold text-lg">
                        R{parseFloat(label.replace(/[^0-9]/g, '')).toLocaleString('en-ZA')}
                      </span>
                    </>
                  ) : (
                    <span className="text-gold font-bold text-lg">{label}</span>
                  )}
                  {sub && <div className="text-green-600 text-xs font-semibold mt-1">{sub}</div>}
                </div>

                <ul className="text-xs text-gray-600 space-y-1 my-3 min-h-[100px]">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Icon name="check" size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="text-center py-2 text-sm font-semibold text-gold bg-gold/10 rounded-lg">
                    Current Plan
                  </div>
                ) : (
                  <button 
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                      loading 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'btn-primary hover:shadow-md'
                    }`}
                    onClick={() => pay(p)}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Secure via PayFast · ZAR · No per-booking fees · Cancel anytime
          </p>
          {PAYFAST_CONFIG.sandbox && (
            <p className="text-xs text-amber-600 mt-1">
              🔧 Sandbox mode enabled - no actual payments processed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;