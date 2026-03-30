import { randomUUID } from 'crypto';

export interface ChatSessionMemory {
  businessId: string;
  lastClientId?: string;
  lastClientName?: string;
  lastInvoiceId?: string;
  lastIntent?: string;
  lastOutstandingAmount?: number;
  updatedAt: string;
}

const sessionStore = new Map<string, ChatSessionMemory>();

function nowIso() {
  return new Date().toISOString();
}

export function getOrCreateChatSession(businessId: string, sessionId?: string | null) {
  const normalizedSessionId = (sessionId || '').trim() || randomUUID();
  const existing = sessionStore.get(normalizedSessionId);

  if (!existing || existing.businessId !== businessId) {
    const freshSession: ChatSessionMemory = {
      businessId,
      updatedAt: nowIso()
    };
    sessionStore.set(normalizedSessionId, freshSession);
    return { sessionId: normalizedSessionId, session: freshSession };
  }

  existing.updatedAt = nowIso();
  return { sessionId: normalizedSessionId, session: existing };
}

export function updateChatSession(sessionId: string, patch: Partial<ChatSessionMemory>) {
  const existing = sessionStore.get(sessionId);
  if (!existing) return null;

  const nextValue: ChatSessionMemory = {
    ...existing,
    ...patch,
    updatedAt: nowIso()
  };

  sessionStore.set(sessionId, nextValue);
  return nextValue;
}

export function messageHasReferenceWords(message: string) {
  const normalized = message.toLowerCase();
  return [
    'inka',
    'unka',
    'unhone',
    'uska',
    'usne',
    'voh',
    'woh',
    'yeh',
    'same client',
    'same invoice'
  ].some((word) => normalized.includes(word));
}

export function isLedgerReference(message: string) {
  const normalized = message.toLowerCase();
  return ['udhar', 'khata', 'balance', 'kitna', 'batao', 'kitne', 'baaki'].some((word) =>
    normalized.includes(word)
  );
}

export function isPaymentReference(message: string) {
  const normalized = message.toLowerCase();
  return ['de diye', 'dediye', 'payment', 'paid', 'cash diya', 'paise de'].some((word) =>
    normalized.includes(word)
  );
}

export function isInvoiceReference(message: string) {
  const normalized = message.toLowerCase();
  return ['invoice', 'bill', 'receipt', 'statement'].some((word) => normalized.includes(word));
}
