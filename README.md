# PhotoMap

PhotoMap is a public demo for exploring travel photos by place, time, albums, and relationships. The current demo is a read-only showcase: visitors can browse sample data without logging in, while upload, delete, edit, and admin workflows stay disabled in public mode.

## Project Snapshot

- Development period: 2025.12 - 2026.04
- Role: frontend architecture, Zustand state management, image rendering optimization, D3 visualization, Unity WebGL integration, deployment cleanup
- Frontend: React, TypeScript, Vite, Zustand, Tailwind CSS, Radix UI
- Visualization: Cobe 3D globe, D3 force graph, Mapbox/Unity WebGL map view
- Data: Supabase PostgreSQL, Auth, Storage
- Deployment target: Vercel

## Public Demo Status

As of 2026-07-20 KST, no publicly accessible production URL is verified.

- Repository homepage URL `https://photomap-beta.vercel.app` returns Vercel `DEPLOYMENT_NOT_FOUND`.
- Latest GitHub production deployment target `https://photomap-7o4sqrn8d-sabins-projects-011c6dea.vercel.app` redirects to Vercel SSO instead of the app.
- Do not use deployment Lighthouse results from these URLs as PhotoMap app performance claims.

Issue #11 should be updated again after Vercel project access protection and alias settings are fixed.

## Demo Behavior

Public demo mode is controlled by environment variables:

```text
VITE_PUBLIC_DEMO=true
VITE_DEMO_USER_ID=<read-only demo data owner user id>
```

In public demo mode:

- The app uses `VITE_DEMO_USER_ID` for read-only Supabase queries.
- Login and signup are not required.
- Upload, delete, category editing, and admin features are hidden or disabled.
- Favorites are saved only in browser `localStorage`.
- Performance monitor UI is hidden unless `VITE_SHOW_PERFORMANCE_MONITOR=true`.

## Features

- EXIF-based photo location and time exploration
- Supabase-backed photo metadata loading
- Virtualized photo feed for larger collections
- Cobe globe view with photo markers
- Timeline, albums, favorites, map, and node graph views
- Unity WebGL map integration
- Read-only public demo guardrails

## Performance Evidence

Performance artifacts are stored outside the repository under `E:\memory\photomap`.

Current tracked baseline:

- Issue #10 summary: `docs/performance/issue-10-baseline.md`
- Full baseline note: `E:\memory\photomap\characteristic\2026-07-19-issue-10-baseline-record.md`
- Dev/performance React Profiler baseline: `PhotomapApp` 11 commits, max `actualDuration` 28.4ms, average `actualDuration` 9.45ms

The deployment Lighthouse artifacts collected for #10 are access-state evidence only because the URLs did not serve the public app.

## Local Development

```powershell
cd Frontend
npm install
npm run dev
```

Production build:

```powershell
cd Frontend
npm run build
```

Performance build:

```powershell
cd Frontend
npm run build:perf
npm run preview:perf
```

## Environment Variables

Set these in `Frontend/.env` for local work or in Vercel project settings for deployment. Do not commit actual values.

```text
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
VITE_DEMO_USER_ID=<read-only demo data owner user id>
VITE_PUBLIC_DEMO=true
VITE_MAPBOX_TOKEN=<Mapbox public token>
VITE_KAKAO_MAP_API_KEY=<Kakao REST API key>
VITE_SHOW_PERFORMANCE_MONITOR=false
```

For authenticated local development, run with:

```text
VITE_PUBLIC_DEMO=false
```

## Vercel Settings

- Root Directory: `Frontend`
- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `build`

`Frontend/vercel.json` configures response headers for Unity WebGL Brotli and WASM assets.

## Supabase Demo Data Requirements

The public demo requires read-only rows owned by `VITE_DEMO_USER_ID`.

Required tables:

- `media`
- `location`
- `category`
- `media_description`
- `favorites` optional

If Row Level Security is enabled, anon access must be limited to the intended demo rows only.
