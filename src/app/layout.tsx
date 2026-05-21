import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'OceanWatch AU — Ocean Pollution Detection',
  description:
    'Near-real-time ocean pollution detections in Australian and Pacific waters, ' +
    'powered by Sentinel-1 SAR satellite data from the Copernicus programme.',
  keywords: ['ocean pollution', 'oil spill', 'Australia', 'satellite', 'Sentinel-1', 'SAR'],
  openGraph: {
    title: 'OceanWatch AU',
    description: 'Near-real-time ocean pollution detections in Australian and Pacific waters.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
