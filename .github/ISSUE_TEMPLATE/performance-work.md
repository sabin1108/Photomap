---
name: Performance work
about: Track measured performance improvements for the public demo
title: "[Performance] "
labels: enhancement, ready-for-agent
assignees: ""
---

## Goal

Improve one measurable performance bottleneck in the public read-only demo.

## Baseline

- [ ] Lighthouse raw JSON saved under `E:\memory\photomap\lightHouse`
- [ ] React Profiler export saved when React rendering is relevant
- [ ] Frame budget JSON saved when WebGL/canvas is relevant
- [ ] Baseline notes include URL, viewport, server mode, and env flags

## Implementation Notes

- Scope:
- Expected affected files:
- Measurement risk or caveat:

## After Measurement

- [ ] `npm run build:perf` passes
- [ ] Lighthouse raw JSON saved under `E:\memory\photomap\lightHouse`
- [ ] React Profiler or frame budget export saved when relevant
- [ ] Analysis summary saved under `E:\memory\photomap\characteristic`
- [ ] Before/after includes Performance score, LCP, TBT, main-thread work, bootup time, and payload size when available
- [ ] No performance regression called out or accepted with reason

## Public Demo Wording Guard

- [ ] Issue and commit text focus on service quality, demo reliability, and performance
- [ ] No company, hiring, resume, or interview-specific wording
- [ ] Static files contain no secrets or private IDs beyond documented public demo env names

## Acceptance Criteria

- [ ] Change is committed in a focused diff
- [ ] Verification commands and result paths are recorded in the closing comment
- [ ] Remaining follow-up work is filed as separate issues when needed
