import { Router, Request, Response } from 'express';
import { geminiService } from '../services/gemini';
import { z } from 'zod';
import { getBusinessId } from '../middleware/walletAuth';
import { ActionUnit, ParsedCommand } from '../types';
import {
  getOrCreateChatSession,
  updateChatSession,
  messageHasReferenceWords,
  isInvoiceReference,
  isLedgerReference,
  isPaymentReference
} from '../services/chatSessionMemory';
import {
  buildFinalResponse,
  ExecutedActionResult,
  executeActions
} from '../services/commandExecution';

const router = Router();
const MUTATING_INTENTS = new Set(['ADD_SALE', 'MARK_PAID', 'UPDATE_STOCK']);

const chatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional().default([])
});

// ─── Main handler ──────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory, sessionId: incomingSessionId } = chatRequestSchema.parse(req.body);
    const businessId = getBusinessId(req);
    const { sessionId, session } = getOrCreateChatSession(businessId, incomingSessionId);

    // Parse with new multi-action Gemini
    const parsed: ParsedCommand = await geminiService.parseCommand(message, conversationHistory);
    const hydratedParsed = hydrateParsedCommand(parsed, message, session);

    // Execute ALL actions in parallel where safe (reads), serial for writes
    const actionResults = await executeActions(hydratedParsed.actions, businessId);
    syncSessionFromResults(sessionId, actionResults);
    const executionSummary = {
      totalActions: actionResults.length,
      successfulActions: actionResults.filter(({ result }) => result && !result.error).length,
      failedActions: actionResults.filter(({ result }) => result?.error).length,
      successfulMutations: actionResults.filter(
        ({ action, result }) => MUTATING_INTENTS.has(action.intent) && result && !result.error
      ).length
    };

    // Build the final enriched response
    const finalResponse = buildFinalResponse(hydratedParsed, actionResults);

    res.json({
      success: true,
      sessionId,
      // Legacy field so frontend doesn't break
      action: {
        ...(hydratedParsed.actions[0] || { intent: 'UNKNOWN' as const }),
        response: finalResponse
      },
      // New fields
      parsedCommand: {
        ...hydratedParsed,
        response: finalResponse
      },
      executionSummary,
      actionResults,
      dbResult: actionResults[0]?.result || null
    });
  } catch (error: any) {
    console.error('Chat route error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  }
});

function hydrateParsedCommand(parsed: ParsedCommand, message: string, session: {
  lastClientId?: string;
  lastClientName?: string;
  lastInvoiceId?: string;
  lastOutstandingAmount?: number;
}) {
  const hasReference = messageHasReferenceWords(message);

  const normalizedActions = parsed.actions.map((action) => {
    const nextAction: ActionUnit = {
      ...action,
      items: Array.isArray(action.items) ? action.items : [],
      filters: action.filters || {}
    };

    if (!nextAction.clientName && hasReference && session.lastClientName) {
      if (['QUERY_LEDGER', 'MARK_PAID', 'GENERATE_INVOICE'].includes(nextAction.intent)) {
        nextAction.clientName = session.lastClientName;
      }
    }

    if (
      nextAction.intent === 'MARK_PAID' &&
      !nextAction.paymentAmount &&
      hasReference &&
      session.lastOutstandingAmount
    ) {
      nextAction.paymentAmount = session.lastOutstandingAmount;
    }

    return nextAction;
  });

  if (
    normalizedActions.every((action) => action.intent === 'UNKNOWN') &&
    hasReference &&
    session.lastClientName
  ) {
    if (isPaymentReference(message)) {
      normalizedActions[0] = {
        intent: 'MARK_PAID',
        clientName: session.lastClientName,
        paymentAmount: session.lastOutstandingAmount || null,
        items: [],
        filters: {},
        totalAmount: null
      };
    } else if (isLedgerReference(message)) {
      normalizedActions[0] = {
        intent: 'QUERY_LEDGER',
        clientName: session.lastClientName,
        items: [],
        filters: {},
        totalAmount: null,
        paymentAmount: null
      };
    } else if (isInvoiceReference(message)) {
      normalizedActions[0] = {
        intent: 'GENERATE_INVOICE',
        clientName: session.lastClientName,
        items: [],
        filters: {},
        totalAmount: null,
        paymentAmount: null
      };
    }
  }

  return {
    ...parsed,
    actions: normalizedActions
  };
}

function syncSessionFromResults(sessionId: string, actionResults: ExecutedActionResult[]) {
  const lastSuccessful = [...actionResults]
    .reverse()
    .find(({ result }) => result && !result.error);

  if (!lastSuccessful) return;

  const nextSessionPatch: Record<string, any> = {
    lastIntent: lastSuccessful.action.intent
  };

  const resultClient =
    lastSuccessful.result.client ||
    (lastSuccessful.result.clientName
      ? {
          id: lastSuccessful.result.clientId,
          name: lastSuccessful.result.clientName,
          total_outstanding: lastSuccessful.result.remainingBalance
        }
      : null);

  if (resultClient?.name) {
    nextSessionPatch.lastClientName = resultClient.name;
  } else if (lastSuccessful.action.clientName) {
    nextSessionPatch.lastClientName = lastSuccessful.action.clientName;
  }

  if (resultClient?.id) {
    nextSessionPatch.lastClientId = resultClient.id;
  }

  if (typeof resultClient?.total_outstanding === 'number') {
    nextSessionPatch.lastOutstandingAmount = Number(resultClient.total_outstanding || 0);
  } else if (typeof lastSuccessful.result.remainingBalance === 'number') {
    nextSessionPatch.lastOutstandingAmount = Number(lastSuccessful.result.remainingBalance || 0);
  }

  if (lastSuccessful.result.invoice?.id) {
    nextSessionPatch.lastInvoiceId = lastSuccessful.result.invoice.id;
  } else if (lastSuccessful.result.invoices?.[0]?.id) {
    nextSessionPatch.lastInvoiceId = lastSuccessful.result.invoices[0].id;
  }

  updateChatSession(sessionId, nextSessionPatch);
}

export default router;
