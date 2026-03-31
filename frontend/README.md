# KhataFlow Frontend

> React 18 SPA — Conversational UI for AI-powered business ledger management, with Web3 wallet integration for Flow EVM.

---

## Overview

The KhataFlow frontend is a single-page React application giving shop owners a clean, intuitive interface to:

- Chat with their business in natural language
- Monitor their ledger and client balances
- Manage inventory
- Create and mint invoices as NFTs on Flow EVM

It is built with **React 18**, **React Router v7**, **Radix UI + shadcn/ui components**, and **TailwindCSS**. State management uses **Zustand** for global store and **TanStack React Query** for server data fetching/caching.

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| React | ^18.3.1 | Core UI framework |
| React Router DOM | ^7.5.1 | Client-side routing |
| TailwindCSS | ^3.4 | Utility-first CSS |
| Radix UI | Latest | Accessible UI primitives |
| shadcn/ui | — | Pre-built component library on top of Radix |
| Zustand | ^5.0 | Lightweight global state |
| TanStack React Query | ^5.95 | Server state, caching, background refetch |
| ethers.js | 6 | MetaMask + Flow EVM contract interaction |
| Recharts | ^3.6 | Financial charts and visualizations |
| Axios | ^1.8 | HTTP client for backend API calls |
| React Hook Form + Zod | Latest | Form handling + validation |
| Lucide React | ^0.507 | Icon library |
| Sonner | ^2.0 | Toast notifications |
| CRACO | ^7.1 | Create React App config override (Webpack) |

---

## Project Structure

```
frontend/
├── src/
│   ├── App.js                # Root component with router setup
│   ├── index.js              # ReactDOM.render entrypoint
│   ├── index.css             # Global styles + Tailwind base
│   │
│   ├── pages/                # Top-level route pages
│   │   ├── ChatPage.jsx      # AI chat interface
│   │   ├── LedgerPage.jsx    # Client ledger & balances
│   │   ├── InventoryPage.jsx # Stock management
│   │   ├── InvoicesPage.jsx  # Invoice list & NFT minting
│   │   └── ChainPage.jsx     # Blockchain status & NFT lookup
│   │
│   ├── components/           # Reusable UI components (60+)
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── chat/             # Chat bubble, input, message components
│   │   ├── ledger/           # Client cards, balance displays
│   │   ├── inventory/        # Stock item rows, low-stock badges
│   │   └── invoices/         # Invoice cards, mint button, NFT status
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useChat.js        # Chat message state + AI API calls
│   │   ├── useLedger.js      # Ledger data + React Query
│   │   └── useBlockchain.js  # MetaMask, wallet, contract calls
│   │
│   ├── lib/                  # Utilities and helpers
│   │   ├── api.js            # Axios instance + backend API wrappers
│   │   ├── contracts.js      # ethers.js contract instances
│   │   └── utils.js          # cn(), formatINR(), date helpers
│   │
│   └── store/                # Zustand global state
│       ├── chatStore.js      # Conversation history
│       └── appStore.js       # Business ID, wallet state
│
├── public/
├── .env.example              # Required environment variables
├── package.json
├── tailwind.config.js        # Tailwind + shadcn theme tokens
├── craco.config.js           # Webpack path aliases, polyfills
└── components.json           # shadcn/ui configuration
```

---

## Pages

### 💬 Chat Page (`/chat`)

The primary interface for the app. A full-screen conversational UI where shopkeepers type or paste business commands in any language.

- Sends `POST /api/chat` with the message
- Renders Gemini's parsed response with highlighted intent and values
- Shows inline confirmation of what was recorded (client name, amount, items)
- Supports continuous multi-turn conversation (conversation history sent to Gemini)

### 📒 Ledger Page (`/ledger`)

Displays the complete list of clients with their outstanding balances.

- Loads from `GET /api/ledger/clients`
- Shows a summary header via `GET /api/ledger/summary` (total outstanding, revenue, active NFTs)
- Recent activity feed from `GET /api/ledger/activity`
- Click on any client to see their full transaction history

### 📦 Inventory Page (`/inventory`)

Stock management dashboard.

- Loads all inventory items from `GET /api/inventory`
- Items below their `low_stock_threshold` are flagged with a red badge
- Inline editing to update quantities
- Add new items via a form

