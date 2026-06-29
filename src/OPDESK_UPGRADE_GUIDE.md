# OpDesk Upgrade Guide
**Forgot Password · SEO · Next.js Migration · Recommendations**

---

## ✅ 1. Forgot Password — What Was Done

### Files Changed
- `src/context/AuthContext.jsx` — Added `resetPassword(email)` function
- `src/bookings.jsx` — Added `'forgot'` mode to `AuthScreen` with full UI

### How It Works
Supabase handles the full reset flow. When a user clicks "Forgot password?":
1. They enter their email on the reset screen
2. `supabase.auth.resetPasswordForEmail()` sends a secure, time-limited link
3. The link lands at `https://opdesk.app/reset-password` (set in your Supabase dashboard)
4. User sets a new password via the Supabase hosted UI or your own reset page

### Supabase Dashboard Step (Required)
Go to **Authentication → URL Configuration** in Supabase and add:
```
https://opdesk.app/reset-password
```
to the **Redirect URLs** list. This authorises the callback origin.

---

## ✅ 2. SEO — What Was Done

### `index.html` — Full Upgrade
| Element | Before | After |
|---|---|---|
| `<title>` | Generic | Keyword-rich with industries |
| `<meta description>` | Missing | 155-char with keywords |
| `<meta keywords>` | Missing | 10 targeted terms |
| `<canonical>` | Missing | `https://opdesk.app/` |
| Open Graph tags | Missing | Full og:title/description/image/locale |
| Twitter Card | Missing | `summary_large_image` |
| Schema.org JSON-LD | Missing | `SoftwareApplication` + `Organization` |
| `robots` meta | Missing | `index, follow` |

### New Files Added
- `public/robots.txt` — Allows crawlers on `/`, blocks `/bookings`, `/app`, `/admin`. Declares sitemap location.
- `public/sitemap.xml` — Lists `/` and `/operators` with priority and frequency.

### Remaining SEO Actions (Manual)
1. **Create `og-image.png`** (1200×630px) — a branded hero image for social shares. Place in `public/`.
2. **Create `favicon.svg`** — replace the Vite default. A proper SVG favicon looks sharp on all devices.
3. **Create `apple-touch-icon.png`** (180×180px) for iOS home screen.
4. **Verify in Google Search Console** — submit `https://opdesk.app/sitemap.xml`.
5. **Add operators to sitemap** — if you want individual operator profile pages indexed, generate dynamic sitemap entries.
6. **Page speed** — run Lighthouse on the landing page. The biggest wins will be image optimisation and lazy-loading non-critical JS.

---

## ⚙️ 3. Vite → Next.js Migration

### Why Migrate?
Your current Vite SPA has one big SEO limitation: Google receives an empty `<div id="root"></div>` on first crawl. The content only exists after React hydrates. For a landing page and operator profile pages that need to rank, this is a real penalty.

Next.js solves this with **Server-Side Rendering (SSR)** or **Static Site Generation (SSG)** — the HTML is fully rendered before it reaches the browser or crawler.

### Migration Checklist

#### Phase 1 — Project Setup (1–2 hrs)
```bash
npx create-next-app@latest opdesk-next --typescript=false --tailwind --app
cd opdesk-next
npm install @supabase/supabase-js react-router-dom xlsx
```

#### Phase 2 — Directory Mapping
| Vite | Next.js App Router |
|---|---|
| `src/App.jsx` (landing page) | `app/page.jsx` |
| `src/bookings.jsx` (auth + app) | `app/bookings/page.jsx` |
| `src/context/AuthContext.jsx` | `app/context/AuthContext.jsx` + `'use client'` |
| `src/lib/supabase.js` | `lib/supabase.js` |
| `src/pages/*.jsx` | `app/(dashboard)/[page]/page.jsx` |
| `public/` | `public/` (same) |
| `index.html` meta tags | `app/layout.jsx` metadata export |

#### Phase 3 — `app/layout.jsx` (replaces index.html meta)
```jsx
// app/layout.jsx
export const metadata = {
  title: "OpDesk — Operator's Command Centre",
  description: "All-in-one operations for safari operators, shuttle companies, charters & travel businesses.",
  metadataBase: new URL('https://opdesk.app'),
  openGraph: {
    title: "OpDesk — Operator's Command Centre",
    description: "Bookings, guides, vehicles, certificates, invoices. Multi-currency. No per-booking fees.",
    url: 'https://opdesk.app',
    siteName: 'OpDesk',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "OpDesk — Operator's Command Centre",
    description: "All-in-one ops for safari, charters & shuttles.",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

#### Phase 4 — Client Boundaries
Add `'use client'` to any component that uses:
- `useState`, `useEffect`, `useContext`
- `window`, `localStorage`, `document`
- Event handlers (onClick, onChange)

The landing page **hero, nav, and pricing sections** should be Server Components (no `'use client'`). The auth forms and app shell should be Client Components.

#### Phase 5 — Supabase Auth in Next.js
Install the Next.js-specific package:
```bash
npm install @supabase/ssr
```
Use `createBrowserClient` for client components and `createServerClient` for server components/middleware.

#### Phase 6 — Operator Profile Pages (SSG)
```jsx
// app/operators/[handle]/page.jsx
export async function generateStaticParams() {
  const { data } = await supabase.from('operator_profiles').select('handle');
  return data.map(({ handle }) => ({ handle }));
}

