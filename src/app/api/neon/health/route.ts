import { NextResponse } from 'next/server';
import { isNeonConfigured, executeNeonQuery } from '@/backend/services/neon/neonClient';

export async function GET() {
  const configured = isNeonConfigured();

  if (!configured) {
    return NextResponse.json({
      status: 'unconfigured_fallback',
      message: 'DATABASE_URL chưa được thiết lập. 3D Hub v2 đang chạy chế độ Mock In-Memory.',
      database: 'Neon PostgreSQL (Scale-to-Zero)',
      help: 'Vui lòng cung cấp DATABASE_URL (postgres://...) trong biến môi trường Vercel hoặc file .env.local để kết nối Neon DB.',
      tables: ['models_3d', 'orders', 'trends_analytics', 'wallet_transactions', 'obsidian_vault_notes'],
    });
  }

  const startTime = Date.now();
  const testRes = await executeNeonQuery('SELECT NOW() as current_time, version() as version;');
  const latencyMs = Date.now() - startTime;

  if (!testRes.success) {
    return NextResponse.json(
      {
        status: 'connection_error',
        error: testRes.error,
        latencyMs,
      },
      { status: 500 }
    );
  }

  // Lấy danh sách các bảng hiện có
  const tablesRes = await executeNeonQuery(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);

  return NextResponse.json({
    status: 'connected',
    message: 'Kết nối Neon Serverless PostgreSQL thành công!',
    latencyMs,
    version: testRes.data?.[0]?.version || 'PostgreSQL (Neon)',
    currentTime: testRes.data?.[0]?.current_time,
    existingTables: tablesRes.data?.map((t: any) => t.table_name) || [],
  });
}
