# Load testing

PhotoMap capacity work models a small service with 10,000 monthly active users.
Authoritative environment plan and dated work log:

```text
E:\memory\photomap\2026-08-08-10k-user-load-test-environment.md
```

## Safety

- Run protocol load against an isolated Supabase staging project.
- Never use production write credentials or a `service_role` key.
- Do not load-test Vercel deployments without Vercel authorization.
- Mock or disable Mapbox, Kakao, mail, SMS, and webhooks during protocol load.
- Start with smoke load and stop when error or latency thresholds fail.

## Target profile

- Normal: 10 requests/second for 30 minutes.
- Peak: 20 to 30 requests/second for 30 minutes.
- Spike: 60 to 100 requests/second for 5 minutes.
- Soak: 10 to 20 requests/second for 2 to 4 hours.
- Browser verification: 10 to 20 sessions, separate from protocol load.

Results record environment, dataset cardinality, response percentiles, error rate,
dropped iterations, Supabase resource usage, egress, and recovery time.
