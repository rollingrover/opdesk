import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { verifyTOTP } from './lib/totp.jsx';

// ─── FORCED 2FA ENROLLMENT (for Firearm Register users) ────────────────────
function Force2FAEnrollment() {
  const { profile, reload, signOut } = useAuth();
  const [secret] = React.useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    return Array.from({length:32}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  });
  const email = profile?.email || '';
  const qr = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(`otpauth://totp/OpDesk:${encodeURIComponent(email)}?secret=${secret}&issuer=OpDesk&digits=6&period=30`)}`;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEnroll(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const ok = await verifyTOTP(secret, code);
    if (!ok) { setError('Incorrect code — check your authenticator and try again'); setLoading(false); return; }
    await supabase.from('profiles').update({ totp_secret: secret, totp_enabled: true }).eq('id', profile.id);
    toast('2FA enabled — Firearm Register access granted');
    reload();
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3"><Logo size={56}/></div>
          <h1 className="text-2xl font-black text-white">Two-Factor Authentication Required</h1>
          <p className="text-sm mt-2" style={{color:'rgba(212,168,83,0.8)'}}>Your account has Firearm Register access — 2FA is mandatory for security compliance.</p>
        </div>
        <div className="card p-8">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2"><Icon name="alert" size={14}/>{error}</div>}
          <form onSubmit={handleEnroll} className="space-y-4">
            <div className="flex items-center gap-2 mb-2"><Icon name="shield" size={20} className="text-gold"/><h2 className="text-xl font-bold text-navy">Set Up 2FA Now</h2></div>
            <p className="text-sm text-gray-600">Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center"><img src={qr} alt="QR" className="border-4 border-navy rounded-lg" style={{width:200,height:200}}/></div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Manual entry secret:</p>
              <div className="flex items-center gap-2"><code className="text-xs font-mono text-navy bg-white px-2 py-1 rounded border flex-1">{secret}</code><button type="button" className="text-gold" onClick={()=>navigator.clipboard.writeText(secret)}><Icon name="copy" size={14}/></button></div>
            </div>
            <div><label className="text-sm font-semibold text-gray-600 block mb-1">Confirm 6-digit code</label><input value={code} onChange={e=>setCode(e.target.value)} maxLength={6} placeholder="000000" className="text-center tracking-widest text-xl font-mono" autoFocus inputMode="numeric" pattern="[0-9]*"/></div>
            <button className="btn-primary w-full py-2.5" disabled={loading||code.length!==6}>{loading?'Enabling...':'Enable 2FA & Continue'}</button>
          </form>
          <div className="mt-4 text-center"><button type="button" className="text-sm text-gray-400 hover:underline" onClick={signOut}>Sign out</button></div>
        </div>
      </div>
    </div>
  );
}


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


export default Force2FAEnrollment;
