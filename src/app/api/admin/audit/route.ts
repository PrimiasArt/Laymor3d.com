import { NextRequest, NextResponse } from 'next/server';
import { auditLogRepository } from '@/backend/repositories/AuditLogRepository';
import { userRepository } from '@/backend/repositories/UserRepository';

export async function GET(req: NextRequest) {
  try {
    const activeUser = userRepository.getActiveUser();
    if (!activeUser || (activeUser.role !== 'admin' && activeUser.role !== 'mod')) {
      return NextResponse.json({ error: 'Chỉ Quản trị viên và Điều phối viên mới có quyền xem Nhật Ký Kiểm Toán' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const search = searchParams.get('search') || undefined;

    const logs = auditLogRepository.getAllLogs({ action, severity, search });
    const stats = auditLogRepository.getAuditStats();

    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lấy nhật ký kiểm toán' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const activeUser = userRepository.getActiveUser();
    if (!activeUser || (activeUser.role !== 'admin' && activeUser.role !== 'mod')) {
      return NextResponse.json({ error: 'Không có quyền ghi nhận nhật ký kiểm toán' }, { status: 403 });
    }

    const body = await req.json();
    const { action, actionTitle, entityType, entityId, description, severity } = body;

    const entry = auditLogRepository.log({
      actorId: activeUser.id,
      actorName: activeUser.name,
      actorRole: activeUser.role,
      action: action || 'config_update',
      actionTitle: actionTitle || 'Thay Đổi Hệ Thống',
      entityType: entityType || 'config',
      entityId,
      description: description || 'Cập nhật cấu hình quản trị',
      severity: severity || 'info',
    });

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi ghi nhật ký kiểm toán' }, { status: 500 });
  }
}
