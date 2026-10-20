-- ==============================================================================
-- 🚀 LAYMOR3D.COM UNIFIED SUPABASE CLOUD SCHEMA (E-COMMERCE + STUDIO + /3DSIM)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán toàn bộ và bấm RUN
-- ==============================================================================

-- 1. BẢNG KHO LƯU TRỮ TRẠNG THÁI HỆ THỐNG ĐỒNG BỘ SERVERLESS (laymor_kv_store)
-- Đảm bảo Vercel Serverless Functions không bao giờ mất dữ liệu khi Cold Start
CREATE TABLE IF NOT EXISTS public.laymor_kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BẢNG ĐƠN HÀNG IN 3D & THƯƠNG MẠI ĐIỆN TỬ (laymor_orders)
CREATE TABLE IF NOT EXISTS public.laymor_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_email TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount_vnd NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'vietqr',
    payment_status TEXT DEFAULT 'pending',
    fulfillment_status TEXT DEFAULT 'pending_review',
    assigned_printer_id TEXT,
    ai_tier TEXT DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BẢNG NGƯỜI DÙNG & VÍ TIỀN ĐIỆN TỬ (laymor_users)
CREATE TABLE IF NOT EXISTS public.laymor_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    wallet_balance_vnd NUMERIC DEFAULT 0,
    unlocked_models JSONB DEFAULT '[]'::jsonb,
    user_assets JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BẢNG SẢN PHẨM SHOP, MÔ HÌNH MARKETPLACE & KHO CRAWLER (laymor_products)
CREATE TABLE IF NOT EXISTS public.laymor_products (
    id TEXT PRIMARY KEY,
    product_type TEXT DEFAULT 'model',
    title TEXT NOT NULL,
    category TEXT,
    price_vnd NUMERIC DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    seller_id TEXT,
    seller_name TEXT,
    moderation_status TEXT DEFAULT 'approved',
    thumbnail_url TEXT,
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BẢNG NHẬT KÝ PHIÊN IN & TELEMETRY CẢM BIẾN /3DSIM (print_sessions)
CREATE TABLE IF NOT EXISTS public.print_sessions (
    id TEXT PRIMARY KEY,
    session_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TEXT,
    status TEXT DEFAULT 'COMPLETED',
    user_name TEXT,
    model_name TEXT,
    material TEXT,
    layer_height NUMERIC,
    infill_density NUMERIC,
    print_speed NUMERIC,
    flow_ratio NUMERIC,
    retraction_mm NUMERIC,
    nozzle_temp NUMERIC,
    bed_temp NUMERIC,
    score NUMERIC DEFAULT 100,
    notes TEXT,
    telemetry_json JSONB,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- 6. BẢNG HỒ SƠ CẤU HÌNH IN 3D & KIỂM ĐỊNH QC /3DSIM (profiles_3d)
CREATE TABLE IF NOT EXISTS public.profiles_3d (
    id TEXT PRIMARY KEY,
    profile_code TEXT,
    name TEXT,
    material TEXT,
    qc_score NUMERIC DEFAULT 100,
    layer_height NUMERIC,
    infill_density NUMERIC,
    print_speed NUMERIC,
    nozzle_temp NUMERIC,
    bed_temp NUMERIC,
    locked_contract JSONB,
    slicer_settings JSONB,
    markdown_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- 7. BẬT ROW LEVEL SECURITY (RLS) & POLICIES CHO SUPABASE REST API
ALTER TABLE public.laymor_kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laymor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laymor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laymor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_3d ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access on laymor_kv_store" ON public.laymor_kv_store;
CREATE POLICY "Public Full Access on laymor_kv_store" ON public.laymor_kv_store FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on laymor_orders" ON public.laymor_orders;
CREATE POLICY "Public Full Access on laymor_orders" ON public.laymor_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on laymor_users" ON public.laymor_users;
CREATE POLICY "Public Full Access on laymor_users" ON public.laymor_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on laymor_products" ON public.laymor_products;
CREATE POLICY "Public Full Access on laymor_products" ON public.laymor_products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on print_sessions" ON public.print_sessions;
CREATE POLICY "Public Full Access on print_sessions" ON public.print_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on profiles_3d" ON public.profiles_3d;
CREATE POLICY "Public Full Access on profiles_3d" ON public.profiles_3d FOR ALL USING (true) WITH CHECK (true);

-- 8. INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_laymor_orders_user_id ON public.laymor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_laymor_orders_created_at ON public.laymor_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_laymor_products_category ON public.laymor_products(category);
CREATE INDEX IF NOT EXISTS idx_print_sessions_status ON public.print_sessions(status);
CREATE INDEX IF NOT EXISTS idx_print_sessions_synced_at ON public.print_sessions(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_3d_material ON public.profiles_3d(material);
CREATE INDEX IF NOT EXISTS idx_profiles_3d_qc_score ON public.profiles_3d(qc_score DESC);
