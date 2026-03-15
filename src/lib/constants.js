// OpDesk constants

// ─── REGION CERTIFICATION CONFIG ────────────────────────────
const COUNTRY_TO_REGION = {
  'South Africa':'south_africa','Botswana':'botswana','Zimbabwe':'zimbabwe',
  'Zambia':'zambia','Namibia':'namibia','Mozambique':'mozambique',
  'Kenya':'kenya','Tanzania':'tanzania','Uganda':'uganda','Rwanda':'rwanda',
};
function getCompanyRegion(country) {
  return COUNTRY_TO_REGION[country] || 'south_africa';
}
const REGION_CERTS = {
  south_africa: {
    label: 'Southern Africa (South Africa)',
    guide: [
      { key:'cert_fgasa',      label:'FGASA Certification',           col:true,  hasLevel:true,  issuers:['FGASA','CATHSSETA','Bushwise','EcoTraining','WildlifeCampus'] },
      { key:'cert_first_aid',  label:'First Aid',                     col:true,  hasLevel:true,  levelHint:'e.g. Level 3 / Wilderness FA' },
      { key:'cert_firearms',   label:'Firearms Competency',           col:true,  hasLevel:false },
      { key:'cert_pdp',        label:'PDP (Professional Driving Permit)', col:true, hasLevel:false },
      { key:'cert_marine',     label:'Marine Guide',                  col:true,  hasLevel:false },
      { key:'cert_sks',        label:'SKS Dangerous Animals',         col:true,  hasLevel:false },
      { key:'cert_ph',         label:'Professional Hunter (PH)',      col:true,  hasLevel:false },
      { key:'cert_track_sign', label:'Track & Sign',                  col:true,  hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Code EB','Code EB — Light vehicle (auto/manual)'],
      ['Code 8', 'Code 8 — Light motor vehicle ≤3,500kg'],
      ['Code 10','Code 10 — Heavy vehicle, no articulation'],
      ['Code C1','Code C1 — 3,500–16,000kg'],
      ['Code 14','Code 14 — Extra-heavy / articulated'],
    ],
    driver: [
      { key:'cert_pdp',       label:'PDP (Professional Driving Permit)', col:true, hasLevel:false },
      { key:'cert_first_aid', label:'First Aid',                         col:true, hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',  label:'Firearms Competency',               col:true, hasLevel:false },
      { key:'cert_fgasa',     label:'FGASA Certification',               col:true, hasLevel:true, levelHint:'e.g. NQF2 Level 1', issuers:['FGASA','CATHSSETA','Bushwise','EcoTraining','WildlifeCampus'] },
    ],
  },
  botswana: {
    label: 'Botswana',
    guide: [
      { key:'BOTA Guide Licence',      label:'BOTA Guide Licence',       col:false, hasLevel:true,  issuers:['Botswana Tourism Organisation (BOTA)'] },
      { key:'cert_first_aid',          label:'First Aid',                 col:true,  hasLevel:true,  levelHint:'e.g. Level 3' },
      { key:'cert_firearms',           label:'Firearms Competency',       col:true,  hasLevel:false },
      { key:'cert_pdp',                label:'PDP (Driving Permit)',       col:true,  hasLevel:false },
      { key:'cert_ph',                 label:'Professional Hunter (PH)',   col:true,  hasLevel:false },
      { key:'Mokoro Guide',            label:'Mokoro Guide',               col:false, hasLevel:false },
      { key:'Horseback Safari Guide',  label:'Horseback Safari Guide',     col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class A','Class A — Motorcycle'],
      ['Class B','Class B — Light vehicle ≤3,500kg'],
      ['Class C','Class C — Heavy vehicle'],
      ['Class C1','Class C1 — Medium goods vehicle'],
      ['Class D','Class D — Bus/minibus'],
      ['Class E','Class E — Articulated vehicle'],
    ],
    driver: [
      { key:'cert_pdp',     label:'PDP (Driving Permit)',       col:true,  hasLevel:false },
      { key:'cert_first_aid',label:'First Aid',                  col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'BOTA Guide Licence', label:'BOTA Guide Licence',   col:false, hasLevel:false },
    ],
  },
  zimbabwe: {
    label: 'Zimbabwe',
    guide: [
      { key:'ZPWMA Professional Guide Licence', label:'ZPWMA Professional Guide Licence', col:false, hasLevel:true, issuers:['Zimbabwe Parks & Wildlife Management Authority (ZPWMA)'] },
      { key:'Dangerous Game Guide',  label:'Dangerous Game Guide',     col:false, hasLevel:false },
      { key:'cert_first_aid',        label:'First Aid',                 col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',         label:'Firearms Competency',       col:true,  hasLevel:false },
      { key:'cert_ph',               label:'Professional Hunter (PH)',  col:true,  hasLevel:false },
      { key:'Canoe Guide',           label:'Canoe Guide',               col:false, hasLevel:false },
      { key:'Horse Trail Guide',     label:'Horse Trail Guide',         col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class 1','Class 1 — Motorcycle'],
      ['Class 2','Class 2 — Light motor vehicle'],
      ['Class 3','Class 3 — Medium vehicle'],
      ['Class 4','Class 4 — Heavy vehicle'],
      ['Class 5','Class 5 — Articulated truck'],
    ],
    driver: [
      { key:'PDP (Defensive Driving)', label:'PDP (Defensive Driving)',  col:false, hasLevel:false },
      { key:'cert_first_aid',          label:'First Aid',                 col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',           label:'Firearms Competency',       col:true,  hasLevel:false },
    ],
  },
  zambia: {
    label: 'Zambia',
    guide: [
      { key:'ZAWA Guide Licence',  label:'ZAWA Guide Licence',       col:false, hasLevel:true, issuers:['Zambia Wildlife Authority (ZAWA)'] },
      { key:'ZNTB Tourist Guide',  label:'ZNTB Tourist Guide',       col:false, hasLevel:true, issuers:['Zambia Tourism Agency (ZTA)'] },
      { key:'cert_first_aid',      label:'First Aid',                 col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',       label:'Firearms Competency',       col:true,  hasLevel:false },
      { key:'cert_ph',             label:'Professional Hunter (PH)',  col:true,  hasLevel:false },
      { key:'Walking Safari Guide',label:'Walking Safari Guide',      col:false, hasLevel:false },
      { key:'Canoe/River Guide',   label:'Canoe/River Guide',         col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class A','Class A — Motorcycle'],
      ['Class B','Class B — Light vehicle ≤3,500kg'],
      ['Class C','Class C — Rigid heavy vehicle'],
      ['Class D','Class D — Bus/passenger vehicle'],
      ['Class E','Class E — Articulated vehicle'],
    ],
    driver: [
      { key:'PSV Licence',     label:'PSV Licence (Public Service Vehicle)', col:false, hasLevel:false },
      { key:'cert_first_aid',  label:'First Aid',                             col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',   label:'Firearms Competency',                   col:true,  hasLevel:false },
      { key:'ZAWA Guide Licence', label:'ZAWA Guide Licence',                col:false, hasLevel:false },
    ],
  },
  namibia: {
    label: 'Namibia',
    guide: [
      { key:'NTA Guide Badge',     label:'NTA Guide Badge',           col:false, hasLevel:true, issuers:['Namibia Tourism Board (NTB)'] },
      { key:'FENATA Field Guide',  label:'FENATA Field Guide',        col:false, hasLevel:true, issuers:['FENATA'] },
      { key:'cert_first_aid',      label:'First Aid',                 col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',       label:'Firearms Competency',       col:true,  hasLevel:false },
      { key:'cert_marine',         label:'Marine Guide',              col:true,  hasLevel:false },
      { key:'Desert Guide',        label:'Desert Guide Certification',col:false, hasLevel:false },
      { key:'cert_ph',             label:'Professional Hunter (PH)',  col:true,  hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Code B',  'Code B — Light motor vehicle'],
      ['Code C',  'Code C — Heavy motor vehicle'],
      ['Code C1', 'Code C1 — Medium goods vehicle'],
      ['Code EC', 'Code EC — Articulated heavy vehicle'],
      ['Code EC1','Code EC1 — Articulated medium vehicle'],
    ],
    driver: [
      { key:'cert_pdp',       label:'PDP (Professional Driving Permit)', col:true,  hasLevel:false },
      { key:'cert_first_aid', label:'First Aid',                          col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',  label:'Firearms Competency',                col:true,  hasLevel:false },
      { key:'NTA Guide Badge',label:'NTA Guide Badge',                    col:false, hasLevel:false },
    ],
  },
  mozambique: {
    label: 'Mozambique',
    guide: [
      { key:'MITUR Tour Guide Licence', label:'MITUR Tour Guide Licence', col:false, hasLevel:false, issuers:['Ministry of Tourism (MITUR)'] },
      { key:'cert_first_aid',           label:'First Aid',                 col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',            label:'Firearms Competency',       col:true,  hasLevel:false },
      { key:'cert_marine',              label:'Marine/Dive Guide',         col:true,  hasLevel:false },
      { key:'Gorongosa Guide Cert',     label:'Gorongosa Guide Cert',      col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Categoria A','Categoria A — Motorcycle'],
      ['Categoria B','Categoria B — Light vehicle ≤3,500kg'],
      ['Categoria C','Categoria C — Heavy vehicle'],
      ['Categoria D','Categoria D — Passenger vehicle/bus'],
      ['Categoria E','Categoria E — Articulated/trailer'],
    ],
    driver: [
      { key:'Licença Motorista Profissional', label:'Licença Motorista Profissional', col:false, hasLevel:false },
      { key:'cert_first_aid', label:'First Aid',            col:true, hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',  label:'Firearms Competency',  col:true, hasLevel:false },
    ],
  },
  kenya: {
    label: 'Kenya',
    guide: [
      { key:'KWS Guide Licence',        label:'KWS Guide Licence',              col:false, hasLevel:true, issuers:['Kenya Wildlife Service (KWS)'] },
      { key:'KPSGA Certification',      label:'KPSGA Certification',            col:false, hasLevel:true, issuers:['Kenya Professional Safari Guides Association (KPSGA)'] },
      { key:'KTB Guide Badge',          label:'Kenya Tourism Board Guide Badge', col:false, hasLevel:false },
      { key:'cert_first_aid',           label:'First Aid',                       col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',            label:'Firearms Competency',             col:true,  hasLevel:false },
      { key:'cert_marine',              label:'Marine Guide',                    col:true,  hasLevel:false },
      { key:'Mountain Guide (KAA)',     label:'Mountain Guide (KAA)',            col:false, hasLevel:false },
      { key:'Camel Safari Guide',       label:'Camel Safari Guide',              col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class A','Class A — Motorcycle'],
      ['Class B','Class B — Light vehicle (cars/vans)'],
      ['Class C','Class C — Rigid heavy vehicle'],
      ['Class D','Class D — Bus/PSV'],
      ['Class E','Class E — Trailer/articulated'],
      ['Class F','Class F — Agricultural vehicle'],
      ['Class G','Class G — Special vehicle'],
    ],
    driver: [
      { key:'PSV Licence',       label:'PSV Licence (Public Service Vehicle)', col:false, hasLevel:false },
      { key:'cert_first_aid',    label:'First Aid',                             col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',     label:'Firearms Competency',                   col:true,  hasLevel:false },
      { key:'KWS Guide Licence', label:'KWS Guide Licence',                    col:false, hasLevel:false },
    ],
  },
  tanzania: {
    label: 'Tanzania',
    guide: [
      { key:'TALA Guide Licence',     label:'TALA Guide Licence',                 col:false, hasLevel:true, issuers:['Tanzania Guides Association (TALA)'] },
      { key:'TANAPA Approved Guide',  label:'TANAPA Approved Guide',              col:false, hasLevel:false, issuers:['Tanzania National Parks Authority (TANAPA)'] },
      { key:'TTB Guide',              label:'Tanzania Tourist Board Guide',       col:false, hasLevel:false },
      { key:'cert_first_aid',         label:'First Aid',                           col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',          label:'Firearms Competency',                 col:true,  hasLevel:false },
      { key:'cert_marine',            label:'Marine Guide',                        col:true,  hasLevel:false },
      { key:'Mountain Guide (Kilimanjaro)', label:'Mountain Guide (Kilimanjaro / KINAPA)', col:false, hasLevel:true },
      { key:'Zanzibar Tourism Guide', label:'Zanzibar Tourism Guide (ZTC)',        col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class A','Class A — Motorcycle'],
      ['Class B','Class B — Light private vehicle'],
      ['Class C','Class C — Heavy goods vehicle'],
      ['Class D','Class D — Bus/minibus'],
      ['Class E','Class E — Articulated/special'],
    ],
    driver: [
      { key:'PSV Permit',           label:'PSV Permit',              col:false, hasLevel:false },
      { key:'cert_first_aid',       label:'First Aid',               col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',        label:'Firearms Competency',     col:true,  hasLevel:false },
      { key:'TALA Guide Licence',   label:'TALA Guide Licence',      col:false, hasLevel:false },
    ],
  },
  uganda: {
    label: 'Uganda',
    guide: [
      { key:'UWA Guide Permit',          label:'UWA Guide Permit',                  col:false, hasLevel:true, issuers:['Uganda Wildlife Authority (UWA)'] },
      { key:'UTB Guide Badge',           label:'Uganda Tourism Board Guide Badge',  col:false, hasLevel:false },
      { key:'Gorilla Trekking Guide',    label:'Gorilla Trekking Guide (UWA)',      col:false, hasLevel:false },
      { key:'Chimpanzee Guide',          label:'Chimpanzee Guide (UWA)',             col:false, hasLevel:false },
      { key:'cert_first_aid',            label:'First Aid',                          col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',             label:'Firearms Competency',                col:true,  hasLevel:false },
      { key:'White Water Rafting Guide', label:'White Water Rafting Guide',          col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Class A','Class A — Motorcycle'],
      ['Class B','Class B — Light vehicle ≤3,500kg'],
      ['Class CM','Class CM — Medium goods'],
      ['Class CH','Class CH — Heavy goods'],
      ['Class DL','Class DL — Light bus/minibus'],
      ['Class DH','Class DH — Heavy bus'],
      ['Class EL','Class EL — Light trailer'],
      ['Class EH','Class EH — Heavy trailer/articulated'],
    ],
    driver: [
      { key:'PSV Permit',         label:'PSV Permit',          col:false, hasLevel:false },
      { key:'cert_first_aid',     label:'First Aid',           col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',      label:'Firearms Competency', col:true,  hasLevel:false },
      { key:'UWA Guide Permit',   label:'UWA Guide Permit',    col:false, hasLevel:false },
    ],
  },
  rwanda: {
    label: 'Rwanda',
    guide: [
      { key:'RDB Guide Licence',         label:'RDB Guide Licence',               col:false, hasLevel:true, issuers:['Rwanda Development Board (RDB)'] },
      { key:'Gorilla Trekking Guide',    label:'Gorilla Trekking Guide (RDB)',    col:false, hasLevel:false },
      { key:'Golden Monkey Guide',       label:'Golden Monkey Guide (RDB)',       col:false, hasLevel:false },
      { key:'cert_first_aid',            label:'First Aid',                        col:true,  hasLevel:true, levelHint:'e.g. Level 3' },
      { key:'cert_firearms',             label:'Firearms Competency',              col:true,  hasLevel:false },
      { key:'Eco-Tourism Guide',         label:'Eco-Tourism Guide (ORTPN)',        col:false, hasLevel:false },
    ],
    driverLicenceCodes: [
      ['Category A','Category A — Motorcycle'],
      ['Category B','Category B — Light vehicle'],
      ['Category C','Category C — Heavy vehicle'],
      ['Category D','Category D — Bus/passenger'],
      ['Category BE','Category BE — Light + trailer'],
      ['Category CE','Category CE — Heavy + trailer'],
    ],
    driver: [
      { key:'TPI',             label:'TPI (Transport Public Individuel)', col:false, hasLevel:false },
      { key:'cert_first_aid',  label:'First Aid',                          col:true,  hasLevel:true, levelHint:'e.g. Level 1' },
      { key:'cert_firearms',   label:'Firearms Competency',                col:true,  hasLevel:false },
      { key:'RDB Guide Licence', label:'RDB Guide Licence',                col:false, hasLevel:false },
    ],
  },
};
// ─────────────────────────────────────────────────────────────

function getCurrencySymbol(code) {
  return (CURRENCIES.find(c => c.code === (code||'ZAR')) || CURRENCIES[0]).symbol;
}


// ─── ICONS ───────────────────────────────
const Icon = ({ name, size=18, className='' }) => {
  const icons = {
    dashboard: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    bookings: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>,
    calendar: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    tours: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3"/></svg>,
    safaris: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
    shuttles: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    charters: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 20h20M3 20V10l9-7 9 7v10"/><path d="M9 20v-6h6v6"/></svg>,
    clients: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    guests: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    guides: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/></svg>,
    drivers: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20h16"/><path d="M8 20v-4a4 4 0 018 0v4"/></svg>,
    vehicles: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>,
    trails: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 17l4-8 4 4 4-6 4 10"/></svg>,
    schedules: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    firearm: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h14l2-3h2v6h-2l-2-3H3z"/><path d="M7 12v4l2 1h2"/><path d="M3 10v4"/></svg>,
    settings: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  marketing: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3z"/><path d="M3 10h12v4H3z"/><path d="M3 17h8v4H3z"/><circle cx="18" cy="19" r="3"/><path d="M18 16v3l2 1"/></svg>,
    billing: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    users: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    logout: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    plus: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    download: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    shield: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    check: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    database: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    upload: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    lock: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    invoice: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    alert: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    upgrade: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>,
    copy: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    eye: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>,
    info: <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };
  return icons[name] || <span className={className}>●</span>;
};

const Logo = ({size=32}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" stroke="#D4A853" strokeWidth="3" fill="none"/>
    <polygon points="50,10 55,45 50,50 45,45" fill="#D4A853"/>
    <polygon points="50,90 55,55 50,50 45,55" fill="#D4A853" opacity="0.5"/>
    <polygon points="10,50 45,45 50,50 45,55" fill="#D4A853" opacity="0.5"/>
    <polygon points="90,50 55,55 50,50 55,45" fill="#D4A853"/>
    <circle cx="50" cy="50" r="6" fill="#D4A853"/>
  </svg>
);
