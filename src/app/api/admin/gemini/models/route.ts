import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/backend/repositories/ConfigRepository';
import { userRepository } from '@/backend/repositories/UserRepository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryKey = searchParams.get('apiKey');
    const apiKey = (queryKey && queryKey.trim().length > 0)
      ? queryKey.trim()
      : configRepository.getGeminiApiKey();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Chưa cấu hình Google Gemini API Key. Vui lòng nhập API Key để kiểm tra.',
      }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Google API trả về mã lỗi HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          msg = errJson.error.message;
        }
      } catch {}
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    const data = await res.json();
    const rawModels: any[] = data.models || [];

    // Lọc ra các model hỗ trợ generateContent
    const contentModels = rawModels
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map((m) => {
        const id = m.name.replace('models/', '');
        return {
          id,
          name: m.displayName || id,
          description: m.description || '',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
        };
      });

    // Sắp xếp ưu tiên: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-lite
    const priority = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
    contentModels.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return NextResponse.json({
      success: true,
      models: contentModels,
      count: contentModels.length,
      preferredModel: configRepository.getPreferredGeminiModel(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Lỗi kết nối tới Google API: ${err.message}`,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey ? body.apiKey.trim() : configRepository.getGeminiApiKey();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Chưa cấu hình Google Gemini API Key. Vui lòng nhập API Key để kiểm tra.',
      }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Google API trả về mã lỗi HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          msg = errJson.error.message;
        }
      } catch {}
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    const data = await res.json();
    const rawModels: any[] = data.models || [];

    const contentModels = rawModels
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map((m) => {
        const id = m.name.replace('models/', '');
        return {
          id,
          name: m.displayName || id,
          description: m.description || '',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
        };
      });

    const priority = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
    contentModels.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return NextResponse.json({
      success: true,
      models: contentModels,
      count: contentModels.length,
      preferredModel: configRepository.getPreferredGeminiModel(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Lỗi kết nối tới Google API: ${err.message}`,
    }, { status: 500 });
  }
}
