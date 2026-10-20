import { IModel3D, ICrawlTaskResult, PlatformType } from '@/backend/domain/models';
import { MakerWorldScraper } from './MakerWorldScraper';
import { PrintablesScraper } from './PrintablesScraper';
import { ThingiverseScraper } from './ThingiverseScraper';
import { GitHub3DScraper } from './GitHub3DScraper';
import { ThangsScraper } from './ThangsScraper';
import { Cults3DScraper } from './Cults3DScraper';
import { RedditScraper } from './RedditScraper';
import { ForumScraper } from './ForumScraper';
import { UniversalUrlScraper, IUniversalScrapeResult } from './UniversalUrlScraper';
import { modelRepository } from '@/backend/repositories/ModelRepository';
import { obsidianVaultService } from '@/backend/services/knowledge/ObsidianVaultService';

export type CrawlDepth = 'standard' | 'deep' | 'ultra';

export interface IManualIngestInput {
  title: string;
  author: string;
  sourceUrl?: string;
  platform?: PlatformType;
  category?: string;
  filamentType?: string;
  filamentWeightGrams?: number;
  printTimeMinutes?: number;
  thumbnailUrl?: string;
  tags?: string[];
  layerHeightMm?: number;
  wallLoops?: number;
  infillPercent?: number;
  speedMmS?: number;
  nozzleTempC?: number;
  bedTempC?: number;
  proTips?: string[];
  problemSolved?: string;
  slicerNotes?: string;
  saveToObsidian?: boolean;
}

export class CrawlerEngine {
  private makerworldScraper = new MakerWorldScraper();
  private printablesScraper = new PrintablesScraper();
  private thingiverseScraper = new ThingiverseScraper();
  private githubScraper = new GitHub3DScraper();
  private thangsScraper = new ThangsScraper();
  private cults3dScraper = new Cults3DScraper();
  private redditScraper = new RedditScraper();
  private forumScraper = new ForumScraper();
  private universalUrlScraper = new UniversalUrlScraper();

  async executeCrawl(
    platform: PlatformType | 'all' = 'all',
    keyword?: string,
    depth: CrawlDepth = 'deep'
  ): Promise<ICrawlTaskResult> {
    const jobId = `crawl-${Date.now()}`;
    const logs: string[] = [];
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    // Xác định hạn ngạch quét dựa theo độ sâu (depth)
    let prLimit = 40;
    let ghLimit = 30;
    let mwLimit = 25;
    let thLimit = 20;
    let tgLimit = 20;
    let cuLimit = 15;
    let rdLimit = 15;
    let fmLimit = 10;

    if (depth === 'ultra') {
      prLimit = 100;
      ghLimit = 70;
      mwLimit = 55;
      thLimit = 40;
      tgLimit = 40;
      cuLimit = 30;
      rdLimit = 30;
      fmLimit = 20;
    } else if (depth === 'deep') {
      prLimit = 60;
      ghLimit = 45;
      mwLimit = 35;
      thLimit = 30;
      tgLimit = 25;
      cuLimit = 20;
      rdLimit = 20;
      fmLimit = 15;
    }

    if (platform === 'printables') prLimit = Math.floor(prLimit * 2.5);
    if (platform === 'github') ghLimit = Math.floor(ghLimit * 2.5);
    if (platform === 'makerworld') mwLimit = Math.floor(mwLimit * 2.5);
    if (platform === 'thingiverse') thLimit = Math.floor(thLimit * 2.5);
    if (platform === 'thangs') tgLimit = Math.floor(tgLimit * 2.5);
    if (platform === 'cults3d') cuLimit = Math.floor(cuLimit * 2.5);
    if (platform === 'reddit') rdLimit = Math.floor(rdLimit * 2.5);
    if (platform === 'community-forum') fmLimit = Math.floor(fmLimit * 2.5);

    logs.push(`[${timestamp}] 🚀 Khởi động siêu tiến trình Crawler Engine v3.5 Multi-Source (Độ sâu: ${depth.toUpperCase()})`);
    logs.push(
      `[${timestamp}] 🎯 Nền tảng mục tiêu: ${
        platform === 'all'
          ? 'TẤT CẢ (Printables, MakerWorld, Thingiverse, GitHub 3D, Thangs, Cults3D, Reddit, Diễn đàn)'
          : platform.toUpperCase()
      }`
    );

    if (keyword && keyword.trim().length > 0) {
      logs.push(`[${timestamp}] 🔍 Áp dụng bộ lọc từ khóa: "${keyword.trim()}"`);
    } else {
      logs.push(`[${timestamp}] ⚡ Chế độ quét: Đa luồng Trending, Featured, Slicing Tips & Troubleshooting`);
    }

    const collectedModels: IModel3D[] = [];

    try {
      // 1. Printables (Prusa) - Live GraphQL
      if (platform === 'printables' || platform === 'all') {
        const tPr = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Kết nối Printables API Gateway (GraphQL, mục tiêu: ${prLimit} models)...`);
        const prModels = await this.printablesScraper.scrapeTrending(keyword, prLimit);
        const durPr = ((Date.now() - tPr) / 1000).toFixed(1);
        if (prModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Printables] Thu thập thành công ${prModels.length} models THỰC TẾ (${durPr}s)`);
          collectedModels.push(...prModels);
        }
      }

