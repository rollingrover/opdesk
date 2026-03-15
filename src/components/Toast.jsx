import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';

// ─── TOAST ───────────────────────────────
let _toastFn = null;
function Toast() {
  const [toasts, setToasts] = useState([]);
  _toastFn = (msg, type='success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${t.type==='success'?'bg-green-500 text-white':t.type==='error'?'bg-red-500 text-white':'bg-navy text-gold'}`}>
          <Icon name={t.type==='success'?'check':t.type==='error'?'x':'info'} size={14}/>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
const toast = (msg, type) => _toastFn && _toastFn(msg, type);


export default Toast;
