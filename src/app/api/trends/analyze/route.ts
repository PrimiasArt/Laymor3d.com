import { NextRequest, NextResponse } from 'next/server';
import { geminiAnalyticsService } from '@/backend/services/analytics/GeminiAnalyticsService';
import { trendScoringEngine } from '@/backend/services/analytics/TrendScoringEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const model = searchParams.get('model') || undefined;

    // Lấy dữ liệu mô hình thực tế và tính điểm trend
    const allTrends = trendScoringEngine.calculateTrends('24h', 'all');
    const trends = category && category !== 'all'
      ? allTrends.filter(t => t.category?.toLowerCase() === category.toLowerCase())
      : allTrends;

    const analysis = await geminiAnalyticsService.analyzeTrends(trends, model);

    return NextResponse.json({
      success: true,
      analysis,
      trendsCount: trends.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi khi phân tích bằng Gemini' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category || undefined;
    const model = body.model || undefined;

    const allTrends = trendScoringEngine.calculateTrends('24h', 'all');
    const trends = category && category !== 'all'
      ? allTrends.filter(t => t.category?.toLowerCase() === category.toLowerCase())
      : allTrends;

    const analysis = await geminiAnalyticsService.analyzeTrends(trends, model);

    return NextResponse.json({
      success: true,
      analysis,
      trendsCount: trends.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi phân tích Gemini' }, { status: 500 });
  }
}
