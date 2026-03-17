import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../lib/constants.jsx';
import SuperAdminLogin from './SuperAdminLogin';
import SACompanies, { SACompanyDetail } from './SACompanies'; // Fixed import
import SARevenueOverview from './SARevenueOverview';
import SAPricingEditor from './SAPricingEditor';
import SAMarketingPackages from './SAMarketingPackages';
import SAAffiliate from './SAAffiliate';
import SADiscountCodes from './SADiscountCodes';
import SASupportQueue from './SASupportQueue';
import SAOperatorProfiles from './SAOperatorProfiles';
import SASystemConfig from './SASystemConfig';

function SuperAdminShell({ onExit }) {
  const [saUser, setSaUser] = useState(null);
  const [saPage, setSaPage] = useState('revenue');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [globalPricing, setGlobalPricing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGlobalPricing();
  }, []);

  async function loadGlobalPricing() {
    const { data } = await supabase.from('addon_pricing').select('*');
    setGlobalPricing(data || []);
    setLoading(false);
  }

  if (!saUser) {
    return <SuperAdminLogin onAuth={setSaUser} />;
  }

  const saNav = [
    { id: 'revenue', label: 'Revenue', icon: 'billing' },
    { id: 'companies', label: 'Companies', icon: 'guests' },
    { id: 'operators', label: 'Operator Profiles', icon: 'star' },
    { id: 'pricing', label: 'Pricing Editor', icon: 'billing' },
    { id: 'packages', label: 'Marketing Packages', icon: 'invoice' },
    { id: 'affiliates', label: 'Affiliates', icon: 'star' },
    { id: 'discounts', label: 'Discount Codes', icon: 'invoice' },
    { id: 'support', label: 'Support Queue', icon: 'shield' },
    { id: 'system', label: 'System', icon: 'settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#111', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#dc2626', borderRadius: 8, padding: 7, display: 'flex' }}>
              <Icon name="shield" size={18} className="text-white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>SuperAdmin</div>
              <div style={{ color: '#dc2626', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>OPDESK · RESTRICTED</div>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: 10 }}>
          {saNav.map(item => (
            <button
              key={item.id}
              onClick={() => { setSaPage(item.id); setSelectedCompany(null); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 2,
                background: saPage === item.id ? 'rgba(220,38,38,0.15)' : 'transparent',
                color: saPage === item.id ? '#f87171' : '#9ca3af',
                fontWeight: 600,
                fontSize: 13,
                textAlign: 'left'
              }}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: 12, borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={onExit}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              padding: '8px 12px'
            }}
          >
            <Icon name="logout" size={14} />
            Back to App
          </button>
        </div>
      </div>

      {/* Main Content - Added padding-top to account for fixed header */}
      <main style={{ 
        marginLeft: 220, 
        flex: 1, 
        padding: '300px 28px 28px 28px',
        color: 'white',
        minHeight: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{ maxWidth: 1200 }}>
          {saPage === 'revenue' && <SARevenueOverview />}
          {saPage === 'companies' && !selectedCompany && (
            <SACompanies onSelect={(c) => setSelectedCompany(c)} />
          )}
          {saPage === 'companies' && selectedCompany && (
            <SACompanyDetail
              company={selectedCompany}
              onBack={() => setSelectedCompany(null)}
              globalPricing={globalPricing}
            />
          )}
          {saPage === 'operators' && <SAOperatorProfiles />}
          {saPage === 'pricing' && <SAPricingEditor />}
          {saPage === 'packages' && <SAMarketingPackages />}
          {saPage === 'affiliates' && <SAAffiliate />}
          {saPage === 'discounts' && <SADiscountCodes />}
          {saPage === 'support' && <SASupportQueue />}
          {saPage === 'system' && <SASystemConfig />}
        </div>
      </main>
    </div>
  );
}

export default SuperAdminShell;