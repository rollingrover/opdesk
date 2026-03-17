import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import './OperatorProfile.css';

function OperatorProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadOperatorProfile(slug);
  }, [slug]);

  async function loadOperatorProfile(slug) {
    try {
      const { data, error } = await supabase
        .from('operator_pages')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setOperator(data);
        // Update SEO meta tags
        updateMetaTags(data);
      }
    } catch (e) {
      console.error('Error loading operator profile:', e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function updateMetaTags(data) {
    // Update document title
    document.title = `${data.headline} · OpDesk`;
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = (data.about || '').slice(0, 160);

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${data.headline} · OpDesk`;

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = (data.about || '').slice(0, 160);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && data.photos && data.photos[0]) {
      ogImage.content = data.photos[0];
    }

    // Update canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = `https://opdesk.app/operators/${slug}`;
    }
  }

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading operator profile…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <nav className="topbar">
          <a href="/" className="topbar-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#D4A853"/>
              <path d="M8 22V10l8 6 8-6v12" stroke="#0F2540" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            OpDesk
          </a>
          <a href="/bookings" className="topbar-cta">List your operation →</a>
        </nav>
        <div className="not-found">
          <div style={{fontSize: '56px', marginBottom: '20px'}}>🦁</div>
          <h1>Operator not found</h1>
          <p>The profile "{esc(slug)}" doesn't exist or has been deactivated.</p>
          <a href="/" className="btn-primary">Back to OpDesk</a>
        </div>
      </>
    );
  }

  const photos = (operator.photos || []).filter(Boolean);
  const heroImg = photos[0] || '';
  const galleryPhotos = photos.slice(1);

  const heroHTML = heroImg ? (
    <div className="hero">
      <img className="hero-img" src={heroImg} alt={operator.headline} />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-badge">Operator Profile</div>
        <h1 className="hero-headline">{esc(operator.headline)}</h1>
      </div>
    </div>
  ) : (
    <div className="hero" style={{display: 'flex', alignItems: 'flex-end', padding: '0 40px 36px'}}>
      <div className="hero-content" style={{position: 'static'}}>
        <div className="hero-badge">Operator Profile</div>
        <h1 className="hero-headline">{esc(operator.headline)}</h1>
      </div>
    </div>
  );

  return (
    <>
      <nav className="topbar">
        <a href="/" className="topbar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#D4A853"/>
            <path d="M8 22V10l8 6 8-6v12" stroke="#0F2540" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          OpDesk
        </a>
        <a href="/bookings" className="topbar-cta">List your operation →</a>
      </nav>

      {heroHTML}

      <div className="container">
        {operator.about && (
          <div className="card">
            <div className="section-label">About</div>
            <p className="about-text">{esc(operator.about)}</p>
          </div>
        )}

        {galleryPhotos.length > 0 && (
          <div className="card">
            <div className="section-label">Gallery</div>
            <div className="photos-grid">
              {galleryPhotos.map((photo, index) => (
                <img key={index} src={photo} alt="Gallery photo" loading="lazy" />
              ))}
            </div>
          </div>
        )}

        {(operator.contact_email || operator.contact_phone || operator.website) && (
          <div className="card">
            <div className="section-label">Get in touch</div>
            {operator.contact_email && (
              <div className="contact-row">
                <div className="contact-icon">✉️</div>
                <a href={`mailto:${operator.contact_email}`}>{esc(operator.contact_email)}</a>
              </div>
            )}
            {operator.contact_phone && (
              <div className="contact-row">
                <div className="contact-icon">📞</div>
                <a href={`tel:${operator.contact_phone.replace(/\s/g, '')}`}>{esc(operator.contact_phone)}</a>
              </div>
            )}
            {operator.website && (
              <div className="contact-row">
                <div className="contact-icon">🌐</div>
                <a href={operator.website} target="_blank" rel="noopener">
                  {esc(operator.website.replace(/^https?:\/\//, ''))}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="powered">
          Listed on <a href="/" target="_blank">OpDesk</a> — the booking platform for tour &amp; safari operators.{' '}
          <a href="/bookings">List your operation →</a>
        </div>
      </div>
    </>
  );
}

export default OperatorProfile;