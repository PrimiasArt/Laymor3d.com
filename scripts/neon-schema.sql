-- ====================================================================
-- 3D HUB V2 - NEON SERVERLESS POSTGRESQL DATABASE SCHEMA
-- Target Database: Neon Postgres (Scale-to-Zero, High Speed HTTP/WS)
-- ====================================================================

-- 1. BẢNG MÔ HÌNH 3D (Models & Generated AI Mesh)
CREATE TABLE IF NOT EXISTS models_3d (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  stl_url TEXT,
  thumbnail_url TEXT,
  ai_engine VARCHAR(50) DEFAULT 'tripo',
  volume_cm3 NUMERIC(10, 2) DEFAULT 0,
  triangle_count INT DEFAULT 0,
  price_vnd NUMERIC(15, 2) DEFAULT 0,
  download_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  creator_id VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index tìm kiếm nhanh models
CREATE INDEX IF NOT EXISTS idx_models_category ON models_3d(category);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models_3d(created_at DESC);

-- 2. BẢNG NGUỒN CRAWLER (MakerWorld, Printables, Thingiverse, Cults3D)
CREATE TABLE IF NOT EXISTS crawler_sources (
  id VARCHAR(64) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  source_url TEXT NOT NULL,
  total_models_found INT DEFAULT 0,
  last_crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) DEFAULT 'idle',
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG PHÂN TÍCH XU HƯỚNG THỊ TRƯỜNG (Trends Analytics)
CREATE TABLE IF NOT EXISTS trends_analytics (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(150) NOT NULL,
  search_volume INT DEFAULT 0,
  printability_score NUMERIC(5, 2) DEFAULT 8.5,
  market_demand VARCHAR(50) DEFAULT 'Cao',
  growth_rate NUMERIC(6, 2) DEFAULT 0,
  source_platform VARCHAR(50) DEFAULT 'Google Trends & MakerWorld',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends_analytics(keyword);

-- 4. BẢNG ĐƠN HÀNG IN 3D & DỊCH VỤ GIA CÔNG (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_address TEXT,
  model_id VARCHAR(64),
  model_title VARCHAR(255) NOT NULL,
  material VARCHAR(50) DEFAULT 'PLA Standard',
  color VARCHAR(50) DEFAULT 'Trắng Sữa',
  infill_percent INT DEFAULT 15,
  layer_height_mm NUMERIC(4, 2) DEFAULT 0.20,
  quantity INT DEFAULT 1,
  total_price_vnd NUMERIC(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);

-- 5. BẢNG VÍ & GIAO DỊCH (Wallet Transactions)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(30) NOT NULL, -- 'top_up', 'unlock_preset', 'order_payment'
  amount_vnd NUMERIC(15, 2) NOT NULL,
  balance_after_vnd NUMERIC(15, 2) NOT NULL,
  description TEXT,
  reference_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON wallet_transactions(user_id);

-- 6. BẢNG ĐỒNG BỘ TRI THỨC OBSIDIAN VAULT (Obsidian Knowledge Sync)
CREATE TABLE IF NOT EXISTS obsidian_vault_notes (
  id VARCHAR(120) PRIMARY KEY, -- relative path e.g. '01-Material-Guides/PLA-Optimization.md'
  title VARCHAR(255) NOT NULL,
  folder VARCHAR(150),
  tags TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  wiki_links TEXT[] DEFAULT '{}',
  github_sha VARCHAR(100),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. BẢNG AUDIT LOGS (Nhật ký hệ thống)
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  operator_id VARCHAR(64) DEFAULT 'system',
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON system_audit_logs(module_name);
