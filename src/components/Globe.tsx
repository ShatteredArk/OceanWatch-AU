'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { DetectionFeatureCollection } from '@/lib/detections';

interface GlobeProps {
  detections: DetectionFeatureCollection;
  amsaIncidents: DetectionFeatureCollection;
  onDetectionClick: (id: string) => void;
  selectedId: string | null;
}

// Colorblind-safe tier colours — must match globals.css and the header legend
const TIER_COLOR_EXPR = [
  'match',
  ['get', 'confidence_tier'],
  'verified',
  '#ef4444',
  'probable',
  '#f59e0b',
  'possible',
  '#fcd34d',
  '#818cf8', // anomaly / default
] as const;

// Monitoring zone — mirrors AUS_PACIFIC_BBOX in src/lib/copernicus.ts
const MONITORING_BBOX = {
  west: 94.0,
  south: -47.0,
  east: 169.0,
  north: -8.0,
} as const;

// GeoJSON polygon tracing the monitoring boundary (counter-clockwise = RFC 7946 exterior)
const MONITORING_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [MONITORING_BBOX.west, MONITORING_BBOX.north],
            [MONITORING_BBOX.east, MONITORING_BBOX.north],
            [MONITORING_BBOX.east, MONITORING_BBOX.south],
            [MONITORING_BBOX.west, MONITORING_BBOX.south],
            [MONITORING_BBOX.west, MONITORING_BBOX.north],
          ],
        ],
      },
      properties: {},
    },
  ],
};

// "Donut" polygon: the entire globe with the monitoring zone punched out as a hole.
// The outer ring (counter-clockwise) covers everything; the inner ring (clockwise)
// cuts out the monitored area so it remains at full fidelity underneath.
const OUTSIDE_MASK_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          // Outer ring — whole world, counter-clockwise
          [
            [-180, -90],
            [-180, 90],
            [180, 90],
            [180, -90],
            [-180, -90],
          ],
          // Inner ring — monitoring zone hole, clockwise
          [
            [MONITORING_BBOX.west, MONITORING_BBOX.north],
            [MONITORING_BBOX.west, MONITORING_BBOX.south],
            [MONITORING_BBOX.east, MONITORING_BBOX.south],
            [MONITORING_BBOX.east, MONITORING_BBOX.north],
            [MONITORING_BBOX.west, MONITORING_BBOX.north],
          ],
        ],
      },
      properties: {},
    },
  ],
};

/** Builds a tileable 16×16 crosshatch ImageData for use as a fill-pattern. */
function buildCrosshatchImage(): ImageData {
  const sz = 16;
  const canvas = document.createElement('canvas');
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  // Draw both diagonal families — canvas clips to tile bounds automatically.
  // The endpoints are offset by ±sz so adjacent tile edges join seamlessly.
  for (const ox of [-sz, 0, sz]) {
    // '\' family (top-left → bottom-right)
    ctx.beginPath();
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox + sz, sz);
    ctx.stroke();
    // '/' family (top-right → bottom-left)
    ctx.beginPath();
    ctx.moveTo(ox + sz, 0);
    ctx.lineTo(ox, sz);
    ctx.stroke();
  }
  return ctx.getImageData(0, 0, sz, sz);
}

