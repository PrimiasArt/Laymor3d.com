import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/backend/repositories/UserRepository';
import { ROLE_PERMISSIONS, UserRole } from '@/backend/domain/user';

export async function GET() {
  const user = userRepository.getActiveUser();
  const permissions = ROLE_PERMISSIONS[user.role];
  const allUsers = userRepository.getAllUsers();

  return NextResponse.json({
    success: true,
    user,
    permissions,
    allUsers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, role, name, email, avatar, googleId, amount } = body;

    // 1. Đăng nhập hoặc đăng ký nhanh qua Google OAuth
    if (action === 'google_login') {
      if (!email) {
        return NextResponse.json({ error: 'Email Google là bắt buộc' }, { status: 400 });
      }

      const { user: gUser, isNew } = userRepository.loginOrCreateGoogleUser({
        email,
        name: name || email.split('@')[0],
        avatar,
        googleId,
      });

      return NextResponse.json({
        success: true,
        user: gUser,
        isNew,
        permissions: ROLE_PERMISSIONS[gUser.role],
        message: isNew
          ? `🎉 Chào mừng ${gUser.name}! Bạn được tặng ngay 50.000 đ credit ví.`
          : `👋 Chào mừng trở lại, ${gUser.name}! Đã đăng nhập bằng Google.`,
      });
    }

    // 2. Chuyển đổi User active nhanh (Switch User)
    if (action === 'switch_user') {
      const switched = userRepository.switchActiveUser(userId);
      if (!switched) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        user: switched,
        permissions: ROLE_PERMISSIONS[switched.role],
        message: `Đã chuyển sang tài khoản: ${switched.name} (${switched.role.toUpperCase()})`,
      });
    }

    // 3. Đổi role của user
    if (action === 'switch_role') {
      const targetUserId = userId || userRepository.getActiveUser().id;
      userRepository.updateRole(targetUserId, role as UserRole);
      const updated = userRepository.getActiveUser();
      return NextResponse.json({
        success: true,
        user: updated,
        permissions: ROLE_PERMISSIONS[updated.role],
        message: `Đã cập nhật vai trò sang: ${updated.role.toUpperCase()}`,
      });
    }

    // 4. Tạo tài khoản mới từ Admin hoặc đăng ký
    if (action === 'create_user' || action === 'register') {
      const newUser = userRepository.createUser(
        name || 'Thành Viên Mới',
        email || `user${Date.now()}@gmail.com`,
        (role as UserRole) || 'user',
        avatar
      );
      if (action === 'register') {
        userRepository.switchActiveUser(newUser.id);
      }
      return NextResponse.json({
        success: true,
        user: newUser,
        permissions: ROLE_PERMISSIONS[newUser.role],
        message: 'Tạo tài khoản thành công!',
      });
    }

    // 5. Nạp / điều chỉnh số dư ví từ Admin
    if (action === 'adjust_balance') {
      const targetUserId = userId || userRepository.getActiveUser().id;
      const delta = Number(amount) || 0;
      const newBal = userRepository.updateBalance(targetUserId, delta);
      userRepository.addTransaction({
        userId: targetUserId,
        amountVnd: Math.abs(delta),
        method: 'wallet',
        type: delta >= 0 ? 'deposit' : 'withdraw',
        status: 'completed',
        description: body.description || `Điều chỉnh số dư ví quản trị: ${delta >= 0 ? '+' : '-'}${Math.abs(delta).toLocaleString('vi-VN')} đ`,
      });
      return NextResponse.json({
        success: true,
        balanceVnd: newBal,
        message: `Đã điều chỉnh ${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ`,
      });
    }

    // 6. Khóa / Mở khóa tài khoản (Toggle Status)
    if (action === 'toggle_status') {
      if (!userId) {
        return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
      }
      const updated = userRepository.toggleUserStatus(userId);
      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        user: updated,
        message: `Tài khoản ${updated.name} hiện đang: ${updated.status === 'active' ? 'Đang hoạt động' : 'Đã tạm khóa'}`,
      });
    }

    // 7. Cập nhật thông tin người dùng
    if (action === 'update_user') {
      if (!userId) {
        return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
      }
      const updated = userRepository.updateUser(userId, {
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: body.role,
        status: body.status,
      });
      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        user: updated,
        message: `Đã cập nhật thông tin cho ${updated.name}`,
      });
    }

    // 8. Xóa tài khoản
    if (action === 'delete_user') {
      if (!userId) {
        return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
      }
      const deleted = userRepository.deleteUser(userId);
      if (!deleted) {
        return NextResponse.json({ error: 'Không thể xóa tài khoản này' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Đã xóa tài khoản thành công',
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
