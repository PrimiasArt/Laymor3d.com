import { NextResponse } from 'next/server';
import { isNeonConfigured, executeNeonQuery } from '@/backend/services/neon/neonClient';

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS models_3d (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_models_category ON models_3d(category);`,
  `CREATE INDEX IF NOT EXISTS idx_models_created_at ON models_3d(created_at DESC);`,

  `CREATE TABLE IF NOT EXISTS crawler_sources (
    id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    source_url TEXT NOT NULL,
    total_models_found INT DEFAULT 0,
    last_crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'idle',
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS trends_analytics (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(150) NOT NULL,
    search_volume INT DEFAULT 0,
    printability_score NUMERIC(5, 2) DEFAULT 8.5,
    market_demand VARCHAR(50) DEFAULT 'Cao',
    growth_rate NUMERIC(6, 2) DEFAULT 0,
    source_platform VARCHAR(50) DEFAULT 'Google Trends & MakerWorld',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends_analytics(keyword);`,

  `CREATE TABLE IF NOT EXISTS orders (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,

  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount_vnd NUMERIC(15, 2) NOT NULL,
    balance_after_vnd NUMERIC(15, 2) NOT NULL,
    description TEXT,
    reference_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS obsidian_vault_notes (
    id VARCHAR(120) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    folder VARCHAR(150),
    tags TEXT[] DEFAULT '{}',
    content TEXT NOT NULL,
    wiki_links TEXT[] DEFAULT '{}',
    github_sha VARCHAR(100),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS system_audit_logs (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    operator_id VARCHAR(64) DEFAULT 'system',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,
];

export async function POST() {
  if (!isNeonConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'DATABASE_URL chưa được thiết lập. Vui lòng cấu hình biến môi trường Neon Postgres trước khi chạy migration.',
      },
      { status: 400 }
    );
  }

  const results: { statement: string; success: boolean; error?: string }[] = [];

  for (const ddl of DDL_STATEMENTS) {
    const res = await executeNeonQuery(ddl);
    results.push({
      statement: ddl.slice(0, 45).replace(/\n/g, ' ') + '...',
      success: res.success,
      error: res.error,
    });
  }

  const failed = results.filter((r) => !r.success);

  return NextResponse.json({
    success: failed.length === 0,
    totalStatements: DDL_STATEMENTS.length,
    passedStatements: results.filter((r) => r.success).length,
    failedStatements: failed.length,
    details: results,
  });
}
