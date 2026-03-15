import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';
import { verifyTOTP } from '../lib/totp.jsx';

// ─── AuthScreen ─────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [company, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [regCountry, setRegCountry] = useState('South Africa');
  const [regCurrency, setRegCurrency] = useState('ZAR');
  const [regLanguage, setRegLanguage] = useState('en');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQR, setTotpQR] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [pendingTotpSecret, setPendingTotpSecret] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  function genSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    return Array.from({length:32}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const { error, data: signInData } = await signIn(email, password);
    if (error) { setError(error.message); setLoading(false); return; }
    // Stash email/password for potential 2FA re-auth
    setPendingEmail(email); setPendingPassword(password);
    // Check if this account has 2FA enabled
    try {
      const { data: profileData } = await supabase.rpc('get_my_data');
      if (profileData?.profile?.totp_enabled && profileData?.profile?.totp_secret) {
        // Stash secret for verification, sign out to hold the gate
        setPendingTotpSecret(profileData.profile.totp_secret);
        await supabase.auth.signOut();
        setMode('verify2fa');
        setLoading(false);
        return;
      }
    } catch(e) { /* if RPC fails, allow login normally */ }
    // No 2FA — loading state is managed by AuthProvider's onAuthStateChange handler
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault(); setError(''); setLoading(true);
    if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
    const { error } = await signUp(email, password, company, name, regCountry, regCurrency, regLanguage);
    if (error) { setError(error.message); setLoading(false); return; }
    const secret = genSecret();
    setTotpSecret(secret);
    const uri = `otpauth://totp/OpDesk:${encodeURIComponent(email)}?secret=${secret}&issuer=OpDesk&digits=6&period=30`;
    setTotpQR(`https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`);
    setMode('totp');
    setLoading(false);
  }

  async function handleTOTP(e) {
    e.preventDefault(); setLoading(true); setError('');
    const ok = await verifyTOTP(totpSecret, totpCode);
    if (!ok) { setError('Incorrect code — check your authenticator and try again'); setLoading(false); return; }
    await supabase.from('profiles').update({ totp_secret: totpSecret, totp_enabled: true }).eq('email', email);
    setSuccess('2FA enabled — sign in below'); setMode('login'); setLoading(false);
  }

  async function handleVerify2FA(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const ok = await verifyTOTP(pendingTotpSecret, totpCode);
    if (!ok) { setError('Incorrect code — please try again'); setLoading(false); return; }
    // Code correct — sign back in to create the session
    const { error } = await signIn(pendingEmail, pendingPassword);
    if (error) { setError('Authentication failed — please sign in again'); setMode('login'); setLoading(false); return; }
    // onAuthStateChange fires → app loads
  }

  async function handleForgot(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://opdesk.app/reset' });
    if (error) setError(error.message);
    else setSuccess('Reset link sent — check your inbox');
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0F2540'}}>
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><Logo size={56}/></div>
          <h1 className="text-3xl font-black text-white tracking-tight">OpDesk</h1>
          <p className="text-sm mt-1 font-medium tracking-widest uppercase" style={{color:'rgba(212,168,83,0.8)'}}>Operator's Command Centre</p>
        </div>
        <div className="card p-8">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2"><Icon name="alert" size={14}/>{error}</div>}
          {success && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2"><Icon name="check" size={14}/>{success}</div>}

          {mode==='login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-xl font-bold text-navy mb-2">Sign In</h2>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com"/></div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Password</label>
                <div className="relative"><input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={()=>setShowPw(!showPw)}><Icon name={showPw?'eyeOff':'eye'} size={16}/></button></div>
              </div>
              <button className="btn-primary w-full py-2.5" disabled={loading}>{loading?'Signing in...':'Sign In'}</button>
              <div className="flex justify-between text-sm"><button type="button" className="text-gold hover:underline" onClick={()=>setMode('forgot')}>Forgot password?</button><button type="button" className="text-gold hover:underline" onClick={()=>setMode('register')}>Create account</button></div>
            </form>
          )}

          {mode==='register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-xl font-bold text-navy mb-2">Create Account</h2>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Company Name</label><input value={company} onChange={e=>setCompanyName(e.target.value)} required placeholder="Safari Adventures Ltd"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Your Name</label><input value={name} onChange={e=>setName(e.target.value)} required placeholder="John Dlamini"/></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com"/></div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Password</label>
                <div className="relative"><input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters"/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={()=>setShowPw(!showPw)}><Icon name={showPw?'eyeOff':'eye'} size={16}/></button></div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Region & Language</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Country</label>
                    <select value={regCountry} onChange={e=>setRegCountry(e.target.value)} className="text-sm">
                      {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Currency</label>
                    <select value={regCurrency} onChange={e=>setRegCurrency(e.target.value)} className="text-sm">
                      {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Language</label>
                    <select value={regLanguage} onChange={e=>setRegLanguage(e.target.value)} className="text-sm">
                      {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button className="btn-primary w-full py-2.5" disabled={loading}>{loading?'Creating...':'Create Account'}</button>
              <div className="text-center"><button type="button" className="text-gold text-sm hover:underline" onClick={()=>setMode('login')}>Already have an account?</button></div>
            </form>
          )}

          {mode==='totp' && (
            <form onSubmit={handleTOTP} className="space-y-4">
              <div className="flex items-center gap-2 mb-2"><Icon name="shield" size={20} className="text-gold"/><h2 className="text-xl font-bold text-navy">Set Up 2FA</h2></div>
              <p className="text-sm text-gray-600">Scan with Google Authenticator or Authy.</p>
              <div className="flex justify-center"><img src={totpQR} alt="QR" className="border-4 border-navy rounded-lg" style={{width:200,height:200}}/></div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Manual entry secret:</p>
                <div className="flex items-center gap-2"><code className="text-xs font-mono text-navy bg-white px-2 py-1 rounded border flex-1">{totpSecret}</code><button type="button" className="text-gold" onClick={()=>navigator.clipboard.writeText(totpSecret)}><Icon name="copy" size={14}/></button></div>
              </div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Enter 6-digit code</label><input value={totpCode} onChange={e=>setTotpCode(e.target.value)} maxLength={6} placeholder="000000" className="text-center tracking-widest text-xl"/></div>
              <button className="btn-primary w-full py-2.5" disabled={loading||totpCode.length!==6}>{loading?'Saving...':'Enable 2FA & Continue'}</button>
            </form>
          )}

          {mode==='verify2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="flex items-center gap-2 mb-2"><Icon name="shield" size={20} className="text-gold"/><h2 className="text-xl font-bold text-navy">Two-Factor Authentication</h2></div>
              <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app to continue.</p>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Authenticator Code</label><input value={totpCode} onChange={e=>setTotpCode(e.target.value)} maxLength={6} placeholder="000000" className="text-center tracking-widest text-xl font-mono" autoFocus inputMode="numeric" pattern="[0-9]*"/></div>
              <button className="btn-primary w-full py-2.5" disabled={loading||totpCode.length!==6}>{loading?'Verifying...':'Verify & Sign In'}</button>
              <div className="text-center"><button type="button" className="text-gold text-sm hover:underline" onClick={()=>{setMode('login');setTotpCode('');}}>Back to Sign In</button></div>
            </form>
          )}

          {mode==='forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <h2 className="text-xl font-bold text-navy mb-2">Reset Password</h2>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com"/></div>
              <button className="btn-primary w-full py-2.5" disabled={loading}>{loading?'Sending...':'Send Reset Link'}</button>
              <div className="text-center"><button type="button" className="text-gold text-sm hover:underline" onClick={()=>setMode('login')}>Back to sign in</button></div>
            </form>
          )}
        </div>
        <p className="text-center text-xs mt-6" style={{color:'rgba(255,255,255,0.25)'}}>No per-booking fees · ZAR billing · Cancel anytime</p>
      </div>
    </div>
  );
}



