import { IModel3D } from '../../domain/models';

export class Cults3DScraper {
  readonly platform = 'cults3d' as const;

  private fallbackCultsIndex: Array<Omit<IModel3D, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'Lithophane Moon Lamp Sphere with Internal LED Socket',
      author: 'MoonMaker3D',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/home/lithophane-moon-lamp-sphere',
      thumbnailUrl: '/thumbnails/moon-lamp.svg',
      downloads: 87000,
      prints: 48000,
      likes: 22000,
      tags: ['moon', 'lamp', 'lithophane', 'lighting', 'home_decor'],
      category: 'Art & Home Decor',
      filamentType: 'PLA White Matte (0.12mm)',
      filamentWeightGrams: 220,
      printTimeMinutes: 720,
    },
    {
      title: 'Articulated Hexagonal Dragon with Magnetic Wings',
      author: 'ToonMechanics',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/game/hex-dragon-articulated',
      thumbnailUrl: '/thumbnails/dragon.svg',
      downloads: 94000,
      prints: 46000,
      likes: 25400,
      tags: ['dragon', 'articulated', 'cults3d', 'print_in_place'],
      category: 'Art & Figures',
      filamentType: 'PLA Silk Tricolor',
      filamentWeightGrams: 175,
      printTimeMinutes: 560,
    },
    {
      title: 'Rugged Waterproof EDC Utility Box with TPU Gasket',
      author: 'ToolboxEngineer',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/tool/rugged-waterproof-box',
      thumbnailUrl: '/thumbnails/rugged-box.svg',
      downloads: 125000,
      prints: 64000,
      likes: 31000,
      tags: ['box', 'rugged', 'waterproof', 'edc', 'latches'],
      category: 'Tools & EDC',
      filamentType: 'PETG / TPU 95A',
      filamentWeightGrams: 185,
      printTimeMinutes: 380,
    },
    {
      title: 'Spiral Voronoi Golden Ratio Flower Vase',
      author: 'OrganicDesigns',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/home/spiral-voronoi-golden-vase',
      thumbnailUrl: '/thumbnails/spiral-vase.svg',
      downloads: 68000,
      prints: 39000,
      likes: 18900,
      tags: ['vase', 'voronoi', 'spiral', 'golden_ratio', 'spiral_mode'],
      category: 'Art & Home Decor',
      filamentType: 'PLA Silk / PETG Translucent',
      filamentWeightGrams: 90,
      printTimeMinutes: 180,
    },
    {
      title: 'Heavy Duty Under-Desk Dual Headphone Hanger',
      author: 'DeskTech_3D',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/gadget/under-desk-headphone-mount',
      thumbnailUrl: '/thumbnails/headphone-hanger.svg',
      downloads: 51000,
      prints: 33000,
      likes: 14200,
      tags: ['headphone', 'desk', 'hanger', 'workspace', 'mount'],
      category: 'Gadgets & Setup',
      filamentType: 'PLA Tough / PETG',
      filamentWeightGrams: 75,
      printTimeMinutes: 140,
    },
    {
      title: 'Honeycomb Storage Wall (HSW) Heavy Multi-Hook Pack',
      author: 'RostaP_Design',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/tool/honeycomb-storage-wall-hooks',
      thumbnailUrl: '/thumbnails/hsw.svg',
      downloads: 160000,
      prints: 89000,
      likes: 41000,
      tags: ['hsw', 'honeycomb', 'wall_storage', 'organizer', 'hooks'],
      category: 'Workshop & Garage',
      filamentType: 'PETG / PLA Basic',
      filamentWeightGrams: 60,
      printTimeMinutes: 110,
    },
    {
      title: 'High-Precision Digital Vernier Caliper Calibration Rig',
      author: 'PrecisionMaker',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/tool/caliper-calibration-rig',
      thumbnailUrl: '/thumbnails/caliper.svg',
      downloads: 42000,
      prints: 24000,
      likes: 9800,
      tags: ['caliper', 'calibration', 'accuracy', 'benchmark', 'metrology'],
      category: 'Calibration & Tools',
      filamentType: 'PLA Matte (Low Shrinkage)',
      filamentWeightGrams: 40,
      printTimeMinutes: 85,
    },
    {
      title: 'Foldable Ergonomic Laptop Riser Stand for 13-16 Inch',
      author: 'MobileWorkspace',
      platform: 'cults3d',
      sourceUrl: 'https://cults3d.com/en/3d-model/gadget/foldable-laptop-stand-ergonomic',
      thumbnailUrl: '/thumbnails/laptop-stand.svg',
      downloads: 79000,
      prints: 41000,
      likes: 19800,
      tags: ['laptop_stand', 'ergonomic', 'workspace', 'desk_setup', 'portable'],
      category: 'Gadgets & Setup',
      filamentType: 'PETG Basic',
      filamentWeightGrams: 140,
      printTimeMinutes: 260,
    },
  ];

  async scrapeTrending(keyword?: string, limit: number = 30): Promise<IModel3D[]> {
    const scrapedAt = new Date().toISOString();

    let filtered = this.fallbackCultsIndex;
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
      id: `cults-${idx + 1}-${Date.now()}`,
      createdAt: scrapedAt,
      updatedAt: scrapedAt,
    }));
  }
}
