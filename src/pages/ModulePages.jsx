import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TIERS, TIER_LIMITS, REGION_CERTS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS_MAP, LABELS, ADDON_TYPES, getCurrencySymbol, getCompanyRegion, Icon } from '../lib/constants.jsx';
import PageHeader from '../components/PageHeader.jsx';
import CrudPage from './CrudPage.jsx';

// ─── MODULE PAGES ────────────────────────

// ══════════════════════════════════════════════
//  CLIENTS MODULE
//  Standard+ included · Free/Basic = addon
// ══════════════════════════════════════════════

export function ClientInvoiceModal({ client, onClose }) {
  const { company, features, currencySymbol: sym } = useAuth();
  const [view,       setView]     = React.useState('list');  // 'list' | 'create' | 'view'
  const [invoices,   setInvoices] = React.useState([]);
  const [activeInv,  setActiveInv]= React.useState(null);
  const [tours,      setTours]    = React.useState([]);
  const [safaris,    setSafaris]  = React.useState([]);
  const [loadingAct, setLoadingAct] = React.useState(true);
  const [loadingInv, setLoadingInv] = React.useState(true);
  const [saving,     setSaving]   = React.useState(false);

  // New invoice form state
  const [lines,       setLines]       = React.useState([]);
  const [invDate,     setInvDate]     = React.useState(new Date().toISOString().split('T')[0]);
  const [dueDate,     setDueDate]     = React.useState('');
  const [taxRate,     setTaxRate]     = React.useState(0);
  const [invNotes,    setInvNotes]    = React.useState('');

  const [editingInv, setEditingInv] = React.useState(null); // invoice being edited

  const showLogo = features.logo && company?.logo_url;
  const isWhite  = features.whiteLabel;

  function nextInvNum() {
    const prefix = (company?.name||'INV').replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,4);
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }

  async function loadInvoices() {
    setLoadingInv(true);
    const { data } = await supabase.from('client_invoices')
      .select('*')
      .eq('client_id', client.id)
      .order('invoice_date', { ascending: false });
    setInvoices(data || []);
    setLoadingInv(false);
  }

  React.useEffect(() => {
    if (!company) return;
    loadInvoices();
    Promise.all([
      supabase.from('tours').select('id,name,price,max_pax').eq('company_id', company.id).eq('status','active').order('name'),
      supabase.from('safaris').select('id,name,price_per_person,max_pax').eq('company_id', company.id).eq('status','active').order('name'),
    ]).then(([t, s]) => {
      setTours(t.data || []);
      setSafaris(s.data || []);
      setLoadingAct(false);
    });
  }, [company]);

  function addLine(item, type) {
    const price = type === 'tour' ? parseFloat(item.price||0) : parseFloat(item.price_per_person||0);
    setLines(prev => [...prev, { id: Date.now(), desc: item.name, qty: 1, unit_price: price }]);
  }
  function removeLine(id) { setLines(prev => prev.filter(l => l.id !== id)); }
  function updateLine(id, field, val) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: field === 'desc' ? val : parseFloat(val)||0 } : l));
  }

  function calcTotals(lns, rate) {
    const sub = lns.reduce((s, l) => s + (l.qty * l.unit_price), 0);
    const tax = sub * (rate / 100);
    return { subtotal: sub, tax_amount: tax, total: sub + tax };
  }

  const { subtotal, tax_amount, total } = calcTotals(lines, taxRate);

  async function handleSave(status) {
    if (lines.length === 0) { toast('Add at least one line item', 'error'); return; }
    setSaving(true);
    const invNum = nextInvNum();
    const tots   = calcTotals(lines, taxRate);
    const payload = {
      company_id:     company.id,
      client_id:      client.id,
      invoice_number: invNum,
      invoice_date:   invDate,
      due_date:       dueDate || null,
      status,
      lines:          lines.map(({ id, ...l }) => l),
      subtotal:       tots.subtotal,
      tax_rate:       taxRate,
      tax_amount:     tots.tax_amount,
      total:          tots.total,
      notes:          invNotes,
    };
    const { data, error } = await supabase.from('client_invoices').insert(payload).select().single();
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Invoice saved');
    setSaving(false);
    await loadInvoices();
    setView('list');
    setLines([]); setInvNotes(''); setTaxRate(0);
    setInvDate(new Date().toISOString().split('T')[0]); setDueDate('');
    if (status !== 'draft') printInvoice(data);
  }

  async function handleDelete(invId) {
    if (!confirm('Delete this invoice?')) return;
    await supabase.from('client_invoices').delete().eq('id', invId);
    toast('Invoice deleted');
    loadInvoices();
  }

  async function updateStatus(invId, status) {
    await supabase.from('client_invoices').update({ status }).eq('id', invId);
    loadInvoices();
  }

  function printInvoice(inv) {
    const lns = Array.isArray(inv.lines) ? inv.lines : JSON.parse(inv.lines || '[]');
    const tots = calcTotals(lns, parseFloat(inv.tax_rate||0));
    const rows = lns.map(l => `<tr>
      <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #f3f4f6">${l.desc}</td>
      <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #f3f4f6;text-align:right">${l.qty}</td>
      <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #f3f4f6;text-align:right">${sym}${parseFloat(l.unit_price||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
      <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${sym}${(l.qty*l.unit_price).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
    </tr>`).join('');

    const displayDate = new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
    const displayDue  = inv.due_date ? new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' }) : null;

    const w = window.open('', '_blank', 'width=860,height=1100');
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a2e;padding:32px;max-width:820px;margin:0 auto}
      .hdr{background:#0F2540;border-radius:12px 12px 0 0;padding:22px 28px;display:flex;justify-content:space-between;align-items:center}
      .bdy{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px}
      .lbl{font-size:10px;text-transform:uppercase;color:#9ca3af;margin-bottom:3px;font-weight:700;letter-spacing:.04em}
      .val{font-weight:700;color:#0F2540;font-size:14px;line-height:1.4}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px}
      .bill-box{background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:20px}
      .bill-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:8px 0;border-bottom:2px solid #e5e7eb;font-weight:700}
      .logo-img{height:44px;width:auto;object-fit:contain;border-radius:4px}
      .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:rgba(212,168,83,0.15);color:#D4A853}
      .bank-box{background:#f9fafb;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:12px;color:#374151}
      .footer{text-align:center;font-size:11px;color:#d1d5db;padding-top:14px;border-top:1px solid #f3f4f6;margin-top:16px}
      @media print{body{padding:0}button{display:none}}
    </style></head><body>
    <div class="hdr">
      <div style="display:flex;align-items:center;gap:14px">
        ${showLogo ? `<img src="${company.logo_url}" class="logo-img" alt="logo"/>` : `<svg width="34" height="34" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" stroke="#D4A853" stroke-width="3" fill="none"/><polygon points="50,10 55,45 50,50 45,45" fill="#D4A853"/><polygon points="50,90 55,55 50,50 45,55" fill="#D4A853" opacity="0.5"/><polygon points="10,50 45,45 50,50 45,55" fill="#D4A853" opacity="0.5"/><polygon points="90,50 55,55 50,50 55,45" fill="#D4A853"/><circle cx="50" cy="50" r="6" fill="#D4A853"/></svg>`}
        <div>
          <div style="font-size:20px;font-weight:900;color:#fff">${isWhite || showLogo ? (company?.name||'OpDesk') : 'OpDesk'}</div>
          ${showLogo ? '' : `<div style="font-size:11px;color:#D4A853;font-weight:600">${company?.name||''}</div>`}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:900;color:#D4A853">INVOICE</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px">${inv.invoice_number}</div>
        <div class="status-badge" style="margin-top:6px">${inv.status||'draft'}</div>
      </div>
    </div>
    <div class="bdy">
      <div class="info-grid">
        <div>
          <div class="lbl">Invoice Date</div>
          <div class="val">${displayDate}</div>
          ${displayDue ? `<div class="lbl" style="margin-top:10px">Due Date</div><div class="val">${displayDue}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="lbl">From</div>
          <div class="val">${company?.name||''}</div>
          ${company?.address ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${company.address}</div>` : ''}
          ${company?.email ? `<div style="font-size:13px;color:#6b7280">${company.email}</div>` : ''}
          ${company?.phone ? `<div style="font-size:13px;color:#6b7280">${company.phone}</div>` : ''}
          ${company?.vat_number ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">VAT Reg: ${company.vat_number}</div>` : ''}
        </div>
      </div>
      <div class="bill-box">
        <div class="lbl" style="margin-bottom:8px">Bill To</div>
        <div class="bill-grid">
          <div>
            <div style="font-weight:700;font-size:15px;color:#0F2540">${client.billing_company || client.full_name}</div>
            ${client.billing_company ? `<div style="font-size:13px;color:#374151;margin-top:2px">${client.full_name}</div>` : ''}
            ${client.email ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${client.email}</div>` : ''}
            ${client.phone ? `<div style="font-size:13px;color:#6b7280">${client.phone}</div>` : ''}
          </div>
          <div>
            ${client.billing_address ? `<div style="font-size:13px;color:#6b7280">${client.billing_address}</div>` : ''}
            ${client.billing_city ? `<div style="font-size:13px;color:#6b7280">${client.billing_city}${client.billing_province ? ', '+client.billing_province : ''}</div>` : ''}
            ${client.billing_postcode ? `<div style="font-size:13px;color:#6b7280">${client.billing_postcode}</div>` : ''}
            ${client.billing_country ? `<div style="font-size:13px;color:#6b7280">${client.billing_country}</div>` : ''}
            ${client.vat_number ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">VAT: ${client.vat_number}</div>` : ''}
          </div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <thead><tr>
          <th>Description</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right;padding-top:10px;font-size:13px;color:#6b7280">Subtotal</td><td style="text-align:right;padding-top:10px;font-size:13px;color:#374151">${sym}${tots.subtotal.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr>
          ${parseFloat(inv.tax_rate||0) > 0 ? `<tr><td colspan="3" style="text-align:right;padding-top:6px;font-size:13px;color:#6b7280">Tax (${inv.tax_rate}%)</td><td style="text-align:right;padding-top:6px;font-size:13px;color:#374151">${sym}${tots.tax_amount.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr>` : ''}
          <tr><td colspan="3" style="text-align:right;padding-top:12px;border-top:2px solid #0F2540;font-weight:900;font-size:14px">TOTAL DUE</td><td style="text-align:right;padding-top:12px;border-top:2px solid #0F2540;font-weight:900;font-size:18px;color:#D4A853">${sym}${tots.total.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td></tr>
        </tfoot>
      </table>
      ${inv.notes ? `<div style="font-size:13px;color:#6b7280;background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:14px"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
      ${company?.bank_name ? `<div class="bank-box"><strong>Banking Details</strong><div style="margin-top:6px;display:grid;grid-template-columns:auto auto auto;gap:4px 24px;width:fit-content"><span style="color:#9ca3af">Bank</span><span>${company.bank_name}</span><span></span><span style="color:#9ca3af">Account</span><span>${company.bank_account||'-'}</span><span></span><span style="color:#9ca3af">Branch</span><span>${company.bank_branch||'-'}</span><span></span></div></div>` : ''}
      <div class="footer">${isWhite ? '' : features.logo ? "✦ OpDesk — Operator's Command Centre" : 'Powered by OpDesk · opdesk.app'}</div>
    </div>
    <script>window.onload=()=>{ window.print(); }<\/script>
    </body></html>`);
    w.document.close();
  }

  function openEdit(inv) {
    const lns = Array.isArray(inv.lines) ? inv.lines : JSON.parse(inv.lines || '[]');
    setEditingInv(inv);
    setLines(lns.map((l, i) => ({ ...l, id: l.id || Date.now() + i })));
    setInvDate(inv.invoice_date || new Date().toISOString().split('T')[0]);
    setDueDate(inv.due_date || '');
    setTaxRate(parseFloat(inv.tax_rate || 0));
    setInvNotes(inv.notes || '');
    setView('edit');
  }

  async function handleUpdate(status) {
    if (lines.length === 0) { toast('Add at least one line item', 'error'); return; }
    setSaving(true);
    const tots = calcTotals(lines, taxRate);
    const payload = {
      invoice_date: invDate,
      due_date:     dueDate || null,
      status,
      lines:        lines.map(({ id, ...l }) => l),
      subtotal:     tots.subtotal,
      tax_rate:     taxRate,
      tax_amount:   tots.tax_amount,
      total:        tots.total,
      notes:        invNotes,
      updated_at:   new Date().toISOString(),
    };
    const { error } = await supabase.from('client_invoices').update(payload).eq('id', editingInv.id);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Invoice updated');
    setSaving(false);
    setEditingInv(null);
    setLines([]); setInvNotes(''); setTaxRate(0);
    setInvDate(new Date().toISOString().split('T')[0]); setDueDate('');
    await loadInvoices();
    setView('list');
    if (status !== 'draft') {
      const { data: updated } = await supabase.from('client_invoices').select('*').eq('id', editingInv.id).single();
      if (updated) printInvoice(updated);
    }
  }

  const statusColor = { draft:'bg-gray-100 text-gray-500', sent:'bg-blue-50 text-blue-600', paid:'bg-green-50 text-green-600', cancelled:'bg-red-50 text-red-400' };

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" style={{maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-navy text-lg">Invoices</h3>
            <p className="text-sm text-gray-500">{client.billing_company || client.full_name}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
              onClick={()=>setView('create')}>
              <Icon name="plus" size={14}/> New Invoice
            </button>
            <button onClick={onClose}><Icon name="x" size={18} className="text-gray-400"/></button>
          </div>
        </div>

        {loadingInv ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="invoice" size={36} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400 text-sm mb-4">No invoices yet for this client</p>
            <button className="btn-primary" onClick={()=>setView('create')}>Create First Invoice</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-semibold">Invoice #</th>
                <th className="text-left pb-2 font-semibold">Date</th>
                <th className="text-right pb-2 font-semibold">Total</th>
                <th className="text-center pb-2 font-semibold">Status</th>
                <th className="pb-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                  <td className="py-3 text-gray-600">{new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('en-ZA')}</td>
                  <td className="py-3 text-right font-bold text-navy">{sym}{parseFloat(inv.total||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                  <td className="py-3 text-center">
                    <select
                      value={inv.status}
                      onChange={e=>updateStatus(inv.id, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer ${statusColor[inv.status]||'bg-gray-100 text-gray-500'}`}>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={()=>printInvoice(inv)} title="Print / PDF"
                        className="text-gold hover:text-amber-600">
                        <Icon name="invoice" size={14}/>
                      </button>
                      <button onClick={()=>openEdit(inv)} title="Edit invoice"
                        className="text-gray-400 hover:text-navy">
                        <Icon name="edit" size={14}/>
                      </button>
                      <button onClick={()=>handleDelete(inv.id)} className="text-red-400 hover:text-red-600">
                        <Icon name="trash" size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ── EDIT VIEW ─────────────────────────────────────────────────────────────
  if (view === 'edit' && editingInv) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" style={{maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <button onClick={()=>{ setView('list'); setEditingInv(null); setLines([]); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1">
              <Icon name="chevron-left" size={12}/> Back to invoices
            </button>
            <h3 className="font-bold text-navy text-lg">Edit Invoice</h3>
            <p className="text-sm text-gray-500 font-mono">{editingInv.invoice_number}</p>
          </div>
          <button onClick={onClose}><Icon name="x" size={18} className="text-gray-400"/></button>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Invoice Date *</label>
            <input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tax / VAT %</label>
            <input type="number" value={taxRate} min={0} max={100} step={0.5}
              onChange={e=>setTaxRate(parseFloat(e.target.value)||0)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
        </div>

        {/* Add lines from activities */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Line Items</p>
          {loadingAct ? <p className="text-sm text-gray-400">Loading activities...</p> : (
            <div className="space-y-3">
              {tours.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Tours</p>
                  <div className="flex flex-wrap gap-2">
                    {tours.map(t => (
                      <button key={t.id} onClick={()=>addLine(t,'tour')}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gold hover:text-navy font-medium transition-all">
                        {t.name} · {sym}{parseFloat(t.price||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {safaris.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Safaris</p>
                  <div className="flex flex-wrap gap-2">
                    {safaris.map(s => (
                      <button key={s.id} onClick={()=>addLine(s,'safari')}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gold hover:text-navy font-medium transition-all">
                        {s.name} · {sym}{parseFloat(s.price_per_person||0).toLocaleString('en-ZA',{minimumFractionDigits:2})} pp
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tours.length===0 && safaris.length===0 && (
                <p className="text-sm text-gray-400">No active tours or safaris found.</p>
              )}
              <button onClick={()=>setLines(prev=>[...prev,{id:Date.now(),desc:'',qty:1,unit_price:0}])}
                className="text-xs text-gold font-semibold hover:underline">+ Add custom line</button>
            </div>
          )}
        </div>

        {/* Line items */}
        {lines.length > 0 && (
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase">
                  <th className="text-left pb-2 font-semibold">Description</th>
                  <th className="text-right pb-2 font-semibold w-16">Qty</th>
                  <th className="text-right pb-2 font-semibold w-28">Unit Price</th>
                  <th className="text-right pb-2 font-semibold w-28">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <input value={l.desc} onChange={e=>updateLine(l.id,'desc',e.target.value)}
                        placeholder="Description..."
                        className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none font-medium text-navy"/>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" value={l.qty} min={1} onChange={e=>updateLine(l.id,'qty',e.target.value)}
                        className="w-14 text-right text-sm border border-gray-200 rounded px-1 py-0.5"/>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" value={l.unit_price} min={0} step={0.01} onChange={e=>updateLine(l.id,'unit_price',e.target.value)}
                        className="w-24 text-right text-sm border border-gray-200 rounded px-1 py-0.5"/>
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold text-navy">
                      {sym}{(l.qty*l.unit_price).toLocaleString('en-ZA',{minimumFractionDigits:2})}
                    </td>
                    <td className="py-2 pl-1">
                      <button onClick={()=>removeLine(l.id)} className="text-red-400 hover:text-red-600">
                        <Icon name="x" size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {taxRate > 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={3} className="pt-2 text-right text-sm text-gray-500 pr-2">Subtotal</td>
                    <td className="pt-2 text-right text-sm text-gray-600">{sym}{subtotal.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                    <td></td>
                  </tr>
                )}
                {taxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-1 text-right text-sm text-gray-500 pr-2">Tax ({taxRate}%)</td>
                    <td className="pt-1 text-right text-sm text-gray-600">{sym}{tax_amount.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                    <td></td>
                  </tr>
                )}
                <tr className="border-t-2 border-navy">
                  <td colSpan={3} className="pt-3 text-right font-black text-navy text-sm pr-2">TOTAL DUE</td>
                  <td className="pt-3 text-right font-black text-lg" style={{color:'#D4A853'}}>
                    {sym}{total.toLocaleString('en-ZA',{minimumFractionDigits:2})}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {lines.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Select an activity above or add a custom line
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 block mb-1">Notes (optional)</label>
          <textarea value={invNotes} onChange={e=>setInvNotes(e.target.value)}
            placeholder="Payment instructions, reference numbers, special terms..."
            rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"/>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button className="btn-secondary text-sm flex-1" onClick={()=>handleUpdate('draft')} disabled={saving||lines.length===0}>
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button className="btn-primary text-sm flex-1 flex items-center justify-center gap-1.5"
            onClick={()=>handleUpdate('sent')} disabled={saving||lines.length===0}>
            <Icon name="invoice" size={14}/> {saving ? 'Saving...' : 'Save & Print PDF'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── CREATE VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" style={{maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <button onClick={()=>setView('list')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1">
              <Icon name="chevron-left" size={12}/> Back to invoices
            </button>
            <h3 className="font-bold text-navy text-lg">New Invoice</h3>
            <p className="text-sm text-gray-500">{client.billing_company || client.full_name}</p>
          </div>
          <button onClick={onClose}><Icon name="x" size={18} className="text-gray-400"/></button>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Invoice Date *</label>
            <input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tax / VAT %</label>
            <input type="number" value={taxRate} min={0} max={100} step={0.5}
              onChange={e=>setTaxRate(parseFloat(e.target.value)||0)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"/>
          </div>
        </div>

        {/* Add lines from activities */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Line Items</p>
          {loadingAct ? <p className="text-sm text-gray-400">Loading activities...</p> : (
            <div className="space-y-3">
              {tours.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Tours</p>
                  <div className="flex flex-wrap gap-2">
                    {tours.map(t => (
                      <button key={t.id} onClick={()=>addLine(t,'tour')}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gold hover:text-navy font-medium transition-all">
                        {t.name} · {sym}{parseFloat(t.price||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {safaris.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Safaris</p>
                  <div className="flex flex-wrap gap-2">
                    {safaris.map(s => (
                      <button key={s.id} onClick={()=>addLine(s,'safari')}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gold hover:text-navy font-medium transition-all">
                        {s.name} · {sym}{parseFloat(s.price_per_person||0).toLocaleString('en-ZA',{minimumFractionDigits:2})} pp
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tours.length===0 && safaris.length===0 && (
                <p className="text-sm text-gray-400">No active tours or safaris. Add them first, or use custom lines.</p>
              )}
              <button onClick={()=>setLines(prev=>[...prev,{id:Date.now(),desc:'',qty:1,unit_price:0}])}
                className="text-xs text-gold font-semibold hover:underline">+ Add custom line</button>
            </div>
          )}
        </div>

        {/* Line items */}
        {lines.length > 0 && (
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase">
                  <th className="text-left pb-2 font-semibold">Description</th>
                  <th className="text-right pb-2 font-semibold w-16">Qty</th>
                  <th className="text-right pb-2 font-semibold w-28">Unit Price</th>
                  <th className="text-right pb-2 font-semibold w-28">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2">
                      <input value={l.desc} onChange={e=>updateLine(l.id,'desc',e.target.value)}
                        placeholder="Description..."
                        className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none font-medium text-navy"/>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" value={l.qty} min={1} onChange={e=>updateLine(l.id,'qty',e.target.value)}
                        className="w-14 text-right text-sm border border-gray-200 rounded px-1 py-0.5"/>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" value={l.unit_price} min={0} step={0.01} onChange={e=>updateLine(l.id,'unit_price',e.target.value)}
                        className="w-24 text-right text-sm border border-gray-200 rounded px-1 py-0.5"/>
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold text-navy">
                      {sym}{(l.qty*l.unit_price).toLocaleString('en-ZA',{minimumFractionDigits:2})}
                    </td>
                    <td className="py-2 pl-1">
                      <button onClick={()=>removeLine(l.id)} className="text-red-400 hover:text-red-600">
                        <Icon name="x" size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {taxRate > 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={3} className="pt-2 text-right text-sm text-gray-500 pr-2">Subtotal</td>
                    <td className="pt-2 text-right text-sm text-gray-600">{sym}{subtotal.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                    <td></td>
                  </tr>
                )}
                {taxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="pt-1 text-right text-sm text-gray-500 pr-2">Tax ({taxRate}%)</td>
                    <td className="pt-1 text-right text-sm text-gray-600">{sym}{tax_amount.toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                    <td></td>
                  </tr>
                )}
                <tr className="border-t-2 border-navy">
                  <td colSpan={3} className="pt-3 text-right font-black text-navy text-sm pr-2">TOTAL DUE</td>
                  <td className="pt-3 text-right font-black text-lg" style={{color:'#D4A853'}}>
                    {sym}{total.toLocaleString('en-ZA',{minimumFractionDigits:2})}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {lines.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Select an activity above or add a custom line to build the invoice
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 block mb-1">Notes (optional)</label>
          <textarea value={invNotes} onChange={e=>setInvNotes(e.target.value)}
            placeholder="Payment instructions, reference numbers, special terms..."
            rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"/>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button className="btn-secondary text-sm flex-1" onClick={()=>handleSave('draft')} disabled={saving||lines.length===0}>
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button className="btn-primary text-sm flex-1 flex items-center justify-center gap-1.5"
            onClick={()=>handleSave('sent')} disabled={saving||lines.length===0}>
            <Icon name="invoice" size={14}/> {saving ? 'Saving...' : 'Save & Print PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const { company, features, addons } = useAuth();
  const [clients,    setClients]    = React.useState([]);
  const [loading,    setLoading]    = React.useState(true);
  const [showModal,  setShowModal]  = React.useState(false);
  const [editItem,   setEditItem]   = React.useState(null);
  const [invoiceFor, setInvoiceFor] = React.useState(null);
  const [form,       setForm]       = React.useState({});
  const [saving,     setSaving]     = React.useState(false);
  const [showUpgrade,setShowUpgrade]= React.useState(false);

  async function load() {
    if (!company) return;
    const { data } = await supabase.from('guests')
      .select('*')
      .eq('company_id', company.id)
      .not('billing_company', 'is', null)
      .order('full_name');
    // Also grab all guests that are marked as clients (either have billing_company or explicit flag)
    const { data: all } = await supabase.from('guests')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    setClients(all || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [company]);

  function openCreate() {
    setEditItem(null); setForm({}); setShowModal(true);
  }
  function openEdit(item) {
    setEditItem(item);
    const f = {};
    ['full_name','email','phone','nationality','id_number','billing_company','billing_address',
     'billing_city','billing_province','billing_postcode','billing_country','vat_number','notes']
      .forEach(k => { f[k] = item[k] || ''; });
    setForm(f); setShowModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id };
    const { error } = editItem
      ? await supabase.from('guests').update(payload).eq('id', editItem.id)
      : await supabase.from('guests').insert(payload);
    if (error) toast(error.message, 'error');
    else { toast(editItem ? 'Client updated' : 'Client added'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Remove this client?')) return;
    await supabase.from('guests').delete().eq('id', id);
    toast('Removed'); load();
  }

  const fields = [
    { key:'full_name',        label:'Contact Name',    required:true,  placeholder:'John Dlamini' },
    { key:'billing_company',  label:'Company / Org',   placeholder:'Ubizane Wildlife Reserve' },
    { key:'email',            label:'Email',           type:'email',   placeholder:'accounts@client.co.za' },
    { key:'phone',            label:'Phone',           placeholder:'+27 35 562 1020' },
    { key:'vat_number',       label:'VAT Number',      placeholder:'4012345678' },
    { key:'billing_address',  label:'Address',         placeholder:'P453 Main Road' },
    { key:'billing_city',     label:'City',            placeholder:'Hluhluwe' },
    { key:'billing_province', label:'Province/Region', placeholder:'KwaZulu-Natal' },
    { key:'billing_postcode', label:'Postal Code',     placeholder:'3960' },
    { key:'billing_country',  label:'Country',         placeholder:'South Africa' },
    { key:'notes',            label:'Notes',           type:'textarea' },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length===1?'':'s'}`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Client</button>}
      />

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-700 flex items-start gap-3">
        <Icon name="invoice" size={16} className="mt-0.5 flex-shrink-0"/>
        <span>Clients are repeat-billing contacts you can invoice directly. They can also be selected when creating bookings. All guests you add here are available in the booking form.</span>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="clients" size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400 mb-1">No clients yet</p>
            <p className="text-xs text-gray-300 mb-4">Add repeat-billing clients to invoice them directly</p>
            <button className="btn-primary" onClick={openCreate}>Add First Client</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Contact</th>
                <th>VAT</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td><span className="font-semibold text-navy">{c.full_name}</span></td>
                  <td><span className="text-gray-600">{c.billing_company || '—'}</span></td>
                  <td>
                    <div className="text-gray-600 text-sm">{c.email || c.phone || '—'}</div>
                  </td>
                  <td><span className="text-gray-500 text-sm">{c.vat_number || '—'}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-gold text-gold hover:bg-amber-50 flex items-center gap-1"
                        onClick={()=>setInvoiceFor(c)}
                        title="Create Invoice">
                        <Icon name="invoice" size={12}/> Invoice
                      </button>
                      <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(c)}>
                        <Icon name="edit" size={14}/>
                      </button>
                      <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(c.id)}>
                        <Icon name="trash" size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal max-w-lg w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">{editItem ? 'Edit Client' : 'Add Client'}</h3>
              <button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {fields.map(f => (
                  <div key={f.key} className={f.type==='textarea' ? 'col-span-2' : ''}>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">
                      {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {f.type === 'textarea'
                      ? <textarea value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                          placeholder={f.placeholder} rows={2}/>
                      : <input type={f.type||'text'} value={form[f.key]||''} required={f.required}
                          onChange={e=>setForm({...form,[f.key]:e.target.value})}
                          placeholder={f.placeholder}/>
                    }
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Client'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceFor && <ClientInvoiceModal client={invoiceFor} onClose={()=>setInvoiceFor(null)}/>}

      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}


// ══════════════════════════════════════════════
//  CLIENTS MODULE
//  Standard+ included · Free/Basic = addon
// ══════════════════════════════════════════════


export function TrailsPage() {
  const { company, limits } = useAuth();
  const [items, setItems]     = useState([]);
  const [guides, setGuides]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [addonResource, setAddonResource] = useState(null);
  const limit = limits.trails;

  async function load() {
    const [tRes, gRes] = await Promise.all([
      supabase.from('trails').select('*, guides(full_name)').eq('company_id', company.id).order('created_at', {ascending:false}),
      supabase.from('guides').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
    ]);
    setItems(tRes.data||[]); setGuides(gRes.data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setAddonResource('trails'); return; }
    setEditItem(null);
    setForm({ status:'active', requires_firearm:false, guide_id:'' });
    setShowModal(true);
  }
  function openEdit(item) {
    setEditItem(item);
    setForm({
      name:item.name||'', difficulty:item.difficulty||'moderate',
      distance_km:item.distance_km||'', duration_hours:item.duration_hours||'',
      price:item.price||'', max_pax:item.max_pax||'',
      start_location:item.start_location||'', status:item.status||'active',
      guide_id:item.guide_id||'',
      requires_firearm:!!item.requires_firearm,
      firearm_notes:item.firearm_notes||'',
    });
    setShowModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id, guide_id: form.guide_id||null };
    const { error } = editItem
      ? await supabase.from('trails').update(payload).eq('id', editItem.id)
      : await supabase.from('trails').insert(payload);
    if (error) toast(error.message,'error');
    else { toast(editItem?'Updated':'Trail created'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this trail?')) return;
    await supabase.from('trails').delete().eq('id', id);
    toast('Deleted'); load();
  }

  const diffBadge = {easy:'badge-green',moderate:'badge-yellow',hard:'badge-red',extreme:'badge-purple'};

  return (
    <div>
      <PageHeader title="Trails" icon="trails"
        subtitle={limit ? `${items.length}/${limit} used` : `${items.length} total`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Trail</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm flex items-center gap-2"><Icon name="alert" size={16}/>Trail limit reached ({limit}/{limit})</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setAddonResource('trails')}>Buy Slot</button>
        </div>
      )}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length===0 ? (
          <div className="p-12 text-center"><Icon name="trails" size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400">No trails yet</p><button className="btn-primary mt-4" onClick={openCreate}>Add First Trail</button></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Difficulty</th><th>Distance</th><th>Guide</th><th>Firearm</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map(t=>(
              <tr key={t.id}>
                <td className="font-semibold text-navy">{t.name}</td>
                <td><span className={`badge ${diffBadge[t.difficulty]||'badge-gray'}`}>{t.difficulty}</span></td>
                <td className="text-gray-500">{t.distance_km ? `${t.distance_km} km` : '—'}</td>
                <td className="text-gray-500 text-sm">{t.guides?.full_name || <span className="text-gray-300">Unassigned</span>}</td>
                <td>{t.requires_firearm ? <span className="badge badge-red text-xs">Required</span> : <span className="text-gray-300 text-xs">No</span>}</td>
                <td><span className={`badge ${t.status==='active'?'badge-green':'badge-gray'}`}>{t.status}</span></td>
                <td><div className="flex items-center gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(t)}><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(t.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal max-w-lg w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">{editItem?'Edit Trail':'New Trail'}</h3>
              <button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Trail Name *</label><input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Drakensberg Summit Trail"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Difficulty</label>
                  <select value={form.difficulty||'moderate'} onChange={e=>setForm({...form,difficulty:e.target.value})}>
                    {['easy','moderate','hard','extreme'].map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Distance (km)</label><input type="number" min="0" step="0.1" value={form.distance_km||''} onChange={e=>setForm({...form,distance_km:e.target.value})} placeholder="15"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Duration (hrs)</label><input type="number" min="0" step="0.5" value={form.duration_hours||''} onChange={e=>setForm({...form,duration_hours:e.target.value})} placeholder="6"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Price (R)</label><input type="number" min="0" value={form.price||''} onChange={e=>setForm({...form,price:e.target.value})} placeholder="250"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Max Hikers</label><input type="number" min="1" value={form.max_pax||''} onChange={e=>setForm({...form,max_pax:e.target.value})} placeholder="15"/></div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Start Location</label><input value={form.start_location||''} onChange={e=>setForm({...form,start_location:e.target.value})} placeholder="Amphitheatre Trailhead"/></div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Assigned Guide</label>
                  <select value={form.guide_id||''} onChange={e=>setForm({...form,guide_id:e.target.value})}>
                    <option value="">— None —</option>
                    {guides.map(g=><option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                  {guides.length===0 && <p className="text-xs text-gray-400 mt-1">No active guides — add guides first.</p>}
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!form.requires_firearm} onChange={e=>setForm({...form,requires_firearm:e.target.checked})} className="w-4 h-4"/>
                    <span className="text-sm font-semibold text-gray-600">Firearm Required on This Trail</span>
                  </label>
                </div>
                {form.requires_firearm && (
                  <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Firearm Notes</label><input value={form.firearm_notes||''} onChange={e=>setForm({...form,firearm_notes:e.target.value})} placeholder="e.g. .375 H&H minimum, anti-poaching patrol"/></div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Save Trail'}</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );
}


export function VehiclesPage() {
  const { company, limits } = useAuth();
  const [items,  setItems]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [view,   setView]   = useState('list');
  const [editItem,setEditItem]= useState(null);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [addonResource, setAddonResource] = useState(null); // null = closed
  const limit = limits.vehicles;

  async function load() {
    const { data } = await supabase.from('vehicles').select('*').eq('company_id', company.id).order('created_at',{ascending:false});
    setItems(data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setAddonResource('vehicles'); return; }
    setEditItem(null); setForm({ status:'available' }); setView('form');
  }
  function openEdit(item) {
    setEditItem(item);
    const f = {};
    ['registration','make','model','year','capacity','vehicle_type','status',
     'odometer_km','last_service_date','next_service_date','insurance_expiry','roadworthy_expiry',
     'licence_disc_url','roadworthy_doc_url','insurance_doc_url','concession_doc_url','doc_urls','notes'
    ].forEach(k => { f[k] = item[k] ?? ''; });
    setForm(f); setView('form');
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id, doc_urls: form.doc_urls || [] };
    const { error } = editItem
      ? await supabase.from('vehicles').update(payload).eq('id', editItem.id)
      : await supabase.from('vehicles').insert(payload);
    if (error) toast(error.message,'error');
    else { toast(editItem?'Vehicle updated':'Vehicle added'); setView('list'); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this vehicle?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    toast('Deleted'); load();
  }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const statusBadge = { available:'badge-green','in-use':'badge-blue', maintenance:'badge-yellow' };

  if (view === 'form') return (
    <div>
      <PageHeader
        title={editItem ? `Edit — ${editItem.registration}` : 'New Vehicle'}
        subtitle="Details, service records & documents"
        action={<button className="btn-secondary" onClick={()=>setView('list')}>← Back</button>}
      />
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Vehicle Info ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Vehicle Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Registration *</label><input required value={form.registration||''} onChange={e=>setF('registration',e.target.value)} placeholder="ZN 123 456" className="uppercase"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Make</label><input value={form.make||''} onChange={e=>setF('make',e.target.value)} placeholder="Toyota"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Model</label><input value={form.model||''} onChange={e=>setF('model',e.target.value)} placeholder="Land Cruiser"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Year</label><input type="number" value={form.year||''} onChange={e=>setF('year',e.target.value)} placeholder="2022"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Capacity</label><input type="number" value={form.capacity||''} onChange={e=>setF('capacity',e.target.value)} placeholder="10"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Type</label>
                  <select value={form.vehicle_type||''} onChange={e=>setF('vehicle_type',e.target.value)}>
                    <option value="">— Select —</option>
                    {['4x4','van','bus','boat','yacht','other'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'available'} onChange={e=>setF('status',e.target.value)}>
                    {['available','in-use','maintenance'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><textarea rows={2} value={form.notes||''} onChange={e=>setF('notes',e.target.value)}/></div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Service & Compliance Tracking</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Odometer (km)</label><input type="number" value={form.odometer_km||''} onChange={e=>setF('odometer_km',e.target.value)} placeholder="85000"/></div>
                <div/>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Last Service Date</label><input type="date" value={form.last_service_date||''} onChange={e=>setF('last_service_date',e.target.value)}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Next Service Date</label><input type="date" value={form.next_service_date||''} onChange={e=>setF('next_service_date',e.target.value)}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Insurance Expiry</label><input type="date" value={form.insurance_expiry||''} onChange={e=>setF('insurance_expiry',e.target.value)}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Roadworthy Expiry</label><input type="date" value={form.roadworthy_expiry||''} onChange={e=>setF('roadworthy_expiry',e.target.value)}/></div>
              </div>
            </div>
          </div>

          {/* ── Right: Documents ── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Documents</h3>
              <p className="text-xs text-gray-400 mb-3">PDF or image, max 10MB</p>
              {editItem ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">Licence Disc</p>
                    <FileUploadBtn label="Upload" accept="image/*,.pdf" bucket="company-assets"
                      path={`vehicles/${editItem.id}/licence-disc`}
                      currentUrl={form.licence_disc_url}
                      onUploaded={url=>setF('licence_disc_url',url)}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">Roadworthy Certificate</p>
                    <FileUploadBtn label="Upload" accept="image/*,.pdf" bucket="company-assets"
                      path={`vehicles/${editItem.id}/roadworthy`}
                      currentUrl={form.roadworthy_doc_url}
                      onUploaded={url=>setF('roadworthy_doc_url',url)}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">Insurance Certificate</p>
                    <FileUploadBtn label="Upload" accept="image/*,.pdf" bucket="company-assets"
                      path={`vehicles/${editItem.id}/insurance`}
                      currentUrl={form.insurance_doc_url}
                      onUploaded={url=>setF('insurance_doc_url',url)}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">Operating Concession / Permit</p>
                    <FileUploadBtn label="Upload" accept="image/*,.pdf" bucket="company-assets"
                      path={`vehicles/${editItem.id}/concession`}
                      currentUrl={form.concession_doc_url}
                      onUploaded={url=>setF('concession_doc_url',url)}
                    />
                  </div>
                  {/* Extra documents (any) */}
                  {(Array.isArray(form.doc_urls)?form.doc_urls:[]).map((doc,i)=>(
                    <div key={i}>
                      <p className="text-xs font-bold text-gray-600 mb-1">{doc.label}</p>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View</a>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400">Save vehicle first to upload documents</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="submit" className="btn-primary px-8" disabled={saving}>{saving?'Saving...':'Save Vehicle'}</button>
          <button type="button" className="btn-secondary" onClick={()=>setView('list')}>Cancel</button>
        </div>
      </form>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );

  // ── List view ──
  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={limit ? `${items.length}/${limit} used` : `${items.length} total`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Vehicle</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm">Vehicle limit reached ({limit}/{limit})</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setAddonResource('vehicles')}>Buy Slot</button>
        </div>
      )}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="vehicles" size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400">No vehicles yet</p>
            <button className="btn-primary mt-4" onClick={openCreate}>Add First Vehicle</button>
          </div>
        ) : (
          <table>
            <thead><tr><th>Registration</th><th>Make / Model</th><th>Type</th><th>Capacity</th><th>Next Service</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map(v=>(
              <tr key={v.id}>
                <td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{v.registration}</code></td>
                <td>
                  <div className="font-medium text-navy">{v.make} {v.model}</div>
                  <div className="text-xs text-gray-400">{v.year||''}</div>
                </td>
                <td className="capitalize text-gray-500">{v.vehicle_type||'—'}</td>
                <td className="text-gray-500">{v.capacity ? `${v.capacity} pax` : '—'}</td>
                <td className="text-gray-500 text-sm">
                  {v.next_service_date
                    ? (() => {
                        const days = Math.ceil((new Date(v.next_service_date)-new Date())/(1000*60*60*24));
                        return <span className={days<=14?'text-red-500 font-semibold':days<=30?'text-amber-500':''}>{new Date(v.next_service_date).toLocaleDateString('en-ZA')}</span>;
                      })()
                    : '—'}
                </td>
                <td><span className={`badge ${statusBadge[v.status]||'badge-gray'}`}>{v.status}</span></td>
                <td><div className="flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(v)}><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(v.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );
}


export function FileUploadBtn({ label, accept, bucket, path, currentUrl, onUploaded, small }) {
  const [uploading, setUploading] = useState(false);
  async function handleChange(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10*1024*1024) { toast('File must be under 10MB','error'); return; }
    setUploading(true);
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert:true });
    if (error) { toast(error.message,'error'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded(publicUrl);
    setUploading(false);
  }
  const base = small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentUrl && (
        <a href={currentUrl} target="_blank" rel="noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1">
          <Icon name="eye" size={12}/> View
        </a>
      )}
      <label className={`btn-secondary cursor-pointer ${base}`}>
        {uploading ? 'Uploading…' : (currentUrl ? 'Replace' : label)}
        <input type="file" accept={accept||'image/*,.pdf'} className="hidden" onChange={handleChange} disabled={uploading}/>
      </label>
    </div>
  );
}

// ─── SHARED: CERT ROW ────────────────────
// Renders a checkbox + optional level text + expiry date for one certification
export function CertRow({ label, checked, onToggle, level, onLevel, levelPlaceholder, expiry, onExpiry, showLevel }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 mb-2">
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input type="checkbox" checked={!!checked} onChange={e=>onToggle(e.target.checked)} className="w-4 h-4 accent-yellow-500"/>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </label>
      {checked && (
        <div className="pl-6 grid grid-cols-2 gap-2">
          {showLevel && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-0.5">Level / Grade</label>
              <input value={level||''} onChange={e=>onLevel(e.target.value)} placeholder={levelPlaceholder||'e.g. Level 2'} className="text-sm"/>
            </div>
          )}
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-gray-500 block mb-0.5">Expiry Date</label>
            <input type="date" value={expiry||''} onChange={e=>onExpiry(e.target.value)}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GUIDE FORM PAGE ─────────────────────
export function GuidesPage() {
  const { company, limits, companyRegion } = useAuth();
  const [items,  setItems]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [view,   setView]   = useState('list'); // 'list' | 'form'
  const [editItem,setEditItem]= useState(null);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [addonResource, setAddonResource] = useState(null); // null = closed
  const limit = limits.guides;

  async function load() {
    const { data } = await supabase.from('guides').select('*').eq('company_id', company.id).order('created_at',{ascending:false});
    setItems(data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setAddonResource('guides'); return; }
    setEditItem(null);
    setForm({ status:'active', cert_fgasa:false, cert_first_aid:false, cert_firearms:false, cert_pdp:false });
    setView('form');
  }
  function openEdit(item) {
    setEditItem(item);
    const f = {};
    ['full_name','phone','email','specialisation','languages','license_number','status',
     'cert_fgasa','cert_fgasa_level','cert_fgasa_expiry','cert_issuer',
     'cert_first_aid','cert_first_aid_level','cert_first_aid_expiry',
     'cert_firearms','cert_firearms_expiry',
     'cert_pdp','cert_pdp_expiry',
     'cert_marine','cert_marine_expiry',
     'cert_sks','cert_sks_expiry',
     'cert_ph','cert_ph_expiry',
     'cert_track_sign','cert_track_sign_expiry',
     'emergency_contact','id_photo_url','photo_url','cert_doc_urls','notes'
    ].forEach(k => { f[k] = item[k] ?? (k.startsWith('cert_') && typeof item[k] === 'undefined' ? false : ''); });
    setForm(f); setView('form');
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id,
      cert_doc_urls: form.cert_doc_urls || [] };
    const { error } = editItem
      ? await supabase.from('guides').update(payload).eq('id', editItem.id)
      : await supabase.from('guides').insert(payload);
    if (error) toast(error.message,'error');
    else { toast(editItem?'Guide updated':'Guide added'); setView('list'); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this guide?')) return;
    await supabase.from('guides').delete().eq('id', id);
    toast('Deleted'); load();
  }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const docPath = (type) => `guides/${editItem?.id||'new-guide'}/${type}-${Date.now()}`;

  if (view === 'form') return (
    <div>
      <PageHeader
        title={editItem ? 'Edit Guide' : 'New Guide'}
        subtitle="Profile & Certifications"
        action={<button className="btn-secondary" onClick={()=>setView('list')}>← Back</button>}
      />
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Basic Info + Photo ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Full Name *</label>
                  <input required value={form.full_name||''} onChange={e=>setF('full_name',e.target.value)} placeholder="Sipho Ndlovu"/>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Phone</label><input value={form.phone||''} onChange={e=>setF('phone',e.target.value)} placeholder="+27 82 000 0000"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={form.email||''} onChange={e=>setF('email',e.target.value)} placeholder="guide@email.com"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Specialisation</label><input value={form.specialisation||''} onChange={e=>setF('specialisation',e.target.value)} placeholder="Big 5, Birding, Cultural"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Languages</label><input value={form.languages||''} onChange={e=>setF('languages',e.target.value)} placeholder="Zulu, English"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">License No.</label><input value={form.license_number||''} onChange={e=>setF('license_number',e.target.value)} placeholder="FGASA Level 1"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'active'} onChange={e=>setF('status',e.target.value)}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Emergency Contact</label><input value={form.emergency_contact||''} onChange={e=>setF('emergency_contact',e.target.value)} placeholder="Name — +27 82 000 0000"/></div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><textarea rows={2} value={form.notes||''} onChange={e=>setF('notes',e.target.value)}/></div>
              </div>
            </div>

            {/* ── Certifications — region-aware ── */}
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Certifications & Qualifications</h3>
              {(() => {
                const rgn = REGION_CERTS[companyRegion] || REGION_CERTS['south_africa'];
                const quals = (() => { try { return JSON.parse(form.qualifications||'{}'); } catch(e){ return {}; } })();
                const setQual = (key, patch) => {
                  const q = (() => { try { return JSON.parse(form.qualifications||'{}'); } catch(e){ return {}; } })();
                  const updated = { ...q, [key]: { ...(q[key]||{}), ...patch } };
                  setF('qualifications', JSON.stringify(updated));
                };
                const nodes = [];
                rgn.guide.forEach((cert, idx) => {
                  if (idx === 4 && rgn.guide.length > 4) {
                    nodes.push(
                      <div key="divider" className="border-t border-gray-100 pt-2 mt-1 mb-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Additional Qualifications</p>
                      </div>
                    );
                  }
                  if (cert.col) {
                    const levelKey = cert.key + '_level';
                    const expiryKey = cert.key + '_expiry';
                    nodes.push(
                      <div key={cert.key}>
                        <CertRow
                          label={cert.label}
                          checked={form[cert.key]} onToggle={v=>setF(cert.key,v)}
                          level={cert.hasLevel ? form[levelKey] : undefined}
                          onLevel={cert.hasLevel ? v=>setF(levelKey,v) : undefined}
                          levelPlaceholder={cert.levelHint||''}
                          showLevel={!!cert.hasLevel}
                          expiry={form[expiryKey]} onExpiry={v=>setF(expiryKey,v)}
                        />
                        {cert.issuers && form[cert.key] && (
                          <div className="pl-6 mb-2">
                            <label className="text-xs text-gray-500 block mb-0.5">Issuing Body</label>
                            <select value={form.cert_issuer||''} onChange={e=>setF('cert_issuer',e.target.value)} className="text-sm">
                              <option value="">— Select —</option>
                              {cert.issuers.map(is=><option key={is} value={is}>{is}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const q = quals[cert.key] || {};
                    const active = !!q.active;
                    nodes.push(
                      <div key={cert.key}>
                        <CertRow
                          label={cert.label}
                          checked={active} onToggle={v=>setQual(cert.key,{active:v})}
                          level={cert.hasLevel ? q.level : undefined}
                          onLevel={cert.hasLevel ? v=>setQual(cert.key,{active,level:v}) : undefined}
                          levelPlaceholder={cert.levelHint||''}
                          showLevel={!!cert.hasLevel}
                          expiry={q.expiry} onExpiry={v=>setQual(cert.key,{active,expiry:v})}
                        />
                        {cert.issuers && active && (
                          <div className="pl-6 mb-2">
                            <label className="text-xs text-gray-500 block mb-0.5">Issuing Body</label>
                            <select value={q.issuer||''} onChange={e=>setQual(cert.key,{active,issuer:e.target.value})} className="text-sm">
                              <option value="">— Select —</option>
                              {cert.issuers.map(is=><option key={is} value={is}>{is}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  }
                });
                return nodes;
              })()}
            </div>
          </div>

          {/* ── Right: Documents ── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">ID & Photo</h3>
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden mb-3 mx-auto">
                {(form.id_photo_url||form.photo_url)
                  ? <img src={form.id_photo_url||form.photo_url} alt="ID" className="w-full h-full object-cover"/>
                  : <Icon name="guides" size={32} className="text-gray-200"/>}
              </div>
              <p className="text-xs text-gray-400 text-center mb-2">ID Photo (JPG/PNG, max 10MB)</p>
              {editItem && (
                <FileUploadBtn
                  label="Upload ID Photo"
                  accept="image/*"
                  bucket="staff-docs"
                  path={`guides/${editItem.id}/id-photo.jpg`}
                  currentUrl={form.id_photo_url}
                  onUploaded={url=>setF('id_photo_url',url)}
                />
              )}
              {!editItem && <p className="text-xs text-gray-400 text-center">Save guide first, then upload photo</p>}
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Documents</h3>
              <p className="text-xs text-gray-400 mb-3">PDF or image, max 10MB each</p>
              {editItem ? (
                <div className="space-y-3">
                  {[
                    {label:'FGASA Certificate', key:'cert_fgasa_doc', path:`guides/${editItem.id}/fgasa-cert`},
                    {label:'First Aid Certificate', key:'cert_firstaid_doc', path:`guides/${editItem.id}/firstaid-cert`},
                    {label:'Firearms Cert', key:'cert_firearms_doc', path:`guides/${editItem.id}/firearms-cert`},
                    {label:'PDP / Driving Licence', key:'cert_pdp_doc', path:`guides/${editItem.id}/pdp`},
                    {label:'Other Document', key:'cert_other_doc', path:`guides/${editItem.id}/other-${Date.now()}`},
                  ].map(doc => {
                    const urls = Array.isArray(form.cert_doc_urls) ? form.cert_doc_urls : [];
                    const existing = urls.find(u => u.label === doc.label);
                    return (
                      <div key={doc.key}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">{doc.label}</p>
                        <FileUploadBtn
                          label="Upload"
                          accept="image/*,.pdf"
                          bucket="staff-docs"
                          path={doc.path}
                          currentUrl={existing?.url}
                          onUploaded={url => {
                            const newUrls = urls.filter(u => u.label !== doc.label);
                            setF('cert_doc_urls', [...newUrls, { label: doc.label, url }]);
                          }}
                          small
                        />
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-gray-400">Save guide first to upload documents</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="submit" className="btn-primary px-8" disabled={saving}>{saving?'Saving...':'Save Guide'}</button>
          <button type="button" className="btn-secondary" onClick={()=>setView('list')}>Cancel</button>
        </div>
      </form>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );

  // ── List view ──
  return (
    <div>
      <PageHeader
        title="Guides"
        subtitle={limit ? `${items.length}/${limit} used` : `${items.length} total`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Guide</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm">Guide limit reached ({limit}/{limit})</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setAddonResource('guides')}>Buy Slot</button>
        </div>
      )}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="guides" size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400">No guides yet</p>
            <button className="btn-primary mt-4" onClick={openCreate}>Add First Guide</button>
          </div>
        ) : (
          <table>
            <thead><tr><th>Photo</th><th>Name</th><th>Specialisation</th><th>Certs</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map(g => (
              <tr key={g.id}>
                <td>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {g.id_photo_url||g.photo_url
                      ? <img src={g.id_photo_url||g.photo_url} alt="" className="w-full h-full object-cover"/>
                      : <Icon name="guides" size={16} className="text-gray-300"/>}
                  </div>
                </td>
                <td>
                  <div className="font-semibold text-navy">{g.full_name}</div>
                  <div className="text-xs text-gray-400">{g.phone}</div>
                </td>
                <td className="text-gray-500 text-sm">{g.specialisation||'—'}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {g.cert_fgasa     && <span className="badge badge-green text-xs">FGASA</span>}
                    {g.cert_first_aid && <span className="badge badge-blue text-xs">First Aid</span>}
                    {g.cert_firearms  && <span className="badge badge-red text-xs">Firearms</span>}
                    {g.cert_pdp       && <span className="badge badge-purple text-xs">PDP</span>}
                    {g.cert_marine    && <span className="badge badge-blue text-xs">Marine</span>}
                    {g.cert_sks       && <span className="badge badge-red text-xs">SKS</span>}
                    {g.cert_ph        && <span className="badge badge-yellow text-xs">PH</span>}
                    {g.cert_track_sign && <span className="badge badge-gray text-xs">Track&Sign</span>}
                    {!g.cert_fgasa && !g.cert_first_aid && !g.cert_firearms && !g.cert_pdp && !g.cert_marine && !g.cert_sks && !g.cert_ph && !g.cert_track_sign && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
                <td><span className={`badge ${g.status==='active'?'badge-green':'badge-gray'}`}>{g.status}</span></td>
                <td><div className="flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(g)} title="Edit"><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(g.id)} title="Delete"><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );
}

// ─── DRIVER FORM PAGE ────────────────────
export function DriversPage() {
  const { company, limits, companyRegion } = useAuth();
  const [items,  setItems]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [view,   setView]   = useState('list');
  const [editItem,setEditItem]= useState(null);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [addonResource, setAddonResource] = useState(null); // null = closed
  const limit = limits.drivers;

  async function load() {
    const { data } = await supabase.from('drivers').select('*').eq('company_id', company.id).order('created_at',{ascending:false});
    setItems(data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setAddonResource('drivers'); return; }
    setEditItem(null);
    setForm({ status:'available', cert_fgasa:false, cert_first_aid:false, cert_firearms:false });
    setView('form');
  }
  function openEdit(item) {
    setEditItem(item);
    const f = {};
    ['full_name','phone','license_number','license_code','license_expiry','status',
     'cert_fgasa','cert_fgasa_level','cert_fgasa_expiry',
     'cert_first_aid','cert_first_aid_level','cert_first_aid_expiry',
     'cert_firearms','cert_firearms_expiry',
     'cert_pdp','cert_pdp_expiry',
     'qualifications','emergency_contact','id_photo_url','photo_url','cert_doc_urls','notes'
    ].forEach(k => { f[k] = item[k] ?? (k.startsWith('cert_') && typeof item[k] === 'undefined' ? false : ''); });
    setForm(f); setView('form');
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id,
      cert_doc_urls: form.cert_doc_urls || [] };
    const { error } = editItem
      ? await supabase.from('drivers').update(payload).eq('id', editItem.id)
      : await supabase.from('drivers').insert(payload);
    if (error) toast(error.message,'error');
    else { toast(editItem?'Driver updated':'Driver added'); setView('list'); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this driver?')) return;
    await supabase.from('drivers').delete().eq('id', id);
    toast('Deleted'); load();
  }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  if (view === 'form') return (
    <div>
      <PageHeader
        title={editItem ? 'Edit Driver' : 'New Driver'}
        subtitle="Profile & Documents"
        action={<button className="btn-secondary" onClick={()=>setView('list')}>← Back</button>}
      />
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Basic Info ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Full Name *</label><input required value={form.full_name||''} onChange={e=>setF('full_name',e.target.value)} placeholder="Thabo Zulu"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Phone</label><input value={form.phone||''} onChange={e=>setF('phone',e.target.value)} placeholder="+27 82 000 0000"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'available'} onChange={e=>setF('status',e.target.value)}>
                    <option value="available">Available</option>
                    <option value="on-duty">On Duty</option>
                    <option value="off-duty">Off Duty</option>
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Licence No.</label><input value={form.license_number||''} onChange={e=>setF('license_number',e.target.value)} placeholder="PDP 1234567"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Licence Code</label>
                  <select value={form.license_code||''} onChange={e=>setF('license_code',e.target.value)}>
                    <option value="">— Select —</option>
                    {(REGION_CERTS[companyRegion]||REGION_CERTS['south_africa']).driverLicenceCodes.map(([val,lbl])=>(
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Licence Expiry</label><input type="date" value={form.license_expiry||''} onChange={e=>setF('license_expiry',e.target.value)}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Emergency Contact</label><input value={form.emergency_contact||''} onChange={e=>setF('emergency_contact',e.target.value)} placeholder="Name — +27 82 000 0000"/></div>
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><textarea rows={2} value={form.notes||''} onChange={e=>setF('notes',e.target.value)}/></div>
              </div>
            </div>

            {/* ── Certifications — region-aware ── */}
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Certifications</h3>
              {(() => {
                const rgn = REGION_CERTS[companyRegion] || REGION_CERTS['south_africa'];
                const quals = (() => { try { return JSON.parse(form.qualifications||'{}'); } catch(e){ return {}; } })();
                const setQual = (key, patch) => {
                  const q = (() => { try { return JSON.parse(form.qualifications||'{}'); } catch(e){ return {}; } })();
                  const updated = { ...q, [key]: { ...(q[key]||{}), ...patch } };
                  setF('qualifications', JSON.stringify(updated));
                };
                return rgn.driver.map(cert => {
                  if (cert.col) {
                    const levelKey = cert.key + '_level';
                    const expiryKey = cert.key + '_expiry';
                    return (
                      <div key={cert.key}>
                        <CertRow
                          label={cert.label}
                          checked={form[cert.key]} onToggle={v=>setF(cert.key,v)}
                          level={cert.hasLevel ? form[levelKey] : undefined}
                          onLevel={cert.hasLevel ? v=>setF(levelKey,v) : undefined}
                          levelPlaceholder={cert.levelHint||''}
                          showLevel={!!cert.hasLevel}
                          expiry={form[expiryKey]} onExpiry={v=>setF(expiryKey,v)}
                        />
                        {cert.issuers && form[cert.key] && (
                          <div className="pl-6 mb-2">
                            <label className="text-xs text-gray-500 block mb-0.5">Issuing Body</label>
                            <select value={form.cert_issuer||''} onChange={e=>setF('cert_issuer',e.target.value)} className="text-sm">
                              <option value="">— Select —</option>
                              {cert.issuers.map(is=><option key={is} value={is}>{is}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const q = quals[cert.key] || {};
                    const active = !!q.active;
                    return (
                      <CertRow
                        key={cert.key}
                        label={cert.label}
                        checked={active} onToggle={v=>setQual(cert.key,{active:v})}
                        expiry={q.expiry} onExpiry={v=>setQual(cert.key,{active,expiry:v})}
                      />
                    );
                  }
                });
              })()}
            </div>
          </div>

          {/* ── Right: Documents ── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">ID Photo</h3>
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden mb-3 mx-auto">
                {(form.id_photo_url||form.photo_url)
                  ? <img src={form.id_photo_url||form.photo_url} alt="ID" className="w-full h-full object-cover"/>
                  : <Icon name="drivers" size={32} className="text-gray-200"/>}
              </div>
              {editItem ? (
                <FileUploadBtn label="Upload ID Photo" accept="image/*" bucket="staff-docs"
                  path={`drivers/${editItem.id}/id-photo.jpg`}
                  currentUrl={form.id_photo_url}
                  onUploaded={url=>setF('id_photo_url',url)}
                />
              ) : <p className="text-xs text-gray-400 text-center">Save driver first, then upload photo</p>}
            </div>

            <div className="card p-5">
              <h3 className="font-bold text-navy mb-4">Documents</h3>
              <p className="text-xs text-gray-400 mb-3">PDF or image, max 10MB</p>
              {editItem ? (
                <div className="space-y-3">
                  {[
                    {label:'Driving Licence', path:`drivers/${editItem.id}/licence`},
                    {label:'PDP Certificate', path:`drivers/${editItem.id}/pdp`},
                    {label:'First Aid Certificate', path:`drivers/${editItem.id}/firstaid`},
                    {label:'Firearms Certificate', path:`drivers/${editItem.id}/firearms`},
                    {label:'Other Document', path:`drivers/${editItem.id}/other-${Date.now()}`},
                  ].map(doc => {
                    const urls = Array.isArray(form.cert_doc_urls) ? form.cert_doc_urls : [];
                    const existing = urls.find(u => u.label === doc.label);
                    return (
                      <div key={doc.label}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">{doc.label}</p>
                        <FileUploadBtn label="Upload" accept="image/*,.pdf" bucket="staff-docs"
                          path={doc.path} currentUrl={existing?.url} small
                          onUploaded={url => {
                            const newUrls = urls.filter(u => u.label !== doc.label);
                            setF('cert_doc_urls', [...newUrls, { label: doc.label, url }]);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-gray-400">Save driver first to upload documents</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="submit" className="btn-primary px-8" disabled={saving}>{saving?'Saving...':'Save Driver'}</button>
          <button type="button" className="btn-secondary" onClick={()=>setView('list')}>Cancel</button>
        </div>
      </form>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );

  // ── List view ──
  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={limit ? `${items.length}/${limit} used` : `${items.length} total`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Driver</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm">Driver limit reached</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setAddonResource('drivers')}>Buy Slot</button>
        </div>
      )}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="drivers" size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-gray-400">No drivers yet</p>
            <button className="btn-primary mt-4" onClick={openCreate}>Add First Driver</button>
          </div>
        ) : (
          <table>
            <thead><tr><th>Photo</th><th>Name</th><th>Code / Licence</th><th>Certs</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map(d => (
              <tr key={d.id}>
                <td>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {d.id_photo_url||d.photo_url
                      ? <img src={d.id_photo_url||d.photo_url} alt="" className="w-full h-full object-cover"/>
                      : <Icon name="drivers" size={16} className="text-gray-300"/>}
                  </div>
                </td>
                <td>
                  <div className="font-semibold text-navy">{d.full_name}</div>
                  <div className="text-xs text-gray-400">{d.phone}</div>
                </td>
                <td className="text-gray-500 text-sm">
                  <div>{d.license_code && <span className="font-semibold text-navy text-xs">{d.license_code}</span>}{d.license_code && d.license_number ? ' · ' : ''}{d.license_number||(!d.license_code?'—':'')}</div>
                  {d.cert_pdp && <span className="text-xs text-purple-500">PDP</span>}
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {d.cert_pdp       && <span className="badge badge-blue text-xs">PDP</span>}
                    {d.cert_first_aid && <span className="badge badge-green text-xs">First Aid</span>}
                    {d.cert_firearms  && <span className="badge badge-red text-xs">Firearms</span>}
                    {d.cert_fgasa     && <span className="badge badge-purple text-xs">FGASA</span>}
                    {!d.cert_pdp && !d.cert_first_aid && !d.cert_firearms && !d.cert_fgasa && <span className="text-gray-300 text-xs">—</span>}
                  </div>
                </td>
                <td><span className={`badge ${d.status==='available'?'badge-green':d.status==='on-duty'?'badge-blue':'badge-gray'}`}>{d.status}</span></td>
                <td><div className="flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(d)}><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(d.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {addonResource && <AddOnPurchaseModal resource={addonResource} onClose={()=>setAddonResource(null)}/>}
    </div>
  );
}


export function SchedulesPage() {
  const { company, limits } = useAuth();
  const [items,   setItems]   = useState([]);
  const [guides,  setGuides]  = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [showUpgrade,setShowUpgrade]= useState(false);
  const limit = limits.schedules;

  async function load() {
    const [sRes, gRes, dRes] = await Promise.all([
      supabase.from('schedules').select('*, guides(full_name), drivers(full_name)').eq('company_id', company.id).order('day_of_week').order('start_time'),
      supabase.from('guides').select('id,full_name').eq('company_id', company.id).eq('status','active').order('full_name'),
      supabase.from('drivers').select('id,full_name').eq('company_id', company.id).neq('status','off-duty').order('full_name'),
    ]);
    setItems(sRes.data||[]); setGuides(gRes.data||[]); setDrivers(dRes.data||[]); setLoading(false);
  }
  useEffect(() => { if (company) load(); }, [company]);

  function openCreate() {
    if (limit !== null && items.length >= limit) { setShowUpgrade(true); return; }
    setEditItem(null);
    setForm({ status:'active', activity_type:'safari', guide_id:'', driver_id:'' });
    setShowModal(true);
  }
  function openEdit(item) {
    setEditItem(item);
    setForm({
      title:item.title||'', activity_type:item.activity_type||'safari',
      day_of_week:item.day_of_week||'Monday',
      start_time:item.start_time||'', end_time:item.end_time||'',
      capacity:item.capacity||'', price:item.price||'',
      guide_id:item.guide_id||'', driver_id:item.driver_id||'',
      notes:item.notes||'', status:item.status||'active',
    });
    setShowModal(true);
  }
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, company_id: company.id,
      guide_id:  form.guide_id  || null,
      driver_id: form.driver_id || null,
    };
    const { error } = editItem
      ? await supabase.from('schedules').update(payload).eq('id', editItem.id)
      : await supabase.from('schedules').insert(payload);
    if (error) toast(error.message,'error');
    else { toast(editItem?'Updated':'Schedule created'); setShowModal(false); load(); }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!confirm('Delete this schedule?')) return;
    await supabase.from('schedules').delete().eq('id', id);
    toast('Deleted'); load();
  }

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <div>
      <PageHeader title="Schedules" subtitle={limit ? `${items.length}/${limit} shifts` : `${items.length} shifts`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Icon name="plus" size={16}/>Add Shift</button>}
      />
      {limit !== null && items.length >= limit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="text-amber-700 text-sm">Limit reached</span>
          <button className="btn-primary text-xs py-1.5" onClick={()=>setShowUpgrade(true)}>Upgrade</button>
        </div>
      )}

      {/* Weekly grid view */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-6">
        {DAYS.map(day => {
          const dayItems = items.filter(i => i.day_of_week === day);
          return (
            <div key={day} className="card p-3">
              <div className="text-xs font-bold text-navy mb-2 border-b border-gray-100 pb-1">{day.slice(0,3)}</div>
              {dayItems.length === 0
                ? <div className="text-xs text-gray-300 text-center py-2">—</div>
                : dayItems.map(item => (
                  <div key={item.id} onClick={()=>openEdit(item)}
                    className="mb-1.5 p-1.5 rounded cursor-pointer hover:bg-amber-50 border border-gray-100"
                    title="Click to edit">
                    <div className="text-xs font-semibold text-navy truncate">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.start_time?.slice(0,5)}–{item.end_time?.slice(0,5)}</div>
                    {item.guides  && <div className="text-xs text-blue-500 truncate">👤 {item.guides.full_name}</div>}
                    {item.drivers && <div className="text-xs text-green-600 truncate">🚗 {item.drivers.full_name}</div>}
                  </div>
                ))
              }
              <button onClick={openCreate} className="w-full text-center text-xs text-gray-300 hover:text-amber-500 mt-1">+ add</button>
            </div>
          );
        })}
      </div>

      {/* Full list below */}
      <div className="card">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : items.length===0 ? (
          <div className="p-12 text-center"><Icon name="schedules" size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400">No shifts scheduled — click a day above or Add Shift to start</p></div>
        ) : (
          <table>
            <thead><tr><th>Title</th><th>Day</th><th>Time</th><th>Activity</th><th>Guide</th><th>Driver</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map(item=>(
              <tr key={item.id}>
                <td className="font-medium text-navy">{item.title}</td>
                <td className="text-gray-500">{item.day_of_week}</td>
                <td className="text-gray-500 text-sm">{item.start_time?.slice(0,5)} – {item.end_time?.slice(0,5)}</td>
                <td className="capitalize text-gray-500">{item.activity_type}</td>
                <td className="text-gray-500 text-sm">{item.guides?.full_name || '—'}</td>
                <td className="text-gray-500 text-sm">{item.drivers?.full_name || '—'}</td>
                <td><span className={`badge ${item.status==='active'?'badge-green':'badge-gray'}`}>{item.status}</span></td>
                <td><div className="flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700" onClick={()=>openEdit(item)}><Icon name="edit" size={14}/></button>
                  <button className="text-red-400 hover:text-red-600" onClick={()=>handleDelete(item.id)}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal max-w-lg w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-navy text-lg">{editItem?'Edit Shift':'New Shift'}</h3>
              <button onClick={()=>setShowModal(false)}><Icon name="x" size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Shift Title *</label><input required value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Morning Safari Departure"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Activity</label>
                  <select value={form.activity_type||'safari'} onChange={e=>setForm({...form,activity_type:e.target.value})}>
                    {['safari','tour','shuttle','charter','trail'].map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Day of Week</label>
                  <select value={form.day_of_week||'Monday'} onChange={e=>setForm({...form,day_of_week:e.target.value})}>
                    {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Start Time</label><input type="time" value={form.start_time||''} onChange={e=>setForm({...form,start_time:e.target.value})}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">End Time</label><input type="time" value={form.end_time||''} onChange={e=>setForm({...form,end_time:e.target.value})}/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Capacity</label><input type="number" min="1" value={form.capacity||''} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="8"/></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Price (R)</label><input type="number" min="0" value={form.price||''} onChange={e=>setForm({...form,price:e.target.value})} placeholder="1500"/></div>

                <div className="col-span-2 border-t border-gray-100 pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assign Staff</p>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Guide</label>
                  <select value={form.guide_id||''} onChange={e=>setForm({...form,guide_id:e.target.value})}>
                    <option value="">— None —</option>
                    {guides.map(g=><option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Driver</label>
                  <select value={form.driver_id||''} onChange={e=>setForm({...form,driver_id:e.target.value})}>
                    <option value="">— None —</option>
                    {drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Status</label>
                  <select value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Notes</label><input value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any special instructions"/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving?'Saving...':'Save Shift'}</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showUpgrade && <AddOnPurchaseModal resource='schedules' onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}

// Re-exports for pages
export { BillingPage } from './BillingPage.jsx';
export { default as DashboardPage } from './DashboardPage.jsx';
export { default as BookingsPage } from './BookingsPage.jsx';
export { default as CalendarPage } from './CalendarPage.jsx';
export { default as SettingsPage } from './SettingsPage.jsx';
export { default as UsersPage } from './UsersPage.jsx';
export { default as FirearmRegisterPage } from './FirearmRegisterPage.jsx';
export { default as MarketingPageEditor } from './MarketingPageEditor.jsx';

// Placeholder pages
export function ToursPage() { return <CrudPage title="Tours" icon="tours" table="tours" resourceKey="tours" fields={[
  { key:'name', label:'Tour Name', required:true, primary:true, placeholder:'Zululand Cultural Tour' },
  { key:'duration_hours', label:'Duration (hrs)', type:'number', placeholder:'6' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'750' },
  { key:'max_pax', label:'Max Guests', type:'number', placeholder:'12' },
  { key:'meeting_point', label:'Meeting Point', placeholder:'Durban Beach Front' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>; }
export function SafarisPage() { return <CrudPage title="Safaris" icon="safaris" table="safaris" resourceKey="safaris" fields={[
  { key:'name', label:'Safari Name', required:true, primary:true, placeholder:'Big 5 Safari' },
  { key:'park', label:'Park/Reserve', placeholder:'Hluhluwe-iMfolozi' },
  { key:'duration_days', label:'Duration (hrs)', type:'number', placeholder:'3' },
  { key:'price_per_person', label:'Price/Person (R)', type:'number', placeholder:'3500' },
  { key:'max_pax', label:'Max Guests', type:'number', placeholder:'8' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>; }
export function ShuttlesPage() { return <CrudPage title="Shuttles" icon="shuttles" table="shuttles" resourceKey="shuttles" fields={[
  { key:'name', label:'Route Name', required:true, primary:true, placeholder:'Durban Airport Shuttle' },
  { key:'from_location', label:'From', placeholder:'King Shaka Airport' },
  { key:'to_location', label:'To', placeholder:'Durban CBD' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'350' },
  { key:'vehicle_type', label:'Vehicle', placeholder:'Toyota Quantum' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>; }
export function ChartersPage() { return <CrudPage title="Charters" icon="charters" table="charters" resourceKey="charters" fields={[
  { key:'name', label:'Charter Name', required:true, primary:true, placeholder:'Deep Sea Fishing Charter' },
  { key:'charter_type', label:'Type', type:'select', options:['road','boat','deep_sea_fishing','yacht','light_aircraft','helicopter','other'] },
  { key:'duration_hours', label:'Duration (hrs)', type:'number', placeholder:'8' },
  { key:'price', label:'Price (R)', type:'number', placeholder:'4500' },
  { key:'capacity', label:'Capacity', type:'number', placeholder:'10' },
  { key:'departure_point', label:'Departure', placeholder:'Durban Harbour' },
  { key:'status', label:'Status', type:'select', options:['active','inactive'], badge:v=>v==='active'?'badge-green':'badge-gray' },
]}/>; }
export function GuestsPage() { return <CrudPage title="Guests" icon="guests" table="guests" resourceKey="guests" fields={[
  { key:'full_name',        label:'Name',            required:true, primary:true, placeholder:'John Dlamini' },
  { key:'email',            label:'Email',           type:'email',  placeholder:'guest@email.com' },
  { key:'phone',            label:'Phone',           placeholder:'+27 82 000 0000' },
  { key:'nationality',      label:'Nationality',     placeholder:'South African' },
  { key:'id_number',        label:'ID/Passport',     placeholder:'Identity number' },
  { key:'billing_company',  label:'Billing Company', placeholder:'ABC Tours (Pty) Ltd', display:false },
  { key:'billing_address',  label:'Billing Address', placeholder:'123 Main Street',     display:false },
  { key:'billing_city',     label:'City',            placeholder:'Durban',              display:false },
  { key:'billing_province', label:'Province',        placeholder:'KwaZulu-Natal',       display:false },
  { key:'billing_postcode', label:'Postal Code',     placeholder:'4001',                display:false },
  { key:'billing_country',  label:'Country',         placeholder:'South Africa',        display:false },
  { key:'vat_number',       label:'VAT Number',      placeholder:'4012345678',          display:false },
  { key:'notes',            label:'Notes',           type:'textarea',                   display:false },
]}/>; }
