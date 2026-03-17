import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import { verifyTOTP, generateTOTPSecret, generateTOTPQR } from '../lib/totp.jsx';
import { Logo, Icon } from '../lib/constants.jsx';

function Force2FAEnrollment() {
  const { profile, reload, signOut } = useAuth();
  const [secret] = useState(() => generateTOTPSecret());
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const email = profile?.email || '';
  const qrCodeUrl = generateTOTPQR(email, secret);

  async function handleEnroll(e) {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    
    setLoading(true);
    
    try {
      const ok = await verifyTOTP(secret, code);
      
      if (!ok) {
        setError('Incorrect code — check your authenticator and try again');
        setLoading(false);
        return;
      }
      
      // Save the TOTP secret to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          totp_secret: secret, 
          totp_enabled: true 
        })
        .eq('id', profile.id);
      
      if (updateError) {
        setError('Failed to enable 2FA: ' + updateError.message);
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      
      // Reload the auth context to reflect the change
      await reload();
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        window.location.reload(); // Force a full reload to reset the app state
      }, 1500);
      
    } catch (err) {
      console.error('2FA enrollment error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F2540' }}>
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="check" size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-navy mb-2">2FA Enabled Successfully!</h2>
            <p className="text-gray-600 mb-6">Your account is now protected with two-factor authentication.</p>
            <p className="text-sm text-gray-400">Redirecting you to the dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F2540' }}>
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size={56} />
          </div>
          <h1 className="text-2xl font-black text-white">Two-Factor Authentication Required</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(212,168,83,0.8)' }}>
            Your account has Firearm Register access — 2FA is mandatory for security compliance.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
              <Icon name="alert" size={14} />
              {error}
            </div>
          )}
          
          <form onSubmit={handleEnroll} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="shield" size={20} className="text-gold" />
              <h2 className="text-xl font-bold text-navy">Set Up 2FA Now</h2>
            </div>
            
            <p className="text-sm text-gray-600">
              Scan this QR code with Google Authenticator, Authy, or any other TOTP app, 
              then enter the 6-digit code to confirm.
            </p>
            
            {/* QR Code */}
            <div className="flex justify-center my-4">
              <div className="border-4 border-navy rounded-lg p-2 bg-white">
                <img 
                  src={qrCodeUrl} 
                  alt="2FA QR Code" 
                  style={{ width: 200, height: 200 }}
                  onError={(e) => {
                    console.error('QR code failed to load');
                    e.target.style.display = 'none';
                    // Show fallback
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <div className="hidden text-center p-4">
                  <p className="text-sm text-red-500 mb-2">QR code failed to load</p>
                  <p className="text-xs text-gray-500">Please use the manual entry code below</p>
                </div>
              </div>
            </div>

            {/* Manual entry secret */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Manual entry secret:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-navy bg-white px-3 py-2 rounded border flex-1 text-center tracking-wider">
                  {secret.match(/.{1,4}/g)?.join(' ') || secret}
                </code>
                <button 
                  type="button" 
                  className="text-gold hover:text-amber-600 p-2"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    // Show a quick tooltip or feedback
                    alert('Secret copied to clipboard!');
                  }}
                  title="Copy to clipboard"
                >
                  <Icon name="copy" size={18} />
                </button>
              </div>
            </div>

            {/* Code input */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                Enter 6-digit code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                className="w-full text-center tracking-widest text-xl font-mono px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-xs text-gray-400 mt-1">
                Open your authenticator app and enter the 6-digit code shown
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                disabled={loading || code.length !== 6}
              >
                <Icon name="shield" size={16} />
                {loading ? 'Verifying...' : 'Enable 2FA & Continue'}
              </button>
              <button
                type="button"
                className="btn-secondary px-6"
                onClick={signOut}
              >
                Sign Out
              </button>
            </div>
          </form>

          {/* Help text */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>Having trouble? Make sure your device's time is synchronized.</p>
            <p className="mt-1">You can manually enter the secret key above into your authenticator app.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Force2FAEnrollment;