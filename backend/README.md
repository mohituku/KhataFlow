# 🚀 KhataFlow Backend - Setup Guide

Complete **Node.js + Express + TypeScript** backend for KhataFlow AI-powered business ledger.

---

## 📋 Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini 2.0 Flash
- **Blockchain:** ethers.js v6 (Flow EVM Testnet)
- **Validation:** Zod

---

## 🎯 Quick Start

### 1️⃣ Install Dependencies

```bash
cd /app/backend
yarn install
```

### 2️⃣ Set Up Environment Variables

Create `.env` file from the example:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials (see setup guide below).

### 3️⃣ Set Up Supabase Database

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Click "New Project"
   - Choose a name and password
   - Wait for project to initialize (~2 minutes)

2. **Run Database Schema:**
   - Go to your Supabase dashboard
   - Navigate to **SQL Editor** (left sidebar)
   - Click "New Query"
   - Copy entire content from `/app/backend/schema.sql`
   - Paste and click **Run**
   - You should see "Success. No rows returned"

3. **Get API Credentials:**
   - Go to **Project Settings** > **API**
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **service_role** key (secret) → `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **IMPORTANT:** Use `service_role` key, NOT `anon` key

### 4️⃣ Get Google Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Select existing project or create new
4. Copy the API key → `GEMINI_API_KEY`

### 5️⃣ Update .env File

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI
GEMINI_API_KEY=AIzaSyA...

# Flow EVM Configuration (default values work)
FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Server Configuration
PORT=8001
NODE_ENV=development
```

### 6️⃣ Start Backend Server

**Development mode (with hot reload):**
```bash
yarn dev
```

**Build for production:**
```bash
yarn build
yarn start
```

---

## 🏗️ Project Structure

```
/app/backend/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── routes/
│   │   ├── chat.ts           # AI chat + business logic
│   │   ├── ledger.ts         # Client management
│   │   ├── inventory.ts      # Stock management
│   │   ├── invoices.ts       # Invoice operations
│   │   └── chain.ts          # Blockchain verification
│   ├── services/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── gemini.ts         # Gemini AI service
│   │   └── blockchain.ts     # Flow EVM service
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
├── schema.sql                # Supabase database schema
├── package.json
├── tsconfig.json
└── .env
```

---

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

### Chat (AI Parsing)
```bash
POST /api/chat
Body: {
  "message": "Ramesh ne 5kg aloo liya 200 baaki hai",
  "conversationHistory": []
}
```

### Ledger
```bash
GET /api/ledger/clients          # Get all clients
GET /api/ledger/summary          # Get business summary
GET /api/ledger/clients/:id      # Get client details
```

### Inventory
```bash
GET /api/inventory               # Get all stock items
POST /api/inventory              # Add/update stock
PATCH /api/inventory/:id         # Update quantity
```

### Invoices
```bash
GET /api/invoices                # Get all invoices
POST /api/invoices               # Create invoice
GET /api/invoices/:id            # Get invoice details
PATCH /api/invoices/:id          # Update invoice
```

### Blockchain
```bash
POST /api/chain/record-mint      # Record NFT mint
GET /api/chain/token/:tokenId    # Get NFT details
GET /api/chain/tx/:txHash        # Get transaction status
```

---

## 🧪 Testing the Backend

### 1. Health Check
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "KhataFlow Backend",
  "chain": "flow-evm-testnet",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Test Chat Endpoint
```bash
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ramesh ne 5kg aloo liya 200 baaki hai"
  }'
```

### 3. Test Ledger
```bash
curl http://localhost:8001/api/ledger/clients
```

### 4. Test Inventory
```bash
curl http://localhost:8001/api/inventory
```

---

## 🎯 Key Features

### ✅ AI-Powered Business Command Parsing
- Parses natural language (Hindi/English mix)
- Intents: `ADD_SALE`, `UPDATE_STOCK`, `QUERY_LEDGER`, `MARK_PAID`
- Automatic transaction recording

