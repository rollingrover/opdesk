import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── UPGRADE MODAL ───────────────────────
function UpgradeModal({ onClose }) {
  const { tier, company } = useAuth();
  const [billing, setBilling] = React.useState('monthly'); // 'monthly' | 'annual'
  const plans = [
    { key:'basic',    monthly:449,  annual:4490,  features:['Unlimited bookings','5 Vehicles & Guides','3 Safaris/Tours/Charters','2 User seats','Logo on invoices'] },
    { key:'standard', monthly:999,  annual:9990,  features:['10 Vehicles & Guides','5 Drivers','10 Shuttles','5 User seats','CSV export'] },
    { key:'premium',  monthly:2499, annual:24990, features:['Unlimited everything','Firearm Register','White-label','Auto backup','Priority support'] },
  ];

  function planPrice(p) {
    if (p.key === 'premium') return { label: 'R2,499/month', amount: 2499 };
    if (billing === 'annual') {
      return { label: `R${p.annual.toLocaleString('en-ZA')}/year`, amount: p.annual, sub: `~R${Math.round(p.annual/12).toLocaleString('en-ZA')}/mo · 2 months free` };
    }
    return { label: `R${p.monthly.toLocaleString('en-ZA')}/month`, amount: p.monthly };
  }

  function pay(p) {
    const { amount } = planPrice(p);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = PAYFAST_CONFIG.sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
    const fields = { merchant_id:PAYFAST_CONFIG.merchant_id, merchant_key:PAYFAST_CONFIG.merchant_key, return_url:PAYFAST_CONFIG.return_url, cancel_url:PAYFAST_CONFIG.cancel_url, notify_url:PAYFAST_CONFIG.notify_url, email_address:company?.billing_email||'', amount:amount.toFixed(2), item_name:`OpDesk ${p.key} plan`, subscription_type:'1', billing_date:new Date().toISOString().slice(0,10), recurring_amount:amount.toFixed(2), frequency: billing==='annual' ? '6' : '3', cycles:'0' };
    Object.entries(fields).forEach(([k,v]) => { const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; form.appendChild(i); });
    document.body.appendChild(form); form.submit();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy">Upgrade Plan</h2>
          <button onClick={onClose}><Icon name="x" size={20} className="text-gray-400"/></button>
        </div>
        {/* Billing toggle */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            <button onClick={()=>setBilling('monthly')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${billing==='monthly'?'bg-navy text-white':'text-gray-500'}`}>Monthly</button>
            <button onClick={()=>setBilling('annual')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${billing==='annual'?'bg-navy text-white':'text-gray-500'}`}>
              Annual <span className="ml-1 text-xs bg-gold/80 text-navy px-1.5 py-0.5 rounded-full font-bold">2 months free</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {plans.map(p => {
            const { label, sub } = planPrice(p);
            return (
              <div key={p.key} className={`border-2 rounded-xl p-4 ${p.key===tier?'border-gold bg-amber-50':'border-gray-200'}`}>
                <div className="font-bold text-navy capitalize mb-1">{p.key}</div>
                <div className="text-gold font-bold text-lg leading-tight">{label}</div>
                {sub && <div className="text-green-600 text-xs font-semibold mb-1">{sub}</div>}
                <ul className="text-xs text-gray-600 space-y-1 my-3">{p.features.map((f,i)=><li key={i} className="flex items-center gap-1"><Icon name="check" size={10} className="text-green-500"/>{f}</li>)}</ul>
                {p.key===tier ? <div className="text-center text-xs font-semibold text-gold">Current Plan</div>
                : <button className="btn-primary w-full text-sm" onClick={()=>pay(p)}>Upgrade</button>}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Secure via PayFast · ZAR · No per-booking fees · Cancel anytime</p>
      </div>
    </div>
  );
}


export default UpgradeModal;
