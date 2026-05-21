# OceanWatch AU — API Reference

**Version**: v1  
**Base URL**: `/api/v1`  
**Format**: GeoJSON (`application/geo+json`)  
**Auth**: None — public, read-only

---

## Overview

The OceanWatch AU API exposes the same detection data that powers the web UI.
It is designed as a public contract suitable for integration with AMSA, CSIRO,
and AODN systems. Schema is stable within a major version; additive changes
(new fields) may be made without a version bump.

---

## Endpoints

### `GET /api/v1/detections`

Returns a [GeoJSON FeatureCollection](https://datatracker.ietf.org/doc/html/rfc7946#section-3.3) of pollution detections matching the query parameters.

#### Query parameters

| Parameter        | Type       | Default     | Description                                                                                                                                           |
| ---------------- | ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bbox`           | string     | —           | Bounding box filter: `minLon,minLat,maxLon,maxLat` (WGS-84 decimal degrees). Example: `112.0,-44.0,154.0,-10.0` for the Australian continental shelf. |
| `start`          | ISO-8601   | 30 days ago | Start of the time window (inclusive).                                                                                                                 |
| `end`            | ISO-8601   | now         | End of the time window (inclusive).                                                                                                                   |
| `min_confidence` | number 0–1 | `0`         | Only return detections with `confidence ≥ min_confidence`.                                                                                            |
| `tier`           | string     | —           | Filter to a single confidence tier: `verified`, `probable`, `possible`, `anomaly`.                                                                    |
| `limit`          | integer    | `200`       | Maximum features in the response (max `1000`).                                                                                                        |
| `offset`         | integer    | `0`         | Pagination offset.                                                                                                                                    |

#### Response

HTTP `200 OK` with `Content-Type: application/geo+json`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [140.0, -10.0],
              [145.0, -10.0],
              [145.0, -15.0],
              [140.0, -15.0],
              [140.0, -10.0]
            ]
          ]
        ]
      },
      "properties": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "source": "copernicus-cdse",
        "source_record_id": "S1A_IW_GRDH_1SDV_20240315T204512_...",
        "acquisition_id": "S1A_IW_GRDH_1SDV_20240315T204512_20240315T204537_...",
        "detected_at": "2024-03-15T20:45:12.000Z",
        "ingested_at": "2024-03-15T22:01:05.000Z",
        "area_km2": 42.5,
        "confidence": 0.72,
        "confidence_tier": "probable",
        "pollutant_type": "oil",
        "provenance": "cdse-derived",
        "thumbnail_url": "https://cdn.example.com/thumbs/...",
        "raw_record_url": "https://catalogue.dataspace.copernicus.eu/odata/v1/Products(...)",
        "model_version": "heuristic-v0",
        "metadata": {},
        "is_fresh": false,
        "is_experimental": false
      }
    }
  ]
}
```

#### Feature properties schema

| Field              | Type           | Description                                                                                      |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `id`               | uuid           | Internal detection identifier. Stable across re-ingests.                                         |
| `source`           | string         | Upstream data provider (e.g. `copernicus-cdse`, `copernicus-cmems`).                             |
| `source_record_id` | string         | Upstream identifier — unique within `source`.                                                    |
| `acquisition_id`   | string         | Satellite acquisition (scene) identifier.                                                        |
| `detected_at`      | ISO-8601 UTC   | Satellite overpass time.                                                                         |
| `ingested_at`      | ISO-8601 UTC   | When this record was written to the OceanWatch database.                                         |
| `area_km2`         | number         | Approximate area of the detection polygon in km².                                                |
| `confidence`       | number [0,1]   | Normalised confidence score.                                                                     |
| `confidence_tier`  | string         | One of `verified`, `probable`, `possible`, `anomaly`. See [Confidence tiers](#confidence-tiers). |
| `pollutant_type`   | string         | `oil` in v0.                                                                                     |
| `provenance`       | string         | Processing chain: `cdse-derived`, `cmems-derived`, `heuristic-v0`.                               |
| `thumbnail_url`    | string \| null | URL to SAR tile thumbnail. May be null if not available.                                         |
| `raw_record_url`   | string \| null | Link to the upstream record for full provenance.                                                 |
| `model_version`    | string \| null | Version of the detection model or heuristic.                                                     |
| `metadata`         | object         | Arbitrary upstream metadata (orbit number, acquisition mode, etc.).                              |
| `is_fresh`         | boolean        | True if `detected_at` is within the last 24 hours. Computed at query time.                       |
| `is_experimental`  | boolean        | True if `provenance = 'heuristic-v0'`. Not a confirmed detection.                                |

#### Confidence tiers

| Tier       | Confidence range | Meaning                                                                                                 |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `verified` | ≥ 0.85           | Pre-validated product from CMEMS or CDSE. Consistent with an oil slick.                                 |
| `probable` | 0.60–0.84        | Strong dark-spot signal, not fully validated.                                                           |
| `possible` | 0.30–0.59        | Dark spot detected; look-alike not ruled out.                                                           |
| `anomaly`  | < 0.30           | SAR acquisition footprint logged by heuristic. Not a confirmed detection. Always shown as Experimental. |

**Important**: `anomaly` tier and `is_experimental: true` records must not be used to trigger maritime incidents or spill response actions without independent verification.

#### Error responses

| Status                      | Body                                   | Meaning                                      |
| --------------------------- | -------------------------------------- | -------------------------------------------- |
| `400 Bad Request`           | `{ "error": "<description>" }`         | Invalid query parameter.                     |
| `500 Internal Server Error` | `{ "error": "Internal server error" }` | Database or upstream error. Retry after 60s. |

#### Caching

Successful responses include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
CDN caches may serve stale data for up to 5 minutes while revalidation occurs.

---

### `GET /api/health`

Health check endpoint. Returns `200` when the database is reachable, `503` when degraded.

#### Response

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime_seconds": 3600,
  "checks": {
    "database": "ok"
  },
  "latency_ms": 12,
  "timestamp": "2024-03-15T22:00:00.000Z"
}
```

---

## Examples

**All detections for the last 7 days over the Torres Strait:**

```
GET /api/v1/detections?bbox=141.0,-11.0,145.0,-9.0&start=2024-03-08T00:00:00Z
```

**Verified and probable detections only:**

```
GET /api/v1/detections?min_confidence=0.6
```

**Paginate through all recent anomalies:**

```
GET /api/v1/detections?tier=anomaly&limit=50&offset=0
GET /api/v1/detections?tier=anomaly&limit=50&offset=50
```

---

## Rate limits

There are no documented rate limits for v0. Please cache responses client-side
and avoid polling faster than the `Cache-Control` header advises. For bulk or
automated access, contact the maintainers.

---

## Data licence

Detection data is derived from Copernicus programme products. See
[/methodology](/methodology) for full licence terms and attribution requirements.
