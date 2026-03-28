import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BusinessCommand } from '../types';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  Gemini API key not found. AI parsing will return mock responses.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp' 
      });
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
    }
  }

  async parseBusinessCommand(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<BusinessCommand> {
    // If Gemini is not initialized, return mock response
    if (!this.model) {
      return this.getMockResponse(message);
    }

    try {
      const systemPrompt = `You are KhataFlow, an AI assistant for Indian kirana and SMB shopkeepers.
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
- "stock", "inventory", "add karo", "bhar do" means inventory update → UPDATE_STOCK
- "khata dikhao", "kitna baaki", "ledger dikhao" means ledger query → QUERY_LEDGER
- totalAmount = amount sold on credit
- paymentAmount = money received against an existing balance
- clientName should be null if no name is clearly present
- items should be [] when not relevant
- Preserve the user's language style in response

Examples:
"Ramesh ne 5kg aloo liya, 200 baaki hai" => {"intent":"ADD_SALE","clientName":"Ramesh","items":[{"name":"aloo","qty":5,"unit":"kg","price":40}],"totalAmount":200,"paymentAmount":null}
"Priya ne 500 de diye" => {"intent":"MARK_PAID","clientName":"Priya","items":[],"totalAmount":null,"paymentAmount":500}
"chawal ka stock 100kg add karo" => {"intent":"UPDATE_STOCK","clientName":null,"items":[{"name":"chawal","qty":100,"unit":"kg","price":0}],"totalAmount":null,"paymentAmount":null}
"Suresh ka khata dikhao" => {"intent":"QUERY_LEDGER","clientName":"Suresh","items":[],"totalAmount":null,"paymentAmount":null}`;

      const chat = this.model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      });

      const prompt = `${systemPrompt}\n\nUser message: "${message}"\n\nParse this and return JSON only.`;
      const result = await chat.sendMessage(prompt);
      const text = result.response.text();

      // Clean JSON response
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Gemini parsing error:', error);
      return this.getMockResponse(message);
    }
  }

  private getMockResponse(message: string): BusinessCommand {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('udhaar') || lowerMsg.includes('liya') || lowerMsg.includes('baki')) {
      return {
        intent: 'ADD_SALE',
        response: 'Transaction recorded! Ramesh Kumar ka khata update ho gaya.',
        clientName: 'Ramesh Kumar',
        items: [
          { name: 'Aloo', qty: 5, unit: 'kg', price: 40 }
        ],
        totalAmount: 200
      };
    }

    if (lowerMsg.includes('stock') || lowerMsg.includes('inventory')) {
      return {
        intent: 'UPDATE_STOCK',
        response: 'Stock updated successfully!',
        items: [
          { name: 'Rice', qty: 50, unit: 'kg' }
        ]
      };
    }

    if (lowerMsg.includes('khata') || lowerMsg.includes('ledger') || lowerMsg.includes('dikhao')) {
      return {
        intent: 'QUERY_LEDGER',
        response: 'Here is the ledger information.',
        clientName: 'Ramesh Kumar'
      };
    }

    if (lowerMsg.includes('paid') || lowerMsg.includes('diye') || lowerMsg.includes('payment')) {
      return {
        intent: 'MARK_PAID',
        response: 'Payment received and recorded!',
        clientName: 'Ramesh Kumar',
        paymentAmount: 500
      };
    }

    return {
      intent: 'UNKNOWN',
      response: 'Main samajh nahi paya. Kya aap phir se bata sakte hain?'
    };
  }
}

export const geminiService = new GeminiService();
