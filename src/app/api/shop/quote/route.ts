import { NextRequest, NextResponse } from 'next/server';
import { shopService } from '@/backend/services/shop/ShopService';
import { IServiceQuoteRequest } from '@/backend/domain/shop';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as IServiceQuoteRequest;

    if (!body.technology || !body.weightGrams) {
      return NextResponse.json({ error: 'Thông số tính toán không đầy đủ' }, { status: 400 });
    }

    const quote = shopService.calculateServiceQuote(body);
    return NextResponse.json({ success: true, quote });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tính báo giá in 3D' }, { status: 500 });
  }
}
