import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import { useAuth } from '../context/AuthContext';

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

// ─── REPORT A PROBLEM MODAL ──────────────────
function ReportModal({ onClose }) {
  const CATEGORIES = ['Bug', 'Billing', 'Feature Request', 'Other'];
  const { company, profile } = useAuth();
  const { toast, showToast } = useToast();
  
  const [cat, setCat] = useState('Bug');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!subject.trim() || !desc.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      const { data: ticketId, error } = await supabase.rpc('submit_support_ticket', {
        p_category: cat,
        p_subject: subject.trim(),
        p_description: desc.trim()
      });
      
      if (error) throw error;
      
      // Fire-and-forget email notification — failure doesn't affect user experience
      try {
        await fetch('/api/notify-ticket', {
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
        });
      } catch (notifyError) {
        console.warn('Notification failed, but ticket was created:', notifyError);
        // Don't show error to user - ticket was still created
      }
      
      setDone(true);
      
    } catch (error) {
      console.error('Error submitting ticket:', error);
      showToast('Failed to submit — please try again', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-box max-w-sm text-center" onClick={e => e.stopPropagation()}>
          <Toast toast={toast} />
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
            <Icon name="check" size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Report Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">Thanks — our support team will follow up shortly.</p>
          <button className="btn-primary w-full" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <Toast toast={toast} />
        
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Icon name="shield" size={18} className="text-red-500" />
            Report a Problem
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    cat === c 
                      ? 'bg-navy text-white border-navy' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              placeholder="Brief description of the issue"
              maxLength={120}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Details</label>
            <textarea
              rows={4}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              required
              placeholder="What happened? What were you trying to do? Any error messages?"
            />
          </div>
          
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                'Submitting…'
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUPERADMIN SUPPORT QUEUE ────────────────
function SASupportQueue() {
  const { toast, showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Open');
  const [saving, setSaving] = useState(false);
  
  const STATUS_COLORS = { 
    Open: '#dc2626', 
    'In Progress': '#d97706', 
    Resolved: '#16a34a', 
    Closed: '#6b7280' 
  };

  async function loadTickets() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_support_tickets');
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      showToast('Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => { loadTickets(); }, []);

  function openTicket(t) {
    setSelected(t);
    setNotes(t.admin_notes || '');
    setStatus(t.status);
  }

  async function saveTicket() {
    if (!selected) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_support_ticket', {
        p_ticket_id: selected.id,
        p_status: status,
        p_admin_notes: notes
      });
      
      if (error) throw error;
      
      showToast('Ticket updated successfully', 'success');
      await loadTickets();
      setSelected(null);
      
    } catch (error) {
      console.error('Error updating ticket:', error);
      showToast('Failed to update ticket: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const CAT_ICON = { 
    Bug: 'shield', 
    Billing: 'billing', 
    'Feature Request': 'info', 
    Other: 'settings' 
  };
  
  const counts = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
  tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  if (loading) {
    return (
      <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>
        Loading tickets…
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} />
      
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Support Queue</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>{tickets.length} total tickets</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {Object.entries(counts).map(([st, n]) => (
          <div 
            key={st} 
            style={{ 
              background: '#1a1a1a', 
              borderRadius: 10, 
              padding: '14px 16px', 
              border: '1px solid #2a2a2a' 
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, color: STATUS_COLORS[st] || 'white' }}>
              {n}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{st}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <Icon name="shield" size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No support tickets yet</p>
        </div>
      )}

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tickets.map(t => (
          <div
            key={t.id}
            onClick={() => openTicket(t)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 10,
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'border-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >
            <div style={{ background: '#111', borderRadius: 8, padding: 8 }}>
              <Icon name={CAT_ICON[t.category] || 'settings'} size={18} style={{ color: '#9ca3af' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700,
                fontSize: 14,
                color: 'white',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {t.subject}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {t.company_name || 'Unknown'} · {t.submitter_email} · {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: '#111',
                border: `1px solid ${STATUS_COLORS[t.status] || '#6b7280'}`,
                color: STATUS_COLORS[t.status] || '#6b7280',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {t.status}
              </span>
              <span style={{
                background: '#222',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                color: '#9ca3af'
              }}>
                {t.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket detail modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 14,
              padding: 28,
              width: '100%',
              maxWidth: 560,
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'white', marginBottom: 4 }}>
                  {selected.subject}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {selected.company_name} · {selected.submitter_email}
                </div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{
              background: '#111',
              borderRadius: 8,
              padding: 14,
              marginBottom: 20,
              fontSize: 13,
              color: '#d1d5db',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {selected.description}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{
                  background: '#111',
                  border: '1px solid #333',
                  color: 'white',
                  borderRadius: 8,
                  padding: '8px 12px',
                  width: '100%'
                }}
              >
                {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Admin Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes (not visible to user)"
                style={{
                  background: '#111',
                  border: '1px solid #333',
                  color: 'white',
                  borderRadius: 8,
                  padding: '8px 12px',
                  width: '100%',
                  resize: 'vertical',
                  fontSize: 13
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid #333',
                  background: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveTicket}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: '#dc2626',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ReportModal, SASupportQueue };
export default SASupportQueue;