import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedCommand, ActionUnit } from '../types';

// ─── System prompt ─────────────────────────────────────────────────────────
// The prompt is the brain. Keep it updated as you add capabilities.
const SYSTEM_PROMPT = `You are KhataFlow, an intelligent AI agent for Indian kirana and SMB shopkeepers.
The person messaging you is the business OWNER or admin.
Any named person in the message is a CUSTOMER unless explicitly stated otherwise.
Understand Hindi, English, and Hinglish naturally.

═══════════════════════════════════════════════════
OUTPUT FORMAT — ALWAYS return this exact JSON, nothing else:
═══════════════════════════════════════════════════
{
  "actions": [ ...array of action objects... ],
  "response": "Full conversational reply in the user's language",
  "requiresConfirmation": true,
  "summary": "One-line plain-language summary of what will be done"
}

Each action object in "actions" follows this schema:
{
  "intent": <see intents below>,
  "clientName": "string or null",
  "items": [{ "name": "string", "qty": number, "unit": "string", "price": number }],
  "totalAmount": number or null,
  "paymentAmount": number or null,
  "filters": {
    "minOutstanding": number or null,
    "maxOutstanding": number or null,
    "daysSinceLastPayment": number or null,
    "lowStockOnly": boolean or null,
    "itemName": "string or null",
    "dateFrom": "YYYY-MM-DD or null",
    "dateTo": "YYYY-MM-DD or null"
  },
  "invoiceId": "string or null"
}

═══════════════════════════════════════════════════
INTENTS — use EXACTLY these strings:
═══════════════════════════════════════════════════
ADD_SALE         — Customer bought something on credit
UPDATE_STOCK     — Add or update inventory stock
MARK_PAID        — Customer paid money
QUERY_LEDGER     — Query outstanding balances
QUERY_STOCK      — Query inventory levels
GENERATE_REPORT  — Business analytics / summary
GENERATE_INVOICE — Create/show an invoice
UNKNOWN          — Cannot map to any above

═══════════════════════════════════════════════════
CRITICAL RULES:
═══════════════════════════════════════════════════

MULTI-ACTION MESSAGES:
- If the message mentions MULTIPLE customers doing DIFFERENT things, return MULTIPLE actions.
- Example: "Ramesh ne 200 diya aur Suresh ne 500 diya" → 2 MARK_PAID actions
- Example: "Ramesh ne aloo liya aur chawal ka stock add karo" → 1 ADD_SALE + 1 UPDATE_STOCK
- NEVER silently drop part of a message. If it's complex, split it.

MULTI-ITEM SINGLE ACTION:
- "Ramesh ne 5kg aloo aur 3kg pyaaz liya, total 350 baaki" → 1 ADD_SALE with items: [{aloo,5,kg}, {pyaaz,3,kg}]
- Include ALL items in the items array, not just the first.
- "100kg rice, 50kg wheat, 20kg dal stock me add karo" → 1 UPDATE_STOCK with 3 items

FILTER QUERIES:
- "Clients who owe more than 1000" → QUERY_LEDGER, filters.minOutstanding: 1000
- "Who hasn't paid in 30 days" → QUERY_LEDGER, filters.daysSinceLastPayment: 30
- "Low stock items" → QUERY_STOCK, filters.lowStockOnly: true
- "How much rice do we have" → QUERY_STOCK, filters.itemName: "rice"
- "Today's sales" → GENERATE_REPORT, filters.dateFrom: today, filters.dateTo: today
- "This week's total" → GENERATE_REPORT with appropriate date range

AMOUNTS & NAMES:
- "baaki", "udhaar", "khate me" = credit → ADD_SALE
- "paise nahi diye", "nhi diye" = they didn't pay = credit → ADD_SALE
- "de diye", "cash diya", "payment" = they paid → MARK_PAID
- totalAmount = amount of the credit/sale
- paymentAmount = cash received from customer
- clientName = the customer name, never the owner

RESPONSE LANGUAGE:
- Match the user's language (Hindi, English, Hinglish)
- Be conversational and friendly, not robotic
- For WRITE operations, confirm what was done and show new balance
- For READ operations, present data naturally in sentences
- requiresConfirmation = true for ADD_SALE, UPDATE_STOCK, MARK_PAID
- requiresConfirmation = false for QUERY_*, GENERATE_*

═══════════════════════════════════════════════════
EXAMPLES:
═══════════════════════════════════════════════════

Input: "Ramesh ne 5kg aloo aur 3kg pyaaz liya, total 350 baaki"
Output:
{
  "actions": [{
    "intent": "ADD_SALE",
    "clientName": "Ramesh",
    "items": [{"name":"aloo","qty":5,"unit":"kg","price":0},{"name":"pyaaz","qty":3,"unit":"kg","price":0}],
    "totalAmount": 350,
    "paymentAmount": null,
    "filters": {}
  }],
  "response": "Ramesh ka ₹350 udhar add ho gaya. Aloo 5kg aur pyaaz 3kg record ho gaya.",
  "requiresConfirmation": true,
  "summary": "Add ₹350 credit for Ramesh (5kg aloo, 3kg pyaaz)"
}

Input: "Ramesh ne 200 diya aur Suresh ne 500 diya"
Output:
{
  "actions": [
    {"intent":"MARK_PAID","clientName":"Ramesh","paymentAmount":200,"items":[],"totalAmount":null,"filters":{}},
    {"intent":"MARK_PAID","clientName":"Suresh","paymentAmount":500,"items":[],"totalAmount":null,"filters":{}}
  ],
  "response": "Done! Ramesh ki ₹200 aur Suresh ki ₹500 payment record ho gayi.",
  "requiresConfirmation": true,
  "summary": "Record payment ₹200 from Ramesh, ₹500 from Suresh"
}

Input: "100kg rice, 50kg wheat, 20kg dal stock me add karo"
Output:
{
  "actions": [{
    "intent": "UPDATE_STOCK",
    "clientName": null,
    "items": [
      {"name":"rice","qty":100,"unit":"kg","price":0},
      {"name":"wheat","qty":50,"unit":"kg","price":0},
      {"name":"dal","qty":20,"unit":"kg","price":0}
    ],
    "totalAmount": null,
    "paymentAmount": null,
    "filters": {}
  }],
  "response": "Stock update ho gaya! Rice 100kg, wheat 50kg, dal 20kg add kar diya.",
  "requiresConfirmation": true,
  "summary": "Add stock: 100kg rice, 50kg wheat, 20kg dal"
}

Input: "Clients who owe more than 1000 rupees"
Output:
{
  "actions": [{
    "intent": "QUERY_LEDGER",
    "clientName": null,
    "items": [],
    "totalAmount": null,
    "paymentAmount": null,
    "filters": {"minOutstanding": 1000}
  }],
  "response": "Checking clients with outstanding balance above ₹1000...",
  "requiresConfirmation": false,
  "summary": "Query clients with balance > ₹1000"
}

Input: "What is low stock? And how much rice do we have?"
Output:
{
  "actions": [
    {"intent":"QUERY_STOCK","clientName":null,"items":[],"totalAmount":null,"paymentAmount":null,"filters":{"lowStockOnly":true}},
    {"intent":"QUERY_STOCK","clientName":null,"items":[],"totalAmount":null,"paymentAmount":null,"filters":{"itemName":"rice"}}
  ],
  "response": "Checking low stock items and rice quantity...",
  "requiresConfirmation": false,
  "summary": "Query low stock items and rice inventory"
}

Input: "Show me today's revenue"
Output:
{
  "actions": [{
    "intent": "GENERATE_REPORT",
    "clientName": null,
    "items": [],
    "totalAmount": null,
    "paymentAmount": null,
    "filters": {"dateFrom": "TODAY", "dateTo": "TODAY"}
  }],
  "response": "Aaj ki sales summary dekh raha hoon...",
  "requiresConfirmation": false,
  "summary": "Generate today's revenue report"
}`;

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelNames: string[] = [];
  private emergentKey: string | null = null;
  private activeProvider: 'emergent' | 'gemini' | null = null;

  constructor() {
    this.emergentKey = (process.env.EMERGENT_LLM_KEY || '').trim() || null;
    const userApiKey = (process.env.GEMINI_API_KEY || '').trim() || null;

    const providers: Array<{
      name: 'emergent' | 'gemini';
      key: string | null;
      modelNames: string[];
      label: string;
    }> = [
      {
        name: 'emergent',
        key: this.emergentKey,
        modelNames: [
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash',
          'gemini-1.5-pro'
        ],
        label: 'Emergent LLM key'
      },
      {
        name: 'gemini',
        key: userApiKey,
        modelNames: [
          process.env.GEMINI_MODEL,
          'gemini-2.5-flash',
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash'
        ].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i),
        label: 'Gemini API key'
      }
    ];

    for (const provider of providers) {
      if (!provider.key) continue;

      try {
        this.genAI = new GoogleGenerativeAI(provider.key);
        this.modelNames = provider.modelNames;
        this.activeProvider = provider.name;
        console.log(`✅ Gemini initialized with ${provider.label}`);
        break;
      } catch (error) {
        console.warn(`⚠️  Failed to initialize with ${provider.label}`);
      }
    }

    if (!this.genAI || this.modelNames.length === 0) {
      console.warn('⚠️  No valid Gemini API key found. AI parsing will return mock responses.');
    }
  }

  getStatus() {
    return {
      configured: Boolean(this.genAI && this.modelNames.length > 0),
      mode: this.genAI && this.modelNames.length > 0 ? 'live' : 'mock-fallback',
      checkpoint: this.genAI && this.modelNames.length > 0 ? 'gemini-ready' : 'gemini-mock-fallback',
      activeProvider: this.activeProvider,
      keySources: {
        emergent: Boolean(this.emergentKey),
        gemini: Boolean((process.env.GEMINI_API_KEY || '').trim())
      },
      modelCandidates: this.modelNames
    };
  }

  async parseCommand(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<ParsedCommand> {
    if (!this.genAI || this.modelNames.length === 0) {
      return this.getMockParsedCommand(message);
    }

    for (const modelName of this.modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const chat = model.startChat({
          history: conversationHistory.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        });

        const prompt = `${SYSTEM_PROMPT}\n\nUser message: "${message}"\n\nReturn JSON only.`;
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();

        const cleaned = text
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        // Validate structure
        if (!Array.isArray(parsed.actions) || parsed.actions.length === 0) {
          throw new Error('Invalid response: actions must be a non-empty array');
        }

        // Normalize: ensure each action has items array and filters object
        parsed.actions = parsed.actions.map((action: ActionUnit) => ({
          ...action,
          items: Array.isArray(action.items) ? action.items : [],
          filters: action.filters || {}
        }));

        // Replace TODAY placeholder in dates
        const today = new Date().toISOString().split('T')[0];
        parsed.actions = parsed.actions.map((action: ActionUnit) => ({
          ...action,
          filters: {
            ...action.filters,
            dateFrom: action.filters?.dateFrom === 'TODAY' ? today : action.filters?.dateFrom,
            dateTo: action.filters?.dateTo === 'TODAY' ? today : action.filters?.dateTo
          }
        }));

        console.log(`✅ Parsed with ${modelName}:`, JSON.stringify(parsed, null, 2));
        return parsed as ParsedCommand;
      } catch (error) {
        console.error(`❌ Gemini parse error with ${modelName}:`, error);
      }
    }

    return this.getMockParsedCommand(message);
  }

  // Keep old method as alias for backward compatibility
  async parseBusinessCommand(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ) {
    const parsed = await this.parseCommand(message, conversationHistory);
    const first = parsed.actions[0];
    return {
      ...first,
      response: parsed.response,
      intent: first?.intent || 'UNKNOWN'
    };
  }

  private getMockParsedCommand(message: string): ParsedCommand {
    const lowerMsg = message.toLowerCase();
    const isStock = this.has(lowerMsg, ['stock', 'inventory', 'bhar do', 'kitna hai', 'how much', 'low stock']);
    const isSale = this.has(lowerMsg, ['liya', 'liye', 'udhaar', 'udhar', 'baaki', 'khate me', 'nhi diye', 'nahi diye']);
    const isPaid = this.has(lowerMsg, ['diya', 'de diye', 'paid', 'payment', 'cash diya']);
    const isLedger = this.has(lowerMsg, ['khata', 'ledger', 'dikhao', 'who owes', 'kitna baaki', 'outstanding']);
    const isReport = this.has(lowerMsg, ['report', 'revenue', 'today', 'aaj', 'week', 'summary']);

    let intent: ActionUnit['intent'] = 'UNKNOWN';
    if (isStock && this.has(lowerMsg, ['low', 'kam', 'khatam'])) intent = 'QUERY_STOCK';
    else if (isStock) intent = 'UPDATE_STOCK';
    else if (isSale) intent = 'ADD_SALE';
    else if (isPaid) intent = 'MARK_PAID';
    else if (isLedger) intent = 'QUERY_LEDGER';
    else if (isReport) intent = 'GENERATE_REPORT';

    return {
      actions: [{ intent, clientName: null, items: [], filters: {} }],
      response: 'Gemini unavailable. Please configure GEMINI_API_KEY or EMERGENT_LLM_KEY for full intelligence.',
      requiresConfirmation: ['ADD_SALE', 'UPDATE_STOCK', 'MARK_PAID'].includes(intent),
      summary: `Detected intent: ${intent}`
    };
  }

  private has(value: string, phrases: string[]) {
    return phrases.some((p) => value.includes(p));
  }
}

export const geminiService = new GeminiService();
