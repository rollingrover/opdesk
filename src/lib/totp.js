// TOTP utilities
// ─── TOTP UTILITIES ──────────────────────────────────────────────────────────
async function verifyTOTP(secret, code) {
  try {
    // Decode base32 secret
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of secret.replace(/=+$/,'').toUpperCase()) {
      const i = base32chars.indexOf(c);
      if (i < 0) continue;
      bits += i.toString(2).padStart(5,'0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length/8));
    for (let i=0;i<bytes.length;i++) bytes[i] = parseInt(bits.slice(i*8,i*8+8),2);

    const key = await crypto.subtle.importKey('raw', bytes, {name:'HMAC',hash:'SHA-1'}, false, ['sign']);

    // Check current window ±1 step (30-second periods)
    const T = Math.floor(Date.now()/1000/30);
    for (const offset of [-1,0,1]) {
      const counter = BigInt(T+offset);
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      view.setUint32(0, Number(counter >> 8n), false);
      view.setUint32(4, Number(counter & 0xFFFFFFFFn), false);
      const sig = await crypto.subtle.sign('HMAC', key, buf);
      const hmac = new Uint8Array(sig);
      const offset2 = hmac[19] & 0xf;
      const otp = ((hmac[offset2]&0x7f)<<24|(hmac[offset2+1]&0xff)<<16|(hmac[offset2+2]&0xff)<<8|(hmac[offset2+3]&0xff)) % 1000000;
      if (otp.toString().padStart(6,'0') === code.trim()) return true;
    }
    return false;
  } catch(e) { console.error('TOTP verify error', e); return false; }
}

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

