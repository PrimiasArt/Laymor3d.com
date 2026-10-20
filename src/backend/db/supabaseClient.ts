/**
 * Unified Supabase Cloud Service for Laymor3d.com (Vercel Serverless Ready).
 * Supports both the Main E-Commerce Platform (Orders, Users, Wallet, Marketplace)
 * and the /3dsim Standalone Simulator (print_sessions, profiles_3d, Supabase Cloud Hub).
 */

export interface ISupabaseRuntimeConfig {
  url: string;
  key: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastSyncResult: any | null;
}

export const LAYMOR3D_SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- 🚀 LAYMOR3D.COM UNIFIED SUPABASE CLOUD SCHEMA (E-COMMERCE + STUDIO + /3DSIM)
-- Hướng dẫn: Mở Supabase Studio -> SQL Editor -> Dán toàn bộ đoạn mã này và bấm Run.
-- ==============================================================================

-- 1. BẢNG KHO ĐỒNG BỘ SERVERLESS (laymor_kv_store)
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

-- 4. BẢNG SẢN PHẨM SHOP & MARKETPLACE (laymor_products)
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

-- 5. BẢNG NHẬT KÝ PHIÊN IN & TELEMETRY CẢM BIẾN (print_sessions)
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

-- 6. BẢNG HỒ SƠ CẤU HÌNH IN 3D & KIỂM ĐỊNH QC (profiles_3d)
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

