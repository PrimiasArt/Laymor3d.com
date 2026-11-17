import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/backend/repositories/ConfigRepository';
import { resolveRequestUser } from '@/backend/services/auth/sessionGuard';
import { isNeonConfigured } from '@/backend/services/neon/neonClient';
import { supabaseCloudService } from '@/backend/db/supabaseClient';
import { auditLogRepository } from '@/backend/repositories/AuditLogRepository';

function isStrictAdminUser(user: Awaited<ReturnType<typeof resolveRequestUser>>['user']): boolean {
  return Boolean(user && (user.role === 'admin' || user.username === 'hlcai_admin'));
}

function buildBackendLabel(backend: string): string {
  if (backend === 'neon_postgres') return 'Neon PostgreSQL';
  if (backend === 'supabase_kv') return 'Supabase Cloud KV';
  return 'Bộ nhớ tạm (RAM/Disk)';
}

export async function GET(req: NextRequest) {
  try {
    const [{ user }, storageBackend] = await Promise.all([
      resolveRequestUser(req),
      configRepository.ensureHydratedAsync(),
    ]);

    const config = configRepository.getConfig();
    const isStrictAdmin = isStrictAdminUser(user);

    const hasGemini = Boolean(config.apiKeys?.geminiApiKey);
    const hasFal = Boolean(config.apiKeys?.falKey);
    const hasMeshy = Boolean(config.apiKeys?.meshyApiKey);
    const hasMakerWorld = Boolean(config.apiKeys?.makerWorldCookie);

    // TUYỆT ĐỐI KHÔNG gửi bất kỳ API key nào xuống client trừ tài khoản Admin thực thụ
    const safeConfig = {
      ...config,
      apiKeys: {
        falKey: isStrictAdmin ? config.apiKeys.falKey : '',
        meshyApiKey: isStrictAdmin ? config.apiKeys.meshyApiKey : '',
        geminiApiKey: isStrictAdmin ? config.apiKeys.geminiApiKey : '',
        makerWorldCookie: isStrictAdmin ? config.apiKeys.makerWorldCookie : '',
        preferredGeminiModel: config.apiKeys.preferredGeminiModel || 'gemini-2.0-flash',
      },
    };

    return NextResponse.json({
      success: true,
      config: safeConfig,
      isStrictAdmin,
      currentUserRole: user?.role || 'guest',
      apiStatus: {
        geminiConnected: hasGemini,
        falConnected: hasFal,
        meshyConnected: hasMeshy,
        makerWorldConnected: hasMakerWorld,
        preferredGeminiModel: safeConfig.apiKeys.preferredGeminiModel,
      },
      storageBackend,
      storageLabel: buildBackendLabel(storageBackend),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const [{ user }] = await Promise.all([
      resolveRequestUser(req),
      configRepository.ensureHydratedAsync(),
    ]);

    if (!isStrictAdminUser(user)) {
      return NextResponse.json(
        {
          error:
            'Chỉ tài khoản Admin tối cao mới có quyền xem, cài đặt API Key, giá vốn và phân quyền Module!',
          code: 'ADMIN_ONLY',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      section,
      environment,
      commercial,
      materials,
      operations,
      aiPricing,
      apiKeys,
      modulePermissions,
      moduleKey,
      role,
      isEnabled,
    } = body;

    const actorName = user!.name || user!.username || 'Admin';
    let updatedConfig = configRepository.getConfig();

    if (section === 'environment' || environment) {
      if (environment === 'staging' || environment === 'official') {
        updatedConfig = configRepository.setEnvironment(environment, actorName);
      }
    }

    if (section === 'commercial' || commercial) {
      updatedConfig = configRepository.updateCommercial(commercial, actorName);
    }

    if (section === 'materials' || materials) {
      updatedConfig = configRepository.updateMaterials(materials, actorName);
    }

    if (section === 'operations' || operations) {
      updatedConfig = configRepository.updateOperations(operations, actorName);
    }

    if (section === 'aiPricing' || aiPricing) {
      updatedConfig = configRepository.updateAIPricing(aiPricing, actorName);
    }

    if (section === 'apiKeys' || apiKeys) {
      const cleanKeys = {
        ...(apiKeys || {}),
        ...(typeof apiKeys?.geminiApiKey === 'string'
          ? { geminiApiKey: apiKeys.geminiApiKey.trim() }
          : {}),
        ...(typeof apiKeys?.falKey === 'string' ? { falKey: apiKeys.falKey.trim() } : {}),
        ...(typeof apiKeys?.meshyApiKey === 'string'
          ? { meshyApiKey: apiKeys.meshyApiKey.trim() }
          : {}),
        ...(typeof apiKeys?.makerWorldCookie === 'string'
          ? { makerWorldCookie: apiKeys.makerWorldCookie.trim() }
          : {}),
      };
      updatedConfig = configRepository.updateApiKeys(cleanKeys, actorName);
    }

    if (section === 'modulePermissions' || modulePermissions) {
      updatedConfig = configRepository.updateModulePermissions(modulePermissions, actorName);
    }

    if (moduleKey && role && isEnabled !== undefined) {
      updatedConfig = configRepository.setModulePermission(moduleKey, role, isEnabled, actorName);
    }

    const saveRes = await configRepository.persistDurableAsync();
    const dbConfigured = isNeonConfigured() || supabaseCloudService.isConfigured;
    if (dbConfigured && !saveRes.persistedToDb) {
      return NextResponse.json(
        {
          success: false,
          error:
            saveRes.error ||
            'Không thể ghi cấu hình lên Database Server lúc này. Vui lòng thử lại.',
        },
        { status: 503 }
      );
    }

    if (section === 'apiKeys' || apiKeys) {
      await auditLogRepository
        .addKnowledgeAuditLogAsync({
          actorId: user!.id,
          actorName,
          actorRole: user!.role,
          action: 'knowledge_moderate',
          actionTitle: 'Admin Cập Nhật Khóa API Hệ Thống',
          description: `Đã lưu API Server lên ${buildBackendLabel(saveRes.storageBackend)} (Gemini=${Boolean(
            updatedConfig.apiKeys.geminiApiKey
          )}, Fal=${Boolean(updatedConfig.apiKeys.falKey)}, Meshy=${Boolean(
            updatedConfig.apiKeys.meshyApiKey
          )})`,
          severity: 'warning',
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu cấu hình lên Server (${buildBackendLabel(saveRes.storageBackend)}) để toàn hệ thống dùng chung!`,
      config: updatedConfig,
      storageBackend: saveRes.storageBackend,
      storageLabel: buildBackendLabel(saveRes.storageBackend),
      persistedToDb: saveRes.persistedToDb,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/config POST:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
