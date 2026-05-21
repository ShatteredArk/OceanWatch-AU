# Data Sources — OceanWatch AU

This document describes every upstream data source the application touches:
URLs, licence terms, attribution requirements, rate limits, and access setup.

---

## 1. Copernicus Data Space Ecosystem (CDSE)

**Role**: Primary source of Sentinel-1 GRD acquisition metadata and quick-look thumbnails.
Used as the fallback when no pre-processed detection product is available from CMEMS.

|                  |                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **URL**          | https://dataspace.copernicus.eu/                                                                                                                                                           |
| **API – OData**  | https://catalogue.dataspace.copernicus.eu/odata/v1/                                                                                                                                        |
| **API – STAC**   | https://catalogue.dataspace.copernicus.eu/stac/                                                                                                                                            |
| **Auth**         | OAuth2 client credentials. Token endpoint: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`                                                       |
| **Registration** | Free. https://dataspace.copernicus.eu/ → Sign up                                                                                                                                           |
| **Credentials**  | Create OAuth client at https://shapps.dataspace.copernicus.eu/dashboard/#/account/settings                                                                                                 |
| **Rate limits**  | Not formally documented for free tier. Observed: ~100 req/min. Ingest cron runs every 6h.                                                                                                  |
| **Licence**      | [Copernicus Sentinel Data Terms and Conditions](https://sentinel.esa.int/documents/247904/690755/Sentinel_Data_Legal_Notice) — free for any use including commercial, attribution required |
| **Attribution**  | "Contains modified Copernicus Sentinel data [year]"                                                                                                                                        |

### Environment variables

```
CDSE_CLIENT_ID=...
CDSE_CLIENT_SECRET=...
```

### Collections used

- `SENTINEL-1` — GRD (Ground Range Detected) products, IW mode
- Acquisition footprints used as heuristic detection polygons (tagged `provenance: 'heuristic-v0'`)

---

## 2. Copernicus Marine Service (CMEMS)

**Role**: Best-effort source of pre-processed, quality-controlled ocean products.
Checked first during each ingest run; falls through to CDSE if no relevant product is returned.

|                     |                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **URL**             | https://marine.copernicus.eu/                                                                                                      |
| **Product browser** | https://data.marine.copernicus.eu/products                                                                                         |
| **Auth**            | Username + password (CMEMS account)                                                                                                |
| **Registration**    | Free. https://marine.copernicus.eu/ → My Account                                                                                   |
| **Rate limits**     | ~10 req/min on free tier (observed)                                                                                                |
| **Licence**         | [CMEMS Licence](https://marine.copernicus.eu/user-corner/service-commitments-and-licence) — free for any use, attribution required |
| **Attribution**     | "E.U. Copernicus Marine Service Information"                                                                                       |

### Environment variables

```
CMEMS_USERNAME=...
CMEMS_PASSWORD=...
```

### Products targeted

As of v0, no CMEMS product provides ready-made SAR oil-slick detections over the
Australian/Pacific region via the free-tier REST API. This is documented in
`DECISIONS.md`. The code checks at each ingest run and will automatically use
CMEMS data if a relevant product becomes available.

---

## 3. GEBCO (General Bathymetric Chart of the Oceans)

**Role**: Ocean bathymetry raster tiles rendered as a subtle overlay on the globe.

|                  |                                                                                  |
| ---------------- | -------------------------------------------------------------------------------- |
| **URL**          | https://www.gebco.net/                                                           |
| **WMS endpoint** | https://wms.gebco.net/mapserv                                                    |
| **Auth**         | None — public WMS                                                                |
| **Rate limits**  | Not documented; intended for map display use                                     |
| **Licence**      | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) |
| **Attribution**  | "© GEBCO"                                                                        |

### Usage

MapLibre raster source using WMS `GetMap` requests. Tiles are fetched by the browser on demand.

---

## 4. CartoDB Dark Matter (OpenStreetMap vector tiles)

**Role**: Base map vector tiles for the globe (land/ocean styling, labels).

|                 |                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| **Style URL**   | https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json                               |
| **Auth**        | None — public CDN                                                                              |
| **Rate limits** | Not documented for public CDN; usage by display is within ToS                                  |
| **Licence**     | CartoDB tiles: CC BY 3.0. Underlying OSM data: [ODbL](https://www.openstreetmap.org/copyright) |
| **Attribution** | "© CartoDB, © OpenStreetMap contributors"                                                      |

---

## 5. Vercel Infrastructure

**Role**: Hosting, Postgres (PostGIS), Blob storage, Cron jobs.

| Service          | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| Vercel Functions | API routes, cron ingest                        |
| Vercel Postgres  | Detection records with PostGIS extension       |
| Vercel Blob      | Cached SAR tile thumbnails (future use in v0+) |
| Vercel Analytics | Anonymous page view and performance analytics  |
| Vercel Cron      | 6-hourly ingest trigger                        |

Environment variables are provided automatically in Vercel deployments.
For local development, use `.env.local` (see `.env.example`).

---

## Attribution checklist

The application must display the following attributions visibly:

- [ ] Footer: "Data: Copernicus CDSE / CMEMS · Tiles: CartoDB / GEBCO"
- [ ] Methodology page: full licence text for each source
- [ ] MapLibre attribution control: auto-populated from tile source metadata
