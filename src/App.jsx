import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import './App.css';
import Bookings from './bookings';
import Admin from './admin';
import OperatorProfile from './OperatorProfile';
import Force2FAEnrollment from './pages/Force2FAEnrollment';

// Landing page component
function LandingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricing, setPricing] = useState({
    basic: { monthly: 349, annual: 3490 },
    standard: { monthly: 1099, annual: 10990 },
    premium: { monthly: 2499, annual: 24990 }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && /^[a-z0-9-]+$/i.test(ref)) {
      localStorage.setItem('opdesk_ref', ref);
    }
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const { data: tiers, error } = await supabase
        .from('tier_pricing')
        .select('tier, monthly_price, annual_price')
        .order('tier');

      if (error) {
        console.warn('Using default pricing');
        return;
      }

      if (tiers && tiers.length > 0) {
        const newPricing = { ...pricing };
        tiers.forEach(({ tier, monthly_price, annual_price }) => {
          const key = tier.toLowerCase();
          if (key !== 'free') {
            newPricing[key] = {
              monthly: parseFloat(monthly_price) || 0,
              annual: parseFloat(annual_price) || 0
            };
          }
        });
        setPricing(newPricing);
      }
    } catch (e) {
      // Silent fail
    }
  };

  const formatPrice = (tier) => {
    if (!pricing[tier]) return { price: 'R0', sub: '' };
    
    if (billingCycle === 'annual') {
      const annual = pricing[tier]?.annual || 0;
      const monthly = Math.round(annual / 12);
      return {
        price: `R${annual.toLocaleString('en-ZA')}`,
        sub: `per year · ~R${monthly}/mo · 2 months free`
      };
    } else {
      const monthly = pricing[tier]?.monthly || 0;
      return {
        price: `R${monthly.toLocaleString('en-ZA')}`,
        sub: 'per month'
      };
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const features = [
    { icon: '📅', title: 'Bookings & Calendar', desc: 'Full booking management with calendar view, status tracking, resource allocation, and guest profiles.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '🦺', title: 'Guide Management', desc: 'Staff profiles, FGASA/CATHSSETA/Bushwise certs, First Aid, Firearms, Marine, SKS, PH, and Track & Sign — all with expiry tracking.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '🚙', title: 'Fleet Management', desc: 'Vehicle profiles, service records, roadworthy and insurance expiry tracking, and document uploads.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '🚌', title: 'Drivers & Shuttles', desc: 'Driver certification tracking (SA Code 8/10/14), PDP management, shuttle scheduling and bookings.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '📋', title: 'Schedules & Shifts', desc: 'Weekly shift grid for guides and drivers. Assign staff to activities, track availability.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '🧾', title: 'Pro Forma Invoices', desc: 'One-click branded PDF invoices with your company logo, VAT registration, and banking details.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '📊', title: 'Dashboard & Reports', desc: 'Revenue charts, booking trends, activity breakdown, staff counts, and live expiry alerts.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '🌍', title: 'Multi-currency & Language', desc: 'Operate in your local currency with support for 15 currencies and 12 languages.', tier: 'All tiers', badgeBg: '#f3f4f6', badgeColor: '#6b7280' },
    { icon: '👥', title: 'Team & Roles', desc: 'Multiple user seats with Owner and Agent role permissions. Control who sees what.', tier: 'Basic+', badgeBg: '#dbeafe', badgeColor: '#1d4ed8' },
    { icon: '🔫', title: 'Firearm Register', desc: 'Dedicated compliance register for firearms issued to guides and rangers. Audit-ready records.', tier: 'Standard+', badgeBg: '#ede9fe', badgeColor: '#7c3aed' },
    { icon: '🥾', title: 'Trails Module', desc: 'Manage walking trails with guide assignments, difficulty ratings, and firearm requirement flags.', tier: 'Standard+', badgeBg: '#ede9fe', badgeColor: '#7c3aed' },
    { icon: '📤', title: 'CSV Data Export', desc: 'Export all your bookings and operational data to CSV for reporting, accounting, or analysis.', tier: 'Basic+', badgeBg: '#dbeafe', badgeColor: '#1d4ed8' },
    { icon: '🎨', title: 'White-label Branding', desc: 'Remove all OpDesk branding. Your logo, your colours, your platform.', tier: 'Premium', badgeBg: '#fef3c7', badgeColor: '#92400e' },
    { icon: '📣', title: 'Marketing Page', desc: 'A free public profile page for your operation. Upload photos, describe your services — we host it and help you get found online.', tier: 'Basic+', badgeBg: '#dbeafe', badgeColor: '#1d4ed8' },
    { icon: '🔔', title: 'Auto Email Backup', desc: 'Automatic daily backup of your operational data sent to your registered email.', tier: 'Premium', badgeBg: '#fef3c7', badgeColor: '#92400e' }
  ];

  const industries = [
    { emoji: '🦁', name: 'Safari & Wildlife', sub: 'Game drives, walking safaris, guided tours' },
    { emoji: '🚌', name: 'Shuttle & Transfer', sub: 'Airport transfers, inter-city shuttles' },
    { emoji: '🚤', name: 'Fishing Charters', sub: 'Deep-sea, river, and inshore fishing trips' },
    { emoji: '⛵', name: 'Yacht Charters', sub: 'Day sails, multi-day, corporate functions' },
    { emoji: '🏔️', name: 'Adventure & Trails', sub: 'Hiking, mountain trails, eco-tourism' },
    { emoji: '🌍', name: 'Cultural & Eco Tours', sub: 'Zulu heritage, volunteer, cultural experiences' }
  ];

  const differentiators = [
    { title: 'No per-booking fees', desc: 'Every booking you make is 100% yours. OpDesk charges a flat subscription — not a cut of your revenue.' },
    { title: 'Works in your currency', desc: 'Choose your local currency at signup — ZAR, USD, EUR, GBP, KES and more. Invoices and reports display in the currency your business runs on.' },
    { title: 'Staff cert compliance built-in', desc: 'Track FGASA, First Aid, PDP, SKS, PH, and Marine licences — with automatic expiry alerts at 30 days.' },
    { title: 'Grows with you', desc: 'Buy extra vehicle, guide, or driver slots one at a time as your fleet grows — no forced plan jumps.' },
    { title: 'Pro forma invoices', desc: 'Generate branded PDF invoices with your company logo instantly from any booking. Includes VAT and banking details.' },
    { title: '2FA & multi-user', desc: 'TOTP two-factor auth and role-based access so owners and agents each see exactly what they need.' }
  ];

  const trustTags = [
    '🦁 Safari Operators', '🚌 Shuttle Companies', '🚤 Fishing Charters', 
    '⛵ Yacht Charters', '🥾 Trail Guides', '🦏 Game Lodges', 
    '🌍 East Africa Tours', '🏝️ Island Transfers'
  ];

  return (
    <>
      <nav>
        <Link to="/" className="nav-brand">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="#D4A853" strokeWidth="3" fill="none"/>
            <polygon points="50,10 55,45 50,50 45,45" fill="#D4A853"/>
            <polygon points="50,90 55,55 50,50 45,55" fill="#D4A853" opacity="0.5"/>
            <polygon points="10,50 45,45 50,50 45,55" fill="#D4A853" opacity="0.5"/>
            <polygon points="90,50 55,55 50,50 55,45" fill="#D4A853"/>
            <circle cx="50" cy="50" r="6" fill="#D4A853"/>
          </svg>
          <div>
            <div className="nav-brand-name">OpDesk</div>
            <div className="nav-brand-tag">Operator's Command Centre</div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#industries">Industries</a>
          <Link to="/bookings" className="nav-cta">Sign In →</Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Navigation Menu */}
        <div className={`mobile-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#features" onClick={closeMobileMenu}>Features</a>
          <a href="#pricing" onClick={closeMobileMenu}>Pricing</a>
          <a href="#industries" onClick={closeMobileMenu}>Industries</a>
          <Link to="/bookings" className="nav-cta" onClick={closeMobileMenu}>Sign In →</Link>
        </div>
      </nav>

      {/* Add spacer div to push content below fixed header */}
      <div className="header-spacer"></div>

      <section className="hero">
        <div className="hero-badge">Built for Travel Operators Worldwide</div>
        <h1>Run Your Entire<br /><span>Travel Operation</span><br />From One Place</h1>
        <p className="hero-sub">Bookings, guides, vehicles, drivers, certificates, invoices and schedules — all in one clean platform. Multi-currency. 12 languages. No per-booking fees. Ever.</p>
        <div className="hero-actions">
          <Link to="/bookings" className="btn-gold">Start Free → <span style={{fontSize: '18px'}}>🏕️</span></Link>
          <a href="#pricing" className="btn-outline">See Pricing</a>
        </div>
        <div className="hero-proof">
          <div className="hero-proof-item">
            <div className="hero-proof-num">R0</div>
            <div className="hero-proof-label">Per-booking fees</div>
          </div>
          <div className="hero-proof-item">
            <div className="hero-proof-num">14+</div>
            <div className="hero-proof-label">Modules included</div>
          </div>
          <div className="hero-proof-item">
            <div className="hero-proof-num">
              From {billingCycle === 'annual' 
                ? `R${pricing.basic?.annual?.toLocaleString('en-ZA')}/yr` 
                : `R${pricing.basic?.monthly?.toLocaleString('en-ZA')}/mo`}
            </div>
            <div className="hero-proof-label">
              {billingCycle === 'annual' ? 'per year (Basic)' : 'per month (Basic)'}
            </div>
          </div>
          <div className="hero-proof-item">
            <div className="hero-proof-num">15+</div>
            <div className="hero-proof-label">Currencies supported</div>
          </div>
        </div>
      </section>

      <div className="trust-bar">
        <p>Trusted by operators worldwide — including</p>
        <div className="trust-tags">
          {trustTags.map((tag, i) => (
            <span key={i} className="trust-tag">{tag}</span>
          ))}
        </div>
      </div>

      <section>
        <div className="centered">
          <div className="section-tag">Why OpDesk</div>
          <h2 className="section-title">The platform operators actually asked for</h2>
          <p className="section-sub">Built by operators, for operators — none of the bloat, all of the essentials.</p>
        </div>
        <div className="diff-grid">
          {differentiators.map((item, i) => (
            <div key={i} className="diff-item">
              <div className="diff-dot"></div>
              <div className="diff-text">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="features" id="features">
        <div className="centered">
          <div className="section-tag">Platform Modules</div>
          <h2 className="section-title">Everything your operation needs</h2>
          <p className="section-sub">15 modules, one subscription. Every tier unlocks more — start free and upgrade as you grow.</p>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: feature.badgeBg,
                color: feature.badgeColor,
                marginBottom: '10px',
                letterSpacing: '0.03em'
              }}>
                {feature.tier}
              </span>
              <div className="feature-title">{feature.title}</div>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="industries" style={{background: '#fff'}}>
        <div className="centered">
          <div className="section-tag">Industries</div>
          <h2 className="section-title">Built for your kind of business</h2>
        </div>
        <div className="industries-grid">
          {industries.map((industry, i) => (
            <div key={i} className="industry-card">
              <div className="industry-emoji">{industry.emoji}</div>
              <div className="industry-name">{industry.name}</div>
              <div className="industry-sub">{industry.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="centered">
          <div className="section-tag">Pricing</div>
          <h2 className="section-title">Priced for African operators, built for the world</h2>
          <p className="section-sub">All paid plans include unlimited bookings. No per-booking fees, ever. Pay monthly or save 2 months with an annual plan.</p>
        </div>
        
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '32px'}}>
          <div style={{display: 'inline-flex', background: '#e5e7eb', borderRadius: '9999px', padding: '4px', gap: '4px'}}>
            <button 
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: billingCycle === 'monthly' ? '#0F2540' : 'transparent',
                color: billingCycle === 'monthly' ? 'white' : '#6b7280'
              }}>
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: billingCycle === 'annual' ? '#0F2540' : 'transparent',
                color: billingCycle === 'annual' ? 'white' : '#6b7280'
              }}>
              Annual <span style={{marginLeft: '6px', fontSize: '11px', background: '#D4A853', color: '#0F2540', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700'}}>2 months free</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="tier-name">Free</div>
            <div className="tier-price">R0</div>
            <div className="tier-price-sub">forever</div>
            <ul className="tier-features">
              <li>20 bookings/month</li>
              <li>1 vehicle, guide, driver</li>
              <li>Basic scheduling</li>
              <li>OpDesk watermark</li>
            </ul>
            <Link to="/bookings" className="btn-plan btn-plan-outline">Get Started Free</Link>
          </div>

          <div className="pricing-card">
            <div className="tier-name">Basic</div>
            <div className="tier-price">{formatPrice('basic').price}</div>
            <div className="tier-price-sub">{formatPrice('basic').sub}</div>
            <ul className="tier-features">
              <li>Unlimited bookings</li>
              <li>5 vehicles, guides & safaris</li>
              <li>3 drivers & 5 shuttles</li>
              <li>Client list & invoice management</li>
              <li>Company logo on invoices & PDFs</li>
              <li>2 user seats</li>
            </ul>
            <Link to="/bookings" className="btn-plan btn-plan-outline">Start Basic</Link>
          </div>

          <div className="pricing-card featured">
            <div className="tier-badge">Most Popular</div>
            <div className="tier-name">Standard</div>
            <div className="tier-price" style={{color: '#D4A853'}}>{formatPrice('standard').price}</div>
            <div className="tier-price-sub">{formatPrice('standard').sub}</div>
            <ul className="tier-features">
              <li>Client list, invoicing & PDF billing</li>
              <li>10 vehicles, guides, safaris & charters</li>
              <li>5 drivers, 10 shuttles, 5 charters</li>
              <li>Staff certifications & document tracking</li>
              <li>Operator public profile page</li>
              <li>5 user seats & CSV export</li>
            </ul>
            <Link to="/bookings" className="btn-plan btn-plan-navy">Start Standard</Link>
          </div>

          <div className="pricing-card">
            <div className="tier-name">Premium</div>
            <div className="tier-price">{formatPrice('premium').price}</div>
            <div className="tier-price-sub">{formatPrice('premium').sub}</div>
            <ul className="tier-features">
              <li>Everything in Standard, fully unlimited</li>
              <li>Client invoicing & multi-currency billing</li>
              <li>Firearm Register & compliance module</li>
              <li>Full white-label (your brand, no OpDesk logo)</li>
              <li>10 user seats & advanced reporting</li>
              <li>Priority support & early feature access</li>
            </ul>
            <Link to="/bookings" className="btn-plan btn-plan-outline">Start Premium</Link>
          </div>
        </div>
        <p className="pricing-note">Prices shown in ZAR. At signup you choose your local currency — invoices and reports will reflect it. Need more slots? Buy extras one at a time.</p>
      </section>

      <section className="cta-section">
        <h2>Ready to take command?</h2>
        <p>Join operators worldwide using OpDesk to run tighter, leaner operations. Free to start, no card required.</p>
        <Link to="/bookings" className="btn-gold" style={{fontSize: '18px', padding: '16px 40px'}}>
          Open OpDesk Free → 🏕️
        </Link>
      </section>

      <footer>
        <div className="footer-brand">OpDesk</div>
        <p>The Operator's Command Centre · Built by RollingRover Productions · South Africa</p>
        <p style={{marginTop: '10px'}}>© 2026 OpDesk. All rights reserved. · <Link to="/bookings">Sign In</Link></p>
      </footer>
    </>
  );
}

// Main App component
function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle ?admin redirect
    if (params.has('admin')) {
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin' + window.location.search;
      }
    }
    
    // Handle ?redirect param for 2FA
    if (params.has('redirect') && window.location.pathname === '/force-2fa') {
      // Already on the right page
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/bookings/*" element={<Bookings />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/operators/:slug" element={<OperatorProfile />} />
      <Route path="/force-2fa" element={<Force2FAEnrollment />} />
    </Routes>
  );
}

export default App;
