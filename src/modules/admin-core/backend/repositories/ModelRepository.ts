import fs from 'fs';
import path from 'path';
import { IModel3D, IAI3DJob, PlatformType } from '@/backend/domain/models';

/**
 * 24 Mô hình 3D thực tế hạt nhân ban đầu (Seed Models)
 * Đảm bảo hệ thống luôn có dữ liệu phong phú ngay từ lần khởi chạy đầu tiên
 */
const SEED_MODELS: IModel3D[] = [
  // 1. MAKERWORLD
  {
    id: 'mw-ams-feeder-funnel',
    title: 'Bambu Lab AMS Feeder Funnel & Saver Guard v3.2',
    author: 'BambuTechLab',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/feeder-saver',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 38200,
    prints: 18400,
    likes: 6700,
    tags: ['bambu', 'ams', 'feeder', 'upgrade', 'wear_protection'],
    category: 'Bambu AMS Upgrades',
    filamentType: 'PLA Tough',
    filamentWeightGrams: 28,
    printTimeMinutes: 45,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'mw-x1c-glass-riser',
    title: 'Bambu X1C / P1S Top Glass Riser with Magnetic Vents',
    author: 'MakerFlow_3D',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/glass-riser-vents',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 45100,
    prints: 21500,
    likes: 8900,
    tags: ['bambu', 'x1c', 'p1s', 'glass_riser', 'ventilation', 'led_mount'],
    category: 'Printer Enclosure & Mods',
    filamentType: 'PETG Basic',
    filamentWeightGrams: 210,
    printTimeMinutes: 380,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'mw-poop-chute-bin',
    title: 'Bambu Magnetic Purge Waste Chute Bucket & Bin',
    author: 'DesignCraft3D',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/purge-bucket',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 62000,
    prints: 32000,
    likes: 11200,
    tags: ['bambu', 'purge', 'poop_chute', 'bin', 'accessories'],
    category: 'Bambu Lab Accessories',
    filamentType: 'PLA Basic',
    filamentWeightGrams: 145,
    printTimeMinutes: 240,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'mw-spool-adapter-cardboard',
    title: 'Universal Cardboard Spool Adapter Ring for Bambu AMS',
    author: 'FilamentMaster',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/spool-adapter',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 54300,
    prints: 29800,
    likes: 9400,
    tags: ['bambu', 'spool', 'adapter', 'ams', 'esun', 'sunlu'],
    category: 'Bambu AMS Upgrades',
    filamentType: 'PLA Tough',
    filamentWeightGrams: 42,
    printTimeMinutes: 65,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'mw-scraper-ergonomic',
    title: 'Bambu Lab Official Bed Scraper - Ergonomic Grip',
    author: 'BambuLab_Community',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/ergonomic-scraper',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 71000,
    prints: 41000,
    likes: 13500,
    tags: ['bambu', 'scraper', 'tools', 'bed_cleaning'],
    category: 'Tools & Accessories',
    filamentType: 'PLA Basic',
    filamentWeightGrams: 35,
    printTimeMinutes: 50,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'mw-ptfe-guide-extruder',
    title: 'Bambu PTFE Tube Guide - Anti-Abrasion & Less Resistance',
    author: 'PrintOptimizer',
    platform: 'makerworld',
    sourceUrl: 'https://makerworld.com/en/models/ptfe-guide',
    thumbnailUrl: '/thumbnails/bambu-acc.svg',
    downloads: 48900,
    prints: 26000,
    likes: 8200,
    tags: ['bambu', 'ptfe', 'extruder', 'guide', 'ams'],
    category: 'Bambu Lab Accessories',
    filamentType: 'PETG Basic',
    filamentWeightGrams: 16,
    printTimeMinutes: 30,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },

  // 2. PRINTABLES
  {
    id: 'pr-crystal-dragon',
    title: 'Articulated Crystal Dragon V3 - Print-in-Place',
    author: 'Cinderwing3D',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/crystal-dragon-v3',
    thumbnailUrl: '/thumbnails/dragon.svg',
    downloads: 148000,
    prints: 79000,
    likes: 24500,
    tags: ['dragon', 'articulated', 'print_in_place', 'fidget', 'silk_pla'],
    category: 'Toys & Games',
    filamentType: 'PLA Silk Dual Color',
    filamentWeightGrams: 125,
    printTimeMinutes: 420,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'pr-3d-benchy',
    title: '3D Benchy - The Jolly 3D Printing Benchmark',
    author: 'CreativeTools',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/3d-benchy',
    thumbnailUrl: '/thumbnails/benchy.svg',
    downloads: 290000,
    prints: 185000,
    likes: 54000,
    tags: ['benchy', 'calibration', 'test', 'benchmark', 'speed_benchy'],
    category: 'Calibration & Benchmark',
    filamentType: 'PLA Basic',
    filamentWeightGrams: 14,
    printTimeMinutes: 28,
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'pr-honeycomb-storage-wall',
    title: 'Honeycomb Storage Wall (HSW) Modular System',
    author: 'RostaP',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/honeycomb-storage-wall',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 124000,
    prints: 68000,
    likes: 21000,
    tags: ['hsw', 'storage', 'wall', 'organizer', 'modular', 'workshop'],
    category: 'Household',
    filamentType: 'PETG Basic',
    filamentWeightGrams: 85,
    printTimeMinutes: 180,
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'pr-cable-management-clips',
    title: 'Under Desk Cable Management Spine & Raceway',
    author: 'DeskGeek',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/cable-spine',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 67000,
    prints: 34000,
    likes: 12300,
    tags: ['cable', 'organizer', 'desk', 'workspace', 'home_office'],
    category: 'Household',
    filamentType: 'PLA Matte',
    filamentWeightGrams: 65,
    printTimeMinutes: 135,
    createdAt: '2026-09-14T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'pr-fidget-infinity-cube',
    title: 'Precision Fidget Infinity Cube - Zero Tolerance Joints',
    author: 'GeomMaker',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/infinity-cube',
    thumbnailUrl: '/thumbnails/robot.svg',
    downloads: 82000,
    prints: 43000,
    likes: 14700,
    tags: ['cube', 'fidget', 'toy', 'print_in_place', 'desk_toy'],
    category: 'Toys & Games',
    filamentType: 'PLA Galaxy',
    filamentWeightGrams: 55,
    printTimeMinutes: 110,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'pr-parametric-rugged-box',
    title: 'Rugged Waterproof Box with Latches and Gasket',
    author: 'Whity',
    platform: 'printables',
    sourceUrl: 'https://printables.com/model/rugged-box',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 93000,
    prints: 51000,
    likes: 16800,
    tags: ['box', 'rugged', 'waterproof', 'toolbox', 'hardware'],
    category: 'Tools & Utilities',
    filamentType: 'PETG / TPU Gasket',
    filamentWeightGrams: 160,
    printTimeMinutes: 320,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },

  // 3. THINGIVERSE
  {
    id: 'th-planetary-gearbox',
    title: 'Planetary Gear Bearing Hand Fidget - High Precision',
    author: 'Emmett',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:53451',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 180000,
    prints: 95000,
    likes: 31000,
    tags: ['planetary', 'gear', 'bearing', 'print_in_place', 'mechanical'],
    category: 'Mechanical & Functional',
    filamentType: 'PETG Basic',
    filamentWeightGrams: 48,
    printTimeMinutes: 95,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'th-cyberpunk-helmet-mini',
    title: 'Cyberpunk Mecha Helmet Display Model - High Detail',
    author: 'Hex3D_Fan',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:4892100',
    thumbnailUrl: '/thumbnails/helmet.svg',
    downloads: 51000,
    prints: 24000,
    likes: 8900,
    tags: ['cyberpunk', 'helmet', 'figure', 'cosplay', 'display'],
    category: 'Art & Decoration',
    filamentType: 'PLA Matte Dark Gray',
    filamentWeightGrams: 110,
    printTimeMinutes: 260,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'th-jet-turbofan-engine',
    title: 'Jet Engine Turbofan & Cowling Functional Model',
    author: 'Catiav5ftw',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:1327093',
    thumbnailUrl: '/thumbnails/turbine.svg',
    downloads: 87000,
    prints: 41000,
    likes: 15600,
    tags: ['turbofan', 'jet_engine', 'aero', 'educational', 'complex'],
    category: 'Mechanical & Functional',
    filamentType: 'PLA / PETG',
    filamentWeightGrams: 320,
    printTimeMinutes: 620,
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'th-paris-eiffel-tower',
    title: 'Paris Eiffel Tower Detailed Architecture Scale 1:1000',
    author: 'Borda',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:9124',
    thumbnailUrl: '/thumbnails/eiffel.svg',
    downloads: 115000,
    prints: 58000,
    likes: 22000,
    tags: ['eiffel', 'paris', 'architecture', 'landmark', 'fine_detail'],
    category: 'Architecture & Art',
    filamentType: 'PLA Matte Bronze',
    filamentWeightGrams: 75,
    printTimeMinutes: 190,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'th-retro-fidget-bot',
    title: 'Retro Fidget Bot Desk Toy with Articulated Limbs',
    author: 'SoniaVerdu',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:3948201',
    thumbnailUrl: '/thumbnails/robot.svg',
    downloads: 64000,
    prints: 31000,
    likes: 11800,
    tags: ['robot', 'fidget', 'desk_companion', 'toy', 'mascot'],
    category: 'Toys & Games',
    filamentType: 'PLA Silk Green',
    filamentWeightGrams: 85,
    printTimeMinutes: 160,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'th-drawer-organizer-gridfinity',
    title: 'Gridfinity Modular Baseplate & Bin System 4x4',
    author: 'ZackFreedman',
    platform: 'thingiverse',
    sourceUrl: 'https://thingiverse.com/thing:5379890',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 132000,
    prints: 74000,
    likes: 25400,
    tags: ['gridfinity', 'organizer', 'drawer', 'modular', 'workshop'],
    category: 'Household',
    filamentType: 'PLA Basic',
    filamentWeightGrams: 90,
    printTimeMinutes: 175,
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },

  // 4. GITHUB 3D OPEN SOURCE REPOSITORIES
  {
    id: 'gh-voron-stealthburner',
    title: 'Voron StealthBurner Toolhead & Clockwork 2 Extruder',
    author: 'VoronDesign',
    platform: 'github',
    sourceUrl: 'https://github.com/VoronDesign/Voron-Stealthburner',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 165000,
    prints: 92000,
    likes: 31000,
    tags: ['voron', 'stealthburner', 'toolhead', 'extruder', 'high_temp'],
    category: 'Open 3D CAD',
    filamentType: 'ABS / ASA (Chịu Nhiệt)',
    filamentWeightGrams: 180,
    printTimeMinutes: 390,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'gh-voron-tap',
    title: 'Voron Tap Opto-Mechanical Z-Probe Assembly',
    author: 'VoronDesign',
    platform: 'github',
    sourceUrl: 'https://github.com/VoronDesign/Voron-Tap',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 82000,
    prints: 46000,
    likes: 16500,
    tags: ['voron', 'tap', 'probe', 'precision', 'cad'],
    category: 'Open 3D CAD',
    filamentType: 'ABS / Carbon Fiber',
    filamentWeightGrams: 45,
    printTimeMinutes: 85,
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'gh-ratrig-vcore3',
    title: 'RatRig V-Core 3.1 Precision Bed Mount & Kinematic Brackets',
    author: 'RatRig',
    platform: 'github',
    sourceUrl: 'https://github.com/Rat-Rig/V-Core-3',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 47000,
    prints: 23000,
    likes: 9200,
    tags: ['ratrig', 'vcore', 'kinematic', 'bed_mount', 'corexy'],
    category: 'Open 3D CAD',
    filamentType: 'PETG-CF / ABS',
    filamentWeightGrams: 140,
    printTimeMinutes: 280,
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'gh-klipper-adxl-mount',
    title: 'Klipper Input Shaper ADXL345 Sensor Nozzle Mount',
    author: 'KlipperCommunity',
    platform: 'github',
    sourceUrl: 'https://github.com/Klipper3d/klipper-adxl-mounts',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 63000,
    prints: 37000,
    likes: 12800,
    tags: ['klipper', 'adxl345', 'input_shaper', 'resonance', 'tuning'],
    category: 'Calibration & Benchmark',
    filamentType: 'PLA Tough',
    filamentWeightGrams: 18,
    printTimeMinutes: 35,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'gh-openscad-parametric-box',
    title: 'OpenSCAD Parametric Hinged Enclosure Generator',
    author: 'OpenSCAD_Lab',
    platform: 'github',
    sourceUrl: 'https://github.com/openscad-projects/parametric-box',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 58000,
    prints: 29000,
    likes: 10400,
    tags: ['openscad', 'parametric', 'box', 'cad', 'code'],
    category: 'Tools & Utilities',
    filamentType: 'PLA Basic',
    filamentWeightGrams: 95,
    printTimeMinutes: 190,
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
  {
    id: 'gh-cable-chain-articulated',
    title: 'Universal Snap-Fit Cable Drag Chain for 3D Printers',
    author: 'OpenHardwareCo',
    platform: 'github',
    sourceUrl: 'https://github.com/OpenHardwareCo/cable-drag-chain',
    thumbnailUrl: '/thumbnails/gear.svg',
    downloads: 71000,
    prints: 39000,
    likes: 13900,
    tags: ['cable_chain', 'drag_chain', 'wiring', 'protection'],
    category: 'Tools & Accessories',
    filamentType: 'PETG / PLA',
    filamentWeightGrams: 60,
    printTimeMinutes: 120,
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
  },
];

class ModelRepository {
  private models: IModel3D[] = [];
  private jobs: Map<string, IAI3DJob> = new Map();
  private filePath: string;
  private lastMtime: number = 0;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'crawled_models.json');
    this.syncWithFile();
  }

  /**
   * Đồng bộ dữ liệu trong RAM với tệp data/crawled_models.json trên đĩa
   * Đảm bảo tính nhất quán giữa các tiến trình / route handler trong Next.js
   */
  private syncWithFile(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(this.filePath)) {
        this.initSeedData();
        return;
      }

      const stat = fs.statSync(this.filePath);
      // Chỉ đọc lại từ đĩa nếu tệp có thay đổi mới hơn hoặc RAM rỗng
      if (stat.mtimeMs > this.lastMtime || this.models.length === 0) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        if (content && content.trim().length > 0) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.models = parsed;
            this.lastMtime = stat.mtimeMs;
            return;
          }
        }
        this.initSeedData();
      }
    } catch (err) {
      console.error('Lỗi khi đồng bộ ModelRepository với tệp cục bộ:', err);
      if (this.models.length === 0) {
        this.initSeedData();
      }
    }
  }

  /**
   * Ghi toàn bộ dữ liệu ra tệp data/crawled_models.json
   */
  private saveToFile(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.models, null, 2), 'utf-8');
      const stat = fs.statSync(this.filePath);
      this.lastMtime = stat.mtimeMs;
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu ModelRepository vào tệp:', err);
    }
  }

  /**
   * Nạp tập dữ liệu hạt nhân ban đầu nếu kho dữ liệu rỗng
   */
  private initSeedData(): void {
    this.models = [...SEED_MODELS];
    this.saveToFile();
  }

  /**
   * Khóa chuẩn hóa để lọc dữ liệu trùng lặp thông minh (bỏ qua ký tự đặc biệt, hoa thường, thẻ tag trong tiêu đề)
   */
  private getDeduplicationKey(model: Pick<IModel3D, 'title' | 'platform'>): string {
    const cleanTitle = model.title
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/[^a-z0-9]/g, '');
    return `${model.platform}:${cleanTitle}`;
  }

  /**
   * Khôi phục cơ sở dữ liệu về tập dữ liệu hạt nhân ban đầu
   */
  resetToSeed(): void {
    this.initSeedData();
  }

  getAllModels(): IModel3D[] {
    this.syncWithFile();
    return [...this.models];
  }

  getModelById(id: string): IModel3D | undefined {
    this.syncWithFile();
    return this.models.find((m) => m.id === id);
  }

  getModelsByPlatform(platform: PlatformType): IModel3D[] {
    this.syncWithFile();
    return this.models.filter((m) => m.platform === platform);
  }

  addModel(model: IModel3D): IModel3D | null {
    if (!model.thumbnailUrl || model.thumbnailUrl.trim() === '') {
      return null;
    }

    this.syncWithFile();
    const key = this.getDeduplicationKey(model);
    const existingIndex = this.models.findIndex(
      (m) => m.id === model.id || this.getDeduplicationKey(m) === key
    );

    if (existingIndex >= 0) {
      const existing = this.models[existingIndex];
      this.models[existingIndex] = {
        ...existing,
        ...model,
        id: existing.id,
        downloads: Math.max(existing.downloads, model.downloads),
        prints: Math.max(existing.prints, model.prints),
        likes: Math.max(existing.likes, model.likes),
        updatedAt: new Date().toISOString(),
      };
      this.saveToFile();
      return this.models[existingIndex];
    } else {
      this.models.unshift(model);
      this.saveToFile();
      return model;
    }
  }

  addBulkModels(newModels: IModel3D[]): number {
    this.syncWithFile();
    let addedCount = 0;
    for (const model of newModels) {
      if (!model.thumbnailUrl || model.thumbnailUrl.trim() === '') continue;
      const key = this.getDeduplicationKey(model);
      const existingIndex = this.models.findIndex(
        (m) => m.id === model.id || this.getDeduplicationKey(m) === key
      );

      if (existingIndex >= 0) {
        const existing = this.models[existingIndex];
        this.models[existingIndex] = {
          ...existing,
          ...model,
          id: existing.id,
          downloads: Math.max(existing.downloads, model.downloads),
          prints: Math.max(existing.prints, model.prints),
          likes: Math.max(existing.likes, model.likes),
          updatedAt: new Date().toISOString(),
        };
      } else {
        this.models.unshift(model);
        addedCount++;
      }
    }

    if (addedCount > 0 || newModels.length > 0) {
      this.saveToFile();
    }
    return addedCount;
  }

  /**
   * Lọc và loại bỏ toàn bộ dữ liệu trùng lặp và mô hình không có hình
   */
  deduplicate(): number {
    this.syncWithFile();
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueList: IModel3D[] = [];
    let removedCount = 0;

    for (const model of this.models) {
      if (!model.thumbnailUrl || model.thumbnailUrl.trim() === '') {
        removedCount++;
        continue;
      }

      const key = this.getDeduplicationKey(model);
      if (seenIds.has(model.id) || seenKeys.has(key)) {
        removedCount++;
        continue;
      }
      seenIds.add(model.id);
      seenKeys.add(key);
      uniqueList.push(model);
    }

    this.models = uniqueList;
    this.saveToFile();
    return removedCount;
  }

  saveAIJob(job: IAI3DJob): void {
    this.jobs.set(job.id, job);
  }

  getAIJob(jobId: string): IAI3DJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllAIJobs(): IAI3DJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Singleton instance across API calls
export const modelRepository = new ModelRepository();