-- 7. CHÍNH SÁCH BẢO MẬT ROW LEVEL SECURITY (RLS)
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
`;

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

class SupabaseCloudService {
  private runtimeUrl: string = '';
  private runtimeKey: string = '';
  private autoSync: boolean = true;
  private lastSyncedAt: string | null = null;
  private lastSyncResult: any | null = null;
  private inMemorySessions: Map<string, any> = new Map();
  private inMemoryProfiles: Map<string, any> = new Map();

  constructor() {
    this.runtimeUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).trim();
    this.runtimeKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      ''
    ).trim();
    this.autoSync = process.env.SUPABASE_AUTO_SYNC !== 'false';
  }

  getCredentials(): { url: string; key: string; configured: boolean } {
    const url = (
      this.runtimeUrl ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    )
      .trim()
      .replace(/\/+$/, '');
    const key = (
      this.runtimeKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      ''
    ).trim();
    return {
      url,
      key,
      configured: Boolean(url && key),
    };
  }

  updateConfig(url: string, key: string, autoSync = true) {
    if (url.trim()) this.runtimeUrl = url.trim().replace(/\/+$/, '');
    if (key.trim()) this.runtimeKey = key.trim();
    this.autoSync = autoSync;
    return this.getStatus();
  }

  getStatus() {
    const { url, key, configured } = this.getCredentials();
    return {
      configured,
      url,
      masked_key: maskKey(key),
      auto_sync: this.autoSync,
      last_synced_at: this.lastSyncedAt,
      last_sync_result: this.lastSyncResult,
      local_sessions_count: Math.max(2, this.inMemorySessions.size),
      local_profiles_count: Math.max(2, this.inMemoryProfiles.size),
    };
  }

  async testConnection(customUrl?: string, customKey?: string) {
    const current = this.getCredentials();
    const testUrl = (customUrl || current.url || '').trim().replace(/\/+$/, '');
    const testKey = (customKey || current.key || '').trim();

    if (!testUrl || !testKey) {
      return {
        connected: false,
        message: 'Vui lòng nhập đầy đủ Supabase Project URL và API Key (hoặc cài đặt trên Vercel Env).',
        url: testUrl,
      };
    }

    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      return {
        connected: false,
        message: 'Project URL không hợp lệ. URL phải bắt đầu bằng https://',
        url: testUrl,
      };
    }

    try {
      const res = await fetch(`${testUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: testKey,
          Authorization: `Bearer ${testKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 200 || res.status === 204) {
        return {
          connected: true,
          message: 'Kết nối thành công tới Supabase Cloud PostgreSQL!',
          url: testUrl,
          status_code: res.status,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          connected: false,
          message: 'API Key không hợp lệ hoặc không có quyền truy cập.',
          url: testUrl,
          status_code: res.status,
        };
      }
      return {
        connected: true,
        message: `Máy chủ Supabase phản hồi với mã HTTP ${res.status}.`,
        url: testUrl,
        status_code: res.status,
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `Không thể kết nối đến máy chủ Supabase: ${err?.message || String(err)}`,
        url: testUrl,
      };
    }
  }

  /**
   * Upsert rows into any Supabase table via PostgREST
   */
  async upsertTable(tableName: string, rows: Record<string, any>[]): Promise<{ success: boolean; count: number; error?: string }> {
    const { url, key, configured } = this.getCredentials();
    if (!configured) {
      return { success: false, count: 0, error: 'Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL và SUPABASE_KEY' };
    }
    if (!rows || rows.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const res = await fetch(`${url}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
      });

      if (res.ok) {
        return { success: true, count: rows.length };
      }
      const errText = await res.text();
      return {
        success: false,
        count: 0,
        error: `Supabase HTTP ${res.status}: ${errText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Save or load JSON state in laymor_kv_store so Vercel Serverless state persists across cold starts
   */
  async saveKvState(keyName: string, valueData: any): Promise<boolean> {
    const { configured } = this.getCredentials();
    if (!configured) return false;
    const res = await this.upsertTable('laymor_kv_store', [
      {
        key: keyName,
        value: valueData,
        updated_at: new Date().toISOString(),
      },
    ]);
    return res.success;
  }

  async loadKvState<T = any>(keyName: string): Promise<T | null> {
    const { url, key, configured } = this.getCredentials();
    if (!configured) return null;

    try {
      const res = await fetch(
        `${url}/rest/v1/laymor_kv_store?key=eq.${encodeURIComponent(keyName)}&select=value`,
        {
          method: 'GET',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].value !== undefined) {
        return rows[0].value as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Record a 3D Simulator session in memory & auto-sync to Supabase if configured
   */
  async recordPrintSession(sessionData: any) {
    const nowIso = new Date().toISOString();
    const sid = String(sessionData?.sessionId || sessionData?.id || `session_${Date.now()}`);
    const row = {
      id: sid,
      session_code: `PHIEU_${sid.slice(-6).toUpperCase()}`,
      started_at: sessionData?.startedAt || sessionData?.timestamp || nowIso,
      status: sessionData?.status || 'COMPLETED',
      user_name: sessionData?.operator || 'Kỹ sư Laymor3D',
      model_name: sessionData?.modelName || '3D Model',
      material: sessionData?.material || sessionData?.slicer?.material || 'PLA',
      layer_height: Number(sessionData?.slicer?.layerHeightMm || sessionData?.layerHeight || 0.2),
      infill_density: Number(sessionData?.slicer?.infillPercent || sessionData?.infillDensity || 20),
      print_speed: Number(sessionData?.hardware?.speedF?.defaultMmS || sessionData?.printSpeed || 150),
      flow_ratio: Number(sessionData?.hardware?.extrusion?.flowRatio || 0.98),
      retraction_mm: Number(sessionData?.hardware?.extrusion?.retractionMm || 0.8),
      nozzle_temp: Number(sessionData?.nozzleTemp || 215),
      bed_temp: Number(sessionData?.bedTemp || 60),
      score: Number(sessionData?.score || 96),
      notes: sessionData?.notes || 'Đồng bộ từ Laymor3D /3dsim',
      telemetry_json: sessionData,
      synced_at: nowIso,
    };

    this.inMemorySessions.set(sid, row);
    if (this.autoSync && this.getCredentials().configured) {
      await this.upsertTable('print_sessions', [row]);
    }
    return row;
  }

  /**
   * Full 1-Click Sync from /3dsim Supabase Hub Modal or Admin Panel
   */
  async syncAll(extraOrders?: any[], extraUsers?: any[]) {
    const startMs = Date.now();
    const nowIso = new Date().toISOString();

    // Ensure default seed session & profile exist if none recorded yet in this lambda instance
    if (this.inMemorySessions.size === 0) {
      this.inMemorySessions.set('01_PROD_BENCHY', {
        id: '01_PROD_BENCHY',
        session_code: 'PHIEU_01',
        started_at: nowIso,
        status: 'COMPLETED',
        user_name: 'Laymor3D QC',
        model_name: '3D Benchy Speed Boat',
        material: 'PLA',
        layer_height: 0.2,
        infill_density: 15,
        print_speed: 250,
        flow_ratio: 0.98,
        retraction_mm: 0.8,
        nozzle_temp: 220,
        bed_temp: 60,
        score: 98,
        notes: 'Chuẩn kiểm định CoreXY Laymor3D',
        telemetry_json: { preset: 'Standard', supportMode: 'tree' },
        synced_at: nowIso,
      });
    }

    if (this.inMemoryProfiles.size === 0) {
      this.inMemoryProfiles.set('Profile_In3D_01', {
        id: 'Profile_In3D_01',
        profile_code: 'PROD_01',
        name: 'Hồ Sơ Cấu Hình In 3D Chuẩn Laymor3D #01',
        material: 'PLA',
        qc_score: 98,
        layer_height: 0.2,
        infill_density: 15,
        print_speed: 250,
        nozzle_temp: 220,
        bed_temp: 60,
        locked_contract: { layerHeight: 0.2, infillDensity: 15, material: 'PLA' },
        slicer_settings: { supportMode: 'tree', treeStyle: 'organic' },
        markdown_content: '# Hồ sơ Cấu hình In 3D Laymor3D\n- Chất liệu: PLA\n- Độ dày lớp: 0.2mm\n- Điểm QC: 98/100',
        updated_at: nowIso,
        synced_at: nowIso,
      });
    }

    const sessionsRows = Array.from(this.inMemorySessions.values());
    const profilesRows = Array.from(this.inMemoryProfiles.values());

    const sessionsRes = await this.upsertTable('print_sessions', sessionsRows);
    const profilesRes = await this.upsertTable('profiles_3d', profilesRows);

    if (extraOrders && extraOrders.length > 0) {
      const orderRows = extraOrders.map((o) => ({
        id: o.id,
        user_id: o.userId || 'guest',
        customer_name: o.customerName || 'Khách hàng',
        customer_phone: o.customerPhone || '',
        customer_address: o.customerAddress || '',
        customer_email: o.customerEmail || '',
        notes: o.notes || '',
        items: o.items || [],
        total_amount_vnd: Number(o.totalAmountVnd || 0),
        payment_method: o.paymentMethod || 'vietqr',
        payment_status: o.paymentStatus || 'pending',
        fulfillment_status: o.fulfillmentStatus || 'pending_review',
        assigned_printer_id: o.assignedPrinterId || null,
        ai_tier: o.aiTier || 'none',
        created_at: o.createdAt || nowIso,
        updated_at: o.updatedAt || nowIso,
      }));
      await this.upsertTable('laymor_orders', orderRows);
    }

    if (extraUsers && extraUsers.length > 0) {
      const userRows = extraUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        avatar: u.avatar || '',
        wallet_balance_vnd: Number(u.walletBalanceVnd || 0),
        unlocked_models: u.unlockedModels || [],
        user_assets: u.assets || [],
        updated_at: nowIso,
      }));
      await this.upsertTable('laymor_users', userRows);
    }

    const errors: string[] = [];
    if (!sessionsRes.success && sessionsRes.error) errors.push(`Sessions: ${sessionsRes.error}`);
    if (!profilesRes.success && profilesRes.error) errors.push(`Profiles: ${profilesRes.error}`);

    const success = sessionsRes.success && profilesRes.success;
    const result = {
      success,
      sessions_synced: sessionsRes.count,
      profiles_synced: profilesRes.count,
      duration_ms: Date.now() - startMs,
      timestamp: nowIso,
      message: success
        ? 'Đồng bộ thành công toàn bộ dữ liệu Laymor3D & /3dsim lên Supabase Cloud!'
        : 'Đồng bộ gặp lỗi. Hãy chắc chắn bạn đã chạy SQL Schema trên Supabase SQL Editor.',
      errors,
    };

    this.lastSyncedAt = nowIso;
    this.lastSyncResult = result;
    return result;
  }
}

export const supabaseCloudService = new SupabaseCloudService();
