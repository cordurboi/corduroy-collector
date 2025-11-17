export function saveWallet(addr: string | null) {
  if (typeof window === 'undefined') return;
  if (addr) localStorage.setItem('wallet', addr);
  else localStorage.removeItem('wallet');
}

export function getSavedWallet(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wallet');
}

export function saveEmail(email: string | null) {
  if (typeof window === 'undefined') return;
  if (email) localStorage.setItem('email', email);
  else localStorage.removeItem('email');
}

export function getSavedEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('email');
}
