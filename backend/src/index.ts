import { geminiService } from './services/gemini';
import { ensureTelegramTransportReady, getTelegramTransportStatus } from './services/telegram';
import app from './app';

const PORT = process.env.PORT || 8001;

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
  const telegramStatus = getTelegramTransportStatus();
  console.log(`   - Telegram: ${telegramStatus.configured ? `✅ ${telegramStatus.mode}` : '⚠️  not configured'}`);
  
  console.log('\n');

  void ensureTelegramTransportReady().catch(() => {
    // Transport errors are already logged in the telegram service.
  });
});

export default app;
