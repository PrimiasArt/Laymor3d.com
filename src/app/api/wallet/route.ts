import { NextRequest, NextResponse } from 'next/server';
import { expertProfileService } from '@/backend/services/slicing/ExpertProfileService';
import { userWalletService } from '@/backend/services/wallet/UserWalletService';

export async function GET() {
  return NextResponse.json({
    success: true,
    balanceVnd: userWalletService.getBalance(),
    unlockedProfileIds: userWalletService.getUnlockedProfiles(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, amount, modelId } = body;

    // 1. Nạp tiền vào tài khoản
    if (action === 'topup') {
      const topUpAmount = Number(amount) || 50000;
      const newBal = userWalletService.topUp(topUpAmount);
      return NextResponse.json({
        success: true,
        message: `Nạp thành công ${topUpAmount.toLocaleString('vi-VN')} đ!`,
        newBalanceVnd: newBal,
      });
    }

    // 2. Mở khóa Profile In Pro (Phí: 1.000 VNĐ)
    if (action === 'unlock') {
      const UNLOCK_COST = 1000;
      if (!modelId) {
        return NextResponse.json({ error: 'Thiếu modelId' }, { status: 400 });
      }

      if (userWalletService.hasUnlocked(modelId)) {
        const profile = expertProfileService.getProfile(modelId);
        return NextResponse.json({
          success: true,
          alreadyUnlocked: true,
          profile,
          balanceVnd: userWalletService.getBalance(),
          unlockedProfileIds: userWalletService.getUnlockedProfiles(),
        });
      }

      const result = userWalletService.unlock(modelId, UNLOCK_COST);
      if (!result.success) {
        return NextResponse.json({
          error: 'Số dư không đủ. Vui lòng nạp thêm tiền để mở khóa Profile Pro!',
          balanceVnd: userWalletService.getBalance(),
          requiredVnd: UNLOCK_COST,
        }, { status: 402 });
      }

      const profile = expertProfileService.getProfile(modelId);
      return NextResponse.json({
        success: true,
        message: `Đã mở khóa thành công Profile In Chuyên Nghiệp (-1.000 đ)`,
        profile,
        balanceVnd: userWalletService.getBalance(),
        unlockedProfileIds: userWalletService.getUnlockedProfiles(),
      });
    }

    // 3. Khóa lại Profile In (Dành cho Demo tính năng)
    if (action === 'lock') {
      if (!modelId) {
        return NextResponse.json({ error: 'Thiếu modelId' }, { status: 400 });
      }

      userWalletService.lock(modelId, 1000);

      return NextResponse.json({
        success: true,
        message: `Đã khóa lại Profile in mẫu (+1.000 đ hoàn lại)`,
        balanceVnd: userWalletService.getBalance(),
        unlockedProfileIds: userWalletService.getUnlockedProfiles(),
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
