export type PaymentMethod = 'vietqr' | 'momo' | 'wallet';

export type TransactionType = 'deposit' | 'order_payment' | 'ai_generation' | 'profile_unlock' | 'withdraw';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface IPaymentTransaction {
  id: string;
  userId: string;
  amountVnd: number;
  method: PaymentMethod;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  qrCodeUrl?: string;
  transferContent?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBankInfo {
  bankId: string; // 'MB' | 'VCB' | 'ICB'
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const OFFICIAL_BANK_INFO: IBankInfo = {
  bankId: 'MB',
  bankName: 'Ngân hàng Quân Đội (MB Bank)',
  accountNumber: '0901234567',
  accountName: '3D HUB VIETNAM',
};

export const OFFICIAL_MOMO_INFO = {
  phoneNumber: '0901234567',
  accountName: '3D HUB TECH VIETNAM',
};

/**
 * Tạo URL mã QR thanh toán chuẩn VietQR (Napas 24/7)
 */
export function generateVietQRUrl(amount: number, transferContent: string): string {
  const bank = OFFICIAL_BANK_INFO;
  const encodedContent = encodeURIComponent(transferContent);
  const encodedName = encodeURIComponent(bank.accountName);
  return `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
}

/**
 * Tạo URL mã QR MoMo
 */
export function generateMoMoQRUrl(amount: number, transferContent: string): string {
  // Sinh mã QR MoMo qua gateway chuẩn QuickPay QR
  const encodedContent = encodeURIComponent(transferContent);
  const momoPayload = `2|99|${OFFICIAL_MOMO_INFO.phoneNumber}|${OFFICIAL_MOMO_INFO.accountName}|${amount}|0|0|${transferContent}|transfer_p2p`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(momoPayload)}`;
}
