# KhataFlow Backend

> Express.js + TypeScript REST API — AI-powered business command processing, ledger management, and Flow EVM blockchain integration.

---

## Overview

The KhataFlow backend is the central nervous system of the platform. It accepts natural language business commands, parses them via Google Gemini AI, persists data to Supabase (PostgreSQL), and communicates with smart contracts deployed on Flow EVM Testnet.

**Running on:** `http://localhost:8001`

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| Express.js | ^4.21.2 | HTTP server and routing |
| TypeScript | ^5.7.2 | Type safety |
| Google Gemini AI | ^0.21.0 | Natural language parsing |
| Supabase JS | ^2.48.1 | PostgreSQL database client |
| ethers.js | ^6.13.0 | Flow EVM blockchain interactions |
| Zod | ^3.24.1 | Runtime request validation |
| dotenv | ^16.4.7 | Environment configuration |
| cors | ^2.8.5 | Cross-origin resource sharing |

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app + server bootstrap
│   ├── middleware/
│   │   └── businessId.ts     # Extracts business ID from requests
│   ├── routes/
│   │   ├── chat.ts           # POST /api/chat — AI command processor
│   │   ├── ledger.ts         # GET /api/ledger/* — clients & transactions
│   │   ├── inventory.ts      # /api/inventory — stock management
│   │   ├── invoices.ts       # /api/invoices — invoice CRUD
│   │   └── chain.ts          # /api/chain — blockchain record ops
│   ├── services/
│   │   ├── gemini.ts         # Gemini 2.0 Flash NLP service
│   │   ├── blockchain.ts     # Flow EVM provider + NFT contract calls
│   │   └── supabase.ts       # Supabase client singleton
│   ├── contracts/
│   │   └── KhataFlowNFT.json # ABI for on-chain calls
│   └── types/                # Shared TypeScript types
├── schema.sql                # Full PostgreSQL schema + seed data
├── .env.example              # Required environment variables
├── package.json
└── tsconfig.json
```

---

## Setup & Running

### 1. Install dependencies

```bash
cd backend
yarn install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Where to get it | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | ✅ Yes |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | ✅ Yes (or uses mock) |
| `FLOW_EVM_RPC` | `https://testnet.evm.nodes.onflow.org` | Optional (has default) |
| `NFT_CONTRACT_ADDRESS` | From `contracts/deployed-addresses.json` | Optional |
| `PAYMENTS_CONTRACT_ADDRESS` | From `contracts/deployed-addresses.json` | Optional |
| `PORT` | Any open port | Optional (default: `8001`) |
| `CORS_ORIGINS` | Frontend URL | Optional (default: `*`) |

### 3. Set up the database

Run `schema.sql` in your Supabase SQL Editor. This creates all tables, indexes, RPC functions, and seeds sample data.

### 4. Start the server

```bash
# Development (hot-reload)
yarn dev

# Production build
yarn build
yarn start
```

