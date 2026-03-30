export type IntentType =
  | 'ADD_SALE'
  | 'UPDATE_STOCK'
  | 'MARK_PAID'
  | 'QUERY_LEDGER'
  | 'QUERY_STOCK'         // NEW: "what is low stock / how much rice do we have"
  | 'GENERATE_REPORT'     // NEW: "show me today's sales / revenue summary"
  | 'GENERATE_INVOICE'    // NEW: "generate invoice for Ramesh"
  | 'UNKNOWN';

export interface ItemLine {
  name: string;
  qty: number;
  unit: string;
  price?: number;
}

// A single parsed action unit
export interface ActionUnit {
  intent: IntentType;
  clientName?: string | null;
  items?: ItemLine[];
  totalAmount?: number | null;
  paymentAmount?: number | null;
  filters?: {
    minOutstanding?: number;    // "clients who owe more than X"
    maxOutstanding?: number;
    daysSinceLastPayment?: number; // "haven't paid in N days"
    lowStockOnly?: boolean;     // "show low stock items"
    itemName?: string;          // "how much rice do we have"
    dateFrom?: string;          // ISO date
    dateTo?: string;
  };
  invoiceId?: string;
}

// Gemini now returns MULTIPLE actions for compound messages
export interface ParsedCommand {
  actions: ActionUnit[];           // ARRAY, not single object
  response: string;                // Overall conversational reply
  requiresConfirmation: boolean;   // true for writes, false for reads
  summary: string;                 // Short 1-line summary of what will happen
}

// Keep BusinessCommand for backward compat but deprecate
export interface BusinessCommand extends ActionUnit {
  response: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  parsedCommand?: ParsedCommand;
  timestamp: string;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  total_outstanding: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  client_id: string;
  type: 'SALE' | 'PAYMENT';
  amount: number;
  items?: ItemLine[];
  status: 'PENDING' | 'PAID';
  nft_token_id?: string;
  chain_status?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  client_id: string;
  amount: number;
  original_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  status: 'PENDING' | 'MINTED' | 'SETTLED';
  items?: ItemLine[];
  nft_token_id?: string;
  nft_tx_hash?: string;
  due_date?: string;
  settled_at?: string;
  created_at: string;
}

export interface NFTData {
  tokenId: number;
  clientName: string;
  amount: number;
  dueDate: string;
  status: 'ACTIVE' | 'SETTLED';
  invoiceId: string;
  txHash: string;
}
