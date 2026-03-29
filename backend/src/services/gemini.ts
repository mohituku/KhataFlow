import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BusinessCommand } from '../types';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelNames: string[] = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  Gemini API key not found. AI parsing will return mock responses.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.modelNames = [
        process.env.GEMINI_MODEL,
        'gemini-3-pro-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash'
      ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
    }
  }

  async parseBusinessCommand(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<BusinessCommand> {
    // If Gemini is not initialized, return mock response
    if (!this.genAI || this.modelNames.length === 0) {
      return this.getMockResponse(message);
    }

    const systemPrompt = `You are KhataFlow, an AI assistant for Indian kirana and SMB shopkeepers.
The person messaging you is always the business owner or shop admin using KhataFlow.
Any named person in the message is usually a customer/client unless explicitly stated otherwise.
Understand Hindi, English, and Hinglish.

Return ONLY valid JSON. No markdown. No explanation.

Schema:
{
  "intent": "ADD_SALE" | "UPDATE_STOCK" | "QUERY_LEDGER" | "MARK_PAID" | "UNKNOWN",
  "response": "Friendly reply in the same language the user used",
  "clientName": "string or null",
  "items": [{ "name": "string", "qty": number, "unit": "string", "price": number }],
  "totalAmount": number or null,
  "paymentAmount": number or null
}

Rules:
- "baaki", "udhaar", "khate me likh" means credit sale → ADD_SALE
- "diya", "payment kiya", "cash diya", "settle kar diya" means payment received → MARK_PAID
- "paise nahi diye", "nhi diye", "khate me daal do", "balance daal do" means credit sale → ADD_SALE
- "stock", "inventory", "add karo", "bhar do" means inventory update → UPDATE_STOCK
- "khata dikhao", "kitna baaki", "ledger dikhao" means ledger query → QUERY_LEDGER
- "kis kis se lena hai", "total udhar", "who owes me", "overall ledger" means overall ledger query → QUERY_LEDGER with clientName = null
- Speak to the business owner/admin in the response, not to the customer
- "my", "mera", "hamara", and "our shop" refer to the shopkeeper's business context
- Treat customer names as clientName whenever a sale/payment/ledger request mentions another person
- totalAmount = amount sold on credit
- paymentAmount = money received against an existing balance
- clientName should be null if no name is clearly present
- items should be [] when not relevant
- Preserve the user's language style in response

Examples:
"Ramesh ne 5kg aloo liya, 200 baaki hai" => {"intent":"ADD_SALE","clientName":"Ramesh","items":[{"name":"aloo","qty":5,"unit":"kg","price":40}],"totalAmount":200,"paymentAmount":null}
"sunno, ramesh bhai ne sugar leke gaye par paise nhi diye toh unka balance 100 rs khate me daaldo" => {"intent":"ADD_SALE","clientName":"Ramesh Bhai","items":[{"name":"sugar","qty":1,"unit":"item","price":100}],"totalAmount":100,"paymentAmount":null}
"Priya ne 500 de diye" => {"intent":"MARK_PAID","clientName":"Priya","items":[],"totalAmount":null,"paymentAmount":500}
"chawal ka stock 100kg add karo" => {"intent":"UPDATE_STOCK","clientName":null,"items":[{"name":"chawal","qty":100,"unit":"kg","price":0}],"totalAmount":null,"paymentAmount":null}
"Suresh ka khata dikhao" => {"intent":"QUERY_LEDGER","clientName":"Suresh","items":[],"totalAmount":null,"paymentAmount":null}
"total udhar mujhe kisskiss se lene hai ?" => {"intent":"QUERY_LEDGER","clientName":null,"items":[],"totalAmount":null,"paymentAmount":null}`;

    for (const modelName of this.modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: conversationHistory.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        });

        const prompt = `${systemPrompt}\n\nUser message: "${message}"\n\nParse this and return JSON only.`;
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();
        const cleaned = text
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        return {
          ...parsed,
          items: Array.isArray(parsed.items) ? parsed.items : []
        };
      } catch (error) {
        console.error(`Gemini parsing error with ${modelName}:`, error);
      }
    }

    return this.getMockResponse(message);
  }

  private getMockResponse(message: string): BusinessCommand {
    const lowerMsg = message.toLowerCase();
    const clientName = this.extractClientName(message);
    const amount = this.extractAmount(message);
    const items = this.extractItems(message);
    const isInventoryIntent = this.containsAny(lowerMsg, ['stock', 'inventory', 'bhar do', 'refill']);
    const isLedgerIntent = this.containsAny(lowerMsg, [
      'khata',
      'ledger',
      'dikhao',
      'udhar kitna',
      'udhaar kitna',
      'who owes',
      'kis kis se',
      'kisskiss se',
      'total udhar',
      'total udhaar'
    ]);
    const isNegativePaymentPhrase = this.containsAny(lowerMsg, [
      'nahi diye',
      'nhi diye',
      'paise nahi diye',
      'paise nhi diye',
      'khate me daal',
      'khata me daal',
      'balance daal'
    ]);
    const isSaleIntent = this.containsAny(lowerMsg, [
      'udhaar',
      'udhar',
      'liya',
      'liye',
      'leke gaye',
      'le gaya',
      'baaki',
      'baki',
      'khate me',
      'khata me'
    ]) || isNegativePaymentPhrase;
    const isPaymentIntent = this.containsAny(lowerMsg, [
      'paid',
      'payment',
      'de diye',
      'de diya',
      'cash diya',
      'settle kar diya',
      'jama kar diya'
    ]) && !isNegativePaymentPhrase;

    if (isInventoryIntent) {
      return {
        intent: 'UPDATE_STOCK',
        response: 'Main aapka inventory update kar raha hoon.',
        items,
        clientName: undefined
      };
    }

    if (isLedgerIntent) {
      return {
        intent: 'QUERY_LEDGER',
        response: clientName
          ? `Main ${clientName} ka khata dekh raha hoon.`
          : 'Main aapka poora udhar summary dekh raha hoon.',
        clientName
      };
    }

    if (isSaleIntent) {
      return {
        intent: 'ADD_SALE',
        response: clientName
          ? `Main ${clientName} ka udhar khate me add kar raha hoon.`
          : 'Main is udhar ko khate me add kar raha hoon.',
        clientName,
        items,
        totalAmount: amount
      };
    }

    if (isPaymentIntent) {
      return {
        intent: 'MARK_PAID',
        response: clientName
          ? `Main ${clientName} ki payment record kar raha hoon.`
          : 'Main payment record kar raha hoon.',
        clientName,
        paymentAmount: amount
      };
    }

    return {
      intent: 'UNKNOWN',
      response: 'I could not clearly map that to a sale, payment, stock update, or ledger query. Please restate it with the client name and amount.'
    };
  }

  private extractClientName(message: string): string | undefined {
    const patterns = [
      /\b([A-Za-z][A-Za-z\s]{1,40}?)\s+ne\b/i,
      /\b([A-Za-z][A-Za-z\s]{1,40}?)\s+(?:paid|gave|purchased|took|owes)\b/i,
      /\bfor\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s|$)/i,
      /\bof\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s|$)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        return this.toDisplayName(match[1]);
      }
    }

    return undefined;
  }

  private extractAmount(message: string): number | undefined {
    const currencyMatches = Array.from(message.matchAll(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/gi));
    if (currencyMatches.length > 0) {
      return Number(currencyMatches[currencyMatches.length - 1][1]);
    }

    const numericMatches = Array.from(message.matchAll(/(\d+(?:\.\d+)?)/g));
    if (numericMatches.length === 0) {
      return undefined;
    }

    return Number(numericMatches[numericMatches.length - 1][1]);
  }

  private extractItems(message: string): BusinessCommand['items'] {
    const sanitizedMessage = message.replace(
      /(?:(?:₹|rs\.?|inr)\s*\d+(?:\.\d+)?)|(?:\d+(?:\.\d+)?\s*(?:₹|rs\.?|inr))/gi,
      ' '
    );

    const quantifiedItemMatch = sanitizedMessage.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|pcs|pc|pieces|piece|l|ltr|litre|litres|packet|packets)?\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:\s+(?:liya|liye|add|stock|baki|baaki|udhaar)|$)/i);

    if (quantifiedItemMatch) {
      return [
        {
          name: this.toDisplayName(quantifiedItemMatch[3].trim()),
          qty: Number(quantifiedItemMatch[1]),
          unit: (quantifiedItemMatch[2] || 'pcs').toLowerCase(),
          price: 0
        }
      ];
    }

    const plainItemMatch = sanitizedMessage.match(/\b([A-Za-z][A-Za-z\s]{1,40}?)\s+(?:leke gaye|le gaya|liya|liye|stock|inventory|add karo)\b/i);

    if (plainItemMatch) {
      const rawName = plainItemMatch[1].trim();
      const normalizedName = rawName.includes(' ne ')
        ? rawName.split(/\s+ne\s+/i).pop() || rawName
        : rawName;

      return [
        {
          name: this.toDisplayName(normalizedName),
          qty: 1,
          unit: 'item',
          price: 0
        }
      ];
    }

    return [];
  }

  private toDisplayName(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private containsAny(value: string, phrases: string[]) {
    return phrases.some((phrase) => value.includes(phrase));
  }
}

export const geminiService = new GeminiService();