---

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "KhataFlow Backend",
  "chain": "flow-evm-testnet",
  "timestamp": "2026-03-29T01:00:00.000Z"
}
```

---

### POST `/api/chat`

The core AI endpoint. Accepts a natural language message (Hindi / English / Hinglish), parses it with Gemini, executes the corresponding database operation, and returns structured results.

**Request:**
```json
{
  "message": "Ramesh ne 5kg aloo liya, 200 baaki hai",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "model", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "action": {
    "intent": "ADD_SALE",
    "response": "Ramesh ka khata update ho gaya!",
    "clientName": "Ramesh",
    "items": [{ "name": "aloo", "qty": 5, "unit": "kg", "price": 40 }],
    "totalAmount": 200,
    "paymentAmount": null
  },
  "dbResult": {
    "client": { "id": "...", "name": "Ramesh", "total_outstanding": 200 },
    "transaction": { "id": "...", "type": "SALE", "amount": 200 }
  }
}
```

**Intent types:**

| Intent | Triggered by | DB action |
|---|---|---|
| `ADD_SALE` | "liya", "udhaar", "baaki", "khate me likh" | Insert transaction + increment client balance |
| `MARK_PAID` | "diya", "payment kiya", "cash diya" | Insert payment + decrement client balance |
| `UPDATE_STOCK` | "stock", "inventory", "add karo", "bhar do" | Upsert inventory items |
| `QUERY_LEDGER` | "khata dikhao", "kitna baaki", "ledger" | Fetch client transactions |
| `UNKNOWN` | Anything else | No DB action, friendly message |

---

### GET `/api/ledger/clients`

Returns all clients for the business with their outstanding balances and timestamp of last transaction.

### GET `/api/ledger/clients/:clientId`

Returns a single client with their full transaction history.

### GET `/api/ledger/summary`

Returns aggregate dashboard stats:
```json
{
  "summary": {
    "totalOutstanding": 14700,
    "totalRevenue": 52000,
    "pendingTransactions": 3,
    "totalClients": 4,
    "activeNFTs": 2
  }
}
```

### GET `/api/ledger/activity`

Returns a unified activity feed (last 10 events) combining sales, payments, NFT mints, and low-stock alerts — sorted by timestamp.

---

### GET `/api/inventory`

Returns all inventory items with a computed `lowStock: boolean` flag (true when `quantity <= low_stock_threshold`).

### POST `/api/inventory`

Add or update an inventory item (upserts on `business_id + item_name`):
```json
{
  "item_name": "Rice",
  "quantity": 100,
  "unit": "kg",
  "low_stock_threshold": 20
}
```

### PATCH `/api/inventory/:itemId`

Update quantity of a specific item:
```json
{ "quantity": 75 }
```

---

### GET `/api/invoices`

Returns all invoices (optionally filter with `?status=MINTED` or `?status=PENDING`). Includes joined client name.

### POST `/api/invoices`

Create a new invoice:
```json
{
  "client_id": "uuid-here",
  "amount": 5000,
  "items": [],
  "status": "PENDING"
}
```

### PATCH `/api/invoices/:invoiceId`

Update an invoice (used after NFT mint to attach token ID and tx hash):
```json
{
  "status": "MINTED",
  "nft_token_id": "1",
  "nft_tx_hash": "0xabc...",
  "due_date": "2026-04-30T00:00:00Z",
  "chain": "flow-evm-testnet"
}
```

---

### POST `/api/chain/record-mint`

Verifies a transaction on Flow EVM, then updates the invoice record in Supabase:
```json
{
  "txHash": "0xabc123...",
  "tokenId": "1",
  "invoiceId": "uuid-here",
  "clientName": "Ramesh",
  "amount": 5000,
  "dueDate": "2026-04-30"
}
```

### GET `/api/chain/token/:tokenId`

Fetches both the on-chain `DebtRecord` and the matching Supabase invoice, combining them:
```json
{
  "nft": {
    "tokenId": 1,
    "clientName": "Ramesh",
    "amount": 5000,
    "status": "ACTIVE",
    "contractAddress": "0x6fa658...",
    "txHash": "0xabc...",
    "debtRecord": { "settled": false, "amountInPaise": 500000, ... }
  }
}
```

### GET `/api/chain/tx/:txHash`

Returns minimal transaction status from Flow EVM:
```json
{
  "transaction": { "status": "SUCCESS", ... },
  "explorerUrl": "https://evm-testnet.flowscan.io/tx/0xabc..."
}
```

---

## Services

### `GeminiService` (`services/gemini.ts`)

Wraps `@google/generative-ai` and uses **Gemini 2.0 Flash** to parse free-text business commands into structured JSON. Falls back gracefully to keyword-based mock responses when no API key is configured — useful for local development without a key.

The system prompt is purposefully bilingual: it includes Hindi/Hinglish examples and instructs the model to respond in the same language the user wrote in.

### `BlockchainService` (`services/blockchain.ts`)

Uses **ethers.js v6** with a `JsonRpcProvider` pointed at the Flow EVM Testnet RPC. Key capabilities:
- `verifyTransaction(txHash)` — checks receipt status = 1 (success)
- `getTransactionDetails(txHash)` — returns raw tx + receipt
- `getDebtRecord(tokenId)` — reads `debtRecords[tokenId]` mapping from the NFT contract
- `getExplorerUrl(txHash)` — generates FlowScan link

### `SupabaseService` (`services/supabase.ts`)

A singleton Supabase client initialized with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Uses the service role (bypasses Row Level Security) — switch to anon key when implementing user-facing auth.

---

## Database Schema Summary

| Table | Key Columns |
|---|---|
| `businesses` | `id`, `user_id`, `name`, `wallet_address` |
| `clients` | `id`, `business_id`, `name`, `total_outstanding` |
| `transactions` | `id`, `business_id`, `client_id`, `type` (SALE/PAYMENT), `amount`, `items` (JSONB), `status` |
| `inventory` | `id`, `business_id`, `item_name`, `quantity`, `unit`, `low_stock_threshold` |
| `invoices` | `id`, `business_id`, `client_id`, `amount`, `status`, `nft_token_id`, `nft_tx_hash`, `chain`, `due_date` |
| `chat_messages` | `id`, `business_id`, `role`, `content`, `parsed_action` |

See [`schema.sql`](./schema.sql) for full DDL including indexes, triggers, and RPC functions.

---

## Development Notes

- **Business ID middleware** extracts `business_id` from the `x-business-id` request header (default: `demo-business-001` for demo mode)
- **Zod validation** is applied to all POST/PATCH request bodies — malformed requests return `400` with descriptive messages
- **Hot reload** is handled by `ts-node-dev` — it transpiles TypeScript on save and restarts the server automatically
- The server logs every incoming request with timestamp, method, and path
