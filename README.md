<div align="center">

# 🧾 KhataFlow

### AI-Powered Business Ledger on Flow EVM — Built for India's Kirana Economy

![KhataFlow Banner](./docs/images/banner.png)

[![Flow EVM](https://img.shields.io/badge/Flow%20EVM-Testnet-00EF8B?style=for-the-badge&logo=flow&logoColor=white)](https://developers.flow.com/evm/about)
[![Gemini AI](https://img.shields.io/badge/Gemini%202.5-Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

> **Talk to your business in Hindi, English, or Hinglish. KhataFlow records it, tracks it — and puts it on the blockchain.**

</div>

---

## 📖 What is KhataFlow?

India has over **60 million kirana stores** — small neighborhood shops that run entirely on trust and handwritten ledgers called *"khata"*. These shopkeepers extend credit to their regular customers ("*udhaar*"), track who owes what, and manage inventory — all with a pen and paper (or at best, a simple app).

**KhataFlow changes that.**

It's a full-stack business management platform that combines:

- 🤖 **Conversational AI** (Google Gemini) — shopkeepers just *speak* or *type* in their natural language (Hindi / Hinglish / English)
- 🏦 **Real-time Ledger** — powered by Supabase (PostgreSQL) for instant data persistence
- 🔗 **Blockchain-Verified Invoices** — debts minted as NFTs on **Flow EVM Testnet** — transparent, immutable, and transferable
- 💸 **Installment Payment Schedules** — smart contracts automate payment milestones on-chain

KhataFlow bridges the gap between traditional Indian SMB accounting and the decentralized web3 economy.

---

## ✅ Current Implementation Snapshot

Today, the repository already includes:

- 🔐 **Wallet-gated business workspaces** — every MetaMask wallet on Flow EVM maps to one business account
- 🤖 **Gemini-powered multi-action chat** — one message can create sales, mark payments, update stock, query ledgers, or generate invoices
- 🧠 **Follow-up memory** — chat sessions keep track of the last client / invoice so prompts like *"isko invoice bana do"* still work
- 👥 **Dedicated operations pages** — Chat, Clients, Ledger, Inventory, Invoices, Chain, Client Portal, and Payment flows are all implemented
- 🔗 **Signed client access links** — clients can open a secure portal, review purchases, and notify the shopkeeper about payments
- 💳 **On-chain payment flow** — clients can pay outstanding balances in **USDC or FLOW** through the x402-style payment flow
- 🤖 **Telegram bots for admins and clients** — admin commands, client balance checks, QR onboarding, and Telegram order placement are wired in
- 🧾 **NFT debt records + installment contracts** — invoices can be synced with Flow EVM debt NFTs and payment schedules

---

## ✨ Key Features

### 🔐 Wallet-Based Business Identity
- Dashboard access is gated by **MetaMask** on **Flow EVM Testnet**
- The backend resolves business context from the `x-wallet-address` header
- First-time wallets are automatically provisioned as new business accounts

### 🗣️ Multi-Action Natural Language Assistant
Type in Hindi, English, or Hinglish. The Gemini layer supports conversational follow-ups and can execute multiple actions from one prompt.

| User says | System does |
|---|---|
| `"Ramesh ne 5kg aloo liya, 200 baaki hai"` | Creates a sale, updates Ramesh's outstanding balance, and stores the transaction |
| `"Priya ne 500 de diye"` | Records a payment and reduces Priya's due amount |
| `"Chawal ka stock 100kg add karo"` | Upserts inventory with quantity, unit, and thresholds |
| `"Suresh ka khata dikhao"` | Returns ledger details and recent transactions |
| `"Isko invoice bana do"` | Uses chat memory to generate an invoice for the last referenced client |

### 📊 Dashboard, Clients, and Notifications
- Chat page combines the **AI assistant**, **stat cards**, **activity feed**, **pending invoices**, **Telegram admin linking**, and **notification inbox**
- Clients page lets you search accounts, inspect IDs, and review transaction history
- Notifications cover payments, low stock, Telegram joins, NFT events, and order activity

### 📦 Inventory + Telegram Ordering
- Inventory tracks **quantity**, **unit**, **price per unit**, and **low-stock threshold**
- Clients can use the Telegram bot to browse items with `/orders`
- Telegram orders create tracked `orders` rows and can immediately translate into ledger sales

### 🔗 Client Portal, QR Sharing, and Payment Confirmations
- Shopkeepers can generate **signed share links** and **QR codes** for client access
- The client portal shows purchases, payments, invoices, balances, and linked NFT details
- Clients can notify the shopkeeper of an offline payment from the portal
- Client QR codes can also link customers directly to the Telegram client bot

### 💳 x402-Style On-Chain Payments
- Public payment page at `/pay/:clientId` supports wallet checkout
- Clients can pay in **USDC** or **native FLOW** on Flow EVM Testnet
- Confirmed transactions are stored in `on_chain_payments` and reflected back in the client portal

### 🧾 NFT Invoices and Installment Schedules
- Invoices can be linked to **ERC-721 debt NFTs** on Flow EVM
- Backend verifies mint transactions before marking invoices as `MINTED`
- `KhataFlowPayments` stores installment schedules for larger balances

---

## 🏗️ Architecture Overview

![KhataFlow Architecture](./docs/images/architecture.png)

> **React Frontend** → **Express API + Gemini AI** → **Supabase (PostgreSQL)** + **Flow EVM Blockchain** + **Telegram Bots**

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + React Router v7 + CRACO | Wallet-gated SPA and public client flows |
| **UI** | TailwindCSS + Radix UI + shadcn/ui | Accessible, consistent component system |
| **State** | Zustand + TanStack React Query | Wallet state, app state, and server caching |
| **Backend** | Express.js + TypeScript | REST API and business orchestration |
| **AI/NLP** | Google Gemini 2.5 Flash | Multi-action natural language command parsing |
| **Database** | Supabase (PostgreSQL) | Ledger, inventory, invoices, notifications, and orders |
| **Messaging** | Telegraf + QRCode | Telegram admin/client bots and QR onboarding |
| **Identity** | MetaMask + signed client access links | Business auth and secure client portal access |
| **Blockchain** | ethers.js v6 + Flow EVM | NFT reads/writes and transaction verification |
| **Smart Contracts** | Solidity ^0.8.20 + Hardhat | Debt NFT + installment scheduler |
| **Payments** | x402-style checkout | USDC / FLOW settlement for client balances |
| **Charts** | Recharts | Dashboard metrics and visualizations |

---

## 📁 Project Structure

```
KhataFlow/
├── backend/                         # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts                # Server bootstrap and route registration
│   │   ├── middleware/
│   │   │   ├── walletAuth.ts       # Wallet → business resolution
│   │   │   └── businessId.ts
│   │   ├── routes/
│   │   │   ├── chat.ts             # AI command entrypoint
│   │   │   ├── ledger.ts           # Clients, summaries, activity, notifications
│   │   │   ├── inventory.ts        # Inventory CRUD
│   │   │   ├── invoices.ts         # Invoice CRUD
│   │   │   ├── chain.ts            # Mint verification + NFT lookup + settle
│   │   │   ├── client.ts           # Signed client portal + payment confirmations
│   │   │   ├── payment.ts          # x402 payment initiation / confirmation
│   │   │   └── qr.ts               # Telegram / share QR generation
│   │   ├── services/
│   │   │   ├── gemini.ts           # Gemini provider integration
│   │   │   ├── commandExecution.ts # Action execution layer
│   │   │   ├── chatSessionMemory.ts
│   │   │   ├── blockchain.ts
│   │   │   ├── notifications.ts
│   │   │   ├── telegram.ts
│   │   │   ├── signedLinks.ts
│   │   │   └── supabase.ts
│   │   ├── contracts/              # Contract ABIs used by the API
│   │   └── types/
│   ├── schema.sql                  # Supabase schema, RPCs, seed data
│   └── package.json
│
├── frontend/                        # React application
│   ├── src/
│   │   ├── App.js                  # Router setup
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── ClientsPage.jsx
│   │   │   ├── LedgerPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── InvoicesPage.jsx
│   │   │   ├── ChainPage.jsx
│   │   │   ├── ClientPortalPage.jsx
│   │   │   └── PaymentPage.jsx
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── dashboard/
│   │   │   ├── ledger/
│   │   │   ├── chain/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── store/
│   └── package.json
│
├── contracts/                       # Hardhat workspace
│   ├── contracts/
│   │   ├── KhataFlowNFT.sol
│   │   └── KhataFlowPayments.sol
│   ├── scripts/                    # Deployment scripts
│   ├── test/                       # Contract tests
│   ├── deployed-addresses.json     # Latest Flow Testnet deployment
│   └── hardhat.config.ts
│
├── docs/images/
└── README.md
```


## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **Yarn** v1.22+
- **MetaMask** configured for **Flow EVM Testnet**
- A **Supabase** project
- A **Google Gemini API key**
- Optional: **Telegram bot tokens** for admin/client bot flows

### 1. Clone the repository

```bash
git clone https://github.com/mohituku/KhataFlow.git
cd KhataFlow
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor**
3. Run `backend/schema.sql`

This creates the core ledger tables plus `orders`, `notifications`, `payment_confirmations`, `on_chain_payments`, and Telegram session tables.

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Recommended starting values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
FALLBACK_GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NFT_CONTRACT_ADDRESS=0xAbd8d654ADf037cB832e8A5f38A399126E6f83dD
PAYMENTS_CONTRACT_ADDRESS=0xA84C52aCFdC6B4fE4363E69fD6a2e29792c271B7
USDC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
INR_PER_USD=83
FLOW_USD_PRICE=3.5
PORT=8001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
BACKEND_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
CLIENT_PORTAL_SIGNING_SECRET=replace_with_a_long_random_secret
TELEGRAM_ADMIN_BOT_TOKEN=
TELEGRAM_CLIENT_BOT_TOKEN=
TELEGRAM_ADMIN_BOT_USERNAME=KhataFlowAdminBot
TELEGRAM_CLIENT_BOT_USERNAME=KhataFlowClientBot
```

Then run:

```bash
yarn install
yarn dev
```

Backend starts at `http://localhost:8001`.

### 4. Configure the frontend

```bash
cd ../frontend
cp .env.example .env
```

```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_NFT_CONTRACT_ADDRESS=0xAbd8d654ADf037cB832e8A5f38A399126E6f83dD
REACT_APP_PAYMENTS_CONTRACT_ADDRESS=0xA84C52aCFdC6B4fE4363E69fD6a2e29792c271B7
REACT_APP_USDC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
REACT_APP_FLOW_CHAIN_ID=545
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

Then run:

```bash
yarn install
yarn start
```

Frontend opens at `http://localhost:3000`.

### 5. Optional: deploy / verify contracts locally

```bash
cd ../contracts
cp .env.example .env
# add DEPLOYER_PRIVATE_KEY
yarn install
yarn compile
yarn test
```

### Wallet / access model

- **Dashboard routes** require a connected wallet; the frontend sends the wallet address to the backend automatically
- **Client portal and payment routes** are public, but protected with **signed access tokens**
- The current deployment metadata lives in `contracts/deployed-addresses.json`


## 🔌 API Reference

All private dashboard endpoints are prefixed with `/api` and expect the business wallet context. Public client endpoints rely on a signed client access token.

### Health

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Backend status, AI provider status, and network info |
| `GET` | `/health/ai` | AI-specific health snapshot |

### 💬 Chat

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "message": "Ramesh ne aloo 5kg liya 200 baaki",
  "sessionId": null,
  "conversationHistory": []
}
```

**Supported intents:** `ADD_SALE` · `MARK_PAID` · `UPDATE_STOCK` · `QUERY_LEDGER` · `QUERY_STOCK` · `GENERATE_REPORT` · `GENERATE_INVOICE` · `UNKNOWN`

### 📒 Ledger

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/ledger/clients` | All clients with balances |
| `GET` | `/api/ledger/clients/:clientId` | Single client with transaction history |
| `GET` | `/api/ledger/summary` | Dashboard totals |
| `GET` | `/api/ledger/activity` | Unified activity feed |
| `GET` | `/api/ledger/notifications` | Admin notification inbox |
| `POST` | `/api/ledger/notifications/mark-all-read` | Mark all notifications as read |

### 📦 Inventory

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/inventory` | Inventory list with `lowStock` flag |
| `POST` | `/api/inventory` | Add or upsert an item |
| `PATCH` | `/api/inventory/:itemId` | Update quantity |
| `DELETE` | `/api/inventory/:itemId` | Remove an item |

### 🧾 Invoices

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/invoices` | All invoices (`status` / `search` filters supported) |
| `POST` | `/api/invoices` | Create invoice |
| `GET` | `/api/invoices/:invoiceId` | Invoice details |
| `PATCH` | `/api/invoices/:invoiceId` | Update status, NFT fields, due date, chain |

### ⛓️ Blockchain

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chain/record-mint` | Verify mint tx and record NFT metadata |
| `POST` | `/api/chain/settle` | Mark an NFT-backed invoice as settled |
| `GET` | `/api/chain/token/:tokenId` | Get NFT and on-chain debt details |
| `GET` | `/api/chain/tx/:txHash` | Inspect transaction status |

### 👤 Client Portal

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/client/share-link/:clientId` | Generate signed portal URLs and QR data |
| `GET` | `/api/client/lookup/:clientId` | Resolve client portal payload using signed token |
| `GET` | `/api/client/:businessId/:clientId` | Fetch signed portal payload directly |
| `POST` | `/api/client/:businessId/:clientId/confirm-payment` | Client-submitted payment confirmation |

### 🔳 QR / Telegram

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/qr/client/:clientId` | QR code for Telegram client bot onboarding |
| `GET` | `/api/qr/admin/link` | QR code / deeplink to connect admin bot |

### 💳 Payments

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/payment/x402/initiate/:clientId` | Return x402 payment requirements (402) |
| `POST` | `/api/payment/x402/confirm/:clientId` | Confirm an on-chain payment |
| `GET` | `/api/payment/link/:clientId` | Generate payment / portal access links |
| `GET` | `/api/payment/on-chain/:clientId` | Fetch confirmed on-chain payment history |


## ⛓️ Smart Contracts

Deployed on **Flow EVM Testnet** (Chain ID: `545`).

| Contract | Address | Explorer |
|---|---|---|
| `KhataFlowNFT` | `0xAbd8d654ADf037cB832e8A5f38A399126E6f83dD` | [View on FlowScan](https://evm-testnet.flowscan.io/address/0xAbd8d654ADf037cB832e8A5f38A399126E6f83dD) |
| `KhataFlowPayments` | `0xA84C52aCFdC6B4fE4363E69fD6a2e29792c271B7` | [View on FlowScan](https://evm-testnet.flowscan.io/address/0xA84C52aCFdC6B4fE4363E69fD6a2e29792c271B7) |

### KhataFlowNFT (ERC-721)

Each minted NFT encodes a debt record permanently on-chain:

```solidity
struct DebtRecord {
    string businessId;
    string clientName;
    uint256 amountInPaise;
    uint256 dueDateUnix;
    string invoiceRef;
    bool settled;
    uint256 mintedAt;
}
```

**Key methods:**

| Function | Description |
|---|---|
| `mintDebt(to, businessId, clientName, amount, dueDate, invoiceRef)` | Mint a new debt NFT |
| `settleDebt(tokenId)` | Mark a debt as settled |
| `getDebtRecord(tokenId)` | Read the full debt record |
| `isOverdue(tokenId)` | Check whether a debt has passed its due date |
| `getBusinessTokens(businessId)` | List token IDs for a business |

### KhataFlowPayments

Manages on-chain installment plans linked to debt NFTs:

```solidity
struct PaymentSchedule {
    uint256 debtTokenId;
    uint256 totalAmountPaise;
    uint256 installmentPaise;
    uint256 frequencySeconds;
    uint256 nextDueUnix;
    uint256 paidInstallments;
    uint256 totalInstallments;
    bool active;
    address businessWallet;
}
```


## 🗄️ Database Schema

KhataFlow uses **Supabase (PostgreSQL)** with the following core tables:

```
businesses             → Wallet-linked merchant profiles
clients                → Customer records per business
transactions           → SALE and PAYMENT ledger entries
inventory              → Stock items with thresholds and pricing
invoices               → Invoice state, NFT linkage, and due dates
chat_messages          → Optional chat history storage
payment_confirmations  → Client-submitted payment notices
orders                 → Telegram / assisted order tracking
on_chain_payments      → Confirmed x402 payment records
notifications          → Admin/client notifications
telegram_sessions      → Multi-step Telegram order state
```

**Custom RPC functions:**
- `increment_client_balance(p_client_id, p_amount)` — atomically add outstanding balance
- `decrement_client_balance(p_client_id, p_amount)` — safely reduce balance
- `reset_client_balance(p_client_id)` — clear dues when needed
- `increment_stock(p_item_id, p_amount)` — stock increment helper


## 🌍 Real-World Usage Scenarios

### Scenario 1: The Daily Kirana Run
*Ramesh owns a grocery store. At the end of the day, he types:*

> **"Sunita ne 3kg chawal, 2kg dal liya. Total 350 baaki hai"**

KhataFlow:
1. Gemini identifies intent: `ADD_SALE`, client: "Sunita", items parsed, amount ₹350
2. Supabase upserts the client, inserts a `SALE` transaction, increments outstanding
3. Dashboard updates instantly — Sunita now shows ₹350 in her ledger

---

### Scenario 2: Payment Day
*Sunita comes in and pays ₹200 cash:*

> **"Sunita ne 200 de diye"**

KhataFlow:
1. Intent: `MARK_PAID`, payment: ₹200
2. Inserts a `PAYMENT` transaction, decrements Sunita's balance to ₹150
3. Activity feed shows: *"Sunita paid ₹200"*

---

### Scenario 3: NFT-Backed Large Invoice
*A wholesale supplier sells ₹10,000 worth of goods to a merchant:*

1. Invoice created with due date 30 days out
2. Business owner clicks **"Mint as NFT"** from the invoices page
3. MetaMask prompts to call `mintDebt()` on `KhataFlowNFT`
4. NFT minted on Flow EVM — immutable proof of the debt
5. `record-mint` API verifies the transaction hash on-chain
6. Invoice status updates to `MINTED` with NFT token ID and tx hash

---

### Scenario 4: Installment Plan
*Merchant wants to repay in 5 monthly installments:*

1. Business calls `createSchedule()` on `KhataFlowPayments`
2. `installmentPaise = totalAmountPaise / 5`
3. `nextDueUnix` advances by `frequencySeconds` (e.g., 30 days) on each `recordInstallment()`
4. Smart contract emits `ScheduleCompleted` after the 5th installment

---

## 🔮 Future Scope

### Near-Term
- [ ] **Voice Input** — integrate Web Speech API for true voice-to-ledger recording
- [ ] **OTP Verification Layer** — add phone / WhatsApp / email OTP checks for client portal access, payment confirmations, and sensitive approval actions
- [ ] **Authentication** — Supabase Auth + Row Level Security for multi-user stores
- [ ] **WhatsApp Bot** — Twilio / WhatsApp Business API for message-based commands
- [ ] **Multi-currency** — support USD, USDC stablecoin payments alongside INR

### Medium-Term
- [ ] **Delivery Management** — add order dispatch, delivery statuses, rider assignment, ETA tracking, and order handoff states
- [ ] **Delivery Verification** — confirm doorstep handoff with OTP / PIN / QR verification and proof-of-delivery capture
- [ ] **SMS Reminders** — auto-send payment reminders to clients via Twilio SMS
- [ ] **Credit Score** — on-chain payment history → generate a trust/credit score per client
- [ ] **PDF Invoices** — auto-generate printable invoice PDFs from minted NFTs
- [ ] **UPI Integration** — QR code generation and UPI deep links for payment collection

### Long-Term
- [ ] **DeFi Collateral** — use debt NFTs as collateral in lending protocols
- [ ] **ONDC Integration** — connect to India's Open Network for Digital Commerce
- [ ] **Supply Chain** — extend to multi-hop supply chain tracking with provenance NFTs
- [ ] **Mobile App** — React Native PWA for Android-first market
- [ ] **AI Analytics** — Gemini-powered business insights and seasonal demand forecasting


## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please open an issue or discussion before large changes so scope stays aligned with the product roadmap.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Flow Blockchain** — for the developer-friendly EVM-compatible testnet
- **Google Gemini** — for powering multilingual NLP at the edge
- **Supabase** — for making PostgreSQL accessible and real-time
- **OpenZeppelin** — for battle-tested ERC-721 smart contract standards
- **Radix UI & shadcn/ui** — for the accessible, beautiful component system

---

<div align="center">

**Built with ❤️ for India's small business owners**

*KhataFlow — Jab business bolta hai, blockchain sunata hai.*<br>
*(When business speaks, blockchain listens.)*

</div>
