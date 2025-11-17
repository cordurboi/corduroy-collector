'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEditions, postClaim } from '../../lib/api';
import { getSavedWallet } from '../../lib/wallet';

export default function BonusPage() {
  useEffect(() => {
    document.title = 'Bonus Content | Corduroy Collector';
  }, []);
  const [wallet, setWallet] = useState('');
  const [collectedCount, setCollectedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [confettiShown, setConfettiShown] = useState(false);
  const [hasBonusNFT, setHasBonusNFT] = useState(false);
  const router = useRouter();
  const TOTAL_EDITIONS = 3;
  const BONUS_EDITION_ID = '4';
  
  // Only count the main 3 editions (exclude bonus edition 4)
  const mainEditionsCount = Math.min(collectedCount, TOTAL_EDITIONS);

  // Keep wallet state in sync with saved wallet and react to wallet-changed events
  useEffect(() => {
    const initial = getSavedWallet() || '';
    if (!initial) {
      if (typeof window !== 'undefined') {
        router.replace('/');
      }
    }
    setWallet(initial);

    const handler = (e: Event) => {
      const anyEvt = e as CustomEvent<string | null>;
      const next = anyEvt.detail || '';
      if (!next) {
        if (typeof window !== 'undefined') {
          router.replace('/');
        }
      }
      setWallet(next);
      if (!next) {
        setCollectedCount(0);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-changed', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wallet-changed', handler);
      }
    };
  }, [router]);

  // Load confetti library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
    document.head.appendChild(script);
  }, []);

  // Fetch editions count whenever wallet changes
  useEffect(() => {
    if (!wallet) return;
    (async () => {
      try {
        setLoading(true);
        const res = await getEditions(wallet);
        const items = res.items || [];
        const count = items.length;
        setCollectedCount(count);
        
        // Check if user owns the bonus NFT (edition 4)
        const ownsBonus = items.some((item: any) => String(item.id) === BONUS_EDITION_ID);
        setHasBonusNFT(ownsBonus);
      } catch (e: any) {
        console.error('Failed to fetch editions:', e);
        setCollectedCount(0);
        setHasBonusNFT(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet, BONUS_EDITION_ID]);

  // Trigger confetti when all 3 editions are collected
  useEffect(() => {
    if (mainEditionsCount === TOTAL_EDITIONS && !confettiShown && typeof window !== 'undefined') {
      setConfettiShown(true);
      setTimeout(() => {
        const confetti = (window as any).confetti;
        if (confetti) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }, 300);
    }
  }, [mainEditionsCount, confettiShown, TOTAL_EDITIONS]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 24 }}>Bonus Content</h1>
      
      <p style={{ fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>
        Collect all 3 prints by Andrés Garzon, then come back here to unlock additional content.
      </p>

      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          textAlign: 'center',
          padding: 24,
          border: '2px solid #eee',
          borderRadius: 8,
          background: (hasBonusNFT || mainEditionsCount === TOTAL_EDITIONS) ? '#202D70' : 'rgba(255, 255, 255, 0.05)',
        }}
      >
        {loading ? (
          <span style={{ opacity: 0.6 }}>Loading...</span>
        ) : hasBonusNFT ? (
          'Bonus Content Collected!'
        ) : (
          <>
            {mainEditionsCount}/{TOTAL_EDITIONS} collected
          </>
        )}
      </div>

      {hasBonusNFT && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => router.push('/collection')}
            style={{
              padding: '14px 32px',
              borderRadius: 9999,
              background: '#FDB93D',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Check It Out
          </button>
        </div>
      )}

      {mainEditionsCount === TOTAL_EDITIONS && !hasBonusNFT && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            onClick={async () => {
              if (!wallet || claiming) return;
              try {
                setClaiming(true);
                setClaimError(null);
                const result = await postClaim({ to: wallet, artId: BONUS_EDITION_ID });
                if (result.ok) {
                  // Refresh collection count
                  const res = await getEditions(wallet);
                  const items = res.items || [];
                  setCollectedCount(items.length);
                  
                  // Check if bonus NFT is now owned
                  const ownsBonus = items.some((item: any) => String(item.id) === BONUS_EDITION_ID);
                  setHasBonusNFT(ownsBonus);
                } else {
                  if (result.data?.alreadyOwned) {
                    setHasBonusNFT(true);
                  } else {
                    setClaimError('Failed to collect bonus content. Please try again.');
                  }
                }
              } catch (e: any) {
                setClaimError(e?.message || 'An error occurred');
              } finally {
                setClaiming(false);
              }
            }}
            disabled={claiming}
            className="bonus-button"
            style={{
              padding: '14px 28px',
              borderRadius: 9999,
              background: '#FDB93D',
              color: '#000',
              border: 'none',
              cursor: claiming ? 'not-allowed' : 'pointer',
              fontSize: 18,
              fontWeight: 600,
              opacity: claiming ? 0.6 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {claiming ? 'Collecting...' : 'Collect Bonus Content'}
          </button>
          <style jsx>{`
            .bonus-button::after {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.3),
                transparent
              );
              transform: rotate(45deg);
              animation: shimmer 2s infinite;
            }
            @keyframes shimmer {
              0% {
                transform: translateX(-100%) translateY(-100%) rotate(45deg);
              }
              100% {
                transform: translateX(100%) translateY(100%) rotate(45deg);
              }
            }
          `}</style>
          {claimError && (
            <p style={{ color: '#ff6b6b', marginTop: 16 }}>{claimError}</p>
          )}
        </div>
      )}
    </div>
  );
}