### 🧾 Invoices Page (`/invoices`)

Manage invoices and mint them as blockchain NFTs.

- List all invoices with status (`PENDING` | `MINTED`)
- The **"Mint as NFT"** button triggers MetaMask → calls `mintDebt()` on `KhataFlowNFT` contract
- After successful mint, calls `POST /api/chain/record-mint` to record the tx hash
- Minted invoices show a direct link to the FlowScan explorer
- Filter invoices by status

### ⛓️ Chain Page (`/chain`)

Blockchain connectivity and NFT lookup.

- Shows wallet connection status and current network
- Look up any NFT token by ID to see the on-chain `DebtRecord`
- Verify transaction hashes
- Links to FlowScan for full on-chain transparency

---

## Setup & Running

### 1. Install dependencies

```bash
cd frontend
yarn install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Value | Description |
|---|---|---|
| `REACT_APP_BACKEND_URL` | `http://localhost:8001` | Backend API base URL |
| `REACT_APP_NFT_CONTRACT_ADDRESS` | `0xAbd8d654ADf037cB832e8A5f38A399126E6f83dD` | Deployed NFT contract |
| `REACT_APP_PAYMENTS_CONTRACT_ADDRESS` | `0xA84C52aCFdC6B4fE4363E69fD6a2e29792c271B7` | Deployed payments contract |
| `REACT_APP_FLOW_CHAIN_ID` | `545` | Flow EVM Testnet chain ID |
| `WDS_SOCKET_PORT` | `3000` | WebSocket port for hot-reload |

### 3. Start development server

```bash
yarn start
```

Opens at `http://localhost:3000`

### 4. Build for production

```bash
yarn build
```

Outputs to `build/` — ready to serve with any static host (Vercel, Netlify, etc.)

---

## MetaMask / Wallet Setup

To use the NFT and blockchain features:

1. Install [MetaMask](https://metamask.io/) browser extension
2. Add **Flow EVM Testnet** as a custom network:
   - **Network Name:** Flow EVM Testnet
   - **RPC URL:** `https://testnet.evm.nodes.onflow.org`
   - **Chain ID:** `545`
   - **Currency Symbol:** `FLOW`
   - **Explorer URL:** `https://evm-testnet.flowscan.io`
3. Get testnet FLOW from the [Flow Faucet](https://faucet.flow.com/)
4. Connect your wallet from the Chain page or the Invoices page

---

## Key Patterns

### Server Data Fetching

All API calls go through TanStack React Query for automatic caching, background refetch, and loading states:

```js
const { data, isLoading } = useQuery({
  queryKey: ['ledger', 'clients', businessId],
  queryFn: () => api.get('/ledger/clients')
});
```

### Global State (Zustand)

The `appStore` holds wallet connection state and the active `businessId`. The `chatStore` holds the conversation history thread in memory.

### Contract Calls (ethers.js)

The `useBlockchain` hook abstracts wallet connection and contract initialization. Example NFT mint flow:

```js
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const nftContract = new ethers.Contract(NFT_ADDRESS, nftAbi, signer);
const tx = await nftContract.mintDebt(to, businessId, clientName, amountInPaise, dueDate, invoiceRef);
await tx.wait();
```

### Path Aliases

CRACO is configured with `@` aliased to `src/`, so imports look like:

```js
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
```

---

## Design System

- **Base:** TailwindCSS with a custom theme configured in `tailwind.config.js`
- **Components:** shadcn/ui (Radix UI primitives + Tailwind variants)
- **Dark mode:** Supported via `next-themes`
- **Icons:** Lucide React
- **Toasts:** Sonner (positioned bottom-right)
- **Charts:** Recharts (for ledger summaries and financial visualizations)

---

## Development Notes

- `craco.config.js` adds Webpack polyfills (`buffer`, `crypto`, `stream`) required by `ethers.js` in the browser
- `ENABLE_HEALTH_CHECK=false` skips backend connectivity checks in local dev
- The app works without MetaMask — blockchain features are gated and show a "Connect Wallet" prompt when needed
- `business_id` is sent as an `x-business-id` header with every API request — defaults to `demo-business-001` in demo mode
