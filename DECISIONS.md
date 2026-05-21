# DECISIONS.md — OceanWatch AU

Append-only log of non-obvious technical decisions. Most recent entries first.

---

## 2026-05-21 — Map tile provider: CartoDB Dark Matter

**Decision**: Use `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
as the MapLibre base style, with a GEBCO WMS raster overlay for ocean bathymetry.

**Alternatives considered**:

- MapTiler (free tier, 100k tiles/month) — good quality but needs API key
- Stadia Maps Alidade Smooth Dark — fine for flat maps; globe mode less tested
- Self-hosted PMTiles via Protomaps — zero cost and zero rate limits, but requires
  a build-time tile generation step not appropriate for v0

**Rationale**: CartoDB Dark Matter is CC BY 3.0 licensed, requires no API key at
reasonable traffic, works well in MapLibre globe projection, and delivers the
dark-ocean Nullschool aesthetic immediately. GEBCO bathymetry raster adds actual
depth information. Both can be replaced in v1 with a self-hosted solution.

**Trade-off**: Rate limits apply (no documented hard limit for reasonable usage);
a sudden traffic spike could cause tile 429s. For v0 public traffic levels this
is acceptable. Document and revisit before v1.

---

## 2026-05-21 — Oil spill data strategy: CDSE + heuristic fallback

**Decision**: Primary ingest attempts the CDSE OData API for Sentinel-1 GRD
acquisitions over Australian and Pacific waters, then checks CMEMS for any
pre-processed oil-slick products. When no derived detection polygon is available
from either source, the ingest cron inserts the SAR acquisition footprint as a
detection record tagged `provenance: 'heuristic-v0'`, `confidence_tier: 'anomaly'`,
`confidence: 0.1`. These records display with an "Experimental" badge in the UI
and are never labelled Verified or Probable.

**Alternatives considered**:

- Running a real dark-spot detection algorithm (Node.js GeoTIFF parsing + threshold
  on backscatter) — technically feasible but would expand v0 scope significantly
  and introduce high false-positive risk, violating the hardest non-functional
  constraint
- Sourcing ready-made detections from CMEMS SLICK product — not consistently
  available via REST for AUS/Pacific region in free tier

**Rationale**: The brief explicitly blesses the heuristic fallback for v0 with the
requirement that all such records be tagged accordingly. This satisfies acceptance
criterion #3 while respecting the low-false-positive constraint: the UI makes the
experimental nature of these records unambiguous.

**CDSE authentication**: OAuth2 client credentials via
`https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`.
Token cached for 1 hour; refreshed automatically.

---

## 2026-05-21 — Tailwind CSS v4 configuration approach

**Decision**: Use Tailwind CSS v4 with `@tailwindcss/postcss`. No `tailwind.config.ts`.
Theme tokens defined via `@theme {}` block in `src/app/globals.css`.

**Rationale**: v4 stable ships Jan 2025; PostCSS plugin approach is the documented
path for Next.js 15. Removes the need for a separate config file and co-locates
design tokens with the CSS that uses them.

---

## 2026-05-21 — Node.js version: 22 LTS

**Decision**: Pin Node 22 LTS via `.nvmrc` and `package.json#engines`.

**Rationale**: Vercel's current recommended LTS as of v0 build date. Node 22 provides
native `fetch`, `structuredClone`, and URL pattern APIs that simplify the Copernicus
client implementation without polyfills.

---

## 2026-05-21 — No separate Python service for geospatial processing

**Decision**: All geospatial processing runs in Vercel Functions (Node runtime) or
is pre-computed at build time. No Python sidecar.

**Rationale**: Prescribed by the stack brief. The Copernicus `copernicusmarine` Python
client is replaced by direct REST calls in TypeScript. For v0 this is sufficient
because we are consuming pre-processed detections, not running inference.

---

## 2026-05-21 — MapLibre GL JS globe projection

**Decision**: Use MapLibre GL JS v4 native globe projection (`projection: 'globe'`).

**Rationale**: Globe projection was stabilised in MapLibre v3 and is fully supported
in v4. Delivers the Nullschool-style 3D globe without a separate 3D library, keeping
the bundle small. Flat mercator is available as a fallback if globe projection
causes performance issues on low-end devices; that fallback is not implemented in v0.

---

## 2026-05-21 — Dynamic import for MapLibre

**Decision**: MapLibre GL JS is loaded via `import('maplibre-gl')` inside a
`useEffect` in a `'use client'` component. Not SSR-rendered.

**Rationale**: MapLibre directly references `window` and `document` on import;
it cannot be server-side rendered. Dynamic import defers it past the initial page
load, satisfying the <200kB gzipped JS budget for the initial route.
