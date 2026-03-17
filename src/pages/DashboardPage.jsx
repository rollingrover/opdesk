import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase.js';
import { TIERS, TIER_LIMITS, TIER_FEATURES, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS_MAP, LABELS, ADDON_TYPES, getCurrencySymbol, getCompanyRegion, Icon } from '../lib/constants.jsx';
import PageHeader from '../components/PageHeader.jsx';

// ─── DASHBOARD ───────────────────────────
function StatCard({ label, value, icon, color = 'navy', sub }) {
  const bg = { navy: '#0F2540', gold: '#D4A853', green: '#22c55e', blue: '#3b82f6', red: '#ef4444' };
  const fg = { navy: '#D4A853', gold: '#0F2540', green: 'white', blue: 'white', red: 'white' };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-32 flex flex-col items-center justify-center w-full text-center">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: bg[color] || bg.navy, color: fg[color] || fg.navy }}
      >
        <Icon name={icon} size={24} />
      </div>
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-navy leading-tight break-words">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 leading-tight">{sub}</p>}
    </div>
  );
}

function DashboardPage() {
  const { company, tier, limits, features, addons } = useAuth();
  const [stats, setStats] = useState({ 
    bookings: 0, guests: 0, revenue: 0, upcoming: 0, 
    confirmed: 0, pending: 0, cancelled: 0, 
    vehicles: 0, guides: 0, drivers: 0,
    activeVehicles: 0, activeGuides: 0, activeDrivers: 0,
    monthRevenue: 0, clientCount: 0, invoiceTotal: 0,
    invoicePaid: 0, invoiceOutstanding: 0, invoiceDraft: 0
  });
  const [recent, setRecent] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [topAct, setTopAct] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState([]);

  useEffect(() => {
    if (!company) return;
    
    async function load() {
      try {
        const now = new Date().toISOString();
        const mon1 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        
        const [b, g, u, v, gd] = await Promise.all([
          supabase.from('bookings').select('id,total_amount,status,activity_type,start_date,created_at,guest_name,booking_ref').eq('company_id', company.id),
          supabase.from('guests').select('id', { count: 'exact' }).eq('company_id', company.id),
          supabase.from('bookings').select('id', { count: 'exact' }).eq('company_id', company.id).gte('start_date', now),
          supabase.from('vehicles').select('id,status,registration,roadworthy_expiry,insurance_expiry').eq('company_id', company.id),
          supabase.from('guides').select('id,status,full_name,cert_fgasa_expiry,cert_first_aid_expiry,cert_firearms_expiry,cert_pdp_expiry,cert_marine_expiry,cert_sks_expiry,cert_ph_expiry,cert_track_sign_expiry').eq('company_id', company.id),
        ]);
        
        // Drivers query (commented out due to 400 error)
        const dr = { data: [] };
        
        const bData = b.data || [];
        const revenue = bData.filter(x => x.status === 'confirmed' || x.status === 'completed').reduce((s, x) => s + (x.total_amount || 0), 0);
        const monthRev = bData.filter(x => (x.status === 'confirmed' || x.status === 'completed') && x.created_at >= mon1).reduce((s, x) => s + (x.total_amount || 0), 0);
        const confirmed = bData.filter(x => x.status === 'confirmed').length;
        const pending = bData.filter(x => x.status === 'pending').length;
        const cancelled = bData.filter(x => x.status === 'cancelled').length;

        // Monthly revenue for last 6 months
        const revByMonth = {};
        bData.forEach(x => {
          if (!x.created_at) return;
          const mo = x.created_at.slice(0, 7);
          if (!revByMonth[mo]) revByMonth[mo] = 0;
          if (x.status === 'confirmed' || x.status === 'completed') revByMonth[mo] += (x.total_amount || 0);
        });
        
        const monthKeys = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - 5 + i);
          return d.toISOString().slice(0, 7);
        });
        
        setMonthly(monthKeys.map(k => ({ month: k.slice(5), rev: revByMonth[k] || 0 })));

        // Top activity types
        const actCount = {};
        bData.forEach(x => { if (x.activity_type) actCount[x.activity_type] = (actCount[x.activity_type] || 0) + 1; });
        setTopAct(Object.entries(actCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ name: k, count: v })));

        // Client & Invoice metrics (if clientList feature enabled)
        let clientCount = 0, invoiceTotal = 0, invoicePaid = 0, invoiceOutstanding = 0, invoiceDraft = 0;
        if (features?.clientList) {
          const [ci] = await Promise.all([
            supabase.from('client_invoices').select('id,status,total').eq('company_id', company.id),
          ]);
          const invData = ci.data || [];
          clientCount = (await supabase.from('guests').select('id', { count: 'exact' }).eq('company_id', company.id)).count || 0;
          invoiceTotal = invData.length;
          invoicePaid = invData.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
          invoiceOutstanding = invData.filter(i => i.status === 'sent').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
          invoiceDraft = invData.filter(i => i.status === 'draft').length;
        }

        setStats({
          bookings: bData.length, guests: g.count || 0, revenue, upcoming: u.count || 0,
          confirmed, pending, cancelled, monthRevenue: monthRev,
          vehicles: (v.data || []).length, guides: (gd.data || []).length, drivers: (dr.data || []).length,
          clientCount, invoiceTotal, invoicePaid, invoiceOutstanding, invoiceDraft,
          activeVehicles: (v.data || []).filter(x => x.status === 'available').length,
          activeGuides: (gd.data || []).filter(x => x.status === 'active').length,
          activeDrivers: (dr.data || []).filter(x => x.status === 'available').length,
        });

        // Cert expiry alerts
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const in30 = new Date(today); in30.setDate(today.getDate() + 30);
        
        function expiryStatus(dateStr) {
          if (!dateStr) return null;
          const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
          if (d < today) return 'expired';
          if (d <= in30) return 'soon';
          return null;
        }
        
        const alerts = [];
        const CERT_LABELS = {
          cert_fgasa_expiry: 'FGASA', cert_first_aid_expiry: 'First Aid', cert_firearms_expiry: 'Firearms',
          cert_pdp_expiry: 'PDP', cert_marine_expiry: 'Marine', cert_sks_expiry: 'SKS',
          cert_ph_expiry: 'PH', cert_track_sign_expiry: 'Track & Sign',
          license_expiry: 'Licence', roadworthy_expiry: 'Roadworthy', insurance_expiry: 'Insurance',
        };
        
        (gd.data || []).forEach(p => {
          Object.keys(CERT_LABELS).forEach(k => {
            const st = expiryStatus(p[k]);
            if (st) alerts.push({ type: st, who: p.full_name || 'Guide', cert: CERT_LABELS[k], date: p[k], category: 'guide' });
          });
        });
        
        (dr.data || []).forEach(p => {
          ['cert_pdp_expiry', 'cert_first_aid_expiry', 'license_expiry'].forEach(k => {
            const st = expiryStatus(p[k]);
            if (st) alerts.push({ type: st, who: p.full_name || 'Driver', cert: CERT_LABELS[k], date: p[k], category: 'driver' });
          });
        });
        
        (v.data || []).forEach(p => {
          ['roadworthy_expiry', 'insurance_expiry'].forEach(k => {
            const st = expiryStatus(p[k]);
            if (st) alerts.push({ type: st, who: p.registration || 'Vehicle', cert: CERT_LABELS[k], date: p[k], category: 'vehicle' });
          });
        });
        
        alerts.sort((a, b) => new Date(a.date) - new Date(b.date));
        setExpiryAlerts(alerts);
        
        const { data: rb } = await supabase.from('bookings').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(8);
        setRecent(rb || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [company, features]);

  const statusColor = { confirmed: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red', completed: 'badge-blue' };
  const bookingLimit = limits?.bookings;
  const pct = bookingLimit ? Math.min(100, Math.round((stats.bookings / bookingLimit) * 100)) : null;
  const maxMonthRev = Math.max(...monthly.map(m => m.rev), 1);

  return (
    <div className="px-0 py-6">
      <PageHeader 
        title="Dashboard" 
        subtitle={`${tier === 'free' && addons?.some(a => a.active) ? 'Free+' : TIERS[tier]?.label || 'Free'} Plan`}
      />
      
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top KPI row - 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Bookings" value={stats.bookings} icon="bookings" color="navy" />
            <StatCard label="Total Guests" value={stats.guests} icon="guests" color="gold" />
            <StatCard label="Upcoming" value={stats.upcoming} icon="calendar" color="blue" />
            <StatCard label="Total Revenue" value={'R' + stats.revenue.toLocaleString()} icon="billing" color="green" />
          </div>

          {/* Second row: booking status breakdown - 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Confirmed" value={stats.confirmed} icon="check" color="green" />
            <StatCard label="Pending" value={stats.pending} icon="alert" color="gold" />
            <StatCard label="Cancelled" value={stats.cancelled} icon="x" color="red" />
            <StatCard label="This Month" value={'R' + (stats.monthRevenue || 0).toLocaleString()} icon="billing" color="navy" />
          </div>

          {/* Client & Invoice metrics (Standard+ with clientList) - 4 cards */}
          {features?.clientList && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Clients" value={stats.clientCount} icon="clients" color="navy" />
              <StatCard label="Invoices" value={stats.invoiceTotal} icon="invoice" color="gold" />
              <StatCard label="Paid" value={'R' + (stats.invoicePaid || 0).toLocaleString()} icon="check" color="green" />
              <StatCard label="Outstanding" value={'R' + (stats.invoiceOutstanding || 0).toLocaleString()} icon="alert" color="red" />
            </div>
          )}

          {/* Resource availability - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-navy">Vehicles</span>
                <span className="text-xs text-gray-500">{stats.activeVehicles}/{stats.vehicles} available</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-400 transition-all duration-300" 
                  style={{ width: `${stats.vehicles ? Math.round((stats.activeVehicles / stats.vehicles) * 100) : 0}%` }}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-navy">Guides</span>
                <span className="text-xs text-gray-500">{stats.activeGuides}/{stats.guides} active</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-amber-400 transition-all duration-300" 
                  style={{ width: `${stats.guides ? Math.round((stats.activeGuides / stats.guides) * 100) : 0}%` }}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-navy">Drivers</span>
                <span className="text-xs text-gray-500">{stats.activeDrivers}/{stats.drivers} available</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-green-400 transition-all duration-300" 
                  style={{ width: `${stats.drivers ? Math.round((stats.activeDrivers / stats.drivers) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Charts row - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue bar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-navy mb-4 text-sm">Revenue — Last 6 Months</h3>
              <div className="flex items-end justify-around h-32 gap-2">
                {monthly.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 max-w-[40px]">
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">
                      R{m.rev > 999 ? Math.round(m.rev / 1000) + 'k' : m.rev}
                    </span>
                    <div 
                      className="w-full rounded-t bg-gold transition-all duration-300" 
                      style={{ height: `${Math.max(4, Math.round((m.rev / maxMonthRev) * 60))}px` }}
                    />
                    <span className="text-[10px] text-gray-500">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-navy mb-4 text-sm">Bookings by Activity</h3>
              {topAct.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-6">No bookings yet</div>
              ) : (
                <div className="space-y-3">
                  {topAct.map(a => {
                    const pct2 = Math.round((a.count / stats.bookings) * 100) || 0;
                    return (
                      <div key={a.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm capitalize text-gray-600">{a.name}</span>
                          <span className="text-sm font-semibold text-navy">
                            {a.count} <span className="text-gray-400 font-normal text-xs">({pct2}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-navy transition-all duration-300" 
                            style={{ width: `${pct2}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Booking limit bar */}
          {bookingLimit && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-navy">Booking Limit</span>
                <span className="text-sm text-gray-500">{stats.bookings}/{bookingLimit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${pct}%`,
                    background: pct > 85 ? '#ef4444' : pct > 60 ? '#eab308' : '#D4A853'
                  }}
                />
              </div>
              {pct > 80 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <Icon name="alert" size={12} /> Approaching limit
                </p>
              )}
            </div>
          )}

          {/* Recent bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-navy">Recent Bookings</h3>
            </div>
            
            {recent.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No bookings yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recent.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{b.booking_ref}</code>
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800">{b.guest_name}</td>
                        <td className="px-4 py-2 capitalize text-gray-500">{b.activity_type}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {b.start_date ? new Date(b.start_date).toLocaleDateString('en-ZA') : '—'}
                        </td>
                        <td className="px-4 py-2 font-semibold text-navy">
                          R{(b.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`badge ${statusColor[b.status] || 'badge-gray'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cert & Document Expiry Alerts */}
          {expiryAlerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="alert" size={18} className="text-red-500" />
                <h3 className="font-bold text-navy">Expiry Alerts</h3>
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {expiryAlerts.filter(a => a.type === 'expired').length > 0 && (
                    <span className="text-red-600 font-semibold">
                      {expiryAlerts.filter(a => a.type === 'expired').length} expired · 
                    </span>
                  )}
                  {expiryAlerts.filter(a => a.type === 'soon').length} expiring soon
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {expiryAlerts.map((a, i) => {
                  const d = new Date(a.date);
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((d - today) / 86400000);
                  const isExpired = a.type === 'expired';
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                        isExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isExpired ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="font-semibold text-sm text-gray-800">{a.who}</span>
                          <span className="text-gray-400 text-xs mx-1">·</span>
                          <span className="text-sm text-gray-600">{a.cert}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            a.category === 'guide' ? 'bg-green-100 text-green-700' :
                            a.category === 'driver' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {a.category}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right text-sm font-semibold flex-shrink-0 ml-3 ${
                        isExpired ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {isExpired
                          ? `Expired ${Math.abs(daysLeft)}d ago`
                          : daysLeft === 0 ? 'Today!'
                          : `${daysLeft}d left`}
                        <div className="text-xs font-normal text-gray-400">
                          {d.toLocaleDateString('en-ZA')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;