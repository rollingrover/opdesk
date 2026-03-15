import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TIERS, CURRENCIES, LANGUAGES, COUNTRIES, DAYS, CATS, ICONS, LABELS, ADDON_TYPES } from '../lib/constants.jsx';

// ─── MARKETING PAGE EDITOR ─────────────────
function MarketingPageEditor() {
  const { company, tier, features } = useAuth();
  const [form, setForm] = React.useState({ headline:'', about:'', contact_email:'', contact_phone:'', website:'', slug:'' });
  const [photos, setPhotos] = React.useState([]); // array of {url, file}
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [pubUrl, setPubUrl] = React.useState('');

  const isBasicPlus = tier === 'basic' || tier === 'standard' || tier === 'premium';

  React.useEffect(() => {
    if (!company?.id) return;
    supabase.from('operator_pages').select('*').eq('company_id', company.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({ headline: data.headline||'', about: data.about||'', contact_email: data.contact_email||'', contact_phone: data.contact_phone||'', website: data.website||'', slug: data.slug||'' });
          setPhotos((data.photos||[]).map(url => ({ url, file:null })));
          setPubUrl(data.slug ? `https://opdesk.app/operators/${data.slug}` : '');
        }
        setLoaded(true);
      });
  }, [company?.id]);

  if (!isBasicPlus) return (
    <div>
      <PageHeader title="Marketing Page" subtitle="Your free public profile — Basic plan and above"/>
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">📣</div>
        <h2 className="font-bold text-navy text-xl mb-2">Upgrade to Basic to unlock your Marketing Page</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-5">Get a free public profile page for your operation. Share your story, upload photos, and get found online — hosted by OpDesk at no extra cost.</p>
        <button className="btn-primary" onClick={()=>document.getElementById('billing-nav-btn')?.click()}>Upgrade to Basic →</button>
      </div>
    </div>
  );

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files).slice(0, 3 - photos.length);
    for (const file of files) {
      const path = `operator-pages/${company.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('operator-pages').upload(path, file, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from('operator-pages').getPublicUrl(path);
        setPhotos(prev => [...prev, { url: pub.publicUrl, file }]);
      }
    }
  }

  function removePhoto(idx) { setPhotos(prev => prev.filter((_,i) => i !== idx)); }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const slug = form.slug || company.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const payload = { company_id: company.id, slug, headline: form.headline, about: form.about, contact_email: form.contact_email, contact_phone: form.contact_phone, website: form.website, photos: photos.map(p=>p.url), active: true, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('operator_pages').upsert(payload, { onConflict: 'company_id' });
    setSaving(false);
    if (error) { toast('Save failed: ' + error.message, 'error'); return; }
    setForm(f => ({ ...f, slug }));
    setPubUrl(`https://opdesk.app/operators/${slug}`);
    toast('Marketing page saved!');
  }

  if (!loaded) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader title="Marketing Page" subtitle="Your free public profile — hosted by OpDesk"/>
      {pubUrl && (
        <div className="card p-4 mb-5 flex items-center gap-3 bg-green-50 border-green-200">
          <Icon name="check" size={18} className="text-green-500 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Your page is live!</p>
            <a href={pubUrl} target="_blank" className="text-xs text-green-600 underline">{pubUrl}</a>
          </div>
          <button onClick={()=>{navigator.clipboard.writeText(pubUrl); toast('Link copied!');}} className="text-xs px-3 py-1 bg-green-600 text-white rounded-full font-semibold">Copy link</button>
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="card p-6">
          <h2 className="font-bold text-navy mb-4">Page Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Page URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">opdesk.app/operators/</span>
                <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder={company?.name?.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'your-operation'} className="input flex-1" maxLength={60}/>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Headline <span className="text-gray-400 font-normal">(shown at top of your page)</span></label>
              <input value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} placeholder="e.g. Award-winning safari experiences in Zululand" className="input w-full" maxLength={120} required/>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">About your operation</label>
              <textarea value={form.about} onChange={e=>setForm({...form,about:e.target.value})} placeholder="Tell guests what makes your operation special — location, experience, specialties..." className="input w-full" rows={5} maxLength={1500}/>
              <p className="text-xs text-gray-400 mt-1">{form.about.length}/1500 characters</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-navy mb-1">Photos <span className="text-sm font-normal text-gray-400">(up to 3)</span></h2>
          <p className="text-sm text-gray-400 mb-4">Show your best work — safari vehicles, lodges, guides in the field.</p>
          <div className="flex gap-4 flex-wrap">
            {photos.map((p,i) => (
              <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 group">
                <img src={p.url} alt="" className="w-full h-full object-cover"/>
                <button type="button" onClick={()=>removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
            {photos.length < 3 && (
              <label className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-content-center cursor-pointer hover:border-gold hover:bg-amber-50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload}/>
                <Icon name="upload" size={24} className="text-gray-400 mt-8"/>
                <span className="text-xs text-gray-400 mt-2">Add photo</span>
              </label>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-navy mb-4">Contact & Links</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Contact email</label>
              <input type="email" value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})} placeholder="info@youroperation.com" className="input w-full"/>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Contact phone</label>
              <input value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})} placeholder="+27 82 000 0000" className="input w-full"/>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-gray-600 block mb-1">Website <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://yourwebsite.com" className="input w-full"/>
            </div>
          </div>
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
          <Icon name="check" size={16}/>{saving ? 'Saving...' : pubUrl ? 'Update page' : 'Publish my page'}
        </button>
      </form>
    </div>
  );
}


export default MarketingPageEditor;
