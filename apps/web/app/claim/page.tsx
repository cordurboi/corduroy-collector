'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postClaim } from '../../lib/api';
import { getSavedWallet } from '../../lib/wallet';
import { QrReader } from 'react-qr-reader';

export default function ClaimPage() {
  useEffect(() => {
    document.title = 'Collect | Corduroy Collector';
  }, []);
  const [to, setTo] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastShownRef = useRef(false);
  const toastHideTimerRef = useRef<number | null>(null);
  const toastClearTimerRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [qrKey, setQrKey] = useState(0);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const modelRef = useRef<any>(null);
  const labelsRef = useRef<string[] | null>(null);
  const thresholdRef = useRef<number>(Number(process.env.NEXT_PUBLIC_TF_THRESHOLD || '0.8'));
  const lastScanAtRef = useRef<number>(0);
  const handlingRef = useRef<boolean>(false);
  const resultLatchedRef = useRef<boolean>(false);
  const scanActivatedAtRef = useRef<number>(0);
  const lastTextRef = useRef<string | null>(null);
  const prevSessionLastTextRef = useRef<string | null>(null);
  const requireDifferentFromPrevRef = useRef<boolean>(false);
  const firstDecodeIgnoredRef = useRef<boolean>(false);
  const activationDelayTimerRef = useRef<number | null>(null);
  const lastCandidateTextRef = useRef<string | null>(null);
  const candidateCountRef = useRef<number>(0);
  const SCAN_DEBOUNCE_MS = 3000;
  const SCAN_START_GRACE_MS = 2000;
  const FIRST_IGNORE_WINDOW_MS = 3000;
  const router = useRouter();

  useEffect(() => {
    const saved = getSavedWallet() || '';
    if (!saved) {
      if (typeof window !== 'undefined') {
        router.replace('/');
      }
    } else {
      setTo(saved);
    }

    const handler = (e: Event) => {
      const anyEvt = e as CustomEvent<string | null>;
      const next = anyEvt.detail || '';
      if (!next) {
        if (typeof window !== 'undefined') {
          router.replace('/');
        }
      }
      setTo(next);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-changed', handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wallet-changed', handler);
      }
      toastShownRef.current = false;
      if (toastHideTimerRef.current) window.clearTimeout(toastHideTimerRef.current);
      if (toastClearTimerRef.current) window.clearTimeout(toastClearTimerRef.current);
      if (activationDelayTimerRef.current) window.clearTimeout(activationDelayTimerRef.current);
    };
  }, [router]);

  function showToast(text: string) {
    if (toastShownRef.current) return; // prevent repeat
    toastShownRef.current = true;
    const now = Date.now();
    setToast({ text, id: now });
    setToastVisible(true);
    // Auto-dismiss after 1.5s with fade-out
    if (toastHideTimerRef.current) window.clearTimeout(toastHideTimerRef.current);
    if (toastClearTimerRef.current) window.clearTimeout(toastClearTimerRef.current);
    toastHideTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
      // Clear the toast slightly after CSS transition ends
      toastClearTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastShownRef.current = false;
      }, 600);
    }, 1500);
  }

  function parsePayload(text: string): ({ pin: string } | { artId: string; name?: string; description?: string; image?: string }) | null {
    try {
      const obj = JSON.parse(text);
      if (obj && obj.pin) return { pin: String(obj.pin) };
      if (obj && obj.artId) return { artId: String(obj.artId), name: obj.name, description: obj.description, image: obj.image };
    } catch {}
    try {
      const url = new URL(text);
      const pin = url.searchParams.get('pin');
      if (pin) return { pin };
      const artId = url.searchParams.get('artId') || url.searchParams.get('art_id');
      if (artId) {
        return {
          artId,
          name: url.searchParams.get('name') || undefined,
          description: url.searchParams.get('description') || undefined,
          image: url.searchParams.get('image') || undefined,
        };
      }
    } catch {}
    // If it looks like a short code, treat as PIN
    const trimmed = text.trim();
    if (trimmed && trimmed.length <= 32 && /^[A-Za-z0-9_-]+$/.test(trimmed)) {
      return { pin: trimmed };
    }
    return null;
  }

  function stopCameraTracks() {
    try {
      // Prefer scoped container
      const root = scannerRef.current || document;
      const mediaEls = root.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>;
      mediaEls.forEach((el) => {
        const anyEl = el as any;
        const stream: MediaStream | null = (anyEl && anyEl.srcObject) || null;
        if (stream) stream.getTracks().forEach((t) => t.stop());
      });
    } catch (_) {
      // ignore
    }
  }

  useEffect(() => {
    if (!cameraActive) {
      // When turning off, ensure tracks are stopped
      stopCameraTracks();
    }
    return () => {
      // On unmount, stop any remaining tracks
      stopCameraTracks();
    };
  }, [cameraActive]);

  async function ensureTfAndModel() {
    if (modelRef.current && labelsRef.current) return;
    if (typeof window === 'undefined') return;
    if (!(window as any).tf) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('failed_to_load_tf'));
        document.head.appendChild(s);
      });
    }
    const tf = (window as any).tf;
    if (!modelRef.current) {
      modelRef.current = await tf.loadLayersModel('/models/v1/model.json');
    }
    if (!labelsRef.current) {
      try {
        const r = await fetch('/models/v1/metadata.json', { cache: 'no-store' });
        const meta = await r.json();
        const labels = meta?.labels || meta?.classes || [];
        labelsRef.current = Array.isArray(labels) ? labels : [];
      } catch {
        labelsRef.current = [];
      }
    }
  }

  async function analyzeCurrentFrame() {
    setAnalyzeError(null);
    try {
      setAnalyzing(true);
      await ensureTfAndModel();
      const tf = (window as any).tf;
      const root = scannerRef.current || document.body;
      const video = root.querySelector('video') as HTMLVideoElement | null;
      if (!video) throw new Error('camera_not_ready');
      const canvas = document.createElement('canvas');
      const SIZE = 224;
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no_canvas');
      ctx.drawImage(video, 0, 0, SIZE, SIZE);
      const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
      const input = tf.tidy(() => tf.browser.fromPixels(imgData).toFloat().div(255).expandDims(0));
      const preds = modelRef.current.predict(input);
      const probs = Array.from((await preds.data()) as Float32Array);
      tf.dispose([input, preds]);
      let topIdx = 0; let topProb = -1;
      for (let i = 0; i < probs.length; i++) { if (probs[i] > topProb) { topProb = probs[i]; topIdx = i; } }
      const labels = labelsRef.current || [];
      const artId = labels[topIdx] || '';
      if (!artId) throw new Error('unlabeled_prediction');
      if (topProb >= (thresholdRef.current || 0.8)) {
        if (!to) throw new Error('login_required');
        resultLatchedRef.current = true;
        setCameraActive(false);
        stopCameraTracks();
        setSubmitting(true);
        setClaimError(null);
        setClaimResult(null);
        try {
          const api = await postClaim({ to, artId });
          setClaimResult(api.data);
          if (api.ok) {
            if (api.data?.alreadyOwned) {
              showToast('You already have this collectible.');
            } else {
              showToast('Success! Collectible added to your collection');
            }
          } else {
            if (api.status === 409) {
              showToast('This artwork has already been collected by another wallet for this token.');
            } else if (api.status === 202) {
              showToast('Mint submitted. Checking status...');
            } else if (api.status === 404 && api.data?.error === 'pin_not_found') {
              showToast('No collectible with this identifier');
            } else {
              showToast('Something went wrong while collecting. Please try again.');
            }
          }
        } catch (e: any) {
          setClaimError(e?.message || String(e));
        } finally {
          setSubmitting(false);
          handlingRef.current = false;
        }
      } else {
        setAnalyzeError(`Not confident enough (${(topProb * 100).toFixed(1)}%) — try again`);
      }
    } catch (e: any) {
      setAnalyzeError(e?.message || String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleScan(text?: string | null) {
    if (!text || submitting) return;
    if (resultLatchedRef.current) return;
    setScanError(null);
    const parsed = parsePayload(text);
    if (!parsed) {
      setScanError('Unrecognized QR format');
      return;
    }
    if (!to) {
      setScanError('Login required before collecting');
      return;
    }
    // Latch immediately and stop camera to avoid any further onResult events
    resultLatchedRef.current = true;
    // Remember last decoded from this session so next start can ignore a cached repeat once
    prevSessionLastTextRef.current = lastTextRef.current;
    setCameraActive(false);
    stopCameraTracks();
    setSubmitting(true);
    handlingRef.current = true;
    setClaimError(null);
    setClaimResult(null);
    try {
      let api: { ok: boolean; status: number; data: any };
      if ('pin' in parsed) {
        api = await postClaim({ to, pin: parsed.pin });
      } else {
        api = await postClaim({ to, artId: parsed.artId, name: parsed.name || parsed.artId, description: parsed.description, image: parsed.image });
      }
      setClaimResult(api.data);
      // Friendly messaging based on status/body
      if (api.ok) {
        if (api.data?.alreadyOwned) {
          showToast('You already have this collectible.');
        } else {
          showToast('Success! Collectible added to your collection');
        }
        // camera already stopped above
      } else {
        if (api.status === 409) {
          showToast('This artwork has already been collected by another wallet for this token.');
        } else if (api.status === 202) {
          showToast('Mint submitted. Checking status...');
        } else if (api.status === 404 && api.data?.error === 'pin_not_found') {
          showToast('No collectible with this identifier');
        } else {
          showToast('Something went wrong while collecting. Please try again.');
        }
      }
    } catch (e: any) {
      setClaimError(e?.message || String(e));
    } finally {
      setSubmitting(false);
      // keep latch until user explicitly presses Scan again
      handlingRef.current = false;
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1>Collect</h1>
      <p style={{ marginBottom: 20 }}>
        Find a piece of art in our exhibit, then hit "Scan" to open your camera. Once your camera is over the piece, click the "Collect" button and give it a moment to analyze it before it's added to your collection.
      </p>
      {!to && <p style={{ marginBottom: 20 }}>Login to enable scanning.</p>}
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 24 }} ref={scannerRef}>
        <div className="btn-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (to) {
                // Reset guards before activating camera
                resultLatchedRef.current = false;
                scanActivatedAtRef.current = 0;
                lastTextRef.current = null;
                lastScanAtRef.current = 0;
                // Force remount of the QR component to clear any internal caches
                setQrKey((k) => k + 1);
                // Require a different code than the previous session before accepting
                requireDifferentFromPrevRef.current = true;
                firstDecodeIgnoredRef.current = false;
                // Reset candidate gating
                lastCandidateTextRef.current = null;
                candidateCountRef.current = 0;
                // Delay activation slightly to avoid consuming cached frame
                if (activationDelayTimerRef.current) window.clearTimeout(activationDelayTimerRef.current);
                activationDelayTimerRef.current = window.setTimeout(() => {
                  setCameraActive(true);
                  scanActivatedAtRef.current = 0;
                  firstDecodeIgnoredRef.current = false;
                }, 200);
                setScanError(null);
                setToast(null);
                setToastVisible(false);
                toastShownRef.current = false;
                setClaimError(null);
                setClaimResult(null);
              }
            }}
            disabled={!to || cameraActive}
            style={{ padding: '10px 18px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: (!to || cameraActive) ? 'not-allowed' : 'pointer', opacity: (!to || cameraActive) ? 0.6 : 1 }}
          >
            Scan
          </button>
          <button
            onClick={() => {
              // Save last decoded text from this session to ignore it on next start
              prevSessionLastTextRef.current = lastTextRef.current;
              setCameraActive(false);
              stopCameraTracks();
              setToastVisible(false);
              setToast(null);
              toastShownRef.current = false;
              resultLatchedRef.current = false;
              lastTextRef.current = null;
              firstDecodeIgnoredRef.current = false;
              if (activationDelayTimerRef.current) window.clearTimeout(activationDelayTimerRef.current);
              // Reset candidate gating
              lastCandidateTextRef.current = null;
              candidateCountRef.current = 0;
            }}
            disabled={!cameraActive}
            style={{ padding: '10px 18px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: (!cameraActive) ? 'not-allowed' : 'pointer', opacity: (!cameraActive) ? 0.6 : 1 }}
          >
            Stop Scanning
          </button>
          <button
            onClick={() => analyzeCurrentFrame()}
            disabled={!cameraActive || analyzing}
            style={{ padding: '10px 18px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: (!cameraActive || analyzing) ? 'not-allowed' : 'pointer', opacity: (!cameraActive || analyzing) ? 0.6 : 1 }}
          >
            Collect
          </button>
        </div>
        {cameraActive ? (
          <QrReader
            key={qrKey}
            constraints={{ facingMode: { ideal: 'environment' } }}
            scanDelay={800}
            onResult={(result: unknown, error: unknown) => {
              const r: any = result as any;
              if (r && typeof r.getText === 'function') {
                const now = Date.now();
                // Ignore results during initial activation grace window to avoid cached frames
                if (!scanActivatedAtRef.current) scanActivatedAtRef.current = now;
                if (now - scanActivatedAtRef.current < SCAN_START_GRACE_MS) return;
                if (handlingRef.current) return;
                if (now - lastScanAtRef.current < SCAN_DEBOUNCE_MS) return;
                const textRaw = r.getText();
                const text = typeof textRaw === 'string' ? textRaw.trim() : '';
                if (!text) return;
                // Always ignore the very first decode after activation to avoid cached previous result
                if (!firstDecodeIgnoredRef.current) {
                  firstDecodeIgnoredRef.current = true;
                  return;
                }
                // Until we see a different code than last session, ignore repeats entirely
                if (requireDifferentFromPrevRef.current && prevSessionLastTextRef.current && text === prevSessionLastTextRef.current) {
                  return;
                }
                // If we required difference and we now have a different text, clear the requirement
                if (requireDifferentFromPrevRef.current && prevSessionLastTextRef.current && text !== prevSessionLastTextRef.current) {
                  requireDifferentFromPrevRef.current = false;
                }
                // Require two consecutive identical decodes before accepting
                if (lastCandidateTextRef.current === text) {
                  candidateCountRef.current += 1;
                } else {
                  lastCandidateTextRef.current = text;
                  candidateCountRef.current = 1;
                  return; // wait for second identical decode
                }
                if (candidateCountRef.current < 2) return;
                // If decode equals previous session's last code, ignore during the early window to avoid cached-frame retrigger
                if (prevSessionLastTextRef.current && text === prevSessionLastTextRef.current) {
                  const sinceActivate = now - (scanActivatedAtRef.current || now);
                  if (sinceActivate < FIRST_IGNORE_WINDOW_MS) {
                    return;
                  } else {
                    // After window, allow scanning same code again
                    prevSessionLastTextRef.current = null;
                  }
                }
                // Skip duplicate text from previous session or repeated frames
                if (lastTextRef.current && lastTextRef.current === text) return;
                lastTextRef.current = text;
                lastScanAtRef.current = now;
                // Reset candidate after accepting
                lastCandidateTextRef.current = null;
                candidateCountRef.current = 0;
                handleScan(text);
              }
              if (error) {
                // Only surface meaningful camera/permission errors; ignore routine decode/abort noise
                try {
                  const err: any = error as any;
                  const name = err?.name || '';
                  const msg = err?.message || '';
                  if (name === 'AbortError') return; // benign during restarts
                  const critical = ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'SecurityError'];
                  if (critical.includes(name)) {
                    setScanError(msg || name);
                  }
                } catch {}
              }
            }}
            containerStyle={{
              width: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
            }}
            videoStyle={{ width: '100%', display: 'block', objectFit: 'cover', borderRadius: 'inherit' }}
          />
        ) : null}
      </div>
      {submitting && <p>Collecting, please wait...</p>}
      {toast && (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            padding: '10px 14px',
            background: '#202D70',
            color: 'white',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            transition: 'opacity 600ms ease',
            opacity: toastVisible ? 1 : 0,
            pointerEvents: 'auto',
            zIndex: 1000,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>{toast.text}</span>
          <button
            aria-label="Close notification"
            onClick={() => {
              if (toastHideTimerRef.current) window.clearTimeout(toastHideTimerRef.current);
              if (toastClearTimerRef.current) window.clearTimeout(toastClearTimerRef.current);
              setToastVisible(false);
              // Allow fade-out, then clear
              toastClearTimerRef.current = window.setTimeout(() => {
                setToast(null);
                toastShownRef.current = false;
              }, 600);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.5)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              lineHeight: 1,
              fontSize: 18
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      )}
      {scanError && <p style={{ color: 'red' }}>{scanError}</p>}
      {analyzeError && <p style={{ color: 'red' }}>{analyzeError}</p>}
      {claimError && <p style={{ color: 'red' }}>{claimError}</p>}
      {/* Raw response hidden intentionally */}
    </div>
  );
}
