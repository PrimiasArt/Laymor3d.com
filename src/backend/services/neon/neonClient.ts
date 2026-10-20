import { neon, NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Neon Serverless PostgreSQL Client
 * Tự động scale-to-zero, cực kỳ tối ưu cho Vercel Serverless Functions.
 * Graceful Fallback: Nếu chưa cấu hình biến môi trường DATABASE_URL,
 * hệ thống sẽ chuyển sang chế độ Mock In-Memory mà không gây sập ứng dụng.
 */

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  '';

export function isNeonConfigured(): boolean {
  return Boolean(
    connectionString &&
    connectionString.startsWith('postgres') &&
    !connectionString.includes('placeholder')
  );
}

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getNeonSql(): NeonQueryFunction<false, false> | null {
  if (!isNeonConfigured()) {
    return null;
  }

  if (!cachedSql) {
    try {
      cachedSql = neon(connectionString);
    } catch (err) {
      console.warn('⚠️ [Neon DB] Không thể khởi tạo kết nối Neon:', err);
      return null;
    }
  }

  return cachedSql;
}

/**
 * Thực thi câu lệnh SQL với an toàn fallback
 */
export async function executeNeonQuery<T = any>(
  queryText: string,
  params: any[] = []
): Promise<{ success: boolean; data: T[] | null; error?: string; isFallback?: boolean }> {
  const sql = getNeonSql();

  if (!sql) {
    return {
      success: true,
      data: null,
      isFallback: true,
      error: 'DATABASE_URL (Neon) chưa được cấu hình. Hệ thống đang dùng In-Memory Data.',
    };
  }

  try {
    // @neondatabase/serverless query
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = await sql(queryText, params);
    return {
      success: true,
      data: result as T[],
      isFallback: false,
    };
  } catch (err: any) {
    console.error('❌ [Neon DB Query Error]:', err?.message || err);
    return {
      success: false,
      data: null,
      error: err?.message || 'Lỗi truy vấn Neon PostgreSQL',
      isFallback: false,
    };
  }
}
