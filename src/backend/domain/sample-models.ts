export type SampleModelId = 'benchy' | 'dragon' | 'robot' | 'gear' | 'helmet' | 'turbine' | 'eiffel' | 'custom';

export interface ISamplePrintModel {
  id: SampleModelId;
  name: string;
  tagline: string;
  category: string;
  defaultDimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  recommendedSupport: 'tree' | 'normal' | 'none';
  recommendedFilament: string;
  overhangDifficulty: 'Dễ' | 'Trung bình' | 'Khó (Cần Support)';
  description: string;
  thumbnailUrl: string;
}

export const SAMPLE_PRINT_MODELS: ISamplePrintModel[] = [
  {
    id: 'benchy',
    name: '3D Benchy - The Jolly Benchmark',
    tagline: 'Mô hình thuyền kiểm chuẩn máy in kinh điển thế giới',
    category: 'Calibration & Benchmark',
    defaultDimensionsMm: { x: 60, y: 31, z: 48 },
    recommendedSupport: 'none',
    recommendedFilament: 'PLA Basic / PLA Matte',
    overhangDifficulty: 'Trung bình',
    description: 'Mô hình chuẩn mực đo độ chính xác máy in 3D: kiểm tra góc nghiêng vòm cabin, cầu nối (bridging), ống khói tròn, bề mặt cong mũi thuyền.',
    thumbnailUrl: '/thumbnails/benchy.svg',
  },
  {
    id: 'dragon',
    name: 'Articulated Crystal Dragon V3',
    tagline: 'Mô hình rồng khớp uốn lượn hot nhất MakerWorld',
    category: 'Toys & Fidget',
    defaultDimensionsMm: { x: 140, y: 85, z: 65 },
    recommendedSupport: 'tree',
    recommendedFilament: 'PLA Silk Dual Color / Glow',
    overhangDifficulty: 'Khó (Cần Support)',
    description: 'Mô hình in liền khối (Print-in-Place). Cần Tree Support ở phần sừng và cằm để các khớp cầu chuyển động trơn tru sau khi in.',
    thumbnailUrl: '/thumbnails/dragon.svg',
  },
  {
    id: 'robot',
    name: 'Retro Fidget Bot Companion',
    tagline: 'Robot linh vật bàn làm việc có khớp xoay',
    category: 'Art & Decoration',
    defaultDimensionsMm: { x: 75, y: 60, z: 110 },
    recommendedSupport: 'tree',
    recommendedFilament: 'PETG / PLA Galaxy',
    overhangDifficulty: 'Trung bình',
    description: 'Thiết kế phong cách Mecha cổ điển. Thân hình có các góc nhô 55 độ, thích hợp test chế độ Tree Support để tiết kiệm nhựa.',
    thumbnailUrl: '/thumbnails/robot.svg',
  },
  {
    id: 'gear',
    name: 'Planetary Gear Bearing',
    tagline: 'Hộp số bánh răng hành tinh cơ khí xoay mượt',
    category: 'Mechanical & Functional',
    defaultDimensionsMm: { x: 80, y: 80, z: 22 },
    recommendedSupport: 'none',
    recommendedFilament: 'PETG / ABS (Độ bền cao)',
    overhangDifficulty: 'Dễ',
    description: 'Bản in cơ khí chính xác dung sai 0.25mm. In phẳng trên bàn in, tự động tắt support để tránh dính chết các khớp răng chuyển động.',
    thumbnailUrl: '/thumbnails/gear.svg',
  },
  {
    id: 'helmet',
    name: 'Cyberpunk Mecha Helmet',
    tagline: 'Nón giáp chiến binh Sci-Fi tỷ lệ thu nhỏ',
    category: 'Cosplay & Props',
    defaultDimensionsMm: { x: 95, y: 110, z: 120 },
    recommendedSupport: 'tree',
    recommendedFilament: 'ABS / PLA-CF (Carbon Fiber)',
    overhangDifficulty: 'Khó (Cần Support)',
    description: 'Chiếc nón giáp chiến binh góc cạnh với vòm kính mắt và màng lọc thở dưới cằm. Cần hệ thống Tree Support ôm khít vòm cằm và cụm tai nghe 2 bên.',
    thumbnailUrl: '/thumbnails/helmet.svg',
  },
  {
    id: 'turbine',
    name: 'Jet Engine Turbofan & Cowling',
    tagline: 'Động cơ phản lực cánh quạt hàng không',
    category: 'Aerospace & Engineering',
    defaultDimensionsMm: { x: 100, y: 100, z: 90 },
    recommendedSupport: 'normal',
    recommendedFilament: 'PETG / PA-CF (Nylon Chịu Nhiệt)',
    overhangDifficulty: 'Khó (Cần Support)',
    description: 'Vỏ ống động cơ phản lực tròn với chóp nón khí động học và 8 cánh quạt hút gió. Cần Normal Support đỡ phần bụng dưới vỏ động cơ và miệng hút gió trước.',
    thumbnailUrl: '/thumbnails/turbine.svg',
  },
  {
    id: 'eiffel',
    name: 'Paris Eiffel Tower Miniature',
    tagline: 'Kiến trúc tháp Eiffel Paris tinh xảo',
    category: 'Architecture & Art',
    defaultDimensionsMm: { x: 80, y: 80, z: 140 },
    recommendedSupport: 'tree',
    recommendedFilament: 'PLA Matte Bronze / Gray',
    overhangDifficulty: 'Trung bình',
    description: 'Công trình kiến trúc vĩ đại với 4 chân trụ vươn lên sàn tầng 1. Hệ thống Tree Support tập trung đỡ mặt trần vòm La Mã khổng lồ dưới sàn tầng 1.',
    thumbnailUrl: '/thumbnails/eiffel.svg',
  },
];

export function getMatchingSampleModelId(title: string, category?: string, tags?: string[]): SampleModelId {
  const text = `${title} ${category || ''} ${(tags || []).join(' ')}`.toLowerCase();
  if (text.includes('dragon') || text.includes('rồng') || text.includes('cinderwing') || text.includes('creature')) return 'dragon';
  if (text.includes('helmet') || text.includes('nón') || text.includes('mũ') || text.includes('mask') || text.includes('mecha') || text.includes('cyberpunk') || text.includes('armor')) return 'helmet';
  if (text.includes('turbine') || text.includes('engine') || text.includes('fan') || text.includes('động cơ') || text.includes('jet') || text.includes('propeller')) return 'turbine';
  if (text.includes('eiffel') || text.includes('tower') || text.includes('tháp') || text.includes('landmark') || text.includes('architecture') || text.includes('arch')) return 'eiffel';
  if (text.includes('robot') || text.includes('bot') || text.includes('companion') || text.includes('fidget')) return 'robot';
  if (text.includes('gear') || text.includes('bearing') || text.includes('bánh răng') || text.includes('planetary') || text.includes('hộp số') || text.includes('mechanical') || text.includes('cơ khí')) return 'gear';
  return 'benchy';
}
