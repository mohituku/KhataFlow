export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
export const BUSINESS_ID_STORAGE_KEY = 'khataflow-business-id';
export const DEFAULT_BUSINESS_ID = 'demo-business-001';

export function getBusinessId() {
  if (typeof window === 'undefined') {
    return DEFAULT_BUSINESS_ID;
  }

  const stored = window.localStorage.getItem(BUSINESS_ID_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  window.localStorage.setItem(BUSINESS_ID_STORAGE_KEY, DEFAULT_BUSINESS_ID);
  return DEFAULT_BUSINESS_ID;
}

export function buildApiHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'x-business-id': getBusinessId(),
    ...extraHeaders
  };
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