      // 2. MakerWorld (Bambu Lab)
      if (platform === 'makerworld' || platform === 'all') {
        const tMw = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Kết nối MakerWorld / Bambu Lab Live Ecosystem (mục tiêu: ${mwLimit} models)...`);
        const mwModels = await this.makerworldScraper.scrapeTrending(keyword, mwLimit);
        const durMw = ((Date.now() - tMw) / 1000).toFixed(1);
        if (mwModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [MakerWorld] Đã thu thập ${mwModels.length} models Bambu Lab (${durMw}s)`);
          collectedModels.push(...mwModels);
        }
      }

      // 3. GitHub 3D Repositories
      if (platform === 'github' || platform === 'all') {
        const tGh = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Quét kho mã nguồn 3D GitHub (api.github.com, mục tiêu: ${ghLimit} repos)...`);
        const ghModels = await this.githubScraper.scrapeTrending(keyword, ghLimit);
        const durGh = ((Date.now() - tGh) / 1000).toFixed(1);
        if (ghModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [GitHub 3D] Tìm thấy ${ghModels.length} dự án CAD/STL mã nguồn mở (${durGh}s)`);
          collectedModels.push(...ghModels);
        }
      }

      // 4. Thingiverse Open Repositories
      if (platform === 'thingiverse' || platform === 'all') {
        const tTh = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Quét kho tệp STL Thingiverse qua Live CDN (mục tiêu: ${thLimit} models)...`);
        const thModels = await this.thingiverseScraper.scrapeTrending(keyword, thLimit);
        const durTh = ((Date.now() - tTh) / 1000).toFixed(1);
        if (thModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Thingiverse] Đã thu thập ${thModels.length} models Thingiverse (${durTh}s)`);
          collectedModels.push(...thModels);
        }
      }

      // 5. Thangs 3D Geometric Search Index
      if (platform === 'thangs' || platform === 'all') {
        const tTg = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Quét Thangs 3D Geometric Index (mục tiêu: ${tgLimit} models)...`);
        const tgModels = await this.thangsScraper.scrapeTrending(keyword, tgLimit);
        const durTg = ((Date.now() - tTg) / 1000).toFixed(1);
        if (tgModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Thangs 3D] Bóc tách ${tgModels.length} models cấu trúc hình học cao (${durTg}s)`);
          collectedModels.push(...tgModels);
        }
      }

      // 6. Cults3D Art & Commercial STL
      if (platform === 'cults3d' || platform === 'all') {
        const tCu = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Kết nối Cults3D Community STL & Designers (mục tiêu: ${cuLimit} models)...`);
        const cuModels = await this.cults3dScraper.scrapeTrending(keyword, cuLimit);
        const durCu = ((Date.now() - tCu) / 1000).toFixed(1);
        if (cuModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Cults3D] Đã thu thập ${cuModels.length} thiết kế chất lượng cao (${durCu}s)`);
          collectedModels.push(...cuModels);
        }
      }

      // 7. Reddit r/3Dprinting & r/BambuLab
      if (platform === 'reddit' || platform === 'all') {
        const tRd = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Trích xuất mẹo in & troubleshooting từ Reddit r/3Dprinting & r/BambuLab (${rdLimit} bài)...`);
        const rdModels = await this.redditScraper.scrapeTrending(keyword, rdLimit);
        const durRd = ((Date.now() - tRd) / 1000).toFixed(1);
        if (rdModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Reddit 3D] Đã bóc tách ${rdModels.length} bài chia sẻ giải pháp lỗi in thực chiến (${durRd}s)`);
          collectedModels.push(...rdModels);
        }
      }

      // 8. Diễn đàn Bambu Lab & Voron Forum
      if (platform === 'community-forum' || platform === 'all') {
        const tFm = Date.now();
        logs.push(`[${new Date().toISOString()}] 🌐 Bóc tách tri thức từ Bambu Lab Forum & Voron Design Forum (${fmLimit} chủ đề)...`);
        const fmModels = await this.forumScraper.scrapeTrending(keyword, fmLimit);
        const durFm = ((Date.now() - tFm) / 1000).toFixed(1);
        if (fmModels.length > 0) {
          logs.push(`[${new Date().toISOString()}] ✅ [Community Forum] Nạp thành công ${fmModels.length} bài phân tích kỹ thuật (${durFm}s)`);
          collectedModels.push(...fmModels);
        }
      }

      // Lưu trữ các model vừa crawl vào Repository và tự động lọc trùng
      const newlyAdded = modelRepository.addBulkModels(collectedModels);
      const duplicatesCleaned = modelRepository.deduplicate();
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

      logs.push(
        `[${new Date().toISOString()}] 💾 Hoàn tất trong ${totalTime}s: Tổng ${collectedModels.length} models (${newlyAdded} models mới lưu trữ, đã lọc sạch ${duplicatesCleaned} bản ghi trùng)`
      );

      return {
        jobId,
        platform: platform === 'all' ? 'makerworld' : platform,
        status: 'success',
        totalCrawled: collectedModels.length,
        newModelsFound: newlyAdded,
        logs,
        timestamp,
      };
    } catch (err: any) {
      logs.push(`[${new Date().toISOString()}] ❌ Lỗi crawler: ${err.message}`);
      return {
        jobId,
        platform: platform === 'all' ? 'makerworld' : platform,
        status: 'failed',
        totalCrawled: 0,
        newModelsFound: 0,
        logs,
        timestamp,
      };
    }
  }

  /**
   * Cào dữ liệu theo đường dẫn URL tùy chọn bất kỳ do người dùng cung cấp
   */
  async crawlUrl(url: string, category?: string): Promise<IUniversalScrapeResult> {
    const result = await this.universalUrlScraper.scrapeUrl(url, category);
    if (result.success && result.model) {
      modelRepository.addModel(result.model);
    }
    return result;
  }

  /**
   * Nạp tri thức, profile in hoặc bài viết mẹo in thủ công vào kho dữ liệu
   */
  manualIngest(payload: IManualIngestInput): { model: IModel3D; obsidianNotePath: string } {
    const id = `manual-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const model: IModel3D = {
      id,
      title: payload.title,
      author: payload.author || 'Maker Chuyên Nghiệp',
      platform: payload.platform || 'manual',
      sourceUrl: payload.sourceUrl || '#',
      thumbnailUrl: payload.thumbnailUrl || '/thumbnails/bambu-acc.svg',
      downloads: Math.floor(Math.random() * 3000 + 800),
      prints: Math.floor(Math.random() * 1200 + 300),
      likes: Math.floor(Math.random() * 600 + 150),
      tags: payload.tags || ['manual_entry', 'custom_profile'],
      category: payload.category || 'Manual Custom Profiles',
      filamentType: payload.filamentType || 'PLA Basic',
      filamentWeightGrams: payload.filamentWeightGrams || 50,
      printTimeMinutes: payload.printTimeMinutes || 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    modelRepository.addModel(model);

    let obsidianNotePath = '';
    if (payload.saveToObsidian !== false) {
      const safeTitle = payload.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `manual_${safeTitle}_${Date.now()}.md`;
      const markdown = `---
id: "${id}"
title: "${payload.title.replace(/"/g, '\\"')}"
author: "${payload.author}"
platform: "${payload.platform || 'manual'}"
filament: "${payload.filamentType || 'PLA Basic'}"
tags: [${(payload.tags || []).map((t) => `"${t}"`).join(', ')}]
created_at: "${timestamp}"
---

