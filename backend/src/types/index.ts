export interface BusinessCommand {
  intent: 'ADD_SALE' | 'UPDATE_STOCK' | 'QUERY_LEDGER' | 'MARK_PAID' | 'UNKNOWN';
  response: string;
  clientName?: string;
  items?: Array<{
    name: string;
    qty: number;
    unit: string;
    price?: number;
  }>;
  totalAmount?: number;
  paymentAmount?: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  action?: any;
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
  items?: any;
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
  status: 'PENDING' | 'MINTED' | 'SETTLED';
  items?: any;
  nft_token_id?: string;
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
