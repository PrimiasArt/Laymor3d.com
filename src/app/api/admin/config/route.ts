import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/backend/repositories/ConfigRepository';
import { userRepository } from '@/backend/repositories/UserRepository';

export async function GET() {
  try {
    const activeUser = userRepository.getActiveUser();
    const config = configRepository.getConfig();

    // Ẩn một phần API key nếu không phải admin
    const isMasterAdmin = activeUser.role === 'admin';
    const safeConfig = {
      ...config,
      apiKeys: {
        falKey: config.apiKeys.falKey ? (isMasterAdmin ? config.apiKeys.falKey : '******') : '',
        meshyApiKey: config.apiKeys.meshyApiKey ? (isMasterAdmin ? config.apiKeys.meshyApiKey : '******') : '',
        geminiApiKey: config.apiKeys.geminiApiKey ? (isMasterAdmin ? config.apiKeys.geminiApiKey : '******') : '',
        makerWorldCookie: config.apiKeys.makerWorldCookie ? (isMasterAdmin ? config.apiKeys.makerWorldCookie : '******') : '',
      },
    };

    return NextResponse.json({
      success: true,
      config: safeConfig,
      currentUserRole: activeUser.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const activeUser = userRepository.getActiveUser();
    if (activeUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ tài khoản Admin mới có quyền cấu hình API, giá vốn và phân quyền Module!' },
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

    let updatedConfig = configRepository.getConfig();

    if (section === 'environment' || environment) {
      if (environment === 'staging' || environment === 'official') {
        updatedConfig = configRepository.setEnvironment(environment, activeUser.name);
      }
    }

    if (section === 'commercial' || commercial) {
      updatedConfig = configRepository.updateCommercial(commercial, activeUser.name);
    }

    if (section === 'materials' || materials) {
      updatedConfig = configRepository.updateMaterials(materials, activeUser.name);
    }

    if (section === 'operations' || operations) {
      updatedConfig = configRepository.updateOperations(operations, activeUser.name);
    }

    if (section === 'aiPricing' || aiPricing) {
      updatedConfig = configRepository.updateAIPricing(aiPricing, activeUser.name);
    }

    if (section === 'apiKeys' || apiKeys) {
      updatedConfig = configRepository.updateApiKeys(apiKeys, activeUser.name);
    }

    // Quản lý Phân Quyền Module
    if (section === 'modulePermissions' || modulePermissions) {
      updatedConfig = configRepository.updateModulePermissions(modulePermissions, activeUser.name);
    }

    if (moduleKey && role && isEnabled !== undefined) {
      updatedConfig = configRepository.setModulePermission(moduleKey, role, isEnabled, activeUser.name);
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình hệ thống thành công!',
      config: updatedConfig,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/config POST:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
