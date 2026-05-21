# OceanWatch AU — v0 Implementation Plan

This document maps the v0 acceptance criteria to concrete implementation milestones.
All feature code begins after this file is committed.

---

## Milestones

### M0 — Repository Foundation _(this PR)_

Establishes infrastructure before any feature code is written. Per the brief, this
must be committed first.

- `PLAN.md` (this document)
- `DECISIONS.md` (initial entries)
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `.nvmrc`, `.gitignore`, `.env.example`
- `vercel.json` (cron schedule)
- GitHub Actions: `ci.yml`, `preview-comment.yml`
- Husky pre-commit hooks (format, lint, conventional commits)
- `CODEOWNERS`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- `docs/data-sources.md` (stub, completed in M3)

**Acceptance criteria addressed**: None — prerequisite for all.

---

### M1 — Database Schema & Client

Defines the canonical detection schema as a PostGIS migration and wires up
the Postgres client.

- `db/schema.sql` — `detections` table with PostGIS geometry, GiST index,
  `(source, source_record_id)` unique constraint
- `db/migrate.ts` — applies schema idempotently
- `src/lib/db.ts` — typed Postgres client, connection pooling
- `src/lib/detections.ts` — query helpers, type definitions, confidence-tier
  assignment logic

**Acceptance criteria addressed**: Foundation for #3, #4, #6.

---

### M2 — Data Ingestion Pipeline

Builds the recurring pipeline that polls Copernicus for Sentinel-1 detections
and persists them with upsert semantics.

- `src/lib/copernicus.ts` — CDSE STAC/OData + CMEMS REST clients with OAuth2
  token refresh and rate-limit handling
- `src/lib/ingest.ts` — fetch → normalise → upsert logic; heuristic-v0 fallback
  tagged at `confidence_tier: 'anomaly'` with `provenance: 'heuristic-v0'`
- `src/app/api/cron/ingest/route.ts` — cron endpoint protected by `CRON_SECRET`
- `db/seed.ts` — seed data (known historical events) for development
- `docs/data-sources.md` — complete

**Acceptance criteria addressed**: #3 (pipeline running on schedule).

---

### M3 — Public API

Implements the versioned detection API endpoint and the health check.

- `src/app/api/v1/detections/route.ts` — query parameters: `bbox`, `start`,
  `end`, `min_confidence`, `tier`, `limit`, `offset`
- `src/app/api/health/route.ts` — DB ping, version, uptime
- `docs/api.md` — complete API contract documentation

**Acceptance criteria addressed**: #6 (public API), #8 (health endpoint).

---

### M4 — Globe UI

The core visual surface: MapLibre globe, detection overlays, incident panel,
time scrubber.

- `src/components/Globe.tsx` — MapLibre v4 with globe projection, CartoDB Dark
  Matter base style, GEBCO bathymetry raster overlay, dynamic import
- Detection layers: fill + outline per confidence tier; pulse animation (1.5s)
  for fresh (<24h) detections
- `src/components/IncidentPanel.tsx` — detection ID, timestamps (UTC + local),
  confidence tier, area, thumbnail, acquisition ID, raw data link; bottom-sheet
  on mobile (≤380px)
- `src/components/TimeScrubber.tsx` — range slider from −30d to now; labels at
  −30d, −7d, −24h, Now; mobile-responsive
- `src/app/page.tsx` — composes globe + panel + scrubber, fetches detections
  from `/api/v1/detections`

**Acceptance criteria addressed**: #2 (globe), #4 (incident panel), #5 (scrubber).

---

### M5 — Supporting Pages & Observability

- `src/app/methodology/page.tsx` — plain-English explanation of what the app
  does, confidence tiers, limitations, upstream data licence links
- `src/components/Footer.tsx` — data attribution (Copernicus/CDSE, GEBCO)
- `src/app/layout.tsx` — root layout, Vercel Analytics, Sentry provider
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `src/instrumentation.ts` — Sentry Next.js instrumentation

**Acceptance criteria addressed**: #7 (methodology), #8 (Vercel Analytics + Sentry),
#1 (site deployable to Vercel).

---

### M6 — Tests

- `src/lib/__tests__/detections.test.ts` — confidence-tier assignment, area
  calculation, schema validation
- `src/lib/__tests__/ingest.test.ts` — upsert idempotency, heuristic-v0 tagging,
  dedup via `(source, source_record_id)`, mocked Copernicus responses
- `e2e/smoke.spec.ts` — Playwright: homepage loads, globe renders, at least one
  detection appears, time scrubber moves detections, methodology page loads

**Acceptance criteria addressed**: CI pipeline green.

---

### M7 — README & Final Polish

- `README.md` — local setup in ≤15 minutes, environment variables, DB migration,
  dev server, production deploy, test commands
- `DECISIONS.md` — complete (all non-obvious choices)
- `CHANGELOG.md` — v0 release entry
- Production Vercel deploy verified, custom domain documented

**Acceptance criteria addressed**: #9 (README), final check on all nine criteria.

---

## Acceptance Criteria Cross-Reference

| #   | Criterion                                                  | Primary Milestone |
| --- | ---------------------------------------------------------- | ----------------- |
| 1   | Live at Vercel-hosted URL                                  | M5                |
| 2   | Interactive globe — MapLibre, bathymetry, pan/zoom/rotate  | M4                |
| 3   | Sentinel-1 SAR ingest pipeline, confidence-tiered overlays | M2                |
| 4   | Clickable detections → incident panel                      | M4                |
| 5   | Time scrubber −30d to now                                  | M4                |
| 6   | `/api/v1/detections` public JSON API                       | M3                |
| 7   | `/methodology` page                                        | M5                |
| 8   | Vercel Analytics, structured logs, `/api/health`, Sentry   | M5                |
| 9   | README — fresh clone running in <15 min                    | M7                |

---

## Out of Scope for v0

The following are explicitly deferred per the brief. Do not partially implement or stub:

- Custom ML inference
- Animated particle current layer
- Additional pollution types (plastic, algal bloom, sediment, SST)
- Drift forecasting
- User accounts, authentication, geofencing, alerts
- AIS vessel attribution
- Multi-language support
- Native mobile app
