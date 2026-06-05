/**
 * Verified historical oil spill incidents sourced from the Australian Maritime
 * Safety Authority (AMSA) public incident registry:
 * https://www.amsa.gov.au/marine-environment/incidents-and-exercises/major-historical-incidents
 *
 * These are always rendered on the map as a permanent historical layer,
 * independent of the time scrubber window.
 */

import type { DetectionFeatureCollection, DetectionFeature } from './detections';
import type { MultiPolygon } from 'geojson';

function rect(lon: number, lat: number, w: number, h: number): MultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [lon, lat],
          [lon + w, lat],
          [lon + w, lat - h],
          [lon, lat - h],
          [lon, lat],
        ],
      ],
    ],
  };
}

export function getAmsaIncidents(): DetectionFeatureCollection {
  const features: DetectionFeature[] = [
    {
      type: 'Feature',
      // Timor Sea NW Australia — spill extent ~250 km offshore
      geometry: rect(124.0, -12.3, 1.2, 0.9),
      properties: {
        id: 'amsa-montara-2009',
        source: 'amsa-historical',
        source_record_id: 'AMSA-MONTARA-2009',
        acquisition_id: 'AMSA-MONTARA-2009',
        detected_at: '2009-08-21T00:00:00Z',
        ingested_at: '2009-08-21T00:00:00Z',
        area_km2: 28000,
        confidence: 1.0,
        confidence_tier: 'verified',
        pollutant_type: 'crude oil',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url:
          'https://www.amsa.gov.au/marine-environment/incidents-and-exercises/response-montara-wellhead-platform-incident',
        model_version: null,
        metadata: {
          zone: 'Timor Sea',
          vessel: 'Montara Wellhead Platform (PTTEP Australasia)',
          date: '21 August – 3 November 2009',
          quantity: '~4,750 tonnes crude oil (74-day blowout)',
          notes:
            'Uncontrolled wellhead blowout — the largest oil spill in Australian history. Spill reached Indonesian and Timorese waters.',
        },
        is_fresh: false,
        is_experimental: false,
      },
    },

    {
      type: 'Feature',
      // SE Queensland — Cape Moreton area, 7 nm east
      geometry: rect(153.2, -27.6, 0.6, 0.45),
      properties: {
        id: 'amsa-pacific-adventurer-2009',
        source: 'amsa-historical',
        source_record_id: 'AMSA-PACIFIC-ADV-2009',
        acquisition_id: 'AMSA-PACIFIC-ADV-2009',
        detected_at: '2009-03-11T00:00:00Z',
        ingested_at: '2009-03-11T00:00:00Z',
        area_km2: 480,
        confidence: 1.0,
        confidence_tier: 'verified',
        pollutant_type: 'fuel oil',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url:
          'https://www.amsa.gov.au/marine-environment/incidents-and-exercises/pacific-adventurer-11-march-2009',
        model_version: null,
        metadata: {
          zone: 'SE Queensland (Cape Moreton)',
          vessel: 'MV Pacific Adventurer',
          date: '11 March 2009',
          quantity: '270 tonnes heavy fuel oil',
          notes:
            '31 containers lost during Cyclone Hamish. Slick contaminated 60 km of Sunshine Coast and Moreton Bay coastline.',
        },
        is_fresh: false,
        is_experimental: false,
      },
    },

    {
      type: 'Feature',
      // Douglas Shoal, southern Great Barrier Reef
      geometry: rect(151.45, -23.25, 0.45, 0.35),
      properties: {
        id: 'amsa-shen-neng-2010',
        source: 'amsa-historical',
        source_record_id: 'AMSA-SHENNENG-2010',
        acquisition_id: 'AMSA-SHENNENG-2010',
        detected_at: '2010-04-03T00:00:00Z',
        ingested_at: '2010-04-03T00:00:00Z',
        area_km2: 3,
        confidence: 0.97,
        confidence_tier: 'verified',
        pollutant_type: 'fuel oil',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url: 'https://www.amsa.gov.au/marine-environment/incidents-and-exercises',
        model_version: null,
        metadata: {
          zone: 'Great Barrier Reef (Douglas Shoal)',
          vessel: 'MV Shen Neng 1 (Chinese bulk carrier)',
          date: '3 April 2010',
          quantity: '2 tonnes oil released; 950 tonnes on board',
          notes:
            'Grounded on Douglas Shoal in the GBR Marine Park; 3 km² of coral reef damaged. Refloated 12 April 2010.',
        },
        is_fresh: false,
        is_experimental: false,
      },
    },

    {
      type: 'Feature',
      // Hebe Reef, approach to Tamar River, northern Tasmania
      geometry: rect(146.55, -41.0, 0.4, 0.3),
      properties: {
        id: 'amsa-iron-baron-1995',
        source: 'amsa-historical',
        source_record_id: 'AMSA-IRONBARON-1995',
        acquisition_id: 'AMSA-IRONBARON-1995',
        detected_at: '1995-07-10T00:00:00Z',
        ingested_at: '1995-07-10T00:00:00Z',
        area_km2: 45,
        confidence: 1.0,
        confidence_tier: 'verified',
        pollutant_type: 'bunker fuel',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url:
          'https://www.amsa.gov.au/marine-environment/incidents-and-exercises/iron-baron-10-july-1995',
        model_version: null,
        metadata: {
          zone: 'Hebe Reef, Tasmania (Tamar River approach)',
          vessel: 'MV Iron Baron (bulk carrier)',
          date: '10 July 1995',
          quantity: '~325 tonnes Bunker C heavy fuel oil',
          notes:
            'Grounded on Hebe Reef fully laden with manganese ore. Severe impact on seabird colonies, particularly little penguins.',
        },
        is_fresh: false,
        is_experimental: false,
      },
    },

    {
      type: 'Feature',
      // SW Western Australia — approx 24 nm SW of Cervantes
      geometry: rect(114.45, -30.65, 0.65, 0.5),
      properties: {
        id: 'amsa-kirki-1991',
        source: 'amsa-historical',
        source_record_id: 'AMSA-KIRKI-1991',
        acquisition_id: 'AMSA-KIRKI-1991',
        detected_at: '1991-07-21T00:00:00Z',
        ingested_at: '1991-07-21T00:00:00Z',
        area_km2: 5800,
        confidence: 1.0,
        confidence_tier: 'verified',
        pollutant_type: 'crude oil',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url:
          'https://www.amsa.gov.au/marine-environment/incidents-and-exercises/kirki-21-july-1991',
        model_version: null,
        metadata: {
          zone: 'SW Western Australia (Cervantes)',
          vessel: 'MT Kirki (Greek tanker)',
          date: '21 July 1991',
          quantity: '17,280 tonnes light crude oil',
          notes:
            "Bow section separated catastrophically. Largest oil spill from a vessel in Australia's history. Slick extended over hundreds of kilometres.",
        },
        is_fresh: false,
        is_experimental: false,
      },
    },

    {
      type: 'Feature',
      // Torres Strait — between Australia and PNG
      geometry: rect(141.6, -10.6, 0.6, 0.45),
      properties: {
        id: 'amsa-oceanic-grandeur-1970',
        source: 'amsa-historical',
        source_record_id: 'AMSA-OCEANIC-1970',
        acquisition_id: 'AMSA-OCEANIC-1970',
        detected_at: '1970-03-03T00:00:00Z',
        ingested_at: '1970-03-03T00:00:00Z',
        area_km2: 650,
        confidence: 1.0,
        confidence_tier: 'verified',
        pollutant_type: 'crude oil',
        provenance: 'amsa-historical',
        thumbnail_url: null,
        raw_record_url:
          'https://www.amsa.gov.au/marine-environment/incidents-and-exercises/oceanic-grandeur-3-march-1970',
        model_version: null,
        metadata: {
          zone: 'Torres Strait',
          vessel: 'Oceanic Grandeur (Liberian-flagged tanker)',
          date: '3 March 1970',
          quantity: '~1,100 tonnes Sumatran crude oil',
          notes:
            'Struck an uncharted rock en-route Dumai to Brisbane. Catalyst for Australia establishing the National Plan for Maritime Environmental Emergencies.',
        },
        is_fresh: false,
        is_experimental: false,
      },
    },
  ];

  return { type: 'FeatureCollection', features };
}
