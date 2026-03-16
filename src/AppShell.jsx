import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from './lib/constants.jsx';
import { ClientsPage, TrailsPage, VehiclesPage, GuidesPage, DriversPage, SchedulesPage } from './pages/ModulePages.jsx';

// ─── PageErrorBoundary ──────────────────────
class PageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[OpDesk PageError]', error, info); }
  reset() { this.setState({ hasError: false, error: null }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-500 font-bold mb-2">Page failed to load</div>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap mb-4">{String(this.state.error?.message || this.state.error)}</pre>
          <button className="btn-primary" onClick={()=>this.setState({hasError:false,error:null})}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}


// ─── ReportModal ────────────────────────────
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



// ─── AppShell ───────────────────────────────
function AppShell() {
  const { session, company, loading, features } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
      <div className="text-center"><Logo size={60}/><p className="text-sm mt-4 font-medium tracking-widest uppercase" style={{color:'rgba(212,168,83,0.6)'}}>Loading...</p></div>
    </div>
  );

  if (!session || !company) return <AuthScreen/>;

  // Force 2FA for Firearm Register users who haven't enrolled
  if (features.firearmRegister && profile && !profile.totp_enabled) {
    return <Force2FAEnrollment/>;
  }

  const ml = collapsed ? 'ml-16' : 'ml-56';
  const pages = {
    dashboard: <DashboardPage/>, bookings: <BookingsPage/>, calendar: <CalendarPage/>,
    tours: <ToursPage/>, safaris: <SafarisPage/>, shuttles: <ShuttlesPage/>, charters: <ChartersPage/>, trails: <TrailsPage/>,
    guests: <GuestsPage/>, clients: <ClientsPage/>, guides: <GuidesPage/>, drivers: <DriversPage/>, vehicles: <VehiclesPage/>, schedules: <SchedulesPage/>,
    firearm: <FirearmRegisterPage/>, users: <UsersPage/>, billing: <BillingPage/>, settings: <SettingsPage/>, marketing: <MarketingPageEditor/>,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <main className={`flex-1 ${ml} p-6 min-h-screen`} style={{transition:'margin 0.2s'}}>
        <PageErrorBoundary key={page}>{pages[page] || <DashboardPage/>}</PageErrorBoundary>
      </main>
      {features.watermark && <div className="watermark">Powered by OpDesk · opdesk.app</div>}
      {/* Report a Problem floating button */}
      <button
        onClick={()=>setShowReport(true)}
        title="Report a Problem"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 text-sm font-semibold shadow-lg transition-all hover:scale-105"
        style={{background:'#0F2540',color:'white',border:'1px solid rgba(212,168,83,0.4)',borderRadius:999,padding:'8px 16px'}}
      >
        <Icon name="shield" size={15} className="text-gold"/>Report a Problem
      </button>
      {showReport && <ReportModal onClose={()=>setShowReport(false)}/>}
    </div>
  );
}


// ─── AppShellWithAddons ─────────────────────
function AppShellWithAddons() {
  const { session, company, loading, features } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showAddonShop, setShowAddonShop] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
      <div className="text-center"><Logo size={60}/><p className="text-sm mt-4 font-medium tracking-widest uppercase" style={{color:'rgba(212,168,83,0.6)'}}>Loading...</p></div>
    </div>
  );

  if (!session || !company) return <AuthScreen/>;

  const ml = collapsed ? 'ml-16' : 'ml-56';
  const pages = {
    dashboard: <DashboardPage/>, bookings: <BookingsPage/>, calendar: <CalendarPage/>,
    tours: <ToursPage/>, safaris: <SafarisPage/>, shuttles: <ShuttlesPage/>, charters: <ChartersPage/>, trails: <TrailsPage/>,
    guests: <GuestsPage/>, clients: <ClientsPage/>, guides: <GuidesPage/>, drivers: <DriversPage/>, vehicles: <VehiclesPage/>, schedules: <SchedulesPage/>,
    firearm: <FirearmRegisterPage/>, users: <UsersPage/>, billing: <BillingPage/>, settings: <SettingsPage/>, marketing: <MarketingPageEditor/>,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed}/>
      {/* Add-on Store button in bottom of sidebar */}
      <div style={{position:'fixed',left:collapsed?8:8,bottom:collapsed?56:56,zIndex:40,transition:'left 0.2s'}}>
        <button onClick={()=>setShowAddonShop(true)} title="Add-on Store"
          style={{background:'#D4A853',color:'#0F2540',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.3)',fontWeight:900,fontSize:18}}>+</button>
      </div>
      <main className={`flex-1 ${ml} p-6 min-h-screen`} style={{transition:'margin 0.2s'}}>
        <PageErrorBoundary key={page}>{pages[page] || <DashboardPage/>}</PageErrorBoundary>
      </main>
      {features.watermark && <div className="watermark">Powered by OpDesk · opdesk.app</div>}
      {showAddonShop && <AddonShop onClose={()=>setShowAddonShop(false)}/>}
    </div>
  );
}


export { AppShell, AppShellWithAddons };
export default AppShellWithAddons;
