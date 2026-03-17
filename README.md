# OpDesk — Vite Migration

## Setup (after cloning)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set:
```
VITE_SUPABASE_URL=https://tasxyiibrjrpnuemorpx.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. In Vercel dashboard
Add these environment variables to your Vercel project:
- `VITE_SUPABASE_URL` = `https://tasxyiibrjrpnuemorpx.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `<your-anon-key>`

### 4. Dev server
```bash
npm run dev
```
App runs at `http://localhost:5173/app.html`

### 5. Build
```bash
npm run build
```

## URL mapping
| Old URL | New URL |
|---------|---------|
| `/bookings.html` | `/app.html` (auto-redirected) |
| `/bookings` | `/app.html` (rewritten) |
| `/?admin` | `/app.html?admin` (unchanged) |
| `/operators/:slug` | `/operators.html` (unchanged) |

## Project structure
```
src/
├── App.jsx                    # Entry point
├── main.jsx                   # ReactDOM mount
├── AppShell.jsx               # Main shell + layout
├── RootRouter.jsx             # ?admin routing
├── Force2FAEnrollment.jsx
├── context/
│   └── AuthContext.jsx        # Auth + AuthScreen
├── components/
│   ├── Sidebar.jsx
│   ├── PageHeader.jsx
│   ├── Toast.jsx
│   ├── UpgradeModal.jsx
│   └── AddOnPurchaseModal.jsx
├── lib/
│   ├── supabase.js            # Supabase client (env vars)
│   ├── constants.js           # TIERS, ICONS, etc.
│   └── totp.js                # TOTP utilities
├── pages/
│   ├── DashboardPage.jsx
│   ├── BookingsPage.jsx
│   ├── CalendarPage.jsx
│   ├── ModulePages.jsx        # Safaris/Tours/Charters/etc.
│   └── ... (all operator pages)
└── superadmin/
    ├── SuperAdminShell.jsx
    ├── SACompanies.jsx
    └── ... (all SA components)
```
