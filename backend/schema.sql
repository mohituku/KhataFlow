-- KhataFlow Database Schema for Supabase (PostgreSQL)
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  total_outstanding NUMERIC DEFAULT 0,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SALE', 'PAYMENT')),
  amount NUMERIC NOT NULL,
  items JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  nft_token_id TEXT,
  chain_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  low_stock_threshold NUMERIC DEFAULT 10,
  price_per_unit NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, item_name)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MINTED')),
  items JSONB,
  nft_token_id TEXT,
  nft_tx_hash TEXT,
  chain TEXT DEFAULT 'flow-evm-testnet',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table (optional - for storing conversation history)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  parsed_action JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_business_id ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_business_id ON chat_messages(business_id);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Increment client outstanding balance
CREATE OR REPLACE FUNCTION increment_client_balance(
  p_client_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clients
  SET total_outstanding = total_outstanding + p_amount,
      updated_at = NOW()
  WHERE id = p_client_id;
END;
$$;

-- Decrement client outstanding balance
CREATE OR REPLACE FUNCTION decrement_client_balance(
  p_client_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clients
  SET total_outstanding = GREATEST(total_outstanding - p_amount, 0),
      updated_at = NOW()
  WHERE id = p_client_id;
END;
$$;

-- Reset client balance (mark all as paid)
CREATE OR REPLACE FUNCTION reset_client_balance(
  p_client_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clients
  SET total_outstanding = 0,
      updated_at = NOW()
  WHERE id = p_client_id;
  
  UPDATE transactions
  SET status = 'PAID',
      updated_at = NOW()
  WHERE client_id = p_client_id AND status = 'PENDING';
END;
$$;

-- ============================================
-- TRIGGERS (Auto-update updated_at)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample business
INSERT INTO businesses (id, name, wallet_address)
VALUES (uuid_generate_v4(), 'Demo Kirana Store', '0x0000000000000000000000000000000000000000')
ON CONFLICT DO NOTHING;

-- Insert sample clients
INSERT INTO clients (business_id, name, total_outstanding) VALUES
  ('demo-business-001', 'Ramesh Kumar', 4500),
  ('demo-business-001', 'Priya Sharma', 2300),
  ('demo-business-001', 'Suresh Patel', 6700),
  ('demo-business-001', 'Meena Devi', 1200)
ON CONFLICT (business_id, name) DO NOTHING;

-- Insert sample inventory
INSERT INTO inventory (business_id, item_name, quantity, unit, low_stock_threshold) VALUES
  ('demo-business-001', 'Rice', 150, 'kg', 20),
  ('demo-business-001', 'Wheat Flour', 85, 'kg', 15),
  ('demo-business-001', 'Dal (Toor)', 15, 'kg', 10),
  ('demo-business-001', 'Oil', 45, 'L', 10),
  ('demo-business-001', 'Sugar', 8, 'kg', 10),
  ('demo-business-001', 'Salt', 35, 'kg', 10),
  ('demo-business-001', 'Tea', 25, 'kg', 5),
  ('demo-business-001', 'Milk Powder', 12, 'kg', 8)
ON CONFLICT (business_id, item_name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================

-- Enable RLS on tables
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies (uncomment when implementing auth)
-- CREATE POLICY "Users can view their own businesses" ON businesses
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can view their business clients" ON clients
--   FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- ============================================
-- NOTES
-- ============================================

/*
SETUP INSTRUCTIONS:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste this entire schema
5. Click "Run" to execute

IMPORTANT:
- This schema uses 'demo-business-001' as the demo business_id
- In production, you should implement proper authentication
- Update business_id to reference actual business UUIDs
- Enable Row Level Security (RLS) for production

CREDENTIALS NEEDED IN .env:
- SUPABASE_URL: From Project Settings > API > Project URL
- SUPABASE_SERVICE_ROLE_KEY: From Project Settings > API > service_role key (secret)
*/
