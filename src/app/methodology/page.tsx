import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology — OceanWatch AU',
  description:
    'How OceanWatch AU detects ocean pollution, what the confidence tiers mean, ' +
    'and the limitations you should know before acting on this data.',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#020b18] text-slate-300">
      <header
        className="border-b border-white/5 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(6,21,37,0.8)' }}
      >
        <Link href="/" className="text-slate-400 hover:text-slate-100 transition-colors text-sm">
          ← Globe
        </Link>
        <span className="text-slate-100 font-semibold text-sm">Methodology</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold text-slate-100 mb-4">How OceanWatch AU works</h1>
          <p className="text-slate-400 leading-relaxed">
            OceanWatch AU displays near-real-time detections of potential ocean pollution —
            primarily oil spills — in Australian and Pacific waters. The data comes from the
            European Space Agency&apos;s Sentinel-1 satellites, which use Synthetic Aperture Radar
            (SAR) to image the ocean surface from space, day and night, through clouds.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">What SAR can detect</h2>
          <p className="text-slate-400 leading-relaxed">
            SAR measures the roughness of the sea surface by bouncing microwave pulses off it. Oil
            and other surfactants dampen small waves, making affected areas appear darker (lower
            backscatter) than surrounding clean water. These dark patches — called &ldquo;dark
            spots&rdquo; or slicks — are flagged as potential pollution events.
          </p>
          <p className="text-slate-400 leading-relaxed mt-3">
            SAR-based detection has known limitations. Natural phenomena — biogenic films, low-wind
            zones, rainfall, sea ice — can also create dark patches and are sometimes misidentified
            as pollution. This is why confidence tiers exist: they communicate how certain the
            system is about any individual detection.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Confidence tiers</h2>

          <div className="space-y-4">
            <div className="rounded border border-red-800/30 bg-red-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-red-400 font-semibold text-sm uppercase tracking-wider">
                  Verified
                </span>
                <span className="text-slate-500 text-xs">≥ 85% confidence</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The detection comes from a pre-processed, quality-controlled product from the
                Copernicus Marine Service (CMEMS) or CDSE derived products. An analyst or validated
                algorithm has reviewed the SAR imagery and confirmed the characteristics are
                consistent with an oil slick.
              </p>
            </div>

            <div className="rounded border border-amber-800/30 bg-amber-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
                <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
                  Probable
                </span>
                <span className="text-slate-500 text-xs">60–84% confidence</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                A dark-spot detection with multiple indicators consistent with oil (shape, texture,
                context) but without full analyst validation. Worth monitoring; should not be used
                to trigger a response without further verification.
              </p>
            </div>

            <div className="rounded border border-yellow-800/20 bg-yellow-950/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300 opacity-70" />
                <span className="text-yellow-300/80 font-semibold text-sm uppercase tracking-wider">
                  Possible
                </span>
                <span className="text-slate-500 text-xs">30–59% confidence</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                A dark spot detected in the imagery, but without enough discriminating features to
                distinguish it confidently from natural look-alikes. Shown as an outline only to
                indicate low confidence.
              </p>
            </div>

            <div className="rounded border border-indigo-800/30 bg-indigo-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-indigo-400" />
                <span className="text-indigo-400 font-semibold text-sm uppercase tracking-wider">
                  Anomaly
                </span>
                <span className="text-slate-500 text-xs">&lt; 30% confidence</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                A SAR acquisition has been logged as a potential anomaly by the heuristic processor
                (see &ldquo;Experimental detections&rdquo; below). These records exist to
                demonstrate the data pipeline and should not be treated as evidence of pollution.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">Experimental detections</h2>
          <p className="text-slate-400 leading-relaxed">
            When no pre-validated detection product is available from Copernicus for a given area
            and time window, OceanWatch AU falls back to recording the Sentinel-1 acquisition
            footprint as a candidate record. These records are tagged &ldquo;Experimental&rdquo; in
            the incident panel and are always displayed as Anomaly tier. They are not confirmed
            detections of pollution — they simply indicate that a satellite pass covered the area
            and no validated product was available.
          </p>
          <p className="text-slate-400 leading-relaxed mt-3">
            This provenance is stored in the database as{' '}
            <code className="text-xs bg-white/10 px-1 py-0.5 rounded">heuristic-v0</code> and will
            be replaced with validated products in future versions as upstream data coverage
            improves.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">Limitations</h2>
          <ul className="space-y-2 text-slate-400 text-sm leading-relaxed list-disc list-inside">
            <li>
              Coverage depends on Sentinel-1 orbit and acquisition mode. Not every pass results in a
              detection product. There will be gaps.
            </li>
            <li>
              SAR cannot identify the type or source of pollution — only a surface roughness
              anomaly. Oil, biogenic films, and rain cells can look similar.
            </li>
            <li>
              Detection polygons are approximate. Area figures are calculated from the detection
              geometry and may not match ground truth.
            </li>
            <li>
              This application is for public awareness and research purposes only. It is not a
              substitute for official maritime authority notifications or spill response systems
              operated by AMSA, CSIRO, or state/territory agencies.
            </li>
            <li>
              Data latency: the ingest pipeline runs every 6 hours. New detections may appear up to
              6 hours after the satellite overpass.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">Data sources and licences</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <div>
              <a
                href="https://dataspace.copernicus.eu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-white transition-colors font-medium"
              >
                Copernicus Data Space Ecosystem (CDSE)
              </a>
              <p className="mt-1">
                Sentinel-1 SAR imagery and acquisition metadata. Licensed under the{' '}
                <a
                  href="https://sentinel.esa.int/documents/247904/690755/Sentinel_Data_Legal_Notice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline"
                >
                  Copernicus Sentinel Data Terms and Conditions
                </a>
                . Free for any use including commercial, with attribution.
              </p>
            </div>

            <div>
              <a
                href="https://marine.copernicus.eu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-white transition-colors font-medium"
              >
                Copernicus Marine Service (CMEMS)
              </a>
              <p className="mt-1">
                Derived ocean products. Licensed under the{' '}
                <a
                  href="https://marine.copernicus.eu/user-corner/service-commitments-and-licence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline"
                >
                  CMEMS Licence
                </a>
                . Free for any use with attribution.
              </p>
            </div>

            <div>
              <a
                href="https://www.gebco.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-white transition-colors font-medium"
              >
                GEBCO (General Bathymetric Chart of the Oceans)
              </a>
              <p className="mt-1">
                Ocean bathymetry tiles used for the globe background. Published under the{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline"
                >
                  Creative Commons Attribution 4.0
                </a>{' '}
                licence.
              </p>
            </div>

            <div>
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-white transition-colors font-medium"
              >
                CartoDB Dark Matter
              </a>
              <p className="mt-1">
                Base map tiles. © CartoDB, © OpenStreetMap contributors, licensed under{' '}
                <a
                  href="https://creativecommons.org/licenses/by/3.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline"
                >
                  CC BY 3.0
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">API access</h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            The detection data powering this app is available as a public JSON API at{' '}
            <code className="text-xs bg-white/10 px-1 py-0.5 rounded">/api/v1/detections</code>. See
            the{' '}
            <a
              href="https://github.com/shatteredark/oceanwatch-au/blob/main/docs/api.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white underline"
            >
              API documentation
            </a>{' '}
            for the full parameter reference. The schema is designed to be compatible with AMSA and
            CSIRO data integration requirements.
          </p>
        </section>
      </main>
    </div>
  );
}
