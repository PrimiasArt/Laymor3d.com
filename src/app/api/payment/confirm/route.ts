import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/backend/repositories/UserRepository';
import { userWalletService } from '@/backend/services/wallet/UserWalletService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, amount } = body;

    const activeUser = userRepository.getActiveUser();
    const confirmedAmount = Number(amount) || 50000;

    // Cập nhật số dư ví trong UserRepository và UserWalletService
    const newBalUser = userRepository.updateBalance(activeUser.id, confirmedAmount);
    userWalletService.topUp(confirmedAmount);

    // Cập nhật trạng thái transaction
    const tx = userRepository.getAllTransactions().find((t) => t.id === transactionId);
    if (tx) {
      tx.status = 'completed';
      tx.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      message: `Nạp thành công ${confirmedAmount.toLocaleString('vi-VN')} đ vào ví!`,
      newBalanceVnd: newBalUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
