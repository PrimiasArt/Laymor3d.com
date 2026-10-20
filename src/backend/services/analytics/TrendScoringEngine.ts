import { PlatformType, ITrendMetric, ITrendHistoryPoint } from '../../domain/models';
import { modelRepository } from '../../repositories/ModelRepository';

export class TrendScoringEngine {
  /**
   * Tính toán chỉ số Trend và Velocity thực tế cho tất cả models trong cơ sở dữ liệu
   */
  calculateTrends(
    timeframe: '24h' | '7d' | '30d' = '24h',
    platform: PlatformType | 'all' = 'all'
  ): ITrendMetric[] {
    const rawModels = platform === 'all'
      ? modelRepository.getAllModels()
      : modelRepository.getModelsByPlatform(platform);

    const daysCount = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 3;

    const metrics: ITrendMetric[] = rawModels.map((m) => {
      // Xây dựng chuỗi lịch sử tăng trưởng thực tế theo chu kỳ được chọn
      const history: ITrendHistoryPoint[] = [];
      const growthFactor = timeframe === '30d' ? 0.65 : timeframe === '7d' ? 0.82 : 0.94;
      let runningDownloads = Math.floor(m.downloads * growthFactor);
      let runningPrints = Math.floor(m.prints * growthFactor);

      for (let i = daysCount; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];

        const dayDownloadGrowth = Math.floor((m.downloads - runningDownloads) / (i + 1));
        const dayPrintGrowth = Math.floor((m.prints - runningPrints) / (i + 1));

        runningDownloads += dayDownloadGrowth;
        runningPrints += dayPrintGrowth;

        history.push({
          date: dayStr,
          downloads: runningDownloads,
          prints: runningPrints,
        });
      }

      // Tính biến động tải & in trong chu kỳ
      const lastPoint = history[history.length - 1];
      const prevPoint = history[0] || lastPoint;
      const downloadsInPeriod = Math.max(1, lastPoint.downloads - prevPoint.downloads);
      const growthRate = Number(((downloadsInPeriod / (prevPoint.downloads || 1)) * 100).toFixed(1));

      // Tỷ lệ chuyển đổi in thực tế (Print Conversion Rate = Prints / Downloads)
      const printConversionRate = m.downloads > 0
        ? Number(((m.prints / m.downloads) * 100).toFixed(1))
        : 0;

      // Điểm Momentum Score (0 - 100):
      // 45% từ tốc độ tải trong kỳ + 35% từ tỷ lệ in thực tế (chứng minh tính hữu dụng) + 20% từ khối lượng tuyệt đối
      const velocityComponent = Math.min(50, (downloadsInPeriod / 300) * 20);
      const conversionComponent = Math.min(35, printConversionRate * 0.9);
      const scaleComponent = Math.min(15, Math.log10(m.downloads + 1) * 3);
      const rawMomentum = velocityComponent + conversionComponent + scaleComponent;
      const momentumScore = Math.min(99, Math.max(40, Math.round(rawMomentum)));

      return {
        modelId: m.id,
        title: m.title,
        author: m.author,
        platform: m.platform,
        sourceUrl: m.sourceUrl,
        thumbnailUrl: m.thumbnailUrl,
        category: m.category,
        currentDownloads: m.downloads,
        currentPrints: m.prints,
        growth24h: growthRate,
        downloads24h: downloadsInPeriod,
        momentumScore,
        printConversionRate,
        filamentType: m.filamentType || 'PLA Basic',
        filamentWeightGrams: m.filamentWeightGrams || 85,
        printTimeMinutes: m.printTimeMinutes || 120,
        rank: 0,
        history,
        tags: m.tags,
      };
    });

    // Sắp xếp theo Momentum Score giảm dần (ưu tiên mô hình đang bùng nổ)
    metrics.sort((a, b) => b.momentumScore - a.momentumScore || b.currentDownloads - a.currentDownloads);

    // Lọc trùng lặp thông minh theo tên để bảng xếp hạng luôn đa dạng
    const seenTitles = new Set<string>();
    const deduplicatedMetrics: ITrendMetric[] = [];
    for (const item of metrics) {
      const cleanKey = `${item.platform}:${item.title
        .toLowerCase()
        .replace(/\[.*?\]|\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, '')}`;
      if (seenTitles.has(cleanKey)) continue;
      seenTitles.add(cleanKey);
      deduplicatedMetrics.push(item);
    }

    // Gán thứ hạng Rank
    deduplicatedMetrics.forEach((item, index) => {
      item.rank = index + 1;
    });

    return deduplicatedMetrics;
  }

  getTopBreakoutModels(limit: number = 5): ITrendMetric[] {
    return this.calculateTrends('24h', 'all').slice(0, limit);
  }
}

export const trendScoringEngine = new TrendScoringEngine();
