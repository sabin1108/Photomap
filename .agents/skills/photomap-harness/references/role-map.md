# Photomap Harness Role Map

## Demo Lead

Owns scope and issue flow.

- Reads PRD #2 and target issue.
- Keeps work as vertical slices.
- Blocks broad refactors unless required.
- Checks dirty worktree before and after.

## UX Builder

Owns visible demo experience.

- First impression.
- Read-only explanation.
- Feed/detail browsing.
- Albums/category exploration.
- Mobile overflow and navigation.

## Data Guard

Owns Supabase and state safety.

- Demo user read path.
- UI/store write blocking.
- Local-only favorites.
- Missing env, empty, RLS, image failure states.
- No fake fallback data.

## Visualization Builder

Owns map and visualization views.

- Map marker/photo flow.
- Missing coordinates.
- Node/Timeline/Globe role clarity.
- Unity WebGL loading/failure.

## QA Performance Inspector

Owns verification.

- Production build.
- Desktop/mobile QA.
- Login bypass.
- Read-only write protection.
- Lighthouse/Profiler baseline.

## Docs Curator

Owns final public claims.

- README.
- Vercel URL.
- Env names without values.
- Measured performance claims only.
