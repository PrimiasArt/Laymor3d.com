import { NextRequest, NextResponse } from 'next/server';
import { PlatformType } from '@/backend/domain/models';
import { trendScoringEngine } from '@/backend/services/analytics/TrendScoringEngine';
import { tagAnalytics } from '@/backend/services/analytics/TagAnalytics';
import { modelRepository } from '@/backend/repositories/ModelRepository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get('timeframe') as '24h' | '7d' | '30d') || '24h';
    const platform = (searchParams.get('platform') as PlatformType | 'all') || 'all';

    const allModels = modelRepository.getAllModels();
    const trends = trendScoringEngine.calculateTrends(timeframe, platform);
    const hotTags = tagAnalytics.getHotTags();
    const categories = tagAnalytics.getCategoryDistribution();
    const filamentStats = tagAnalytics.getFilamentDistribution();
    const platformStats = tagAnalytics.getPlatformDistribution();

    const totalDownloads = allModels.reduce((acc, m) => acc + m.downloads, 0);
    const totalPrints = allModels.reduce((acc, m) => acc + m.prints, 0);
    const surgeVolume = trends.reduce((acc, t) => acc + t.downloads24h, 0);
    const avgConversionRate = totalDownloads > 0
      ? Number(((totalPrints / totalDownloads) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      timeframe,
      platform,
      totalModels: allModels.length,
      filteredCount: trends.length,
      summary: {
        totalTrackedModels: allModels.length,
        totalDownloads,
        totalPrints,
        avgConversionRate,
        surgeVolume,
      },
      trends,
      hotTags,
      categories,
      filamentStats,
      platformStats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