export async function generateMetadata({ params }) {
  const { data } = await supabase
    .from('operator_profiles')
    .select('name, bio')
    .eq('handle', params.handle)
    .single();
  return {
    title: `${data.name} — OpDesk`,
    description: data.bio,
  };
}
```
This gives every operator a Google-indexable page with their own title and description — a massive SEO win for both you and your customers.

#### Phase 7 — `vercel.json` Update
```json
{
  "framework": "nextjs"
}
```
Remove the `rewrites` block — Next.js handles routing natively.

### Migration Effort Estimate
| Phase | Effort |
|---|---|
| Setup + config | 2 hrs |
| Landing page port | 4–6 hrs |
| Auth + app shell | 4–6 hrs |
| Dashboard pages | 8–12 hrs |
| Superadmin | 4–6 hrs |
| Testing + deploy | 4 hrs |
| **Total** | **~26–34 hrs** |

---

## 💡 4. Additional Recommendations

### High Priority

**A. Password Reset Callback Page**
Create `src/pages/ResetPasswordPage.jsx` (or `app/reset-password/page.jsx` in Next.js). After Supabase redirects the user back, detect the `#access_token` hash and show a "new password" form:
```jsx
const { data, error } = await supabase.auth.updateUser({ password: newPassword });
```

**B. Email Confirmation Redirect**
Right now sign-up confirms via email but lands on the default Supabase page. Set your confirmation redirect URL to `https://opdesk.app/bookings` so users land directly in the app.

**C. `<html lang>` Per Company Language**
Your app supports 12 languages. Consider setting `document.documentElement.lang` based on `company.language` after login — this helps screen readers and search engines.

### Medium Priority

**D. Operator Profile SEO**
The `/operators/:handle` public pages are a growth channel. Each operator page should have:
- Unique `<title>` with operator name
- `og:image` from their uploaded logo/photo
- Local business structured data (`LocalBusiness` schema)
- Google Maps embed if coordinates are stored

**E. Structured Data on Landing Page**
Add `FAQPage` schema for your pricing FAQ section — FAQ rich results appear directly in Google SERPs.

**F. `rel="preconnect"` for Supabase**
Add to `<head>` to speed up the first Supabase API call:
```html
<link rel="preconnect" href="https://your-project.supabase.co" />
```

**G. Analytics**
Integrate Vercel Analytics (free, privacy-first) or Plausible to track which landing page sections convert. The data will tell you whether to expand the pricing section or the feature grid.

**H. Lazy-load Heavy Modules**
`ModulePages.jsx` is 124KB — the largest file in the project. In Next.js use `dynamic(() => import('./ModulePages'), { loading: () => <Spinner /> })` to code-split it out of the initial bundle.

**I. Toast System Consolidation**
There are two Toast implementations (`src/components/Toast.jsx` and an inline one in `bookings.jsx`). Consolidate to the component version and wrap at the `RootRouter` level for consistent messaging.

**J. Error Boundary**
Add a top-level React `ErrorBoundary` around the app shell so that a JS error in one page doesn't crash the entire session.

**K. `Content-Security-Policy` Header**
Add to `vercel.json` headers:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co;"
}
```

### Lower Priority

**L. PWA Manifest**
Add a `manifest.json` so mobile users can install OpDesk to their home screen. Combine with a service worker for offline resilience (useful in low-connectivity safari lodges).

**M. Image Optimisation**
If operator photos or logos are stored in Supabase Storage, run them through a CDN transform on the way out (`?width=400&format=webp`) rather than serving full-resolution uploads.

**N. Supabase Package Update**
`@supabase/supabase-js` is pinned at `^2.39.0`. The current version is `2.68+` with improved auth and realtime. Run `npm update @supabase/supabase-js` and test auth flows.

---

## Summary of Files Changed in This Upgrade

| File | Change |
|---|---|
| `src/bookings.jsx` | Added `forgot` mode, `handleForgotPassword`, UI for reset flow |
| `src/context/AuthContext.jsx` | Added `resetPassword()` function, exposed in context value |
| `index.html` | Full SEO meta, OG, Twitter, JSON-LD, canonical |
| `public/robots.txt` | Created — crawler rules + sitemap declaration |
| `public/sitemap.xml` | Created — indexed URLs |
