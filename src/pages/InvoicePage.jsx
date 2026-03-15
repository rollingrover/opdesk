import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';

// ─── INVOICE ─────────────────────────────
function InvoiceModal({ booking, onClose }) {
  const { company, features, currencySymbol: sym, companyRegion } = useAuth();
  const invoiceRef = React.useRef(null);
  const invoiceNum = `INV-${booking.booking_ref}-${new Date().getFullYear()}`;
  const showLogo   = features.logo && company?.logo_url;   // basic/standard/premium + logo uploaded
  const isWhite    = features.whiteLabel;                  // premium only

  function handlePrint() {
    const content = invoiceRef.current;
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice ${invoiceNum}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:system-ui,sans-serif;background:#fff;color:#1a1a2e;padding:32px;}
        .header{background:#0F2540;border-radius:12px 12px 0 0;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;}
        .header-brand{display:flex;align-items:center;gap:12px;}
        .brand-name{font-size:22px;font-weight:900;color:#fff;}
        .brand-sub{font-size:11px;color:#D4A853;font-weight:600;margin-top:2px;}
        .header-right{text-align:right;}
        .pf-label{font-size:18px;font-weight:900;color:#D4A853;}
        .pf-sub{font-size:12px;color:#fff;opacity:0.7;}
        .body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px;}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
        .meta-label{font-size:10px;text-transform:uppercase;color:#9ca3af;margin-bottom:2px;font-weight:600;}
        .meta-val{font-weight:700;color:#0F2540;font-size:14px;}
        .guest-box{background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:18px;}
        table{width:100%;border-collapse:collapse;margin-bottom:18px;}
        th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:6px 0;border-bottom:1px solid #e5e7eb;}
        td{padding:10px 0;font-size:14px;border-bottom:1px solid #f3f4f6;}
        .total-row td{border-top:2px solid #0F2540;border-bottom:none;padding-top:12px;font-weight:900;font-size:15px;}
        .total-amount{color:#D4A853;font-size:18px;}
        .footer{text-align:center;font-size:11px;color:#d1d5db;padding-top:14px;border-top:1px solid #f3f4f6;}
        .company-details{font-size:12px;color:#6b7280;margin-top:14px;}
        .logo-img{height:40px;width:auto;object-fit:contain;border-radius:4px;}
      </style>
    </head><body>
      <div class="header">
        <div class="header-brand">
          ${showLogo
            ? `<img src="${company.logo_url}" class="logo-img" alt="logo"/>`
            : `<svg width="32" height="32" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" stroke="#D4A853" stroke-width="3" fill="none"/><polygon points="50,10 55,45 50,50 45,45" fill="#D4A853"/><polygon points="50,90 55,55 50,50 45,55" fill="#D4A853" opacity="0.5"/><polygon points="10,50 45,45 50,50 45,55" fill="#D4A853" opacity="0.5"/><polygon points="90,50 55,55 50,50 55,45" fill="#D4A853"/><circle cx="50" cy="50" r="6" fill="#D4A853"/></svg>`
          }
          <div>
            <div class="brand-name">${isWhite || showLogo ? (company?.name || 'OpDesk') : 'OpDesk'}</div>
            <div class="brand-sub">${showLogo ? '' : company?.name || ''}</div>
          </div>
        </div>
        <div class="header-right">
          <div class="pf-label">PRO FORMA</div>
          <div class="pf-sub">Invoice</div>
        </div>
      </div>
      <div class="body">
        <div class="meta">
          <div><div class="meta-label">Invoice No.</div><div class="meta-val">${invoiceNum}</div></div>
          <div style="text-align:right"><div class="meta-label">Invoice Date</div><div class="meta-val">${new Date().toLocaleDateString('en-ZA')}</div></div>
          <div><div class="meta-label">Booking Reference</div><div class="meta-val">${booking.booking_ref}</div></div>
          <div style="text-align:right"><div class="meta-label">Activity Date</div><div class="meta-val">${booking.start_date ? new Date(booking.start_date).toLocaleDateString('en-ZA') : '—'}</div></div>
        </div>
        <div class="guest-box">
          <div class="meta-label">Bill To</div>
          <div style="font-weight:700;font-size:15px;margin-top:4px;color:#0F2540">${booking.guest_name}</div>
          ${booking.guest_email ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${booking.guest_email}</div>` : ''}
          ${booking.guest_phone ? `<div style="font-size:13px;color:#6b7280">${booking.guest_phone}</div>` : ''}
          ${booking.guest_vat_number ? `<div style="font-size:12px;color:#9ca3af;margin-top:4px">VAT: ${booking.guest_vat_number}</div>` : ''}
        </div>
        <table>
          <thead><tr><th>Description</th><th>Date</th><th style="text-align:right">Pax</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td style="font-weight:600;text-transform:capitalize">${(booking.activity_type||'Activity')} — ${company?.name||''}</td>
              <td>${booking.start_date ? new Date(booking.start_date).toLocaleDateString('en-ZA') : '—'}</td>
              <td style="text-align:right">${booking.pax||1}</td>
              <td style="text-align:right;font-weight:700">${sym}${(booking.total_amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align:right">TOTAL DUE</td>
              <td style="text-align:right" class="total-amount">${sym}${(booking.total_amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
            </tr>
          </tfoot>
        </table>
        ${company?.bank_name ? `<div class="company-details"><strong>Banking Details:</strong><br/>${company.bank_name} · Acc: ${company.bank_account||'—'} · Branch: ${company.bank_branch||'—'}</div>` : ''}
        ${company?.vat_number ? `<div class="company-details" style="margin-top:6px">VAT Reg: ${company.vat_number}</div>` : ''}
        <div class="footer">${isWhite ? '' : features.logo ? '✦ OpDesk — Operator\'s Command Centre' : 'Powered by OpDesk · opdesk.app'}</div>
      </div>
      <script>window.onload=()=>{ window.print(); }<\/script>
    </body></html>`);
    w.document.close();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
        {/* Modal toolbar */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-navy text-lg">Pro Forma Invoice</h3>
          <div className="flex gap-2">
            <button className="btn-primary text-sm py-1.5 flex items-center gap-1.5" onClick={handlePrint}>
              <Icon name="invoice" size={14}/> Save / Print PDF
            </button>
            <button onClick={onClose}><Icon name="x" size={18} className="text-gray-400"/></button>
          </div>
        </div>

        {/* Invoice preview */}
        <div ref={invoiceRef}>
          {/* Header band */}
          <div style={{background:'#0F2540',borderRadius:'12px 12px 0 0',padding:'20px 28px'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showLogo
                  ? <img src={company.logo_url} alt="logo" className="h-10 w-auto object-contain rounded"/>
                  : <Logo size={32}/>
                }
                <div>
                  <div className="font-black text-xl text-white">
                    {isWhite || showLogo ? (company?.name || 'OpDesk') : 'OpDesk'}
                  </div>
                  {!showLogo && <div className="text-xs font-semibold" style={{color:'#D4A853'}}>{company?.name}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-lg" style={{color:'#D4A853'}}>PRO FORMA</div>
                <div className="text-white text-sm opacity-70">Invoice · {invoiceNum}</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 border border-t-0 border-gray-200 rounded-b-xl">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Invoice No.</p>
                <p className="font-bold text-navy">{invoiceNum}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase mb-1">Date</p>
                <p className="font-medium">{new Date().toLocaleDateString('en-ZA')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Booking Reference</p>
                <p className="font-bold text-navy">{booking.booking_ref}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase mb-1">Activity Date</p>
                <p className="font-medium">{booking.start_date ? new Date(booking.start_date).toLocaleDateString('en-ZA') : '—'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-400 uppercase mb-1">Bill To</p>
              <p className="font-bold text-navy text-base">{booking.guest_name}</p>
              {booking.guest_email && <p className="text-sm text-gray-500">{booking.guest_email}</p>}
              {booking.guest_phone && <p className="text-sm text-gray-500">{booking.guest_phone}</p>}
              {booking.guest_vat_number && <p className="text-xs text-gray-400 mt-1">VAT: {booking.guest_vat_number}</p>}
            </div>

            <table className="mb-4">
              <thead><tr><th>Description</th><th>Date</th><th className="text-right">Pax</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr>
                  <td className="capitalize font-medium">{booking.activity_type||'Activity'} — {company?.name}</td>
                  <td>{booking.start_date ? new Date(booking.start_date).toLocaleDateString('en-ZA') : '—'}</td>
                  <td className="text-right">{booking.pax||1}</td>
                  <td className="text-right font-bold">{sym}{(booking.total_amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy">
                  <td colSpan={3} className="text-right font-black text-navy pt-3">TOTAL DUE</td>
                  <td className="text-right font-black text-lg pt-3" style={{color:'#D4A853'}}>
                    R{(booking.total_amount||0).toLocaleString('en-ZA',{minimumFractionDigits:2})}
                  </td>
                </tr>
              </tfoot>
            </table>

            {(company?.bank_name || company?.vat_number) && (
              <div className="text-xs text-gray-400 pt-3 border-t border-gray-100 space-y-1">
                {company?.bank_name && <div><span className="font-semibold">Bank:</span> {company.bank_name} · Acc: {company?.bank_account||'—'} · Branch: {company?.bank_branch||'—'}</div>}
                {company?.vat_number && <div><span className="font-semibold">VAT Reg:</span> {company.vat_number}</div>}
              </div>
            )}

            {!isWhite && (
              <div className="text-center text-xs text-gray-300 pt-4 border-t border-gray-100 mt-3">
                {features.logo ? '✦ OpDesk — Operator\'s Command Centre' : 'Powered by OpDesk · opdesk.app'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
