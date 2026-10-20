import { IModel3D } from '@/backend/domain/models';

export class ForumScraper {
  readonly platform = 'community-forum' as const;

  private forumKnowledgeEntries: Array<Omit<IModel3D, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'Bambu Forum: High Speed CoreXY Outer Wall Speed Harmonization Guide',
      author: 'BambuGuru_Forum',
      platform: 'community-forum',
      sourceUrl: 'https://forum.bambulab.com/t/outer-wall-speed-harmonization-for-hull-lines/49210',
      thumbnailUrl: '/thumbnails/benchy.svg',
      downloads: 36000,
      prints: 24000,
      likes: 4800,
      tags: ['forum', 'bambu', 'speed', 'outer_wall', 'orcaslicer', 'surface'],
      category: 'Forum Slicing Guides',
      filamentType: 'PLA Basic / PLA Matte',
      filamentWeightGrams: 25,
      printTimeMinutes: 50,
    },
    {
      title: 'Voron Forum: Stealthburner Hotend Input Shaping & Accelerometer Tuning',
      author: 'VoronCore_Dev',
      platform: 'community-forum',
      sourceUrl: 'https://forum.vorondesign.com/threads/input-shaper-adxl345-stealthburner.1249/',
      thumbnailUrl: '/thumbnails/voron-toolhead.svg',
      downloads: 52000,
      prints: 38000,
      likes: 7900,
      tags: ['forum', 'voron', 'input_shaper', 'klipper', 'resonance', 'tuning'],
      category: 'Printer Mods & Calibration',
      filamentType: 'ABS / ASA',
      filamentWeightGrams: 160,
      printTimeMinutes: 380,
    },
    {
      title: 'Prusa Forum: Eliminate Elephant Foot with PrusaSlicer XY Size Compensation',
      author: 'Josef_Fan_CZ',
      platform: 'community-forum',
      sourceUrl: 'https://forum.prusa3d.com/forum/original-prusa-i3-mk3s-mk3/elephant-foot-tuning-guide/',
      thumbnailUrl: '/thumbnails/gear.svg',
      downloads: 44000,
      prints: 29000,
      likes: 5600,
      tags: ['forum', 'prusa', 'elephant_foot', 'first_layer', 'tolerance'],
      category: 'Forum Slicing Guides',
      filamentType: 'PETG / PLA Tough',
      filamentWeightGrams: 35,
      printTimeMinutes: 65,
    },
    {
      title: 'Bambu Forum: Chamber Temperature Control for Warp-Free ABS/ASA Prints',
      author: 'EnclosurePro',
      platform: 'community-forum',
      sourceUrl: 'https://forum.bambulab.com/t/chamber-temp-tips-for-large-asa-prints/23119',
      thumbnailUrl: '/thumbnails/rugged-box.svg',
      downloads: 47000,
      prints: 31000,
      likes: 6200,
      tags: ['forum', 'bambu', 'abs', 'asa', 'chamber_temp', 'warping'],
      category: 'Material Science & Drying',
      filamentType: 'ASA / ABS',
      filamentWeightGrams: 110,
      printTimeMinutes: 240,
    },
  ];

  async scrapeTrending(keyword?: string, limit: number = 20): Promise<IModel3D[]> {
    const scrapedAt = new Date().toISOString();

    let filtered = this.forumKnowledgeEntries;
    if (keyword && keyword.trim().length > 0) {
      const q = keyword.toLowerCase().trim();
      const matched = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)) ||
          m.category.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        filtered = matched;
      }
    }

    return filtered.slice(0, limit).map((m, idx) => ({
      ...m,
      id: `forum-${idx + 1}-${Date.now()}`,
      createdAt: scrapedAt,
      updatedAt: scrapedAt,
    }));
  }
}
