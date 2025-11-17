const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function resolveApiBase() {
  if (typeof window === 'undefined') return RAW_API_BASE;
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('api');
    if (qp) {
      try { localStorage.setItem('apiBase', qp); } catch {}
      return qp.replace(/\/$/, '');
    }
    const stored = localStorage.getItem('apiBase');
    if (stored) return stored.replace(/\/$/, '');
  } catch {}

  const origin = window.location.origin;
  const isLocalEnv = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(RAW_API_BASE);
  const isOriginLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(origin);
  if (isLocalEnv && !isOriginLocal) return origin;
  return RAW_API_BASE;
}

const API_BASE = resolveApiBase();

export function getApiBase() {
  return API_BASE;
}

type ClaimBody = {
  to: string;
  pin?: string;
  artId?: string;
  name?: string;
  description?: string;
  image?: string;
};

export async function postClaim(body: ClaimBody) {
  const r = await fetch(`${API_BASE}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = r.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await r.json().catch(() => ({})) : await r.text();
  return { ok: r.ok, status: r.status, data: payload } as { ok: boolean; status: number; data: any };
}

export async function getEditions(wallet: string) {
  try {
    // Request meta=0 to skip server-side IPFS fetch and speed up first paint.
    const r = await fetch(`${API_BASE}/editions?wallet=${encodeURIComponent(wallet)}&meta=0`, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    if (!r.ok) {
      // Try to get error details from response
      const contentType = r.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.message || `API error: ${r.status}`);
      }
      throw new Error(`API error: ${r.status}`);
    }
    return r.json();
  } catch (e: any) {
    // Improve error messages
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    if (e.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw e;
  }
}
