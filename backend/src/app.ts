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
import {
  adminBot,
  clientBot,
  adminWebhookHandler,
  clientWebhookHandler,
  ensureTelegramTransportReady,
  getTelegramTransportStatus
} from './services/telegram';
import { setTelegramBots } from './services/notifications';

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

const app: Application = express();

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'KhataFlow Backend',
    health: '/health',
    api: '/api'
  });
});

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// Telegram webhooks must stay public and bypass wallet auth.
app.post('/api/telegram/admin/webhook', adminWebhookHandler);
app.post('/api/telegram/client/webhook', clientWebhookHandler);

app.use(walletAuthMiddleware);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'KhataFlow Backend',
    chain: 'flow-evm-testnet',
    timestamp: new Date().toISOString(),
    ai: geminiService.getStatus(),
    telegram: getTelegramTransportStatus()
  });
});

app.get('/health/ai', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'KhataFlow Backend',
    ai: geminiService.getStatus(),
    telegram: getTelegramTransportStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/telegram/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    telegram: getTelegramTransportStatus()
  });
});

app.post('/api/telegram/register-webhooks', async (req: Request, res: Response) => {
  try {
    await ensureTelegramTransportReady({ force: true });
    res.json({
      success: true,
      telegram: getTelegramTransportStatus()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register Telegram webhooks',
      telegram: getTelegramTransportStatus()
    });
  }
});

app.use('/api/chat', chatRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/chain', chainRouter);
app.use('/api/client', clientRouter);
app.use('/api/qr', qrRouter);
app.use('/api/payment', paymentRouter);

app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'KhataFlow API',
    version: '1.0.0',
    endpoints: [
      'POST /api/chat',
      'GET /api/ledger/clients',
      'GET /api/ledger/summary',
      'GET /api/ledger/activity',
      'GET /api/ledger/notifications',
      'POST /api/ledger/notifications/mark-all-read',
      'GET /api/inventory',
      'POST /api/inventory',
      'GET /api/invoices',
      'POST /api/invoices',
      'POST /api/chain/record-mint',
      'GET /api/chain/token/:tokenId',
      'GET /api/client/:businessId/:clientId',
      'POST /api/client/:businessId/:clientId/confirm-payment',
      'POST /api/telegram/admin/webhook',
      'POST /api/telegram/client/webhook',
      'GET /health',
      'GET /health/ai'
    ]
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

setTelegramBots(adminBot, clientBot);

export default app;
