import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';

// ─── PAGE HEADER ─────────────────────────
function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div><h1 className="text-2xl font-black text-navy">{title}</h1>{subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function StatCard({ label, value, icon, color='navy', sub }) {
  const bg = { navy:'#0F2540', gold:'#D4A853', green:'#22c55e', blue:'#3b82f6' };
  const fg = { navy:'#D4A853', gold:'#0F2540', green:'white', blue:'white' };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p><p className="text-3xl font-black text-navy mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:bg[color]||bg.navy,color:fg[color]||fg.navy}}><Icon name={icon} size={18}/></div>
      </div>
    </div>
  );
}


export default PageHeader;
