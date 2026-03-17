import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function SARevenueOverview() {
  const [stats, setStats] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [s, c] = await Promise.all([
      supabase.rpc('sa_get_revenue_stats'),
      supabase.rpc('sa_get_all_companies'),
    ]);
    setStats(s.data || []);
    setCompanies(c.data || []);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ color: '#6b7280', padding: 40, textAlign: 'center' }}>Loading revenue data...</div>;
  }

  const TIER_PRICE = { free: 0, basic: 349, standard: 1099, premium: 2499 };
  const tierColor = { free: '#6b7280', basic: '#3b82f6', standard: '#9333ea', premium: '#D4A853' };

  const liveMRR = companies.reduce((s, c) => s + (TIER_PRICE[c.subscription_tier || 'free'] || 0), 0);
  const liveARR = liveMRR * 12;
  const byTier = { free: 0, basic: 0, standard: 0, premium: 0 };
  
  companies.forEach(c => {
    byTier[c.subscription_tier || 'free']++;
  });
  
  const paying = companies.filter(c => c.subscription_tier !== 'free').length;
  const churned = companies.filter(c => (c.account_status || 'active') === 'churned').length;
  const avgRevPerPaying = paying > 0 ? Math.round(liveMRR / paying) : 0;

  const cardStyle = { background: '#1a1a1a', borderRadius: 12, padding: '16px 20px', border: '1px solid #222' };
  const labelStyle = { color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div>
      <h2 style={{ color: 'white', fontWeight: 900, fontSize: 20, marginBottom: 20 }}>Revenue Overview</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          ['MRR', `R${liveMRR.toLocaleString()}`, '#D4A853'],
          ['ARR', `R${liveARR.toLocaleString()}`, '#9333ea'],
          ['Paying', paying, '#22c55e'],
          ['Avg Rev/Paying', `R${avgRevPerPaying}`, '#3b82f6'],
        ].map(([l, v, c]) => (
          <div key={l} style={cardStyle}>
            <div style={labelStyle}>{l}</div>
            <div style={{ color: c, fontSize: 26, fontWeight: 900 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Tier breakdown */}
        <div style={cardStyle}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Companies by Tier</h3>
          {Object.entries(byTier).map(([tier, count]) => {
            const pct = companies.length > 0 ? Math.round((count / companies.length) * 100) : 0;
            const tierMRR = count * (TIER_PRICE[tier] || 0);
            return (
              <div key={tier} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: tierColor[tier], fontWeight: 700, textTransform: 'capitalize', fontSize: 13 }}>{tier}</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>
                    {count} companies · R{tierMRR.toLocaleString()}/mo
                  </span>
                </div>
                <div style={{ background: '#111', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                  <div style={{ background: tierColor[tier], width: `${pct}%`, height: '100%', borderRadius: 999, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Account status breakdown */}
        <div style={cardStyle}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Account Health</h3>
          {['active', 'trial', 'vip', 'churned', 'suspended'].map(status => {
            const count = companies.filter(c => (c.account_status || 'active') === status).length;
            const pct = companies.length > 0 ? Math.round((count / companies.length) * 100) : 0;
            const statusColor = {
              active: '#22c55e',
              trial: '#f59e0b',
              vip: '#D4A853',
              churned: '#6b7280',
              suspended: '#ef4444'
            }[status];
            
            return (
              <div key={status} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: statusColor, fontWeight: 700, textTransform: 'capitalize', fontSize: 13 }}>{status}</span>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{count}</span>
                </div>
                <div style={{ background: '#111', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                  <div style={{ background: statusColor, width: `${pct}%`, height: '100%', borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280', fontSize: 12 }}>Churn rate</span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
              {companies.length > 0 ? Math.round((churned / companies.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Monthly cohort table */}
      <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>Monthly Cohorts (signups by month)</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d0d' }}>
              {['Month', 'New Signups', 'Basic', 'Standard', 'Premium', 'MRR from cohort'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #222' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No data yet
                </td>
              </tr>
            ) : (
              stats.map(row => (
                <tr key={row.month} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 16px', color: 'white', fontWeight: 600 }}>{row.month}</td>
                  <td style={{ padding: '10px 16px', color: '#9ca3af' }}>{row.new_companies}</td>
                  <td style={{ padding: '10px 16px', color: tierColor.basic }}>{row.basic_count || 0}</td>
                  <td style={{ padding: '10px 16px', color: tierColor.standard }}>{row.standard_count || 0}</td>
                  <td style={{ padding: '10px 16px', color: tierColor.premium }}>{row.premium_count || 0}</td>
                  <td style={{ padding: '10px 16px', color: '#D4A853', fontWeight: 700 }}>
                    R{Number(row.mrr_zar || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SARevenueOverview;