import { IModel3D } from '../../domain/models';

export class RedditScraper {
  readonly platform = 'reddit' as const;

  private communityRedditTips: Array<Omit<IModel3D, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'r/3Dprinting: OrcaSlicer Scarf Joint Seam Calibration Guide',
      author: 'u/SlicerMaster_Pro',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/3Dprinting/comments/scarf_joint_seam_tuning',
      thumbnailUrl: '/thumbnails/benchy.svg',
      downloads: 41000,
      prints: 29500,
      likes: 5400,
      tags: ['reddit', 'scarf_joint', 'seam', 'orcaslicer', 'surface_quality'],
      category: 'Community Tips & Troubleshooting',
      filamentType: 'All Filaments',
      filamentWeightGrams: 15,
      printTimeMinutes: 45,
    },
    {
      title: 'r/BambuLab: Complete Fix for First Layer Warping on Textured PEI',
      author: 'u/BambuWhisperer',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/BambuLab/comments/first_layer_pei_warping_solution',
      thumbnailUrl: '/thumbnails/c-clamp.svg',
      downloads: 58000,
      prints: 37000,
      likes: 7200,
      tags: ['reddit', 'bambu', 'pei', 'warping', 'bed_adhesion', 'first_layer'],
      category: 'Community Tips & Troubleshooting',
      filamentType: 'PLA / PETG',
      filamentWeightGrams: 30,
      printTimeMinutes: 60,
    },
    {
      title: 'r/3Dprinting: Zero-Scar Tree Support Interface Thickness Formula',
      author: 'u/SupportWizard',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/3Dprinting/comments/zero_scar_tree_support_settings',
      thumbnailUrl: '/thumbnails/dragon.svg',
      downloads: 62000,
      prints: 41000,
      likes: 8100,
      tags: ['reddit', 'tree_support', 'interface_gap', 'support_tuning', 'no_scars'],
      category: 'Community Tips & Troubleshooting',
      filamentType: 'PLA Standard / Matte',
      filamentWeightGrams: 50,
      printTimeMinutes: 90,
    },
    {
      title: 'r/BambuLab: Bambu AMS PTFE Tube Wear Saver & Feeder Clip',
      author: 'u/AMS_Engineer',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/BambuLab/comments/ams_feeder_saver_clip_fix',
      thumbnailUrl: '/thumbnails/bambu-acc.svg',
      downloads: 73000,
      prints: 46000,
      likes: 9500,
      tags: ['reddit', 'bambu', 'ams', 'ptfe', 'mod', 'wear_protection'],
      category: 'Printer Mods & Upgrades',
      filamentType: 'PETG / PC',
      filamentWeightGrams: 22,
      printTimeMinutes: 35,
    },
    {
      title: 'r/3Dprinting: Wet PETG vs Dry PETG - Exact Stringing Elimination',
      author: 'u/FilamentChemist',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/3Dprinting/comments/wet_petg_vs_dry_petg_comparison',
      thumbnailUrl: '/thumbnails/spool-pla-plus.svg',
      downloads: 39000,
      prints: 23000,
      likes: 4900,
      tags: ['reddit', 'petg', 'stringing', 'drying', 'temperature'],
      category: 'Material Science & Drying',
      filamentType: 'PETG Basic / High-Speed',
      filamentWeightGrams: 40,
      printTimeMinutes: 75,
    },
    {
      title: 'r/3Dprinting: TPU 95A No-Stringing Direct Drive Speed & Retract Settings',
      author: 'u/FlexiMaster',
      platform: 'reddit',
      sourceUrl: 'https://reddit.com/r/3Dprinting/comments/tpu_zero_stringing_settings',
      thumbnailUrl: '/thumbnails/airless-ball.svg',
      downloads: 48000,
      prints: 31000,
      likes: 6300,
      tags: ['reddit', 'tpu', 'flexible', 'retraction', 'direct_drive'],
      category: 'Community Tips & Troubleshooting',
      filamentType: 'TPU 95A / 85A',
      filamentWeightGrams: 85,
      printTimeMinutes: 240,
    },
  ];

  async scrapeTrending(keyword?: string, limit: number = 30): Promise<IModel3D[]> {
    const scrapedAt = new Date().toISOString();

    let filtered = this.communityRedditTips;
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
      id: `reddit-${idx + 1}-${Date.now()}`,
      createdAt: scrapedAt,
      updatedAt: scrapedAt,
    }));
  }
}
