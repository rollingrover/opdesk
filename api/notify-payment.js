// api/notify-payment.js
// PayFast Instant Transaction Notification (ITN) handler
// Vercel Serverless Function — deployed at https://opdesk.app/api/notify-payment
//
// Required Vercel environment variables:
//   PAYFAST_MERCHANT_ID      — your PayFast merchant ID
//   PAYFAST_MERCHANT_KEY     — your PayFast merchant key
//   PAYFAST_PASSPHRASE       — your PayFast passphrase (set in PayFast dashboard)
//   PAYFAST_SANDBOX          — "true" or "false"
//   SUPABASE_URL             — your Supabase project URL
//   SUPABASE_SERVICE_KEY     — Supabase service_role key (NOT the anon key)
//
// NOTE: Use SUPABASE_SERVICE_KEY (service_role), NOT the VITE_SUPABASE_ANON_KEY.
//       The service role key bypasses RLS and is safe here because this file
//       runs server-side only — it is never exposed to the browser.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ─── Config ─────────────────────────────────────────────────────────────────

const SANDBOX = process.env.PAYFAST_SANDBOX === 'true';

const PAYFAST_VALID_HOSTS = SANDBOX
  ? ['sandbox.payfast.co.za', 'w1w.sandbox.payfast.co.za', 'w2w.sandbox.payfast.co.za']
  : ['www.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];

const PAYFAST_VALIDATE_URL = SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/query/validate'
  : 'https://www.payfast.co.za/eng/query/validate';

// Valid tiers accepted from PayFast metadata
const VALID_TIERS = ['free', 'basic', 'standard', 'premium'];

// ─── Supabase (service role — server-side only) ───────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable');
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the signature string PayFast expects and compute MD5.
 * Rules: sort params in the order they were POSTed (PayFast sends them sorted),
 * exclude 'signature', URL-encode values, join as key=value&..., then MD5.
 */
function computeSignature(params, passphrase) {
  // Build ordered query string from all fields except signature
  const parts = Object.entries(params)
    .filter(([k]) => k !== 'signature')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const payload = passphrase
    ? `${parts}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : parts;

  return crypto.createHash('md5').update(payload).digest('hex');
}

/**
 * Verify the request actually came from a PayFast IP by checking
 * the resolved hostnames of PayFast's known IP ranges.
 * In production PayFast POSTs from specific IPs; in sandbox we skip this check.
 */
async function verifySourceIP(req) {
  if (SANDBOX) return true; // Skip IP check in sandbox

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';

  if (!ip) return false;

  try {
    const { promises: dns } = await import('dns');
    const hostnames = await dns.reverse(ip);
    return hostnames.some(h => PAYFAST_VALID_HOSTS.some(valid => h.endsWith(valid)));
  } catch {
    // DNS reverse lookup failed — fail open in sandbox, fail closed in production
    return false;
  }
}

/**
 * Ask PayFast to confirm the payment data is genuine.
 * This is the server-to-server validation step.
 */
async function validateWithPayfast(rawBody) {
  const res = await fetch(PAYFAST_VALIDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
  });

  if (!res.ok) return false;
  const text = await res.text();
  return text.trim().toUpperCase() === 'VALID';
}

/**
 * Parse application/x-www-form-urlencoded body from a Vercel request.
 * Vercel does not auto-parse this content type.
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        const params = Object.fromEntries(new URLSearchParams(data).entries());
        resolve({ params, raw: data });
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Determine if this ITN is for a subscription upgrade or an add-on purchase.
 * UpgradeModal sets custom_str2 as JSON with a `type` field.
 * AddOnPurchaseModal sets m_payment_id as `{companyId}_addon_{resource}_{qty}_{ts}`.
 */
function parsePaymentIntent(params) {
  // Try JSON metadata from UpgradeModal (custom_str2)
  if (params.custom_str2) {
    try {
      const meta = JSON.parse(params.custom_str2);
      if (meta.type === 'subscription' && VALID_TIERS.includes(meta.tier)) {
        return { kind: 'subscription', meta };
      }
    } catch {
      // custom_str2 was not JSON — fall through
    }
  }

  // Try addon pattern from AddOnPurchaseModal (m_payment_id)
  // Format: {companyId}_addon_{resource}_{qty}_{timestamp}
  if (params.m_payment_id) {
    const match = params.m_payment_id.match(
      /^([0-9a-f-]{36})_addon_([a-z_]+)_(\d+)_\d+$/i
    );
    if (match) {
      return {
        kind: 'addon',
        companyId: match[1],
        resource: match[2],
        qty: parseInt(match[3], 10),
      };
    }
  }

  return null;
}

// ─── DB Operations ───────────────────────────────────────────────────────────

/**
 * Upgrade a company's subscription tier.
 * Uses the same sa_update_company RPC that the superadmin panel uses.
 */
async function upgradeSubscription(supabase, companyId, tier, billing) {
  // Calculate expiry: +1 month or +1 year from now
  const now = new Date();
  const expires = new Date(now);
  if (billing === 'annual') {
    expires.setFullYear(expires.getFullYear() + 1);
  } else {
    expires.setMonth(expires.getMonth() + 1);
  }

  const { error } = await supabase.rpc('sa_update_company', {
    p_company_id: companyId,
    p_tier: tier,
    p_expires_at: expires.toISOString(),
  });

  if (error) throw error;

  return { tier, expires: expires.toISOString() };
}

/**
 * Grant an add-on slot to a company.
 * Inserts into company_addons, same shape as handleSandboxGrant() in the frontend.
 */
async function grantAddon(supabase, companyId, resource, qty, pricePaid) {
  // Derive unit price from what was paid
  const unitPrice = qty > 0 ? Math.round((pricePaid / qty) * 100) / 100 : 0;

  const { error } = await supabase.from('company_addons').insert([{
    company_id: companyId,
    addon_key: resource,
    addon_type: resource,
    quantity: qty,
    price_per_unit: unitPrice,
    billing_cycle: 'monthly',
    active: true,
    note: 'Self-purchased via PayFast ITN',
    created_at: new Date().toISOString(),
  }]);

  if (error) throw error;

  return { resource, qty };
}

/**
 * Log the raw ITN to a `payfast_itn_log` table if it exists.
 * This is optional but invaluable for debugging — create the table with:
 *
 *   create table payfast_itn_log (
 *     id uuid primary key default gen_random_uuid(),
 *     created_at timestamptz default now(),
 *     payment_status text,
 *     pf_payment_id text,
 *     m_payment_id text,
 *     amount_gross numeric,
 *     company_id uuid,
 *     intent jsonb,
 *     raw_params jsonb,
 *     outcome text,
 *     error text
 *   );
 */
async function logITN(supabase, params, intent, outcome, errorMsg) {
  try {
    await supabase.from('payfast_itn_log').insert([{
      payment_status: params.payment_status,
      pf_payment_id: params.pf_payment_id,
      m_payment_id: params.m_payment_id,
      amount_gross: parseFloat(params.amount_gross) || null,
      company_id: params.custom_str1 || intent?.companyId || null,
      intent: intent ? JSON.stringify(intent) : null,
      raw_params: JSON.stringify(params),
      outcome,
      error: errorMsg || null,
    }]);
  } catch {
    // Logging is best-effort — never block the ITN response
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // PayFast only POSTs to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let params = {};
  let rawBody = '';

  // ── Step 1: Parse body ───────────────────────────────────────────────────
  try {
    ({ params, raw: rawBody } = await parseBody(req));
  } catch (e) {
    console.error('[PayFast ITN] Body parse error:', e.message);
    return res.status(400).send('Bad Request');
  }

  console.log('[PayFast ITN] Received:', {
    payment_status: params.payment_status,
    pf_payment_id: params.pf_payment_id,
    amount_gross: params.amount_gross,
    custom_str1: params.custom_str1,
    m_payment_id: params.m_payment_id,
  });

  const supabase = getSupabase();

  // ── Step 2: Verify source IP ─────────────────────────────────────────────
  const ipOk = await verifySourceIP(req);
  if (!ipOk) {
    console.warn('[PayFast ITN] Request from unrecognised IP — rejected');
    await logITN(supabase, params, null, 'rejected_ip', 'IP verification failed');
    return res.status(200).send('OK'); // Always 200 to PayFast; we just ignore it
  }

  // ── Step 3: Verify signature ─────────────────────────────────────────────
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';
  const expectedSig = computeSignature(params, passphrase);

  if (params.signature !== expectedSig) {
    console.warn('[PayFast ITN] Signature mismatch:', {
      received: params.signature,
      expected: expectedSig,
    });
    await logITN(supabase, params, null, 'rejected_signature', 'Signature mismatch');
    return res.status(200).send('OK');
  }

  // ── Step 4: Validate with PayFast server-to-server ───────────────────────
  const isValid = await validateWithPayfast(rawBody);
  if (!isValid) {
    console.warn('[PayFast ITN] Server-to-server validation failed');
    await logITN(supabase, params, null, 'rejected_validation', 'PayFast validation failed');
    return res.status(200).send('OK');
  }

  // ── Step 5: Only process COMPLETE payments ───────────────────────────────
  if (params.payment_status !== 'COMPLETE') {
    console.log('[PayFast ITN] Non-COMPLETE status:', params.payment_status);
    await logITN(supabase, params, null, `ignored_${params.payment_status}`, null);
    return res.status(200).send('OK');
  }

  // ── Step 6: Verify merchant credentials ──────────────────────────────────
  const expectedMerchantId = process.env.PAYFAST_MERCHANT_ID;
  if (params.merchant_id !== expectedMerchantId) {
    console.warn('[PayFast ITN] Merchant ID mismatch');
    await logITN(supabase, params, null, 'rejected_merchant', 'Merchant ID mismatch');
    return res.status(200).send('OK');
  }

  // ── Step 7: Parse payment intent ─────────────────────────────────────────
  const intent = parsePaymentIntent(params);
  if (!intent) {
    console.warn('[PayFast ITN] Could not determine payment intent from params');
    await logITN(supabase, params, null, 'ignored_unknown_intent', 'No recognisable intent');
    return res.status(200).send('OK');
  }

  console.log('[PayFast ITN] Payment intent:', intent);

  // ── Step 8: Apply the payment ─────────────────────────────────────────────
  try {
    if (intent.kind === 'subscription') {
      const { meta } = intent;
      const companyId = params.custom_str1 || meta.companyId;

      if (!companyId) throw new Error('No company ID in subscription payment');

      const result = await upgradeSubscription(
        supabase,
        companyId,
        meta.tier,
        meta.billing || 'monthly'
      );

      console.log('[PayFast ITN] Subscription upgraded:', result);
      await logITN(supabase, params, intent, 'success_subscription', null);

    } else if (intent.kind === 'addon') {
      const companyId = intent.companyId || params.custom_str1;

      if (!companyId) throw new Error('No company ID in addon payment');

      const amountPaid = parseFloat(params.amount_gross) || 0;

      const result = await grantAddon(
        supabase,
        companyId,
        intent.resource,
        intent.qty,
        amountPaid
      );

      console.log('[PayFast ITN] Add-on granted:', result);
      await logITN(supabase, params, intent, 'success_addon', null);
    }

    // PayFast requires a 200 response to confirm receipt
    return res.status(200).send('OK');

  } catch (e) {
    console.error('[PayFast ITN] DB operation failed:', e.message);
    await logITN(supabase, params, intent, 'error', e.message);

    // Return 200 anyway — returning 500 causes PayFast to retry indefinitely.
    // The error is logged; you can replay it manually from payfast_itn_log.
    return res.status(200).send('OK');
  }
}

// ─── Disable Vercel's automatic body parsing ──────────────────────────────
// We need the raw body for signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};
