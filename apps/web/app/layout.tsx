export const metadata = { 
  title: 'Corduroy Collector', 
  description: 'NFT Collecting App',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import './globals.css';
import NavBar from './nav-bar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gw = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
  let gwHost = '';
  try {
    gwHost = new URL(gw).origin;
  } catch {}

  return (
    <html lang="en">
      <head>
        {gwHost && (
          <>
            <link rel="preconnect" href={gwHost} />
            <link rel="dns-prefetch" href={gwHost} />
          </>
        )}
      </head>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <NavBar />
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  );
}
