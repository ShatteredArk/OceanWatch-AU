import Link from 'next/link';

export function Footer() {
  return (
    <footer className="absolute bottom-16 left-0 z-10 px-4 py-2">
      <p className="text-[10px] text-slate-600 leading-relaxed">
        Data:{' '}
        <a
          href="https://dataspace.copernicus.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          Copernicus CDSE
        </a>{' '}
        /{' '}
        <a
          href="https://marine.copernicus.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          CMEMS
        </a>{' '}
        · Tiles:{' '}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          CartoDB
        </a>{' '}
        /{' '}
        <a
          href="https://www.gebco.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          GEBCO
        </a>{' '}
        ·{' '}
        <Link href="/methodology" className="hover:text-slate-400 transition-colors">
          Methodology
        </Link>
      </p>
    </footer>
  );
}
