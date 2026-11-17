import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/backend/repositories/ConfigRepository';
import { resolveRequestUser } from '@/backend/services/auth/sessionGuard';

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_REQUESTS = 40;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(bucketKey: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(bucketKey) || [];
  const active = prev.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (active.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(bucketKey, active);
    return false;
  }
  active.push(now);
  rateBuckets.set(bucketKey, active);
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function redactSecret(msg: string, secret?: string): string {
  let clean = msg || '';
  if (secret && secret.length > 4) {
    clean = clean.split(secret).join('[REDACTED]');
  }
  return clean.replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
}

function sanitizeParts(rawParts: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(rawParts)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const part of rawParts.slice(0, 8)) {
    if (!part || typeof part !== 'object') continue;
    const p = part as Record<string, unknown>;
    if (typeof p.text === 'string' && p.text.trim()) {
      out.push({ text: p.text.slice(0, 60000) });
    } else if (p.inlineData && typeof p.inlineData === 'object') {
      const idata = p.inlineData as Record<string, unknown>;
      const mimeType = typeof idata.mimeType === 'string' ? idata.mimeType.trim() : '';
      const data = typeof idata.data === 'string' ? idata.data : '';
      if (
        /^image\/(jpeg|jpg|png|webp|gif)$/i.test(mimeType) &&
        data.length > 0 &&
        data.length <= 12 * 1024 * 1024
      ) {
        out.push({ inlineData: { mimeType, data } });
      }
    }
  }
  return out;
}

async function callGoogleGeminiServerSide(params: {
  apiKey: string;
  preferredModel?: string;
  serverDefaultModel?: string;
  parts: Array<Record<string, unknown>>;
  systemInstruction?: string;
  jsonMode?: boolean;
  maxOutputTokens?: number;
}) {
  const candidates = Array.from(
    new Set(
      [
        params.preferredModel,
        params.serverDefaultModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ].filter((m): m is string => Boolean(m && m.trim().length > 0))
    )
  );

  let lastStatus = 0;
  let lastError = '';

  for (const modelId of candidates) {
    const cleanModel = modelId.trim().replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      cleanModel
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

    const payload: Record<string, unknown> = {
      contents: [{ role: 'user', parts: params.parts }],
      generationConfig: {
        temperature: 0.25,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: Math.max(64, Math.min(4096, Number(params.maxOutputTokens || 2500))),
        ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (params.systemInstruction && params.systemInstruction.trim()) {
      payload.systemInstruction = {
        parts: [{ text: params.systemInstruction.slice(0, 24000) }],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      });

      lastStatus = response.status;
      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          return { ok: true, status: 200, text, modelUsed: cleanModel };
        }
      } else {
        try {
          const errJson = await response.json();
          lastError = redactSecret(
            errJson?.error?.message || response.statusText,
            params.apiKey
          );
        } catch {
          lastError = redactSecret(response.statusText, params.apiKey);
        }
        if (response.status === 404 || response.status === 400) {
          continue;
        }
        break;
      }
    } catch (err: any) {
      lastError = redactSecret(err?.message || 'Lỗi kết nối Gemini API', params.apiKey);
    }
  }

  return {
    ok: false,
    status: lastStatus || 502,
    text: '',
    modelUsed: candidates[0] || 'gemini-2.0-flash',
    errorMessage: lastError || 'Không thể kết nối tới Google Gemini API.',
  };
}

export async function GET() {
  try {
    const backend = await configRepository.ensureHydratedAsync();
    const apiKey = configRepository.getGeminiApiKey();
    const preferredModel = configRepository.getPreferredGeminiModel();

    return NextResponse.json({
      success: true,
      available: Boolean(apiKey && apiKey.trim().length > 0),
      preferredModel,
      source: apiKey ? 'server' : 'none',
      storageBackend: backend,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, available: false, error: err?.message || 'Lỗi kiểm tra AI Server' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const [{ user }] = await Promise.all([
      resolveRequestUser(req),
      configRepository.ensureHydratedAsync(),
    ]);

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'test' ? 'test' : 'generate';
    const isStrictAdmin = Boolean(user && (user.role === 'admin' || user.username === 'hlcai_admin'));

    if (action === 'test') {
      if (!isStrictAdmin) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: 'Chỉ tài khoản Admin mới được quyền kiểm tra hoặc thay đổi API Key.',
          },
          { status: 403 }
        );
      }

      const candidateKey =
        typeof body.apiKey === 'string' && body.apiKey.trim().length > 0
          ? body.apiKey.trim()
          : configRepository.getGeminiApiKey();

      if (!candidateKey) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: 'Chưa có Gemini API Key trên Server hoặc ô nhập liệu.',
          },
          { status: 400 }
        );
      }

      const t0 = Date.now();
      const testRes = await callGoogleGeminiServerSide({
        apiKey: candidateKey,
        preferredModel: typeof body.preferredModel === 'string' ? body.preferredModel : undefined,
        serverDefaultModel: configRepository.getPreferredGeminiModel(),
        parts: [{ text: 'Trả lời ngắn gọn bằng Tiếng Việt: Kết nối AI Server Laymor3D thành công.' }],
        jsonMode: false,
        maxOutputTokens: 120,
      });

      return NextResponse.json({
        ...testRes,
        success: testRes.ok,
        modelName: testRes.modelUsed,
        latencyMs: Date.now() - t0,
        error: testRes.errorMessage,
      });
    }

    // Action === 'generate': open for all users via server-held key
    const bucketKey = user ? `uid:${user.id}` : `ip:${getClientIp(req)}`;
    if (!checkRateLimit(bucketKey)) {
      return NextResponse.json(
        {
          ok: false,
          status: 429,
          text: '',
          errorMessage: 'Bạn đang gửi quá nhiều truy vấn AI liên tiếp. Vui lòng thử lại sau ít phút.',
        },
        { status: 429 }
      );
    }

    const serverKey = configRepository.getGeminiApiKey();
    if (!serverKey) {
      return NextResponse.json({
        ok: false,
        status: 503,
        text: '',
        modelUsed: configRepository.getPreferredGeminiModel(),
        errorMessage: 'Quản trị viên chưa cấu hình Google Gemini API Key trên Server.',
      });
    }

    const parts = sanitizeParts(body.parts);
    if (parts.length === 0) {
      return NextResponse.json(
        { ok: false, status: 400, text: '', errorMessage: 'Thiếu nội dung truy vấn AI (parts).' },
        { status: 400 }
      );
    }

    const result = await callGoogleGeminiServerSide({
      apiKey: serverKey,
      preferredModel:
        typeof body.preferredModel === 'string' ? body.preferredModel : undefined,
      serverDefaultModel: configRepository.getPreferredGeminiModel(),
      parts,
      systemInstruction:
        typeof body.systemInstruction === 'string' ? body.systemInstruction : undefined,
      jsonMode: body.jsonMode !== false,
      maxOutputTokens: Number(body.maxOutputTokens || 2500),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, status: 500, text: '', errorMessage: err?.message || 'Lỗi Gemini Server Proxy' },
      { status: 500 }
    );
  }
}
