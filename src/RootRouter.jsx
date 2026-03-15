import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from './lib/constants';

import { AuthProvider } from './context/AuthContext';
import Toast from './components/Toast';
import { AppShellWithAddons } from './AppShell';
import { SuperAdminShell } from './superadmin/SuperAdminShell';

function RootRouter() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
    return window.location.search.toLowerCase().includes('admin') || window.location.hash.toLowerCase() === '#admin';
  });

  // Persist affiliate referral handle to localStorage so it survives page navigation
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.match(/^[a-z0-9-]+$/i)) localStorage.setItem('opdesk_ref', ref);
  }, []);

  // Listen for hash changes
  useEffect(() => {
    function onHash() {
      setIsSuperAdmin(window.location.hash.toLowerCase() === '#admin' || window.location.search.toLowerCase().includes('admin'));
    }
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };
  }, []);

  if (isSuperAdmin) {
    return <SuperAdminShell onExit={()=>{ window.history.replaceState(null,'',window.location.pathname); setIsSuperAdmin(false); }}/>;
  }

  return (
    <AuthProvider>
      <AppShellWithAddons/>
      <Toast/>
    </AuthProvider>
  );
}


export default RootRouter;
