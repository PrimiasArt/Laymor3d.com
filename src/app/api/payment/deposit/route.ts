import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/backend/repositories/UserRepository';
import {
  generateVietQRUrl,
  generateMoMoQRUrl,
  OFFICIAL_BANK_INFO,
  OFFICIAL_MOMO_INFO,
  PaymentMethod,
} from '@/backend/domain/payment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, method = 'vietqr' } = body;

    const depositAmount = Number(amount) || 50000;
    if (depositAmount < 10000) {
      return NextResponse.json({ error: 'Số tiền nạp tối thiểu là 10.000 VNĐ' }, { status: 400 });
    }

    const activeUser = userRepository.getActiveUser();
    const shortCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const transferContent = `3DHUB NAP ${activeUser.id.replace('usr-', '').toUpperCase()} ${shortCode}`;

    let qrCodeUrl = '';
    if (method === 'vietqr') {
      qrCodeUrl = generateVietQRUrl(depositAmount, transferContent);
    } else {
      qrCodeUrl = generateMoMoQRUrl(depositAmount, transferContent);
    }

    const transaction = userRepository.addTransaction({
      userId: activeUser.id,
      amountVnd: depositAmount,
      method: method as PaymentMethod,
      type: 'deposit',
      status: 'pending',
      description: `Nạp ${depositAmount.toLocaleString('vi-VN')} đ qua ${method === 'vietqr' ? 'VietQR Napas 24/7' : 'Ví MoMo'}`,
      qrCodeUrl,
      transferContent,
      accountNumber: method === 'vietqr' ? OFFICIAL_BANK_INFO.accountNumber : OFFICIAL_MOMO_INFO.phoneNumber,
      accountName: method === 'vietqr' ? OFFICIAL_BANK_INFO.accountName : OFFICIAL_MOMO_INFO.accountName,
      bankName: method === 'vietqr' ? OFFICIAL_BANK_INFO.bankName : 'Ví Điện Tử MoMo',
    });

    return NextResponse.json({
      success: true,
      transaction,
      bankInfo: OFFICIAL_BANK_INFO,
      momoInfo: OFFICIAL_MOMO_INFO,
      qrCodeUrl,
      transferContent,
      amountVnd: depositAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
