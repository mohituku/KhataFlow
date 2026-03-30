import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import chatRouter from './routes/chat';
import ledgerRouter from './routes/ledger';
import inventoryRouter from './routes/inventory';
import invoicesRouter from './routes/invoices';
import chainRouter from './routes/chain';
import clientRouter from './routes/client';
import qrRouter from './routes/qr';
import paymentRouter from './routes/payment';
import { walletAuthMiddleware } from './middleware/walletAuth';
import { geminiService } from './services/gemini';
import { launchTelegramBots } from './services/telegram';
import { adminBot, clientBot } from './services/telegram';
import { setTelegramBots } from './services/notifications';

const app: Application = express();
const PORT = process.env.PORT || 8001;
const NODE_ENV = process.env.NODE_ENV || 'development';

function getCorsOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0 && !configuredOrigins.includes('*')) {
    return configuredOrigins;
  }

  if (NODE_ENV !== 'production') {
    return ['http://localhost:3000'];
  }

  throw new Error('CORS_ORIGINS must be configured in production and cannot be "*"');
}

// Middleware
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(walletAuthMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'KhataFlow Backend',
    chain: 'flow-evm-testnet',
    timestamp: new Date().toISOString(),
    ai: geminiService.getStatus()
  });
});

app.get('/health/ai', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'KhataFlow Backend',
    ai: geminiService.getStatus(),
    timestamp: new Date().toISOString()
  });
});

// API Routes (with /api prefix to match frontend expectations)
app.use('/api/chat', chatRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/chain', chainRouter);
app.use('/api/client', clientRouter);
app.use('/api/qr', qrRouter);
app.use('/api/payment', paymentRouter);

// Root route
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'KhataFlow API',
    version: '1.0.0',
    endpoints: [
      'POST /api/chat',
      'GET /api/ledger/clients',
      'GET /api/ledger/summary',
      'GET /api/ledger/activity',
      'GET /api/inventory',
      'POST /api/inventory',
      'GET /api/invoices',
      'POST /api/invoices',
      'POST /api/chain/record-mint',
      'GET /api/chain/token/:tokenId',
      'GET /api/client/:businessId/:clientId',
      'POST /api/client/:businessId/:clientId/confirm-payment',
      'GET /health',
      'GET /health/ai'
    ]
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 KhataFlow Backend Server Started!');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API base: http://localhost:${PORT}/api`);
  console.log(`\n⚡ Environment:`);
  console.log(`   - Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  const aiStatus = geminiService.getStatus();
  console.log(`   - Gemini AI: ${aiStatus.configured ? `✅ ${aiStatus.activeProvider || 'configured'} (${aiStatus.checkpoint})` : `❌ Not configured (${aiStatus.checkpoint})`}`);
  console.log(`   - Flow EVM: ${process.env.FLOW_EVM_RPC || 'https://testnet.evm.nodes.onflow.org'}`);
  
  // Initialize Telegram bots
  if (process.env.TELEGRAM_ADMIN_BOT_TOKEN && process.env.TELEGRAM_CLIENT_BOT_TOKEN) {
    setTelegramBots(adminBot, clientBot);
    launchTelegramBots();
  } else {
    console.log(`   - Telegram: ⚠️  Bot tokens not configured`);
  }
  
  console.log('\n');
});

export default app;
