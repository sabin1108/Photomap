---
name: photomap-harness
description: "Codex??Photomap 怨듦컻 ?곕え 媛쒖꽑 ?섎꽕?? PRD #2? ?댁뒋 #3-#11??湲곗??쇰줈 UX, Supabase ?곹깭, 吏???쒓컖?? QA/?깅뒫, README ?묒뾽????븷蹂꾨줈 ?섎늻???ㅽ뻾?쒕떎. 'Photomap ?섎꽕??, '怨듦컻 ?곕え 媛쒖꽑 ?쒖옉', '?댁뒋 #3-#11 援ы쁽', '寃利??뚯뒪??媛쒕컻', 'Codex ?섎꽕?? ?붿껌 ???ъ슜?쒕떎."
---

# Photomap Harness

Codex?먯꽌 Photomap 怨듦컻 ?곕え 媛쒖꽑??吏꾪뻾?섍린 ?꾪븳 repo-native harness??

Claude Code??`TeamCreate` runtime???섏〈?섏? ?딅뒗?? ???Codex媛 ??skill???쎄퀬, ?꾩옱 ?ъ슜 媛?ν븳 skills? local tools瑜?議고빀????븷蹂?workflow瑜??ㅽ뻾?쒕떎.

## Scope

Parent PRD:

- `https://github.com/sabin1108/Photomap/issues/2`

Implementation issues:

- #3 怨듦컻 ?곕え 泥?吏꾩엯怨?read-only 留λ씫 ?뺣━
- #4 ?ъ쭊 ?쇰뱶? ?곸꽭 蹂닿린 ?먯깋 ?덉쭏 媛쒖꽑
- #5 吏??湲곕컲 ?꾩튂 ?먯깋 ?먮쫫 媛쒖꽑
- #6 ?⑤쾾/移댄뀒怨좊━ ?먯깋??read-only ?쇱??댁뒪濡??뺣━
- #7 ?몃뱶/??꾨씪??湲濡쒕툕/Unity WebGL 蹂댁“ 酉???븷 ?뺣━
- #8 紐⑤컮??viewport ?ъ슜???⑥뒪
- #9 濡쒕뵫/鍮??곹깭/?ㅻ쪟/?대?吏 ?ㅽ뙣 ?곹깭 ?듯빀 ?뺣━
- #10 Lighthouse? React Profiler 湲곗?媛?湲곕줉
- #11 README? 諛고룷 URL 理쒖쥌 ?뺣━

## Operating Model

Use a pipeline with reviewer gates.

1. Plan slice from GitHub issue.
2. Inspect relevant code.
3. Implement narrow end-to-end change.
4. Verify build and behavior.
5. Review against PRD and issue acceptance criteria.
6. Record result in chat log when user asks for traceability.

For context saving or parallel investigation, use existing `cavecrew` if user asks to delegate or when context pressure is high. Otherwise execute inline.

## Role Map

### Demo Lead

Purpose: choose next issue, enforce scope, avoid unsafe commits.

Responsibilities:

- Read PRD #2 and target issue.
- Convert acceptance criteria into local checklist.
- Keep changes vertical, not broad refactors.
- Prevent accidental staging of `.env`, secrets, `.vscode`, experimental Unity folders.

### UX Builder

Purpose: improve visible user experience.

Issues:

- #3, #4, #6, #8

Responsibilities:

- First screen, read-only explanation, navigation.
- Photo feed, detail modal, albums/categories.
- Mobile sidebar/drawer/modal overflow.
- Broken/encoded text cleanup.

### Data Guard

Purpose: protect Supabase-backed read-only demo behavior.

Issues:

- #3, #4, #9

Responsibilities:

- Demo user read path.
- UI and store write blocking in public demo mode.
- `localStorage` favorites only in public demo.
- Missing env, empty data, RLS/permission, image failure states.
- No fake fallback data.

### Visualization Builder

Purpose: make visual exploration screens useful and stable.

Issues:

- #5, #7, #8, #9

Responsibilities:

- Map marker/photo connection.
- Missing/sparse coordinates.
- Node, Timeline, Globe role clarity.
- Unity WebGL loading/failure/missing support states.
- Keep heavy views lazy-loaded.

### QA Performance Inspector

Purpose: verify external behavior and measured performance.

Issues:

- #8, #9, #10

Responsibilities:

- `npm run build`.
- Desktop and mobile viewport checks.
- Public demo login bypass.
- Read-only write path checks.
- Lighthouse baseline on deployed URL when available.
- React Profiler baseline for main flows when available.

### Docs Curator

Purpose: keep README and release notes honest.

Issues:

- #10, #11

Responsibilities:

- Verified Vercel URL only.
- Env names without values.
- No unmeasured performance claims.
- Vite + React + Supabase + Unity WebGL wording only.

## Issue Execution Order

Default order:

1. #3
2. #4
3. #5 and #6, after #4
4. #7, after #4
5. #8, after #5/#6/#7
6. #9, after #5/#6/#7
7. #10, after #8/#9
8. #11, after #10

If user asks to start development, start with #3 unless they name another issue.

## Required Checks

Before edits:

- `git status --short`
- Read target issue body.
- Identify files likely affected.

After edits:

- `npm run build` in `Frontend` when code changed.
- Verify no actual env/token/secret values were added.
- Verify no unrelated untracked folders were staged.
- Summarize changed user-visible behavior.

Secret scan before commit/staging:

```powershell
git diff --cached | rg -n "eyJ|service_role|sk-[A-Za-z0-9]|access_token|secret|api[_-]?key|VITE_[A-Z0-9_]+=|PASSWORD=|SUPABASE_SERVICE|PRIVATE_KEY|pk\\."
```

## Existing Skills To Combine

- Use `diagnose` for broken deployment, Supabase RLS, image/WebGL loading failures.
- Use `tdd` when a change can be protected by a practical test seam.
- Use `qa` for conversational QA against deployed URL and issue filing.
- Use `review` before merge/commit when diff should be checked against PRD/issue.
- Use `caveman-commit` for terse conventional commit messages.
- Use `handoff` after long sessions or before switching agents.

## Local Trace Log

When user asks to keep AI conversation/work logs, append a dated markdown file under:

- `E:\memory\photomap\chat`

Log format:

```markdown
# Photomap Work Log - YYYY-MM-DD

## User Request
...

## Interpretation
...

## Actions Taken
...

## Files/Issues Changed
...

## Verification
...

## Next Steps
...
```

Do not include secrets, env values, passwords, tokens, or private account data.

## Done Criteria

A slice is done only when:

- Target GitHub issue acceptance criteria are addressed or explicitly marked blocked.
- User-visible behavior is verified.
- Build passes when code changed.
- Documentation claims remain truthful.
- Secret scan/staging safety has no findings.
