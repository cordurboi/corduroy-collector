'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { getWeb3Auth, clearWeb3Auth } from '../lib/web3auth';
import { getSavedWallet, saveWallet, getSavedEmail, saveEmail } from '../lib/wallet';

type WalletBarProps = { mode?: 'full' | 'login-only' | 'button-only' | 'info-only' };

export default function WalletBar({ mode = 'full' }: WalletBarProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Ensure window.ethereum exists to avoid crashes in environments without injected wallets
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).ethereum) {
      (window as any).ethereum = {} as any;
    }
  }, []);

  useEffect(() => {
    const saved = getSavedWallet();
    if (saved) setAddress(saved);
    const em = getSavedEmail();
    if (em) setEmail(em);

    // Listen for wallet changes to refresh user info
    const handler = (e: Event) => {
      const anyEvt = e as CustomEvent<string | null>;
      const newAddress = anyEvt.detail || null;
      setAddress(newAddress);
      // Refresh email from storage when wallet changes
      const newEmail = getSavedEmail();
      setEmail(newEmail);
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

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const w3a = await getWeb3Auth();
      const provider = await w3a.connect();
      // provider is EIP-1193; wrap with ethers
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      saveWallet(addr);
      
      // Fetch email BEFORE dispatching event
      const info = await w3a.getUserInfo();
      const em = (info?.email as string) || null;
      setEmail(em);
      saveEmail(em);
      
      // Dispatch event AFTER both wallet and email are saved
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet-changed', { detail: addr }));
      }
      
      // After successful login, go straight to the collection page
      router.replace('/collection');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    
    if (typeof window === 'undefined') return;
    
    try {
      // Logout from Web3Auth first
      const w3a = await getWeb3Auth();
      await w3a.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    
    // Clear the cached Web3Auth instance
    clearWeb3Auth();
    
    // Clear ALL storage - localStorage, sessionStorage, and IndexedDB
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB (where Web3Auth stores data)
    if (window.indexedDB) {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });
    }
    
    // Force immediate redirect without waiting
    window.location.replace('/');
  }, []);

  if (mode === 'button-only') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {address ? (
          <button
            onClick={disconnect}
            disabled={loading}
            style={{ padding: '8px 14px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            Logout
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={loading}
            style={{ padding: '8px 14px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            Login
          </button>
        )}
      </div>
    );
  }

  if (mode === 'info-only') {
    if (!address) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>
          {email || 'Logged in'}
        </span>
        <a
          href={`https://moonbase.moonscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-address"
          style={{ fontSize: 12, color: '#aaa', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textDecoration: 'none' }}
          title="View on Moonbase Moonscan"
        >
          {address}
        </a>
      </div>
    );
  }

  if (mode === 'login-only') {
    if (address) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={connect}
          disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {address ? (
        <>
          <span style={{ fontSize: 12 }}>
            {email || 'Logged in'}
          </span>
          <a
            href={`https://moonbase.moonscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-address"
            style={{ fontSize: 12, color: '#aaa', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', textDecoration: 'none' }}
            title="View on Moonbase Moonscan"
          >
            {address}
          </a>
          <button
            onClick={disconnect}
            disabled={loading}
            style={{ padding: '8px 14px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={connect}
          disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 9999, background: '#FDB93D', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          Login
        </button>
      )}
    </div>
  );
}
