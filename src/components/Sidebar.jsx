import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants';

// ─── SIDEBAR ─────────────────────────────
function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  const { company, profile, tier, features, role, signOut, addons } = useAuth();
  const [addonResource, setAddonResource] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [resourceKey] = useState(null);
  const sym = { free:'◦', basic:'◈', standard:'◉', premium:'✦' };
  const tierBadge = { free:'badge-gray', basic:'badge-blue', standard:'badge-purple', premium:'badge-navy' };

  const nav = [
    { id:'dashboard', label:'Dashboard', icon:'dashboard' },
    { id:'bookings', label:'Bookings', icon:'bookings' },
    { id:'calendar', label:'Calendar', icon:'calendar' },
    null,
    { id:'tours', label:'Tours', icon:'tours' },
    { id:'safaris', label:'Safaris', icon:'safaris' },
    { id:'shuttles', label:'Shuttles', icon:'shuttles' },
    { id:'charters', label:'Charters', icon:'charters' },
    { id:'trails', label:'Trails', icon:'trails' },
    null,
    { id:'guests', label:'Guests', icon:'guests' },
    ...(features.clientList ? [{ id:'clients', label:'Clients', icon:'clients' }] : []),
    { id:'guides', label:'Guides', icon:'guides' },
    { id:'drivers', label:'Drivers', icon:'drivers' },
    { id:'vehicles', label:'Vehicles', icon:'vehicles' },
    { id:'schedules', label:'Schedules', icon:'schedules' },
    null,
    ...(features.firearmRegister ? [{ id:'firearm', label:'Firearm Register', icon:'firearm' }, null] : []),
    { id:'users', label:'Users', icon:'users' },
    { id:'billing', label:'Billing', icon:'billing' },
    { id:'settings', label:'Settings', icon:'settings' },
    null,
    ...(tier !== 'free' || addons.some(a=>a.active) ? [{ id:'marketing', label:'Marketing Page', icon:'marketing' }] : []),
  ];

  const agentPages = new Set(['dashboard','bookings','guests','calendar']);

  return (
    <>
    <div className={`flex flex-col h-screen fixed left-0 top-0 z-30 ${collapsed?'w-16':'w-56'}`} style={{background:'#0F2540',transition:'width 0.2s'}}>
      <div className="flex items-center gap-3 px-4 py-5 cursor-pointer" onClick={()=>setCollapsed(!collapsed)}>
        <Logo size={collapsed?26:32}/>
        {!collapsed && <div><div className="font-black text-white text-lg leading-none">OpDesk</div><div className="text-xs font-semibold tracking-widest uppercase leading-none mt-0.5" style={{color:'#D4A853'}}>Command Centre</div></div>}
      </div>
      {!collapsed && <div className="px-4 pb-3 border-b" style={{borderColor:'rgba(255,255,255,0.1)'}}><p className="text-xs truncate" style={{color:'rgba(255,255,255,0.5)'}}>{company?.name}</p></div>}

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {nav.map((item, i) => {
          if (!item) return <div key={i} className="my-1 border-t" style={{borderColor:'rgba(255,255,255,0.1)'}}/>;
          if (role !== 'owner' && role !== 'superadmin' && !agentPages.has(item.id)) return null;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={()=>setPage(item.id)}
              className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-left ${active?'active':'hover:text-white'}`}
              style={{color: active ? '#D4A853' : 'rgba(255,255,255,0.65)'}}>
              <Icon name={item.icon} size={18} className="flex-shrink-0"/>
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t" style={{borderColor:'rgba(255,255,255,0.1)'}}>
        {!collapsed && (
          <div className="flex items-center justify-between mb-2">
            <span className={`badge ${tier==='free' && addons.some(a=>a.active) ? 'badge-green' : tierBadge[tier]} text-xs`}>{sym[tier]} {tier==='free' && addons.some(a=>a.active) ? 'Free+' : TIERS[tier].label}</span>
            {tier !== 'premium' && <button className="text-xs font-semibold flex items-center gap-1" style={{color:'rgba(212,168,83,0.7)'}} onClick={()=>setShowUpgrade(true)}><Icon name="upgrade" size={12}/>Upgrade</button>}
          </div>
        )}
        {!collapsed && <div className="mb-2"><div className="text-xs truncate" style={{color:'rgba(255,255,255,0.5)'}}>{profile?.full_name}</div><div className="text-xs capitalize" style={{color:'rgba(255,255,255,0.3)'}}>{role}</div></div>}
        <button onClick={signOut} className={`flex items-center gap-2 text-xs ${collapsed?'justify-center w-full':''}`} style={{color:'rgba(255,255,255,0.4)'}}>
          <Icon name="logout" size={14}/>{!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
    {showUpgrade && resourceKey && <AddOnPurchaseModal resource={resourceKey} onClose={()=>setShowUpgrade(false)}/> }
      {showUpgrade && !resourceKey && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </>
  );
}


export default Sidebar;
