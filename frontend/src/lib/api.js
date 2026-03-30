import { useWalletStore } from '../store/useWalletStore';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function buildApiHeaders(extraHeaders = {}) {
  // Get wallet address from Zustand store directly (outside React)
  const { address } = useWalletStore.getState();
  
  return {
    'Content-Type': 'application/json',
    ...(address ? { 'x-wallet-address': address } : {}),
    ...extraHeaders
  };
}

export function getBusinessId() {
  const { address } = useWalletStore.getState();
  return address || '';
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
}

export async function fetchJson(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: buildApiHeaders(options.headers || {})
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  return payload;
}