// ─── AuthContext ─────────────────────────────
// ─── AUTH CONTEXT ─────────────────────────
export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData(user) {
    setLoading(true);
    try {
      // Single SECURITY DEFINER RPC — bypasses RLS on both profiles and companies
      const { data: d, error: dErr } = await supabase.rpc('get_my_data');
      if (d && d.profile) {
        setProfile(d.profile);
        if (d.company) setCompany(d.company);
      }
    } catch(e) { console.error('loadData error', e); }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoading(true);
      setSession(data.session);
      if (data.session) loadData(data.session.user);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      if (s) setLoading(true);
      setSession(s);
      if (s) loadData(s.user);
      else { setCompany(null); setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  }
  async function signUp(email, password, companyName, ownerName, country, currency, language) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error };
      const userId = data?.user?.id || data?.session?.user?.id;
      if (!userId) return { error: { message: 'Account created — please check your email to confirm, then sign in.' } };
      // Capture referral handle from URL or localStorage
      const refHandle = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('opdesk_ref') || null;
      if (refHandle) localStorage.removeItem('opdesk_ref'); // consume after use
      const { error: e2 } = await supabase.rpc('create_company_and_profile', {
        user_id: userId, company_name: companyName, owner_name: ownerName,
        p_country: country||'South Africa', p_currency: currency||'ZAR', p_language: language||'en',
        p_referred_by: refHandle
      });
      if (e2) return { error: e2 };
      return { data };
    } catch(err) {
      return { error: { message: err.message || 'Registration failed. Please try again.' } };
    }
  }
  async function signOut() { await supabase.auth.signOut(); window.location.reload(); }

  const [addons, setAddons] = useState([]);

  // Load company add-ons whenever company changes
  useEffect(() => {
    if (!company?.id) { setAddons([]); return; }
    supabase.from('company_addons').select('*').eq('company_id', company.id).eq('active', true)
      .then(({ data }) => setAddons(data || []));
  }, [company?.id]);

  const tier = company?.subscription_tier || 'free';
  const baseLimits = TIER_LIMITS[tier];

  // Compute effective limits: base tier limits + purchased addon quantities
  const limits = Object.fromEntries(
    Object.entries(baseLimits).map(([k, v]) => {
      if (v === null) return [k, null]; // already unlimited
      const extra = addons
        .filter(a => a.addon_key === k && a.active)
        .reduce((sum, a) => sum + (a.quantity || 1), 0);
      return [k, v + extra];
    })
  );

  const features = {
    ...TIER_FEATURES[tier],
    firearmRegister: TIER_FEATURES[tier].firearmRegister ||
      addons.some(a => a.addon_key === 'firearm_register' && a.active),
    whiteLabel: TIER_FEATURES[tier].whiteLabel ||
      addons.some(a => a.addon_key === 'white_label' && a.active),
    watermark: TIER_FEATURES[tier].watermark &&
      !addons.some(a => a.addon_key === 'no_watermark' && a.active),
    clientList: TIER_FEATURES[tier].clientList || addons.some(a => a.addon_key === 'client_list' && a.active),
  };
  const role = profile?.role || 'owner';

  function reloadAddons() {
    if (!company?.id) return;
    supabase.from('company_addons').select('*').eq('company_id', company.id).eq('active', true)
      .then(({ data }) => setAddons(data || []));
  }

  return (
    <AuthContext.Provider value={{ session, company, profile, loading, tier, limits, baseLimits, addons, features, role, signIn, signUp, signOut, setCompany, reloadAddons, reload: () => session && loadData(session.user), currencySymbol: getCurrencySymbol(company?.currency), appLanguage: company?.language || 'en', companyRegion: company?.region || getCompanyRegion(company?.country) }}>
      {children}
    </AuthContext.Provider>
  );
}

