'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletBar from './wallet-bar';
import { getSavedWallet } from '../lib/wallet';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Initialize from saved wallet
    const saved = getSavedWallet();
    setHasWallet(!!saved);

    // React to wallet-changed events
    const handler = (e: Event) => {
      const anyEvt = e as CustomEvent<string | null>;
      const next = anyEvt.detail || '';
      setHasWallet(!!next);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-changed', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wallet-changed', handler);
      }
    };
  }, []);

  return (
    <nav className="nav" style={{ justifyContent: 'space-between' }}>
      {/* Left side: hamburger (mobile) + Home / menu links */}
      <>
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          className={`hamburger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="nav-left">
          <Link href="/" style={{ color: pathname === '/' ? '#fff' : '#FDB93D' }}>Home</Link>
          {hasWallet && (
            <>
              <Link href="/collect" style={{ color: pathname === '/collect' ? '#fff' : '#FDB93D' }}>Collect</Link>
              <Link href="/collection" style={{ color: pathname === '/collection' ? '#fff' : '#FDB93D' }}>View Collection</Link>
              <Link href="/bonus" style={{ color: pathname === '/bonus' ? '#fff' : '#FDB93D' }}>Bonus Content</Link>
            </>
          )}
        </div>
        <div className={`nav-links ${open ? 'open' : ''}`}>
          <Link href="/" onClick={() => setOpen(false)} style={{ color: pathname === '/' ? '#fff' : '#FDB93D' }}>Home</Link>
          {hasWallet && (
            <>
              <Link href="/collect" onClick={() => setOpen(false)} style={{ color: pathname === '/collect' ? '#fff' : '#FDB93D' }}>Collect</Link>
              <Link href="/collection" onClick={() => setOpen(false)} style={{ color: pathname === '/collection' ? '#fff' : '#FDB93D' }}>View Collection</Link>
              <Link href="/bonus" onClick={() => setOpen(false)} style={{ color: pathname === '/bonus' ? '#fff' : '#FDB93D' }}>Bonus Content</Link>
            </>
          )}
          <div className="nav-wallet-mobile">
            <WalletBar mode="info-only" />
          </div>
        </div>
      </>

      {/* Right side: login/logout button always visible */}
      <div className="nav-right-mobile">
        <WalletBar mode="button-only" />
      </div>
      <div className="nav-right">
        <WalletBar />
      </div>
    </nav>
  );
}
