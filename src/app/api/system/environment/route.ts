import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/backend/repositories/ConfigRepository';
import { userRepository } from '@/backend/repositories/UserRepository';

export async function GET() {
  try {
    const config = configRepository.getConfig();
    return NextResponse.json({
      success: true,
      environment: config.environment || 'official',
      commercial: {
        brandName: config.commercial?.brandName || '3D HUB VIETNAM',
        companyName: config.commercial?.companyName || 'Công ty Cổ phần Công nghệ In 3D Hub',
        hotline: config.commercial?.hotline || '1900 6833 - 0988.333.444',
        supportEmail: config.commercial?.supportEmail || 'contact@3dhub.vn',
        address: config.commercial?.address || 'Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh',
        taxCode: config.commercial?.taxCode || '0318998822',
        warrantyPolicy: config.commercial?.warrantyPolicy || 'Bảo hành 1 đổi 1 trong 7 ngày nếu lỗi in',
        vatEnabled: config.commercial?.vatEnabled ?? true,
        commercialMarginPercent: config.commercial?.commercialMarginPercent ?? 25,
      },
      profitMarginPercent: config.operations?.profitMarginPercent ?? 0,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
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
        { error: 'Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền chuyển đổi môi trường Staging / Official!' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { environment } = body;

    if (environment !== 'staging' && environment !== 'official') {
      return NextResponse.json(
        { error: 'Môi trường không hợp lệ. Chỉ chấp nhận "staging" hoặc "official".' },
        { status: 400 }
      );
    }

    const updatedConfig = configRepository.setEnvironment(environment, activeUser.name);

    return NextResponse.json({
      success: true,
      environment: updatedConfig.environment,
      message:
        environment === 'official'
          ? '🌟 Đã kích hoạt [Bản Thương Mại Official]: Vận hành sản xuất thực tế & bảng giá thương mại niêm yết.'
          : '🧪 Đã chuyển sang [Bản Thử Nghiệm Staging]: Kích hoạt sandbox thử nghiệm, giá gốc 0% phụ thu.',
      updatedConfig,
    });
  } catch (err: any) {
    console.error('Error in POST /api/system/environment:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
