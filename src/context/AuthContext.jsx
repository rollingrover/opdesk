import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { TIERS, TIER_LIMITS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, getCurrencySymbol, getCompanyRegion } from '../lib/constants.jsx';

// Create Auth Context
export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);

// Auth Provider Component
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addons, setAddons] = useState([]);

  // Load user data when session changes
  async function loadData(user) {
    setLoading(true);
    try {
      // Get user profile and company data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);

      if (profileData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single();

        if (!companyError && companyData) {
          setCompany(companyData);
          
          // Load company add-ons
          const { data: addonData } = await supabase
            .from('company_addons')
            .select('*')
            .eq('company_id', companyData.id)
            .eq('active', true);
          
          setAddons(addonData || []);
        }
      }
    } catch (e) {
      console.error('loadData error', e);
    } finally {
      setLoading(false);
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadData(session.user);
      } else {
        setCompany(null);
        setProfile(null);
        setAddons([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in function
  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  // Sign up function
  async function signUp(email, password, companyName, ownerName, country, currency, language) {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: ownerName
          }
        }
      });
      
      if (error) return { error };
      
      const userId = data?.user?.id;
      if (!userId) return { error: { message: 'Account created — please check your email to confirm, then sign in.' } };
      
      // Capture referral handle from URL or localStorage
      const refHandle = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('opdesk_ref') || null;
      if (refHandle) localStorage.removeItem('opdesk_ref');
      
      // Create company and profile using RPC
      const { error: e2 } = await supabase.rpc('create_company_and_profile', {
        user_id: userId,
        company_name: companyName,
        owner_name: ownerName,
        p_country: country || 'South Africa',
        p_currency: currency || 'ZAR',
        p_language: language || 'en',
        p_referred_by: refHandle
      });
      
      if (e2) return { error: e2 };
      return { data };
    } catch(err) {
      return { error: { message: err.message || 'Registration failed. Please try again.' } };
    }
  }

  // Sign out function - FIXED
  async function signOut() {
    await supabase.auth.signOut();
    // Force a hard reload to clear all state
    window.location.href = '/';
  }

  // Reload user data
  async function reload() {
    if (session?.user) {
      await loadData(session.user);
    }
  }

  // Compute derived values
  const tier = company?.subscription_tier || 'free';
  const baseLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  
  // Compute effective limits with add-ons
  const limits = Object.fromEntries(
    Object.entries(baseLimits).map(([k, v]) => {
      if (v === null) return [k, null];
      const extra = addons
        .filter(a => a.addon_key === k && a.active)
        .reduce((sum, a) => sum + (a.quantity || 1), 0);
      return [k, v + extra];
    })
  );

  // Compute features (base + add-ons)
  const features = {
    ...TIER_FEATURES[tier],
    firearmRegister: TIER_FEATURES[tier]?.firearmRegister || addons.some(a => a.addon_key === 'firearm_register' && a.active),
    whiteLabel: TIER_FEATURES[tier]?.whiteLabel || addons.some(a => a.addon_key === 'white_label' && a.active),
    watermark: !(TIER_FEATURES[tier]?.watermark === false) && !addons.some(a => a.addon_key === 'no_watermark' && a.active),
    clientList: TIER_FEATURES[tier]?.clientList || addons.some(a => a.addon_key === 'client_list' && a.active),
  };

  const role = profile?.role || 'owner';
  const currencySymbol = getCurrencySymbol(company?.currency);
  const appLanguage = company?.language || 'en';
  const companyRegion = getCompanyRegion(company?.country);

  const value = {
    session,
    company,
    profile,
    loading,
    tier,
    limits,
    baseLimits,
    addons,
    features,
    role,
    currencySymbol,
    appLanguage,
    companyRegion,
    signIn,
    signUp,
    signOut,
    reload,
    setCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}