# ${payload.title}

> **Nguồn / Tác giả:** **${payload.author}** | **Nền tảng:** \`${payload.platform || 'manual'}\`  
> **Vật liệu:** \`${payload.filamentType || 'PLA Basic'}\`  
> **Thời gian in ước tính:** \`${payload.printTimeMinutes || 90} phút\`

---

## 🎯 Ghi Chú Kỹ Thuật & Cắt Lớp
${payload.slicerNotes || 'Thông số cắt lớp được nhập thủ công từ kinh nghiệm thực chiến.'}

${payload.problemSolved ? `### 🛠️ Vấn Đề Lỗi Đã Giải Quyết:\n${payload.problemSolved}\n` : ''}

## 📋 Thông Số Cắt Lớp Khuyến Nghị
- **Layer height:** \`${payload.layerHeightMm || 0.2} mm\`
- **Wall loops:** \`${payload.wallLoops || 3}\`
- **Infill density:** \`${payload.infillPercent || 20}%\`
- **Tốc độ in:** \`${payload.speedMmS || 60} mm/s\`
- **Nhiệt độ Nozzle:** \`${payload.nozzleTempC || 215}°C\`
- **Nhiệt độ Bed:** \`${payload.bedTempC || 60}°C\`

${payload.proTips && payload.proTips.length > 0 ? `## 💡 Mẹo Thực Chiến\n${payload.proTips.map((t) => `- ${t}`).join('\n')}\n` : ''}

## 🔗 Liên Kết Tri Thức Liên Quan
- [[${payload.title}]]
- [[${payload.filamentType?.split(' ')[0] || 'PLA'}]]
- [[Manual Custom Knowledge]]
`;
      obsidianNotePath = obsidianVaultService.saveNote('Community_Tips', filename, markdown);
    }

    return { model, obsidianNotePath };
  }

  getCrawledModels(platform?: PlatformType): IModel3D[] {
    modelRepository.deduplicate();
    if (platform) {
      return modelRepository.getModelsByPlatform(platform);
    }
    return modelRepository.getAllModels();
  }

  deduplicateModels(): number {
    return modelRepository.deduplicate();
  }

  resetDatabase(): void {
    modelRepository.resetToSeed();
  }
}

export const crawlerEngine = new CrawlerEngine();
