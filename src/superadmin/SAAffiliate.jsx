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

// ─── SUPERADMIN: AFFILIATE MANAGEMENT ─────────────────────────────────
function SAAffiliate() {
  const { toast, showToast } = useToast();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [conversions, setConversions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    handle:'', 
    full_name:'', 
    email:'', 
    phone:'', 
    notes:'', 
    commission_pct:'10',
    payment_threshold: '200', // New field
    status:'active' 
  });
  const [saving, setSaving] = useState(false);
  const [paymentNotifications, setPaymentNotifications] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_affiliates');
      if (error) throw error;
      setAffiliates(data || []);
      
      // Load payment notifications
      const notifData = localStorage.getItem('affiliate_notifications');
      if (notifData) {
        setPaymentNotifications(JSON.parse(notifData));
      }
    } catch (error) {
      console.error('Error loading affiliates:', error);
      showToast('Failed to load affiliates', 'error');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => { load(); }, []);

  async function openAffiliate(aff) {
    setSelected(aff);
    try {
      const { data, error } = await supabase.rpc('get_affiliate_conversions', { p_handle: aff.handle });
      if (error) throw error;
      setConversions(data || []);
    } catch (error) {
      console.error('Error loading conversions:', error);
      showToast('Failed to load conversions', 'error');
    }
  }

  async function saveForm(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error } = await supabase.rpc('upsert_affiliate', {
        p_handle: form.handle,
        p_full_name: form.full_name,
        p_email: form.email,
        p_phone: form.phone || null,
        p_notes: form.notes || null,
        p_commission_pct: parseFloat(form.commission_pct) || 10,
        p_payment_threshold: parseFloat(form.payment_threshold) || 200,
        p_status: form.status
      });
      
      if (error) throw error;
      
      showToast(`Affiliate ${form.handle} saved successfully`, 'success');
      setShowForm(false);
      setForm({ 
        handle:'', full_name:'', email:'', phone:'', notes:'', 
        commission_pct:'10', payment_threshold:'200', status:'active' 
      });
      load();
      
    } catch (error) {
      console.error('Error saving affiliate:', error);
      showToast('Failed to save affiliate: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(handle) {
    if (!confirm('Mark all unpaid commissions as paid for this affiliate?')) return;
    
    try {
      const { error } = await supabase.rpc('mark_commissions_paid', { p_handle: handle });
      if (error) throw error;
      
      showToast(`Commissions marked as paid`, 'success');
      
      // Remove notifications for this affiliate
      const updated = paymentNotifications.filter(n => n.handle !== handle);
      localStorage.setItem('affiliate_notifications', JSON.stringify(updated));
      setPaymentNotifications(updated);
      
      load();
      if (selected?.handle === handle) openAffiliate({ ...selected });
      
    } catch (error) {
      console.error('Error marking paid:', error);
      showToast('Failed to mark commissions as paid', 'error');
    }
  }

  // Check for affiliates reaching payment threshold
  useEffect(() => {
    const checkThresholds = () => {
      const notifications = [];
      affiliates.forEach(a => {
        const unpaid = parseFloat(a.unpaid_commissions || 0);
        const threshold = parseFloat(a.payment_threshold || 200);
        if (unpaid >= threshold) {
          const existing = paymentNotifications.find(n => n.handle === a.handle);
          if (!existing) {
            notifications.push({
              handle: a.handle,
              name: a.full_name,
              amount: unpaid,
              threshold,
              date: new Date().toISOString()
            });
          }
        }
      });
      
      if (notifications.length > 0) {
        const updated = [...paymentNotifications, ...notifications];
        localStorage.setItem('affiliate_notifications', JSON.stringify(updated));
        setPaymentNotifications(updated);
        
        notifications.forEach(n => {
          showToast(`${n.name} has R${n.amount.toFixed(2)} in unpaid commissions!`, 'info');
        });
      }
    };
    
    if (affiliates.length > 0) {
      checkThresholds();
    }
  }, [affiliates]);

  const totalUnpaid = affiliates.reduce((s,a) => s + parseFloat(a.unpaid_commissions||0), 0);
  const totalSignups = affiliates.reduce((s,a) => s + parseInt(a.total_signups||0), 0);
  const pendingPayments = paymentNotifications.length;

  const inp = (label, key, type='text', extra={}) => (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',color:'#9ca3af',fontSize:12,marginBottom:4}}>{label}</label>
      <input 
        type={type} 
        value={form[key]} 
        onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
        style={{
          width:'100%',
          background:'#1a1a1a',
          border:'1px solid #333',
          borderRadius:6,
          padding:'8px 10px',
          color:'white',
          fontSize:13,
          boxSizing:'border-box'
        }} 
        {...extra}
      />
    </div>
  );

  if (selected) return (
    <div>
      <Toast toast={toast} />
      
      <button 
        onClick={()=>{setSelected(null);setConversions([]);}} 
        style={{
          background:'none',
          border:'none',
          color:'#9ca3af',
          cursor:'pointer',
          marginBottom:16,
          display:'flex',
          alignItems:'center',
          gap:6,
          fontSize:13
        }}
      >
        <Icon name="chevron-left" size={14}/> Back to Affiliates
      </button>
      
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h2 style={{color:'white',margin:0,fontSize:20}}>{selected.full_name}</h2>
          <div style={{color:'#9ca3af',fontSize:13,marginTop:4}}>
            Referral link: <code style={{background:'#1a1a1a',padding:'2px 6px',borderRadius:4,color:'#D4A853'}}>
              https://opdesk.app/bookings.html?ref={selected.handle}
            </code>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button 
            onClick={()=>{ 
              setForm({
                handle:selected.handle,
                full_name:selected.full_name,
                email:selected.email,
                phone:selected.phone||'',
                notes:selected.notes||'',
                commission_pct:selected.commission_pct,
                payment_threshold:selected.payment_threshold || '200',
                status:selected.status
              }); 
              setShowForm(true); 
            }}
            style={{
              background:'#1a1a1a',
              border:'1px solid #333',
              color:'white',
              padding:'7px 14px',
              borderRadius:6,
              cursor:'pointer',
              fontSize:13
            }}
          >
            Edit
          </button>
          {parseFloat(selected.unpaid_commissions) > 0 &&
            <button 
              onClick={()=>markPaid(selected.handle)}
              style={{
                background:'#15803d',
                border:'none',
                color:'white',
                padding:'7px 14px',
                borderRadius:6,
                cursor:'pointer',
                fontSize:13,
                fontWeight:700
              }}
            >
              Mark R{parseFloat(selected.unpaid_commissions).toFixed(2)} Paid
            </button>
          }
        </div>
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Signups', value:selected.total_signups},
          {label:'Unpaid Commission', value:`R${parseFloat(selected.unpaid_commissions||0).toFixed(2)}`},
          {label:'Commission Rate', value:`${selected.commission_pct}%`},
          {label:'Payment Threshold', value:`R${selected.payment_threshold || 200}`},
        ].map(s=>(
          <div key={s.label} style={{background:'#111',border:'1px solid #1a1a1a',borderRadius:8,padding:'14px 16px'}}>
            <div style={{color:'#9ca3af',fontSize:11,marginBottom:4}}>{s.label}</div>
            <div style={{color:'white',fontSize:20,fontWeight:700}}>{s.value}</div>
          </div>
        ))}
      </div>
      
      <div style={{background:'#111',borderRadius:8,border:'1px solid #1a1a1a',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #1a1a1a',color:'white',fontWeight:700}}>
          Conversions
        </div>
        {conversions.length === 0 ? (
          <div style={{padding:20,color:'#9ca3af',fontSize:13}}>No conversions yet.</div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#1a1a1a'}}>
                {['Company','Tier','Value','Commission','Paid','Date'].map(h=>(
                  <th key={h} style={{padding:'8px 14px',textAlign:'left',color:'#9ca3af',fontSize:11,fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conversions.map(c=>(
                <tr key={c.id} style={{borderTop:'1px solid #1a1a1a'}}>
                  <td style={{padding:'10px 14px',color:'white',fontSize:13}}>{c.company_name}</td>
                  <td style={{padding:'10px 14px',color:'#D4A853',fontSize:13,fontWeight:700,textTransform:'capitalize'}}>{c.tier}</td>
                  <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>R{parseFloat(c.monthly_value||0).toFixed(2)}</td>
                  <td style={{padding:'10px 14px',color:'#22c55e',fontSize:13,fontWeight:700}}>R{parseFloat(c.commission_due||0).toFixed(2)}</td>
                  <td style={{padding:'10px 14px',fontSize:12}}>
                    <span style={{
                      background:c.paid_out?'#14532d':'#7c2d12',
                      color:c.paid_out?'#86efac':'#fca5a5',
                      padding:'2px 8px',
                      borderRadius:4,
                      fontWeight:700
                    }}>
                      {c.paid_out ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px',color:'#6b7280',fontSize:12}}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <Toast toast={toast} />
      
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h2 style={{color:'white',margin:0,fontSize:20}}>Affiliates & Referrals</h2>
          <p style={{color:'#9ca3af',fontSize:13,margin:'4px 0 0'}}>
            Manage referral partners. Each gets a unique <code style={{background:'#1a1a1a',padding:'1px 5px',borderRadius:3}}>?ref=handle</code> link.
          </p>
        </div>
        <button 
          onClick={()=>setShowForm(true)} 
          style={{
            background:'#dc2626',
            border:'none',
            color:'white',
            padding:'9px 18px',
            borderRadius:8,
            cursor:'pointer',
            fontWeight:700,
            fontSize:13,
            display:'flex',
            alignItems:'center',
            gap:6
          }}
        >
          <Icon name="plus" size={14}/> Add Affiliate
        </button>
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Affiliates', value:affiliates.length, color:'#6b7280'},
          {label:'Total Signups', value:totalSignups, color:'#3b82f6'},
          {label:'Unpaid Commissions', value:`R${totalUnpaid.toFixed(2)}`, color:'#22c55e'},
          {label:'Pending Payments', value:pendingPayments, color:'#f59e0b'},
        ].map(s=>(
          <div key={s.label} style={{background:'#1a1a1a',borderRadius:10,padding:'14px 18px',border:'1px solid #222'}}>
            <div style={{color:s.color,fontWeight:900,fontSize:22}}>{s.value}</div>
            <div style={{color:'#9ca3af',fontSize:12,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      
      {showForm && (
        <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:10,padding:20,marginBottom:20}}>
          <h3 style={{color:'white',margin:'0 0 16px',fontSize:15}}>
            {form.handle && affiliates.find(a=>a.handle===form.handle) ? 'Edit Affiliate' : 'Add Affiliate'}
          </h3>
          <form onSubmit={saveForm}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>{inp('Handle (URL slug)', 'handle', 'text', {pattern:'[a-z0-9-]+', required:true, placeholder:'e.g. john-smith'})}</div>
              <div>{inp('Full Name', 'full_name', 'text', {required:true})}</div>
              <div>{inp('Email', 'email', 'email', {required:true})}</div>
              <div>{inp('Phone', 'phone')}</div>
              <div>{inp('Commission %', 'commission_pct', 'number', {min:0,max:100,step:0.5})}</div>
              <div>{inp('Payment Threshold (R)', 'payment_threshold', 'number', {min:0,step:10})}</div>
              <div>
                <label style={{display:'block',color:'#9ca3af',fontSize:12,marginBottom:4}}>Status</label>
                <select 
                  value={form.status} 
                  onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                  style={{
                    width:'100%',
                    background:'#1a1a1a',
                    border:'1px solid #333',
                    borderRadius:6,
                    padding:'8px 10px',
                    color:'white',
                    fontSize:13
                  }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>
            {inp('Notes (internal)', 'notes')}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
              <button 
                type="button" 
                onClick={()=>setShowForm(false)} 
                style={{
                  background:'#1a1a1a',
                  border:'1px solid #333',
                  color:'white',
                  padding:'7px 16px',
                  borderRadius:6,
                  cursor:'pointer',
                  fontSize:13
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                style={{
                  background:'#dc2626',
                  border:'none',
                  color:'white',
                  padding:'7px 16px',
                  borderRadius:6,
                  cursor:'pointer',
                  fontWeight:700,
                  fontSize:13,
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving…' : 'Save Affiliate'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div style={{color:'#9ca3af',padding:20,textAlign:'center'}}>Loading affiliates...</div>
      ) : affiliates.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'#9ca3af'}}>
          <Icon name="users" size={32} style={{margin:'0 auto 12px',opacity:0.3}}/>
          <p style={{marginTop:12}}>No affiliates yet. Add your first referral partner above.</p>
        </div>
      ) : (
        <div style={{background:'#111',borderRadius:8,border:'1px solid #1a1a1a',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#1a1a1a'}}>
                {['Partner','Handle','Signups','Unpaid','Threshold','Commission','Status',''].map(h=>(
                  <th key={h} style={{padding:'8px 14px',textAlign:'left',color:'#9ca3af',fontSize:11,fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.map(a=>{
                const unpaid = parseFloat(a.unpaid_commissions||0);
                const threshold = parseFloat(a.payment_threshold||200);
                const nearing = unpaid >= threshold * 0.8 && unpaid < threshold;
                
                return (
                  <tr 
                    key={a.id} 
                    style={{borderTop:'1px solid #1a1a1a',cursor:'pointer'}} 
                    onClick={()=>openAffiliate(a)}
                    onMouseEnter={e=>e.currentTarget.style.background='#1a1a1a'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{padding:'10px 14px'}}>
                      <div style={{color:'white',fontWeight:600,fontSize:13}}>{a.full_name}</div>
                      <div style={{color:'#6b7280',fontSize:11}}>{a.email}</div>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <code style={{background:'#1a1a1a',padding:'2px 6px',borderRadius:3,color:'#D4A853',fontSize:12}}>{a.handle}</code>
                    </td>
                    <td style={{padding:'10px 14px',color:'white',fontSize:13}}>{a.total_signups}</td>
                    <td style={{
                      padding:'10px 14px',
                      color: unpaid >= threshold ? '#22c55e' : nearing ? '#f59e0b' : '#9ca3af',
                      fontWeight: unpaid >= threshold ? 700 : 400,
                      fontSize:13
                    }}>
                      R{unpaid.toFixed(2)}
                      {unpaid >= threshold && ' 🎯'}
                    </td>
                    <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>R{threshold}</td>
                    <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{a.commission_pct}%</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{
                        background:a.status==='active'?'#14532d':a.status==='paused'?'#713f12':'#1a1a1a',
                        color:a.status==='active'?'#86efac':a.status==='paused'?'#fde68a':'#9ca3af',
                        padding:'2px 8px',
                        borderRadius:4,
                        fontSize:11,
                        fontWeight:700,
                        textTransform:'uppercase'
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <Icon name="chevron-right" size={14} className="text-gray-500"/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SAAffiliate;