import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── SA: PRICING EDITOR ───────────────────────
function SAPricingEditor() {
  const [tiers, setTiers] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [tierEdits, setTierEdits] = useState({});
  const [addonEdits, setAddonEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  async function load() {
    const [p, t] = await Promise.all([
      supabase.from('addon_pricing').select('*').order('addon_key'),
      supabase.from('tier_pricing').select('*').order('tier'),
    ]);
    const tdata = t.data || [];
    const pdata = p.data || [];
    setTiers(tdata);
    setPricing(pdata);
    // Seed edits with current DB values
    const te = {};
    tdata.forEach(t => { te[t.id] = { label: t.label, monthly_price: t.monthly_price, annual_price: t.annual_price }; });
    const ae = {};
    pdata.forEach(p => { ae[p.id] = { monthly_price: p.monthly_price, annual_price: p.annual_price }; });
    setTierEdits(te);
    setAddonEdits(ae);
    setDirty(false);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function onTierChange(id, field, val) {
    setTierEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    setDirty(true);
  }

  function onAddonChange(id, field, val) {
    setAddonEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    setDirty(true);
  }

  async function applyAll() {
    setSaving(true);
    try {
      // Save all tier rows
      await Promise.all(tiers.map(t => {
        const e = tierEdits[t.id] || {};
        return supabase.from('tier_pricing').update({
          label: e.label ?? t.label,
          monthly_price: parseFloat(e.monthly_price) || 0,
          annual_price: parseFloat(e.annual_price) || 0,
        }).eq('id', t.id);
      }));
      // Save all addon rows
      await Promise.all(pricing.map(p => {
        const e = addonEdits[p.id] || {};
        return supabase.from('addon_pricing').update({
          monthly_price: parseFloat(e.monthly_price) || 0,
          annual_price: parseFloat(e.annual_price) || 0,
        }).eq('id', p.id);
      }));
      toast('All pricing updated — landing page will reflect changes on next load');
      await load();
    } catch(err) {
      toast('Error saving pricing');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{color:'#6b7280',padding:24,textAlign:'center'}}>Loading pricing...</div>;

  const inputStyle = {background:'#111',border:'1px solid #333',color:'white',borderRadius:6,padding:'6px 10px',fontSize:13};
  const numInputStyle = {...inputStyle, width:110};

  return (
    <div>
      <div style={{background:'#1a1a1a',borderRadius:12,padding:20,border:'1px solid #222',marginBottom:20}}>
        <h3 style={{color:'white',fontWeight:700,marginBottom:14,fontSize:16}}>Subscription Tier Pricing</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#0d0d0d'}}>{['Tier','Label','Monthly (R)','Annual (R)'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',color:'#6b7280',fontSize:11,textTransform:'uppercase',borderBottom:'1px solid #222'}}>{h}</th>)}</tr></thead>
          <tbody>{tiers.map(t=>{
            const e = tierEdits[t.id] || {};
            return (
              <tr key={t.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'10px 12px',color:'#D4A853',fontWeight:700,textTransform:'capitalize'}}>{t.tier}</td>
                <td style={{padding:'10px 12px'}}><input value={e.label ?? t.label} onChange={ev=>onTierChange(t.id,'label',ev.target.value)} style={inputStyle}/></td>
                <td style={{padding:'10px 12px'}}><input type="number" value={e.monthly_price ?? t.monthly_price} onChange={ev=>onTierChange(t.id,'monthly_price',ev.target.value)} style={numInputStyle}/></td>
                <td style={{padding:'10px 12px'}}><input type="number" value={e.annual_price ?? t.annual_price} onChange={ev=>onTierChange(t.id,'annual_price',ev.target.value)} style={numInputStyle}/></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div style={{background:'#1a1a1a',borderRadius:12,padding:20,border:'1px solid #222',marginBottom:20}}>
        <h3 style={{color:'white',fontWeight:700,marginBottom:14,fontSize:16}}>Add-on Unit Pricing</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#0d0d0d'}}>{['Add-on','Monthly (R)','Annual (R)'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',color:'#6b7280',fontSize:11,textTransform:'uppercase',borderBottom:'1px solid #222'}}>{h}</th>)}</tr></thead>
          <tbody>{pricing.map(p=>{
            const e = addonEdits[p.id] || {};
            return (
              <tr key={p.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'10px 12px',color:'white',fontWeight:600,textTransform:'capitalize'}}>{({
  vehicles:'Extra Vehicle Slot', guides:'Extra Guide Slot', drivers:'Extra Driver Slot',
  shuttles:'Extra Shuttle Slot', safaris:'Extra Safari Listing', tours:'Extra Tour Listing',
  charters:'Extra Charter Listing', trails:'Extra Trail Listing', seats:'Extra User Seat',
  firearm_register:'Firearm Register', schedules_module:'Schedules Module',
  white_label:'White-Label', client_list:'Client List & Billing', no_watermark:'Remove Watermark',
  storage_10gb:'Storage +10 GB', storage_50gb:'Storage +50 GB', storage_200gb:'Storage +200 GB',
  bandwidth_50gb:'Bandwidth +50 GB', bandwidth_200gb:'Bandwidth +200 GB', bandwidth_1tb:'Bandwidth +1 TB',
})[p.addon_key] || p.addon_key?.replace(/_/g,' ')}</td>
                <td style={{padding:'10px 12px'}}><input type="number" value={e.monthly_price ?? p.monthly_price} onChange={ev=>onAddonChange(p.id,'monthly_price',ev.target.value)} style={numInputStyle}/></td>
                <td style={{padding:'10px 12px'}}><input type="number" value={e.annual_price ?? p.annual_price} onChange={ev=>onAddonChange(p.id,'annual_price',ev.target.value)} style={numInputStyle}/></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button
          onClick={applyAll}
          disabled={saving || !dirty}
          style={{
            background: dirty ? '#D4A853' : '#444',
            color: dirty ? '#0F2540' : '#888',
            border:'none',borderRadius:8,padding:'10px 28px',
            fontWeight:700,fontSize:14,cursor: dirty ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.7 : 1,
            transition:'all 0.2s'
          }}
        >
          {saving ? 'Applying...' : 'Apply Changes'}
        </button>
        {dirty && !saving && <span style={{color:'#f59e0b',fontSize:13}}>Unsaved changes</span>}
        {!dirty && !saving && !loading && <span style={{color:'#6b7280',fontSize:13}}>All prices saved</span>}
      </div>
    </div>
  );
}



export default SAPricingEditor;
