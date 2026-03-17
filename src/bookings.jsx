import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import { useAuth } from './context/AuthContext';
import { 
  DashboardPage, BookingsPage, CalendarPage, ToursPage, SafarisPage,
  ShuttlesPage, ChartersPage, TrailsPage, GuestsPage, ClientsPage,
  GuidesPage, DriversPage, VehiclesPage, SchedulesPage, FirearmRegisterPage,
  UsersPage, SettingsPage, MarketingPageEditor 
} from './pages/ModulePages.jsx';
import { BillingPage } from './pages/BillingPage.jsx';
import Force2FAEnrollment from './pages/Force2FAEnrollment.jsx';
import { Logo, Icon } from './lib/constants.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';

// Toast notification system
function useToast() {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

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

// AuthScreen component with signup option
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const { toast, showToast } = useToast();
  const { signIn, signUp } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, companyName, fullName, 'South Africa', 'ZAR', 'en');

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      showToast('Account created! Please check your email to confirm.', 'success');
      setMode('login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
      <Toast toast={toast} />
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <Logo size={60} />
          <h2 className="text-2xl font-bold text-navy mt-4">
            {mode === 'login' ? 'Sign in to OpDesk' : 'Create an Account'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">Operator's Command Centre</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-sm text-gold hover:underline"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Your Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-gold hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gold hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

// Sidebar component
function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  const { signOut, tier, addons } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'bookings', icon: 'bookings', label: 'Bookings' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'guides', icon: 'guides', label: 'Guides' },
    { id: 'drivers', icon: 'drivers', label: 'Drivers' },
    { id: 'vehicles', icon: 'vehicles', label: 'Vehicles' },
    { id: 'clients', icon: 'clients', label: 'Clients' },
    { id: 'guests', icon: 'guests', label: 'Guests' },
    { id: 'tours', icon: 'tours', label: 'Tours' },
    { id: 'safaris', icon: 'safaris', label: 'Safaris' },
    { id: 'shuttles', icon: 'shuttles', label: 'Shuttles' },
    { id: 'charters', icon: 'charters', label: 'Charters' },
    { id: 'trails', icon: 'trails', label: 'Trails' },
    { id: 'schedules', icon: 'schedules', label: 'Schedules' },
    { id: 'firearm', icon: 'firearm', label: 'Firearm Register' },
    { id: 'billing', icon: 'billing', label: 'Billing' },
    { id: 'users', icon: 'users', label: 'Users' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    ...((tier !== 'free' || addons?.some(a => a.addon_key === 'marketing_page')) 
      ? [{ id: 'marketing', icon: 'marketing', label: 'Marketing' }] 
      : []),
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-navy text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        {!collapsed && <span className="font-bold">OpDesk</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gold">
          <Icon name="menu" size={20} />
        </button>
      </div>
      <div className="py-4 overflow-y-auto h-[calc(100vh-64px)]">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gold hover:text-navy transition-colors ${
              page === item.id ? 'bg-gold text-navy' : ''
            }`}
          >
            <Icon name={item.icon} size={20} />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </button>
        ))}
      </div>
      <button
        onClick={signOut}
        className="absolute bottom-4 left-0 w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white"
      >
        <Icon name="logout" size={20} />
        {!collapsed && <span className="text-sm">Sign Out</span>}
      </button>
    </div>
  );
}

// Report Modal - Updated with real Supabase RPC
function ReportModal({ onClose }) {
  const { toast, showToast } = useToast();
  const { company, profile } = useAuth();
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
      
      // Fire-and-forget email notification
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <Toast toast={toast} />
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={28} className="text-green-600"/>
          </div>
          <h2 className="text-xl font-bold text-navy mb-2 text-center">Report Submitted</h2>
          <p className="text-gray-500 text-sm mb-6 text-center">Thanks — our support team will follow up shortly.</p>
          <button className="btn-primary w-full" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <Toast toast={toast} />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Icon name="shield" size={18} className="text-red-500"/>Report a Problem
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="x" size={20}/>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {['Bug','Billing','Feature Request','Other'].map(c => (
                <button key={c} type="button"
                  onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    cat === c ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Brief description of the issue" maxLength={120}/>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Details</label>
            <textarea rows={4} value={desc} onChange={e => setDesc(e.target.value)} required placeholder="What happened? What were you trying to do? Any error messages?"/>
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

// Authenticated App component
function AuthenticatedApp() {
  const { profile, features, company, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
        <div className="text-center">
          <Logo size={60}/>
          <p className="text-sm mt-4 font-medium tracking-widest uppercase" style={{color:'rgba(212,168,83,0.6)'}}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !company) {
    return <div>Error loading user data</div>;
  }

  if (features?.firearmRegister && profile && !profile.totp_enabled) {
    return <Force2FAEnrollment />;
  }

  const ml = collapsed ? 'ml-16' : 'ml-56';
  
  const pages = {
    dashboard: <DashboardPage />,
    bookings: <BookingsPage />,
    calendar: <CalendarPage />,
    tours: <ToursPage />,
    safaris: <SafarisPage />,
    shuttles: <ShuttlesPage />,
    charters: <ChartersPage />,
    trails: <TrailsPage />,
    guests: <GuestsPage />,
    clients: <ClientsPage />,
    guides: <GuidesPage />,
    drivers: <DriversPage />,
    vehicles: <VehiclesPage />,
    schedules: <SchedulesPage />,
    firearm: <FirearmRegisterPage />,
    users: <UsersPage />,
    billing: <BillingPage />,
    settings: <SettingsPage />,
    marketing: <MarketingPageEditor />,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <main className={`flex-1 ${ml} p-6 min-h-screen`} style={{transition:'margin 0.2s'}}>
        {pages[page] || <DashboardPage />}
      </main>
      {features?.watermark && <div className="watermark">Powered by OpDesk · opdesk.app</div>}
      <button
        onClick={() => setShowReport(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 text-sm font-semibold shadow-lg transition-all hover:scale-105"
        style={{
          background:'#0F2540',
          color:'white',
          border:'1px solid rgba(212,168,83,0.4)',
          borderRadius:999,
          padding:'8px 16px'
        }}
      >
        <Icon name="shield" size={15} className="text-gold"/>Report a Problem
      </button>
      {showReport && <ReportModal onClose={() => setShowReport(false)}/>}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

// Main Bookings App
function BookingsApp() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
        <div className="text-center">
          <Logo size={60}/>
          <p className="text-sm mt-4 font-medium tracking-widest uppercase" style={{color:'rgba(212,168,83,0.6)'}}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AuthenticatedApp />;
}

export default BookingsApp;