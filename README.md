# OceanWatch AU

Near-real-time ocean pollution detections in Australian and Pacific waters, powered by
Sentinel-1 SAR satellite data from the Copernicus programme.

**Live app**: deployed at your Vercel URL (see Deployment section)  
**API docs**: [docs/api.md](docs/api.md)  
**Methodology**: [/methodology](./src/app/methodology/page.tsx)

---

## Local setup

Estimated time: 10–15 minutes on a clean machine.

### Prerequisites

- Node.js 22 LTS ([nvm](https://github.com/nvm-sh/nvm) recommended)
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 15+ with PostGIS extension  
  _Quickest option_: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw postgis/postgis`

### 1. Clone and install

```bash
git clone https://github.com/shatteredark/oceanwatch-au.git
cd oceanwatch-au
nvm use          # switches to Node 22 via .nvmrc
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable                                | Where to get it                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`                          | Your local PostgreSQL connection string                                                                    |
| `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` | Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu/) → Account Settings → OAuth clients |
| `CMEMS_USERNAME` / `CMEMS_PASSWORD`     | Register at [marine.copernicus.eu](https://marine.copernicus.eu/)                                          |
| `BLOB_READ_WRITE_TOKEN`                 | Vercel Blob — skip for local dev (thumbnails will be null)                                                 |
| `CRON_SECRET`                           | Any random string, e.g. `openssl rand -hex 32`                                                             |

For the Copernicus credentials, free registration takes about 5 minutes. The app works
without them — the ingest cron will log an error but the UI will render with seed data.

### 3. Apply the database schema

```bash
pnpm db:migrate
```

This creates the `detections` table with PostGIS geometry, GiST index, and the
`(source, source_record_id)` unique constraint.

### 4. Seed development data (optional)

```bash
# Inserts 3 known historical detections for a working UI out of the box
POSTGRES_URL=<your-connection-string> tsx db/seed.ts
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the globe centred on Australia.

### 6. Trigger the ingest pipeline manually (optional)

```bash
curl -H "Authorization: Bearer <your-CRON_SECRET>" http://localhost:3000/api/cron/ingest
```

This fetches recent Sentinel-1 acquisitions from CDSE and upserts them as heuristic detections.

---

## Commands

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Start the Next.js development server with Turbopack |
| `pnpm build`        | Production build                                    |
| `pnpm start`        | Start the production server                         |
| `pnpm type-check`   | TypeScript type check                               |
| `pnpm lint`         | ESLint                                              |
| `pnpm format`       | Prettier format (write)                             |
| `pnpm format:check` | Prettier format check (CI)                          |
| `pnpm test`         | Vitest unit tests                                   |
| `pnpm test:watch`   | Vitest watch mode                                   |
| `pnpm test:e2e`     | Playwright e2e tests (requires running server)      |
| `pnpm db:migrate`   | Apply database schema                               |

---

## Deployment

### Vercel (production)

1. Import this repo at [vercel.com/new](https://vercel.com/new).
2. Add a **Vercel Postgres** database in the Storage tab. Enable the PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Add a **Vercel Blob** store.
4. Set environment variables in Vercel project settings (see `.env.example`).
5. Run the migration:
   ```bash
   vercel env pull .env.local  # pulls production env vars locally
   pnpm db:migrate
   ```
6. Push to `main`. Vercel will build and deploy automatically.

### Custom domain

In the Vercel project → Domains, add your domain and follow the DNS instructions.
No code changes required.

### Cron schedule

The ingest pipeline runs every 6 hours via `vercel.json`. No additional setup needed.
To verify it's working, check the Vercel Function logs for `/api/cron/ingest`.

---

## Architecture

```
Browser
  └── Next.js 15 App Router (Vercel)
        ├── page.tsx — server component, fetches initial detections
        ├── GlobeView — client component, MapLibre GL JS (dynamic import)
        │     ├── Globe.tsx — MapLibre map, detection layers, pulse animation
        │     ├── IncidentPanel.tsx — detection details sidebar
        │     └── TimeScrubber.tsx — −30d to now slider
        ├── /api/v1/detections — public GeoJSON API
        ├── /api/health — health check
        └── /api/cron/ingest — Vercel Cron (every 6h)
              ├── CMEMS REST — derived products (best-effort)
              └── CDSE OData — Sentinel-1 GRD metadata (heuristic fallback)

Database: Vercel Postgres + PostGIS
  └── detections table — WGS-84 MultiPolygon + confidence tiers
```

---

## Testing

```bash
pnpm test          # Vitest unit tests (no DB, no network)
pnpm test:e2e      # Playwright smoke tests (requires running dev server)
```

Unit tests cover: confidence tier assignment, freshness calculation, ingest upsert logic.  
E2e tests cover: globe renders, time scrubber moves, methodology page loads, API responses.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability disclosure.

## Licence

MIT — see [LICENSE](LICENSE).