export function Globe({ detections, amsaIncidents, onDetectionClick, selectedId }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef({ opacity: 0.35, direction: 1 });

  const handleDetectionClick = useCallback(
    (
      e: Parameters<Parameters<MapLibreMap['on']>[1]>[0] & {
        features?: Array<{ properties?: Record<string, unknown> }>;
      }
    ) => {
      const feature = e.features?.[0];
      const id = feature?.properties?.['id'];
      if (typeof id === 'string') {
        onDetectionClick(id);
      }
    },
    [onDetectionClick]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let map: MapLibreMap | undefined;
    let destroyed = false;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (destroyed || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [133.7751, -25.2744],
        zoom: 3.5,
        antialias: true,
      });

      // Globe projection — runtime API exists in v4.7+ but lacks TS types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setProjection?.('globe');

      mapRef.current = map;

      map.on('load', () => {
        if (destroyed || !map) return;

        // GEBCO bathymetry raster overlay
        map.addSource('gebco', {
          type: 'raster',
          tiles: [
            'https://wms.gebco.net/mapserv?service=WMS&version=1.3.0&request=GetMap' +
              '&layers=GEBCO_LATEST&styles=default&format=image%2Fpng' +
              '&transparent=true&crs=EPSG%3A3857&width=256&height=256' +
              '&bbox={bbox-epsg-3857}',
          ],
          tileSize: 256,
          attribution: '© GEBCO',
        });
        map.addLayer(
          {
            id: 'gebco-bathymetry',
            type: 'raster',
            source: 'gebco',
            paint: {
              'raster-opacity': 0.28,
              'raster-brightness-max': 0.5,
              'raster-contrast': -0.2,
            },
          },
          'water'
        );

        // Outside mask — dims everything beyond the monitoring zone
        map.addSource('outside-mask', {
          type: 'geojson',
          data: OUTSIDE_MASK_GEOJSON,
        });
        map.addLayer({
          id: 'outside-mask-fill',
          type: 'fill',
          source: 'outside-mask',
          paint: {
            'fill-color': '#020b18',
            'fill-opacity': 0.78,
          },
        });

        // Monitoring zone boundary
        map.addSource('monitoring-boundary', {
          type: 'geojson',
          data: MONITORING_BOUNDARY_GEOJSON,
        });

        // Faint red fill inside the monitoring zone
        map.addLayer({
          id: 'monitoring-fill',
          type: 'fill',
          source: 'monitoring-boundary',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.03,
          },
        });

        // Dashed red perimeter
        map.addLayer({
          id: 'monitoring-border',
          type: 'line',
          source: 'monitoring-boundary',
          paint: {
            'line-color': '#ef4444',
            'line-width': 1.5,
            'line-opacity': 0.55,
            'line-dasharray': [4, 5],
          },
        });

        // ── AMSA historical incidents — always-visible permanent layer ──────────

        map.addSource('amsa-incidents', {
          type: 'geojson',
          data: amsaIncidents,
          generateId: true,
        });

        // Bold fill — slightly higher opacity than demo to signal authority
        map.addLayer({
          id: 'amsa-incidents-fill',
          type: 'fill',
          source: 'amsa-incidents',
          paint: {
            'fill-color': [...TIER_COLOR_EXPR] as unknown as string,
            'fill-opacity': 0.5,
          },
        });

        // Solid bright outline (no dash) to distinguish from demo
        map.addLayer({
          id: 'amsa-incidents-outline',
          type: 'line',
          source: 'amsa-incidents',
          paint: {
            'line-color': [...TIER_COLOR_EXPR] as unknown as string,
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2.5],
            'line-opacity': 1.0,
          },
        });

        // ── Detection layers (demo + future real data) ────────────────────────

        // Detection GeoJSON source
        map.addSource('detections', {
          type: 'geojson',
          data: detections,
          generateId: true,
        });

        // Fill layer — base polygon fill
        map.addLayer({
          id: 'detections-fill',
          type: 'fill',
          source: 'detections',
          paint: {
            'fill-color': [...TIER_COLOR_EXPR] as unknown as string,
            'fill-opacity': [
              'match',
              ['get', 'confidence_tier'],
              'verified',
              0.4,
              'probable',
              0.35,
              'possible',
              0.12,
              0.18, // anomaly
            ],
          },
        });

        // Crosshatch pattern overlay — demo detections only
        // Transparent background with white diagonal lines makes the tier colour
        // show through while visually flagging these as simulated data.
        map.addImage('demo-crosshatch', buildCrosshatchImage());
        map.addLayer({
          id: 'detections-demo-hatch',
          type: 'fill',
          source: 'detections',
          filter: ['==', ['get', 'source'], 'demo'],
          paint: {
            // fill-pattern replaces fill-color; fill-opacity still applies
            'fill-pattern': 'demo-crosshatch',
            'fill-opacity': 0.85,
          },
        });

        // Soft glow ring on verified + probable detections
        map.addLayer({
          id: 'detections-glow',
          type: 'line',
          source: 'detections',
          filter: ['in', ['get', 'confidence_tier'], ['literal', ['verified', 'probable']]],
          paint: {
            'line-color': [...TIER_COLOR_EXPR] as unknown as string,
            'line-width': 12,
            'line-opacity': 0.1,
            'line-blur': 6,
          },
        });

        // Crisp outline
        map.addLayer({
          id: 'detections-outline',
          type: 'line',
          source: 'detections',
          paint: {
            'line-color': [...TIER_COLOR_EXPR] as unknown as string,
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.5],
            'line-opacity': 0.9,
          },
        });

        // Pulse overlay — only for fresh (<24h) detections
        map.addLayer({
          id: 'detections-pulse',
          type: 'fill',
          source: 'detections',
          filter: ['==', ['get', 'is_fresh'], true],
          paint: {
            'fill-color': [...TIER_COLOR_EXPR] as unknown as string,
            'fill-opacity': 0.35,
          },
        });

        // Animate the pulse layer at ~1.5 s cycle
        const animate = () => {
          const p = pulseRef.current;
          p.opacity += p.direction * 0.008;
          if (p.opacity > 0.65) p.direction = -1;
          if (p.opacity < 0.2) p.direction = 1;
          if (map?.getLayer('detections-pulse')) {
            map.setPaintProperty('detections-pulse', 'fill-opacity', p.opacity);
          }
          animFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Click → incident panel (detections + AMSA incidents)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', 'detections-fill', handleDetectionClick as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', 'amsa-incidents-fill', handleDetectionClick as any);

        // Pointer cursor on hover
        for (const layer of ['detections-fill', 'amsa-incidents-fill']) {
          map.on('mouseenter', layer, () => {
            if (map) map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layer, () => {
            if (map) map.getCanvas().style.cursor = '';
          });
        }
      });
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(animFrameRef.current);
      map?.remove();
      mapRef.current = null;
    };
    // handleDetectionClick is memoised; including it would cause re-init on parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON data when detections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('detections') as GeoJSONSource | undefined;
    source?.setData(detections);
  }, [detections]);

  // Update AMSA incidents data (static in practice, but keeps the pattern consistent)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('amsa-incidents') as GeoJSONSource | undefined;
    source?.setData(amsaIncidents);
  }, [amsaIncidents]);

  // Highlight selected detection (detections source)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.removeFeatureState({ source: 'detections' });
    map.removeFeatureState({ source: 'amsa-incidents' });

    if (selectedId) {
      // Check detections source
      const detFeatures = map.querySourceFeatures('detections', {
        filter: ['==', ['get', 'id'], selectedId],
      });
      const detFirst = detFeatures[0];
      if (detFirst?.id !== undefined) {
        map.setFeatureState({ source: 'detections', id: detFirst.id }, { selected: true });
      }

      // Check AMSA incidents source
      const amsaFeatures = map.querySourceFeatures('amsa-incidents', {
        filter: ['==', ['get', 'id'], selectedId],
      });
      const amsaFirst = amsaFeatures[0];
      if (amsaFirst?.id !== undefined) {
        map.setFeatureState({ source: 'amsa-incidents', id: amsaFirst.id }, { selected: true });
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      aria-label="Interactive map showing ocean pollution detections in Australian waters"
    />
  );
}
