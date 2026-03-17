import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import { verifyTOTP } from '../lib/totp.jsx';

function SuperAdminLogin({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('password');
  const [totpCode, setTotpCode] = useState('');
  const [pendingSecret, setPendingSecret] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      // Check if superadmin using RPC
      const { data: isSA, error: saErr } = await supabase.rpc('check_is_superadmin');
      if (saErr || !isSA) {
        await supabase.auth.signOut();
        setErr('Not authorised — superadmin role required');
        setLoading(false);
        return;
      }

      // Get profile to check 2FA status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('totp_enabled, totp_secret')
        .eq('id', data.user.id)
        .single();

      if (profileData?.totp_enabled && profileData?.totp_secret) {
        // Has 2FA - need to verify
        setPendingSecret(profileData.totp_secret);
        setPendingUser(data.user);
        await supabase.auth.signOut();
        setStep('totp');
        setLoading(false);
        return;
      }

      // No 2FA - force setup
      setStep('setup');
      setPendingUser(data.user);
      setLoading(false);
      
    } catch (error) {
      setErr('Login failed');
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const isValid = await verifyTOTP(pendingSecret, totpCode);
      if (!isValid) {
        setErr('Incorrect code — try again');
        setLoading(false);
        return;
      }

      // Re-authenticate
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr('Session error — sign in again');
        setStep('password');
        setLoading(false);
        return;
      }

      onAuth(data.user);
      
    } catch (error) {
      setErr('Verification failed');
      setLoading(false);
    }
  }

  async function handleSetup2FA() {
    setErr('');
    setLoading(true);
    
    try {
      // Store the pending user info
      sessionStorage.setItem('pending_superadmin', JSON.stringify({
        email,
        password,
        id: pendingUser?.id
      }));
      
      window.location.href = '/force-2fa?redirect=admin';
    } catch (error) {
      setErr('Redirect failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div style={{ width: 380, background: '#111', borderRadius: 16, padding: 36, border: '1px solid #222' }}>
        <div className="flex items-center gap-3 mb-6">
          <div style={{ background: '#dc2626', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={20} className="text-white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>OpDesk Superadmin</div>
            <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Restricted Access
            </div>
          </div>
        </div>

        {err && (
          <div style={{ background: '#1a0000', border: '1px solid #dc2626', color: '#f87171', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {err}
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
              <input
                style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%', outline: 'none', fontSize: 14 }}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@opdesk.app"
              />
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Password</label>
              <input
                style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '9px 12px', width: '100%', outline: 'none', fontSize: 14 }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              style={{ background: '#dc2626', color: 'white', fontWeight: 700, border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In as Superadmin'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#1a1a00', border: '1px solid #ca8a04', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fde047', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="shield" size={14} /> Two-factor authentication required
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Authenticator Code</label>
              <input
                style={{ background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: 8, padding: '12px', width: '100%', outline: 'none', fontSize: 22, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', boxSizing: 'border-box' }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              style={{ background: '#dc2626', color: 'white', fontWeight: 700, border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', marginTop: 4 }}
              disabled={loading || totpCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enter'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('password'); setTotpCode(''); setErr(''); }}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 4 }}
            >
              ← Back
            </button>
          </form>
        )}

        {step === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#1a1a3a', border: '1px solid #6366f1', borderRadius: 8, padding: '16px 14px', fontSize: 13, color: '#a5b4fc' }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>Two-factor authentication required</strong>
              <p style={{ marginBottom: 12 }}>As a superadmin, you must enable 2FA before accessing the console.</p>
            </div>
            <button
              onClick={handleSetup2FA}
              style={{ background: '#6366f1', color: 'white', fontWeight: 700, border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer' }}
              disabled={loading}
            >
              Set Up Two-Factor Authentication
            </button>
            <button
              onClick={() => setStep('password')}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 4 }}
            >
              ← Back to login
            </button>
          </div>
        )}

        <p style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Restricted: superadmin role required
        </p>
      </div>
    </div>
  );
}

export default SuperAdminLogin;