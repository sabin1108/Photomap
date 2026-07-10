# Photomap Harness Verification

## Build

Run from `Frontend`:

```powershell
npm run build
```

Required when any app code changes.

## Manual Demo Flow

1. Open public demo URL or local dev URL.
2. Confirm no login is required in public demo mode.
3. Confirm real Supabase demo data appears.
4. Open photo detail.
5. Toggle favorite and confirm local-only behavior.
6. Open map.
7. Open albums.
8. Open node/timeline/globe/Unity screens when relevant.
9. Repeat core path on mobile viewport.

## Read-only Safety

Check:

- Upload entry hidden in public demo.
- Delete action hidden or blocked.
- Admin entry hidden.
- Category edit/create/delete hidden or blocked.
- Store-level write guard exists for destructive actions.

## State Coverage

Check changed surfaces for:

- Loading.
- Empty data.
- Missing env.
- Supabase/RLS read error.
- Image loading failure.
- WebGL loading/failure.

## Documentation Safety

README can include:

- Vercel URL after verification.
- Env variable names.
- Stack description.
- Measured performance values only.

README must not include:

- Actual env values.
- Supabase service role.
- Passwords.
- Tokens.
- Unmeasured Lighthouse/Profiler claims.
