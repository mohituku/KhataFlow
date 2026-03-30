import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

type ClientAccessPayload = {
  businessId: string;
  clientId: string;
  exp: number;
};

function getSigningSecret() {
  const configuredSecret = (process.env.CLIENT_PORTAL_SIGNING_SECRET || '').trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if ((process.env.NODE_ENV || 'development') !== 'production') {
    return 'khataflow-dev-client-access-secret';
  }

  throw new Error('CLIENT_PORTAL_SIGNING_SECRET is required in production');
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function createClientAccessToken(
  businessId: string,
  clientId: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS
) {
  const payload: ClientAccessPayload = {
    businessId,
    clientId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyClientAccessToken(token: string, businessId: string, clientId: string) {
  const [encodedPayload, providedSignature] = token.split('.');

  if (!encodedPayload || !providedSignature) {
    throw new Error('Missing or invalid access token');
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid access token');
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ClientAccessPayload;

  if (payload.businessId !== businessId || payload.clientId !== clientId) {
    throw new Error('Access token does not match this client');
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Access token has expired');
  }

  return payload;
}

export function getClientAccessUrls(businessId: string, clientId: string) {
  const token = createClientAccessToken(businessId, clientId);
  const frontendUrl = getFrontendUrl();
  const expiresAt = new Date(
    (Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS) * 1000
  ).toISOString();

  return {
    token,
    expiresAt,
    portalUrl: `${frontendUrl}/client/${clientId}?token=${encodeURIComponent(token)}`,
    paymentUrl: `${frontendUrl}/pay/${clientId}?token=${encodeURIComponent(token)}`
  };
}
