// TOTP utilities only - no React components here
import { supabase } from './supabase';

/**
 * Generates a random base32 secret for TOTP
 * @returns {string} 32-character base32 secret
 */
export function generateTOTPSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 character set
  let secret = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < 32; i++) {
    secret += chars[randomValues[i] % 32];
  }
  return secret;
}

/**
 * Generates a Google Charts QR code URL for TOTP setup
 * @param {string} email - User's email
 * @param {string} secret - Base32 secret
 * @returns {string} QR code URL
 */
export function generateTOTPQR(email, secret) {
  const uri = `otpauth://totp/OpDesk:${encodeURIComponent(email)}?secret=${secret}&issuer=OpDesk&digits=6&period=30`;
  return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`;
}

/**
 * Decodes a base32 string to a Uint8Array
 * @param {string} base32 - Base32 encoded string
 * @returns {Uint8Array} Decoded bytes
 */
function base32ToBytes(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  // Clean the string
  base32 = base32.replace(/=+$/, '').toUpperCase();
  
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32[i]);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  return bytes;
}

/**
 * Verifies a TOTP code against a secret
 * @param {string} secret - Base32 secret
 * @param {string} code - 6-digit code to verify
 * @returns {Promise<boolean>} True if code is valid
 */
export async function verifyTOTP(secret, code) {
  try {
    // Clean the code
    const cleanCode = code.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) return false;
    
    // Decode base32 secret
    const bytes = base32ToBytes(secret);
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw', 
      bytes, 
      { name: 'HMAC', hash: 'SHA-1' }, 
      false, 
      ['sign']
    );

    // Get current time window (30-second periods)
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const currentWindow = Math.floor(epoch / timeStep);

    // Check current window and adjacent windows (allowing for slight time drift)
    for (let offset = -1; offset <= 1; offset++) {
      const counter = BigInt(currentWindow + offset);
      
      // Convert counter to buffer (8 bytes, big-endian)
      const counterBuffer = new ArrayBuffer(8);
      const counterView = new DataView(counterBuffer);
      counterView.setBigUint64(0, counter, false); // false = big-endian
      
      // Generate HMAC
      const hmac = await crypto.subtle.sign('HMAC', key, counterBuffer);
      const hmacBytes = new Uint8Array(hmac);
      
      // Dynamic truncation (RFC 4226)
      const offset2 = hmacBytes[19] & 0xf;
      const codeBinary = ((hmacBytes[offset2] & 0x7f) << 24) |
                         ((hmacBytes[offset2 + 1] & 0xff) << 16) |
                         ((hmacBytes[offset2 + 2] & 0xff) << 8) |
                         (hmacBytes[offset2 + 3] & 0xff);
      
      // Get 6-digit code
      const totp = (codeBinary % 1000000).toString().padStart(6, '0');
      
      if (totp === cleanCode) {
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error('TOTP verify error:', e);
    return false;
  }
}

/**
 * Check if a user needs to enable 2FA based on their role and modules
 * @param {string} userId - User's ID
 * @returns {Promise<boolean>} True if user needs to enable 2FA
 */
export async function check2FARequirement(userId) {
  try {
    // Get user's profile with role and company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id, totp_enabled, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return false;
    }

    // Superadmin always requires 2FA
    if (profile.role === 'superadmin') {
      return !profile.totp_enabled;
    }

    // If user already has 2FA enabled, no need to enforce
    if (profile.totp_enabled) {
      return false;
    }

    // Check if user's company has firearm module
    if (profile.company_id) {
      const { data: addons, error: addonsError } = await supabase
        .from('company_addons')
        .select('addon_key')
        .eq('company_id', profile.company_id)
        .eq('active', true);

      if (!addonsError && addons) {
        const hasFirearmModule = addons.some(a => a.addon_key === 'firearm_register');
        if (hasFirearmModule) {
          return true; // User needs to enable 2FA
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking 2FA requirement:', error);
    return false;
  }
}

/**
 * Enable 2FA for a user
 * @param {string} userId - User's ID
 * @param {string} secret - Base32 secret
 * @returns {Promise<boolean>} True if successful
 */
export async function enable2FA(userId, secret) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        totp_secret: secret,
        totp_enabled: true 
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return false;
  }
}

/**
 * Disable 2FA for a user (admin only)
 * @param {string} userId - User's ID
 * @returns {Promise<boolean>} True if successful
 */
export async function disable2FA(userId) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        totp_secret: null,
        totp_enabled: false 
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return false;
  }
}

/**
 * Get 2FA setup data for a user
 * @param {string} email - User's email
 * @returns {Object} Secret and QR code URL
 */
export function get2FASetupData(email) {
  const secret = generateTOTPSecret();
  const qrUrl = generateTOTPQR(email, secret);
  return { secret, qrUrl };
}