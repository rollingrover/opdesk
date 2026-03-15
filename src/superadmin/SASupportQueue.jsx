import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── REPORT A PROBLEM MODAL ──────────────────
function ReportModal({ onClose }) {
  const CATS = ['Bug','Billing','Feature Request','Other'];
  const { company, profile } = useAuth();
  const [cat, setCat] = useState('Bug');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!subject.trim() || !desc.trim()) return;
    setSaving(true);
    const { data: ticketId, error } = await supabase.rpc('submit_support_ticket', {
      p_category: cat, p_subject: subject.trim(), p_description: desc.trim()
    });
    setSaving(false);
    if (!error) {
      setDone(true);
      // Fire-and-forget email notification — failure doesn't affect user experience
      fetch('/api/notify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          subject: subject.trim(),
          description: desc.trim(),
          company_name: company?.name || '',
          submitter_email: profile?.email || '',
          ticket_id: ticketId,
        }),
      }).catch(() => {}); // Silently ignore network errors
    } else {
      showToast('Failed to submit — please try again', 'error');
    }
  }

  if (done) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-sm text-center" onClick={e=>e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'#dcfce7'}}>
          <Icon name="check" size={28} className="text-green-600"/>
        </div>
        <h2 className="text-xl font-bold text-navy mb-2">Report Submitted</h2>
        <p className="text-gray-500 text-sm mb-6">Thanks — our support team will follow up shortly.</p>
        <button className="btn-primary w-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Icon name="shield" size={18} className="text-red-500"/>Report a Problem
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icon name="x" size={20}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {['Bug','Billing','Feature Request','Other'].map(c=>(
                <button key={c} type="button"
                  onClick={()=>setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${cat===c ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Subject</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} required placeholder="Brief description of the issue" maxLength={120}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Details</label>
            <textarea rows={4} value={desc} onChange={e=>setDesc(e.target.value)} required placeholder="What happened? What were you trying to do? Any error messages?"/>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? 'Submitting…' : <><Icon name="check" size={16}/>Submit Report</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── SUPERADMIN SUPPORT QUEUE ────────────────
