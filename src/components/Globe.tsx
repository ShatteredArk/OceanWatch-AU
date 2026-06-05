'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { DetectionFeatureCollection } from '@/lib/detections';

interface GlobeProps {
  detections: DetectionFeatureCollection;
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

// Full rotation in ~3.5 minutes at 60 fps; each easeTo covers 1 second of arc
const SECONDS_PER_REVOLUTION = 210;
const DEGREES_PER_STEP = 360 / SECONDS_PER_REVOLUTION;
const SPIN_RESUME_DELAY_MS = 3000;
const MAX_SPIN_ZOOM = 5; // above this zoom spinning stops automatically

export function Globe({ detections, onDetectionClick, selectedId }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef({ opacity: 0.35, direction: 1 });

  // Spin state — plain refs to avoid re-renders
  const interactingRef = useRef(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // ── Spin helpers ────────────────────────────────────────────────────────

      function spinGlobe() {
        if (!map || destroyed) return;
        if (interactingRef.current) return;
        if (map.getZoom() >= MAX_SPIN_ZOOM) return;
        const center = map.getCenter();
        center.lng -= DEGREES_PER_STEP;
        map.easeTo({ center, duration: 1000, easing: (t) => t });
      }

      function scheduleSpinResume() {
        if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
        spinTimerRef.current = setTimeout(() => {
          interactingRef.current = false;
          spinGlobe();
        }, SPIN_RESUME_DELAY_MS);
      }

      map.on('mousedown', () => {
        interactingRef.current = true;
        if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      });

      map.on('touchstart', () => {
        interactingRef.current = true;
        if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      });

      map.on('mouseup', scheduleSpinResume);
      map.on('touchend', scheduleSpinResume);
      map.on('dragend', scheduleSpinResume);

      // Chain: each completed easeTo triggers the next step
      map.on('moveend', () => spinGlobe());

      // Resume after zoom-out below the threshold
      map.on('zoomend', () => {
        if (map && map.getZoom() < MAX_SPIN_ZOOM && !interactingRef.current) {
          spinGlobe();
        }
      });

      // ── Map load ─────────────────────────────────────────────────────────────

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

        // Click → incident panel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('click', 'detections-fill', handleDetectionClick as any);

        // Pointer cursor on hover
        map.on('mouseenter', 'detections-fill', () => {
          if (map) map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'detections-fill', () => {
          if (map) map.getCanvas().style.cursor = '';
        });

        // Start ambient auto-rotation
        spinGlobe();
      });
    });

    return () => {
      destroyed = true;
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
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

  // Highlight selected detection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.removeFeatureState({ source: 'detections' });
    if (selectedId) {
      const features = map.querySourceFeatures('detections', {
        filter: ['==', ['get', 'id'], selectedId],
      });
      const first = features[0];
      if (first?.id !== undefined) {
        map.setFeatureState({ source: 'detections', id: first.id }, { selected: true });
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      aria-label="Interactive globe showing ocean pollution detections"
    />
  );
}
