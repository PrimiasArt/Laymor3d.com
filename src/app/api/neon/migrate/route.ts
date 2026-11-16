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
  `CREATE TABLE IF NOT EXISTS ai_knowledge_rules (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    category VARCHAR(48) NOT NULL,
    defect_type VARCHAR(64),
    severity VARCHAR(16) DEFAULT 'medium',
    problem_symptom TEXT,
    root_cause TEXT,
    solution_text TEXT NOT NULL,
    slicer_overrides JSONB DEFAULT '{}'::jsonb,
    trigger_condition JSONB DEFAULT '{}'::jsonb,
    auto_fix_patch JSONB DEFAULT '{}'::jsonb,
    submitted_by_user_id VARCHAR(64),
    submitted_by VARCHAR(120),
    applicable_printers TEXT[] DEFAULT ARRAY['all']::TEXT[],
    applicable_filaments TEXT[] DEFAULT ARRAY['PLA']::TEXT[],
    applicable_categories TEXT[] DEFAULT ARRAY['all']::TEXT[],
    confidence_score INTEGER DEFAULT 75,
    verification_count INTEGER DEFAULT 0,
    source_platform VARCHAR(48) DEFAULT 'user_contributed',
    source_reference TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    moderation_status VARCHAR(24) DEFAULT 'pending',
    reviewed_by VARCHAR(120),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    content_hash VARCHAR(64),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_status ON ai_knowledge_rules (moderation_status);`,
  `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_submitter ON ai_knowledge_rules (submitted_by_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_hash ON ai_knowledge_rules (content_hash);`,
  `CREATE TABLE IF NOT EXISTS ai_learning_cases (
    id VARCHAR(64) PRIMARY KEY,
    model_name TEXT NOT NULL,
    material VARCHAR(32) NOT NULL,
    category VARCHAR(48) NOT NULL,
    geometry_signature JSONB NOT NULL DEFAULT '{}'::jsonb,
    feature_vector DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
    slicer_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    outcome_status VARCHAR(24) NOT NULL,
    failure_defect TEXT,
    operator_notes TEXT,
    trust_weight DOUBLE PRECISION DEFAULT 1.0,
    moderation_status VARCHAR(24) DEFAULT 'pending',
    submitted_by_user_id VARCHAR(64),
    submitted_by VARCHAR(120),
    reviewed_by VARCHAR(120),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS idx_ai_learning_status ON ai_learning_cases (moderation_status);`,
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
