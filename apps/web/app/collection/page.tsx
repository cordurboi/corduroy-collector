'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEditions } from '../../lib/api';
import { getSavedWallet } from '../../lib/wallet';

export default function CollectionPage() {
  useEffect(() => {
    document.title = 'Collection | Corduroy Collector';
  }, []);
  const [wallet, setWallet] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const [cardDone, setCardDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<Record<string, boolean>>({});
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [audioLoaded, setAudioLoaded] = useState<Record<string, boolean>>({});
  const [audioHover, setAudioHover] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const audioRefs = useState<Record<string, HTMLAudioElement>>({})[0];
  const router = useRouter();
  const gw = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
  const toHttp = (u: string) => {
    if (!u) return u;
    if (u.startsWith('ipfs://')) {
      const path = u.slice(7);
      return `${gw}/ipfs/${path}`;
    }
    return u;
  };
  const resolveMetaUrl = (uri?: string) => {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) {
      return `${gw}/ipfs/${uri.replace('ipfs://','')}`;
    }
    return uri;
  };

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
        setItems([]);
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

  // Refetch whenever wallet changes
  useEffect(() => {
    if (!wallet) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getEditions(wallet);
        setItems(res.items || []);
      } catch (e: any) {
        console.error('Failed to fetch editions:', e);
        // Don't show error for empty collections - just set empty array
        setItems([]);
        // Only show error if it's a real failure (not just empty)
        const errorMsg = e?.message || String(e);
        if (!errorMsg.includes('404') && !errorMsg.includes('empty')) {
          setError('Unable to load collection. Please refresh the page.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet]);

  // Client-side metadata hydration for faster first paint
  useEffect(() => {
    const pending = (items || []).filter((it) => it && !it.metadata && it.uri);
    if (!pending.length) return;
    let aborted = false;
    (async () => {
      const updates: Record<string, any> = {};
      await Promise.all(pending.map(async (it) => {
        try {
          const url = resolveMetaUrl(it.uri);
          if (!url) return;
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) return;
          const meta = await r.json();
          updates[String(it.id)] = meta;
        } catch {}
      }));
      if (aborted) return;
      if (Object.keys(updates).length) {
        setItems((prev) => prev.map((it) => updates[String(it.id)] ? { ...it, metadata: updates[String(it.id)] } : it));
      }
    })();
    return () => { aborted = true; };
  }, [items, gw]);

  // Handle dragging of audio progress bar
  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (clientX: number) => {
      const progressBar = document.querySelector(`[data-progress-bar="${draggingId}"]`) as HTMLElement;
      if (!progressBar) return;

      const audio = audioRefs[draggingId];
      const duration = audioDuration[draggingId];
      if (!audio || !duration) return;

      const rect = progressBar.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;
      audio.currentTime = newTime;
      setAudioProgress(prev => ({ ...prev, [draggingId]: newTime }));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => setDraggingId(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [draggingId, audioRefs, audioDuration]);

  // Initialize per-card completion: done when (metadata present and no image) initially; image cards complete on load/error
  useEffect(() => {
    const list = items || [];
    const next: Record<string, boolean> = {};
    for (const it of list) {
      const idStr = String(it?.id ?? '');
      const hasName = typeof it?.metadata?.name === 'string' && String(it.metadata.name).trim().length > 0;
      // If title text is present, consider card done regardless of image status; otherwise keep previous state
      next[idStr] = hasName ? true : (cardDone[idStr] || false);
    }
    setCardDone(next);
  }, [items]);

  const targetsTotal = (items || []).length;
  const targetsDoneCount = Object.values(cardDone).filter(Boolean).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Your Collection</h1>
      {!wallet && (
        <p style={{ marginBottom: 16 }}>Login to view your collection.</p>
      )}
      { (loading || (targetsTotal > 0 && targetsDoneCount < targetsTotal)) && (
        <div style={{ margin: '8px 0 16px', display: 'inline-block', opacity: 0.85, fontWeight: 600 }}>
          Loading your collection…
          <style jsx>{`
            div { animation: pulseFade 1.2s ease-in-out infinite; }
            @keyframes pulseFade {
              0% { opacity: 0.4; }
              50% { opacity: 1; }
              100% { opacity: 0.4; }
            }
          `}</style>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && wallet && items.length === 0 && (
        <p style={{ margin: '8px 0 16px', color: '#fff' }}>
          Your collection is empty, find some art and scan it on the Collect page to add it here!
        </p>
      )}
      <ul className="collection-list" style={{ display: 'grid', gap: 20, listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((it: any) => {
          const name = (it?.metadata?.name ? String(it.metadata.name) : '');
          const desc = it?.metadata?.description ?? '';
          const img = toHttp(it?.metadata?.image ?? '');
          const audioUrl = it?.metadata?.animation_url ? toHttp(it.metadata.animation_url) : null;
          const idStr = String(it.id);
          const isPlaying = audioPlaying[idStr] || false;
          const progress = audioProgress[idStr] || 0;
          const duration = audioDuration[idStr] || 0;
          const isAudioLoaded = audioLoaded[idStr] || false;
          const isHovering = audioHover[idStr] || false;
          
          const toggleAudio = () => {
            const audio = audioRefs[idStr];
            if (!audio) return;
            if (isPlaying) {
              audio.pause();
              setAudioPlaying(prev => ({ ...prev, [idStr]: false }));
            } else {
              audio.play();
              setAudioPlaying(prev => ({ ...prev, [idStr]: true }));
            }
          };
          
          const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
            const audio = audioRefs[idStr];
            if (!audio || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = percentage * duration;
            audio.currentTime = newTime;
            setAudioProgress(prev => ({ ...prev, [idStr]: newTime }));
          };

          const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            setDraggingId(idStr);
            handleSeek(e);
          };
          
          // Accept ipfs:// and http(s). For ipfs, let the browser extension/gateway handle it or a future enhancement can rewrite.
          const isCardLoading = !cardDone[idStr];
          
          return (
            <li 
              key={String(it.id)} 
              style={{ 
                border: '2px solid #eee', 
                borderRadius: 8, 
                padding: 12,
                minHeight: isCardLoading ? '400px' : 'auto',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isCardLoading && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'cardShimmer 1.8s ease-in-out infinite',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />
                  <style jsx>{`
                    @keyframes cardShimmer {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                  `}</style>
                </>
              )}
              <div
                style={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                  minHeight: '2.4em', // reserve space for up to 2 lines
                  display: '-webkit-box',
                  WebkitLineClamp: 2 as any,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {name}
              </div>
              {img && (
                <div
                  onMouseEnter={() => audioUrl && setAudioHover(prev => ({ ...prev, [idStr]: true }))}
                  onMouseLeave={() => audioUrl && setAudioHover(prev => ({ ...prev, [idStr]: false }))}
                  style={{
                    position: 'relative',
                    width: '100%',
                    marginTop: 8,
                    // Keep consistent aspect ratio for all NFTs
                    aspectRatio: '17 / 11',
                    overflow: 'hidden',
                    borderRadius: 6,
                    zIndex: 2,
                    // White background for audio NFTs only after image loads
                    background: (audioUrl && imgLoaded[idStr]) ? '#ffffff' : 'transparent',
                    display: audioUrl ? 'flex' : 'block',
                    alignItems: audioUrl ? 'center' : 'initial',
                    justifyContent: audioUrl ? 'center' : 'initial',
                  }}
                >
                  {audioUrl && (
                    <audio
                      ref={(el) => { if (el) audioRefs[idStr] = el; }}
                      src={audioUrl}
                      preload="auto"
                      onTimeUpdate={(e) => {
                        const audio = e.currentTarget;
                        setAudioProgress(prev => ({ ...prev, [idStr]: audio.currentTime }));
                      }}
                      onLoadedMetadata={(e) => {
                        const audio = e.currentTarget;
                        setAudioDuration(prev => ({ ...prev, [idStr]: audio.duration }));
                        // Show controls as soon as we have duration - allows play button to appear faster
                        setAudioLoaded(prev => ({ ...prev, [idStr]: true }));
                      }}
                      onCanPlay={() => {
                        // Audio has buffered enough to start playing
                        setAudioLoaded(prev => ({ ...prev, [idStr]: true }));
                      }}
                      onEnded={() => {
                        setAudioPlaying(prev => ({ ...prev, [idStr]: false }));
                      }}
                    />
                  )}
                  {!imgLoaded[idStr] && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                      />
                      <style jsx>{`
                        @keyframes shimmer {
                          0% { background-position: -200% 0; }
                          100% { background-position: 200% 0; }
                        }
                      `}</style>
                    </>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={name || `Artwork ${idStr}`}
                    style={audioUrl ? {
                      // For audio NFTs: smaller square centered on white background
                      width: '65%',
                      height: 'auto',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      display: imgLoaded[idStr] ? 'block' : 'none',
                      borderRadius: 4,
                    } : {
                      // For regular NFTs: fill the container
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: imgLoaded[idStr] ? 'block' : 'none',
                    }}
                    onLoad={() => {
                      setImgLoaded((m) => ({ ...m, [idStr]: true }));
                      setCardDone((m) => ({ ...m, [idStr]: true }));
                    }}
                    onError={() => {
                      setImgLoaded((m) => ({ ...m, [idStr]: false }));
                      setCardDone((m) => ({ ...m, [idStr]: true }));
                    }}
                  />
                  {audioUrl && !isAudioLoaded && imgLoaded[idStr] && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.75)',
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    >
                      <div
                        style={{
                          color: '#ffffff',
                          fontSize: 16,
                          fontWeight: 600,
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      >
                        Music loading...
                      </div>
                      <style jsx>{`
                        @keyframes pulse {
                          0%, 100% { opacity: 0.6; }
                          50% { opacity: 1; }
                        }
                      `}</style>
                    </div>
                  )}
                  {audioUrl && isAudioLoaded && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <button
                        onClick={toggleAudio}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: 'rgba(253, 185, 61, 0.9)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 26,
                          color: '#000',
                          zIndex: 10,
                          padding: 0,
                          lineHeight: 1,
                          pointerEvents: 'auto',
                          opacity: (!isPlaying || isHovering) ? 1 : 0,
                          transition: 'opacity 0.8s ease',
                        }}
                      >
                        {isPlaying ? (
                          <div style={{
                            display: 'flex',
                            gap: '3px',
                            alignItems: 'center',
                          }}>
                            <div style={{
                              width: '3px',
                              height: '14px',
                              background: '#000',
                              borderRadius: '1px',
                            }} />
                            <div style={{
                              width: '3px',
                              height: '14px',
                              background: '#000',
                              borderRadius: '1px',
                            }} />
                          </div>
                        ) : (
                          <div style={{ 
                            marginLeft: '4px',
                          }}>
                            ▶
                          </div>
                        )}
                      </button>
                      <div
                        data-progress-bar={idStr}
                        onClick={handleSeek}
                        onMouseDown={handleMouseDown}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          setDraggingId(idStr);
                          if (e.touches.length > 0) {
                            const touch = e.touches[0];
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = touch.clientX - rect.left;
                            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                            const newTime = percentage * duration;
                            const audio = audioRefs[idStr];
                            if (audio && duration) {
                              audio.currentTime = newTime;
                              setAudioProgress(prev => ({ ...prev, [idStr]: newTime }));
                            }
                          }
                        }}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: isHovering ? 12 : 6,
                          background: 'rgba(0, 0, 0, 0.5)',
                          cursor: 'pointer',
                          zIndex: 10,
                          pointerEvents: 'auto',
                          transform: isHovering ? 'translateY(-2px)' : 'translateY(0)',
                          transition: 'height 0.2s ease, transform 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: duration ? `${(progress / duration) * 100}%` : '0%',
                            background: '#FDB93D',
                            transition: draggingId === idStr ? 'none' : 'width 0.1s linear',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {desc && (
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginTop: 16, position: 'relative', zIndex: 2 }}>{desc}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
