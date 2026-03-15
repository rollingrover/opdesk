import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── SUPERADMIN: AFFILIATE MANAGEMENT ─────────────────────────────────
function SAAffiliate() {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [conversions, setConversions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ handle:'', full_name:'', email:'', phone:'', notes:'', commission_pct:'10', status:'active' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc('get_all_affiliates');
    setAffiliates(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openAffiliate(aff) {
    setSelected(aff);
    const { data } = await supabase.rpc('get_affiliate_conversions', { p_handle: aff.handle });
    setConversions(data || []);
  }

  async function saveForm(e) {
    e.preventDefault(); setSaving(true);
    await supabase.rpc('upsert_affiliate', {
      p_handle: form.handle, p_full_name: form.full_name, p_email: form.email,
      p_phone: form.phone||null, p_notes: form.notes||null,
      p_commission_pct: parseFloat(form.commission_pct)||10,
      p_status: form.status
    });
    setSaving(false); setShowForm(false); setForm({ handle:'', full_name:'', email:'', phone:'', notes:'', commission_pct:'10', status:'active' }); load();
  }

  async function markPaid(handle) {
    if (!confirm('Mark all unpaid commissions as paid for this affiliate?')) return;
    await supabase.rpc('mark_commissions_paid', { p_handle: handle });
    load();
    if (selected?.handle === handle) openAffiliate({ ...selected });
  }

  const totalUnpaid = affiliates.reduce((s,a) => s + parseFloat(a.unpaid_commissions||0), 0);
  const totalSignups = affiliates.reduce((s,a) => s + parseInt(a.total_signups||0), 0);
  const totalPaid = affiliates.reduce((s,a) => {
    if (!selected) return s; return s;
  }, 0);
  // Referral report: monthly signups from conversions in selected affiliate detail
  const [report, setReport] = React.useState(null);
  React.useEffect(()=>{
    if (!selected) { setReport(null); return; }
    // conversions already loaded in selected.conversions via openAffiliate
  },[selected]);

  const inp = (label, key, type='text', extra={}) => (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',color:'#9ca3af',fontSize:12,marginBottom:4}}>{label}</label>
      <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
        style={{width:'100%',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,padding:'8px 10px',color:'white',fontSize:13,boxSizing:'border-box'}} {...extra}/>
    </div>
  );

  if (selected) return (
    <div>
      <button onClick={()=>{setSelected(null);setConversions([]);}} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',gap:6,fontSize:13}}>
        <Icon name="back" size={14}/> Back to Affiliates
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
          <button onClick={()=>{ setForm({handle:selected.handle,full_name:selected.full_name,email:selected.email,phone:selected.phone||'',notes:selected.notes||'',commission_pct:selected.commission_pct,status:selected.status}); setShowForm(true); }}
            style={{background:'#1a1a1a',border:'1px solid #333',color:'white',padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:13}}>Edit</button>
          {parseFloat(selected.unpaid_commissions)>0 &&
            <button onClick={()=>markPaid(selected.handle)}
              style={{background:'#15803d',border:'none',color:'white',padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700}}>
              Mark R{parseFloat(selected.unpaid_commissions).toFixed(2)} Paid
            </button>}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Signups', value:selected.total_signups},
          {label:'Unpaid Commission', value:`R${parseFloat(selected.unpaid_commissions||0).toFixed(2)}`},
          {label:'Commission Rate', value:`${selected.commission_pct}%`},
          {label:'Status', value:selected.status.toUpperCase()},
        ].map(s=>(
          <div key={s.label} style={{background:'#111',border:'1px solid #1a1a1a',borderRadius:8,padding:'14px 16px'}}>
            <div style={{color:'#9ca3af',fontSize:11,marginBottom:4}}>{s.label}</div>
            <div style={{color:'white',fontSize:20,fontWeight:700}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#111',borderRadius:8,border:'1px solid #1a1a1a',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #1a1a1a',color:'white',fontWeight:700}}>Conversions</div>
        {conversions.length===0 ? <div style={{padding:20,color:'#9ca3af',fontSize:13}}>No conversions yet.</div> : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#1a1a1a'}}>
              {['Company','Tier','Value','Commission','Paid','Date'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',color:'#9ca3af',fontSize:11,fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>{conversions.map(c=>(
              <tr key={c.id} style={{borderTop:'1px solid #1a1a1a'}}>
                <td style={{padding:'10px 14px',color:'white',fontSize:13}}>{c.company_name}</td>
                <td style={{padding:'10px 14px',color:'#D4A853',fontSize:13,fontWeight:700,textTransform:'capitalize'}}>{c.tier}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>R{parseFloat(c.monthly_value||0).toFixed(2)}</td>
                <td style={{padding:'10px 14px',color:'#22c55e',fontSize:13,fontWeight:700}}>R{parseFloat(c.commission_due||0).toFixed(2)}</td>
                <td style={{padding:'10px 14px',fontSize:12}}>
                  <span style={{background:c.paid_out?'#14532d':'#7c2d12',color:c.paid_out?'#86efac':'#fca5a5',padding:'2px 8px',borderRadius:4,fontWeight:700}}>
                    {c.paid_out ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td style={{padding:'10px 14px',color:'#6b7280',fontSize:12}}>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h2 style={{color:'white',margin:0,fontSize:20}}>Affiliates & Referrals</h2>
          <p style={{color:'#9ca3af',fontSize:13,margin:'4px 0 0'}}>Manage referral partners. Each gets a unique <code style={{background:'#1a1a1a',padding:'1px 5px',borderRadius:3}}>?ref=handle</code> link.</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={{background:'#dc2626',border:'none',color:'white',padding:'9px 18px',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
          <Icon name="plus" size={14}/> Add Affiliate
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Affiliates', value:affiliates.length},
          {label:'Total Signups', value:totalSignups},
          {label:'Unpaid Commissions', value:`R${totalUnpaid.toFixed(2)}`},
        ].map(s=>(
          <div key={s.label} style={{background:'#111',border:'1px solid #1a1a1a',borderRadius:8,padding:'14px 16px'}}>
            <div style={{color:'#9ca3af',fontSize:11,marginBottom:4}}>{s.label}</div>
            <div style={{color:'white',fontSize:22,fontWeight:700}}>{s.value}</div>
          </div>
        ))}
      </div>
      {showForm && (
        <div style={{background:'#111',border:'1px solid #333',borderRadius:10,padding:20,marginBottom:20}}>
          <h3 style={{color:'white',margin:'0 0 16px',fontSize:15}}>{form.handle && affiliates.find(a=>a.handle===form.handle) ? 'Edit Affiliate' : 'Add Affiliate'}</h3>
          <form onSubmit={saveForm}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>{inp('Handle (URL slug)', 'handle', 'text', {pattern:'[a-z0-9-]+', required:true, placeholder:'e.g. john-smith'})}</div>
              <div>{inp('Full Name', 'full_name', 'text', {required:true})}</div>
              <div>{inp('Email', 'email', 'email', {required:true})}</div>
              <div>{inp('Phone', 'phone')}</div>
              <div>{inp('Commission %', 'commission_pct', 'number', {min:0,max:100,step:0.5})}</div>
              <div>
                <label style={{display:'block',color:'#9ca3af',fontSize:12,marginBottom:4}}>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                  style={{width:'100%',background:'#1a1a1a',border:'1px solid #333',borderRadius:6,padding:'8px 10px',color:'white',fontSize:13}}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>
            {inp('Notes (internal)', 'notes')}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button type="button" onClick={()=>setShowForm(false)} style={{background:'#1a1a1a',border:'1px solid #333',color:'white',padding:'7px 16px',borderRadius:6,cursor:'pointer',fontSize:13}}>Cancel</button>
              <button type="submit" disabled={saving} style={{background:'#dc2626',border:'none',color:'white',padding:'7px 16px',borderRadius:6,cursor:'pointer',fontWeight:700,fontSize:13}}>
                {saving ? 'Saving…' : 'Save Affiliate'}
              </button>
            </div>
          </form>
        </div>
      )}
      {loading ? <div style={{color:'#9ca3af',padding:20}}>Loading…</div> : affiliates.length===0 ? (
        <div style={{textAlign:'center',padding:40,color:'#9ca3af'}}>
          <Icon name="guests" size={32} className="mx-auto mb-3 opacity-30"/>
          <p style={{marginTop:12}}>No affiliates yet. Add your first referral partner above.</p>
        </div>
      ) : (
        <div style={{background:'#111',borderRadius:8,border:'1px solid #1a1a1a',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#1a1a1a'}}>
              {['Partner','Handle','Signups','Unpaid','Commission','Status',''].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',color:'#9ca3af',fontSize:11,fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>{affiliates.map(a=>(
              <tr key={a.id} style={{borderTop:'1px solid #1a1a1a',cursor:'pointer'}} onClick={()=>openAffiliate(a)}>
                <td style={{padding:'10px 14px'}}>
                  <div style={{color:'white',fontWeight:600,fontSize:13}}>{a.full_name}</div>
                  <div style={{color:'#6b7280',fontSize:11}}>{a.email}</div>
                </td>
                <td style={{padding:'10px 14px'}}><code style={{background:'#1a1a1a',padding:'2px 6px',borderRadius:3,color:'#D4A853',fontSize:12}}>{a.handle}</code></td>
                <td style={{padding:'10px 14px',color:'white',fontSize:13}}>{a.total_signups}</td>
                <td style={{padding:'10px 14px',color: parseFloat(a.unpaid_commissions)>0?'#22c55e':'#6b7280',fontWeight:700,fontSize:13}}>R{parseFloat(a.unpaid_commissions||0).toFixed(2)}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{a.commission_pct}%</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{background:a.status==='active'?'#14532d':a.status==='paused'?'#713f12':'#1a1a1a',color:a.status==='active'?'#86efac':a.status==='paused'?'#fde68a':'#9ca3af',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>
                    {a.status}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}><Icon name="chevron-right" size={14} className="text-gray-500"/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function SASupportQueue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Open');
  const [saving, setSaving] = useState(false);
  const STATUS_COLORS = { Open:'#dc2626', 'In Progress':'#d97706', Resolved:'#16a34a', Closed:'#6b7280' };

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc('get_all_support_tickets');
    setTickets(data || []);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  function openTicket(t) {
    setSelected(t);
    setNotes(t.admin_notes || '');
    setStatus(t.status);
  }

  async function saveTicket() {
    if (!selected) return;
    setSaving(true);
    await supabase.rpc('update_support_ticket', {
      p_ticket_id: selected.id, p_status: status, p_admin_notes: notes
    });
    setSaving(false);
    load();
    setSelected(null);
  }

  const CAT_ICON = { Bug:'shield', Billing:'billing', 'Feature Request':'info', Other:'settings' };
  const counts = { Open:0, 'In Progress':0, Resolved:0, Closed:0 };
  tickets.forEach(t=>{ if (counts[t.status]!==undefined) counts[t.status]++; });

  if (loading) return <div style={{color:'#9ca3af',padding:40,textAlign:'center'}}>Loading tickets…</div>;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Support Queue</h2>
        <p style={{color:'#6b7280',fontSize:14}}>{tickets.length} total tickets</p>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {Object.entries(counts).map(([st,n])=>(
          <div key={st} style={{background:'#1a1a1a',borderRadius:10,padding:'14px 16px',border:'1px solid #2a2a2a'}}>
            <div style={{fontSize:26,fontWeight:900,color:STATUS_COLORS[st]||'white'}}>{n}</div>
            <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{st}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 && (
        <div style={{textAlign:'center',padding:60,color:'#6b7280'}}>
          <Icon name="shield" size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No support tickets yet</p>
        </div>
      )}

      {/* Ticket list */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {tickets.map(t=>(
          <div key={t.id} onClick={()=>openTicket(t)}
            style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:10,padding:'14px 16px',cursor:'pointer',
              display:'flex',alignItems:'center',gap:14,transition:'border-color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#dc2626'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#2a2a2a'}
          >
            <div style={{background:'#111',borderRadius:8,padding:8}}>
              <Icon name={CAT_ICON[t.category]||'settings'} size={18} style={{color:'#9ca3af'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:'white',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
              <div style={{fontSize:12,color:'#6b7280'}}>{t.company_name || 'Unknown'} · {t.submitter_email} · {new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:'#111',border:`1px solid ${STATUS_COLORS[t.status]||'#6b7280'}`,color:STATUS_COLORS[t.status]||'#6b7280',
                borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>{t.status}</span>
              <span style={{background:'#222',borderRadius:6,padding:'2px 8px',fontSize:11,color:'#9ca3af'}}>{t.category}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket detail modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:20}}
          onClick={()=>setSelected(null)}>
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:14,padding:28,width:'100%',maxWidth:560,maxHeight:'85vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontWeight:800,fontSize:17,color:'white',marginBottom:4}}>{selected.subject}</div>
                <div style={{fontSize:12,color:'#6b7280'}}>{selected.company_name} · {selected.submitter_email}</div>
                <div style={{fontSize:11,color:'#4b5563',marginTop:2}}>{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',padding:4}}>
                <Icon name="x" size={18}/>
              </button>
            </div>
            <div style={{background:'#111',borderRadius:8,padding:14,marginBottom:20,fontSize:13,color:'#d1d5db',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
              {selected.description}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:'#9ca3af',display:'block',marginBottom:6}}>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)}
                style={{background:'#111',border:'1px solid #333',color:'white',borderRadius:8,padding:'8px 12px',width:'100%'}}>
                {['Open','In Progress','Resolved','Closed'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,color:'#9ca3af',display:'block',marginBottom:6}}>Admin Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
                placeholder="Internal notes (not visible to user)"
                style={{background:'#111',border:'1px solid #333',color:'white',borderRadius:8,padding:'8px 12px',width:'100%',resize:'vertical',fontSize:13}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setSelected(null)}
                style={{flex:1,padding:'10px 0',borderRadius:8,border:'1px solid #333',background:'none',color:'#9ca3af',cursor:'pointer',fontWeight:600}}>
                Cancel
              </button>
              <button onClick={saveTicket} disabled={saving}
                style={{flex:1,padding:'10px 0',borderRadius:8,background:'#dc2626',border:'none',color:'white',cursor:'pointer',fontWeight:700,fontSize:14}}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default SAAffiliate;