### ✅ Complete Business Logic
- **Add Sale:** Upserts client, creates transaction, updates balance
- **Update Stock:** Manages inventory with low-stock tracking
- **Query Ledger:** Fetches client details and transaction history
- **Mark Paid:** Records payments and updates balances

### ✅ Blockchain Integration
- Flow EVM Testnet support
- Transaction verification
- NFT mint recording
- Explorer links

### ✅ Database Management
- PostgreSQL via Supabase
- Automatic timestamps
- RPC functions for balance updates
- Sample data included

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Service role key (secret) | `eyJhbGci...` |
| `GEMINI_API_KEY` | ✅ Yes | Google AI API key | `AIzaSyA...` |
| `FLOW_EVM_RPC` | No | Flow EVM RPC endpoint | `https://testnet.evm...` |
| `NFT_CONTRACT_ADDRESS` | No | NFT contract address | `0x0000...` |
| `PORT` | No | Server port | `8001` |
| `NODE_ENV` | No | Environment | `development` |

---

## 🐛 Troubleshooting

### Issue: "Supabase credentials not found"
**Solution:** Check that `.env` file exists and contains valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Issue: "Gemini API key not found"
**Solution:** Backend will work with mock responses. Add valid `GEMINI_API_KEY` for AI parsing.

### Issue: Database errors
**Solution:** 
1. Verify schema was run in Supabase SQL Editor
2. Check that all tables were created
3. Verify service_role key (not anon key)

### Issue: CORS errors from frontend
**Solution:** Backend already configured for CORS. Ensure frontend uses correct backend URL.

### Issue: TypeScript compilation errors
**Solution:**
```bash
rm -rf node_modules dist
yarn install
yarn build
```

---

## 🔐 Security Notes

### ⚠️ IMPORTANT

1. **Never commit `.env` file** - It contains secrets
2. **Use service_role key** - Required for server-side operations
3. **Validate all inputs** - Zod validation is implemented
4. **Enable RLS in production** - Row Level Security (commented in schema)
5. **Implement authentication** - Currently skipped for development

---

## 🚀 Production Deployment

### Build for Production
```bash
yarn build
```

This creates optimized JavaScript in `/dist` folder.

### Start Production Server
```bash
yarn start
```

### Environment Setup
1. Set `NODE_ENV=production` in `.env`
2. Use production Supabase project
3. Enable Row Level Security
4. Implement proper authentication
5. Set up proper CORS origins

---

## 📝 Database Schema Overview

### Tables
- `businesses` - Business entities
- `clients` - Customer accounts
- `transactions` - Sales and payments
- `inventory` - Stock items
- `invoices` - Generated invoices
- `chat_messages` - Conversation history

### RPC Functions
- `increment_client_balance(client_id, amount)`
- `decrement_client_balance(client_id, amount)`
- `reset_client_balance(client_id)`

---

## 🎨 Integration with Frontend

Frontend expects backend at URL specified in `/app/frontend/.env`:
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

All API calls use `/api` prefix automatically.

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Gemini API Docs:** https://ai.google.dev/docs
- **Flow EVM Docs:** https://developers.flow.com/evm/using
- **ethers.js Docs:** https://docs.ethers.org/v6/

---

## ✅ Checklist

Before testing with frontend:

- [ ] Supabase project created
- [ ] Database schema executed successfully
- [ ] `.env` file created with all credentials
- [ ] `yarn install` completed
- [ ] Backend server starts without errors (`yarn dev`)
- [ ] Health check endpoint returns success
- [ ] Sample data visible in Supabase dashboard

---

## 🆘 Need Help?

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test each endpoint individually with curl
4. Check Supabase dashboard for database issues
5. Ensure all dependencies are installed

---

**Built with 💪 for KhataFlow**

**Happy Coding! 🚀**
