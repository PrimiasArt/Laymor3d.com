export type AITierId = 'tripo_fast' | 'trellis_pro' | 'meshy_ultra';

export interface IAIPrintTier {
  id: AITierId;
  name: string;
  engine: 'tripo3d/h3.1' | 'fal-ai/trellis-2' | 'fal-ai/meshy/v6-preview';
  costUsd: number;
  priceUsd: number; // Cost x 2
  priceVnd: number; // Tỷ giá quy đổi 25.000đ/USD
  description: string;
  suitableFor: string;
  speedEstimate: string;
  textureQuality: string;
  topologyQuality: string;
  features: string[];
  badge: string;
  badgeColor: string;
}

export const AI_PRINT_TIERS: Record<AITierId, IAIPrintTier> = {
  tripo_fast: {
    id: 'tripo_fast',
    name: 'In Thường (Tiết Kiệm)',
    engine: 'tripo3d/h3.1',
    costUsd: 0.01,
    priceUsd: 0.01,
    priceVnd: 250, // 250 VNĐ giá gốc
    description: 'Sinh khối 3D siêu tốc từ ảnh trực giao, thuật toán tự động hàn kín nước (Watertight) chuẩn cho máy in 3D FDM cơ bản.',
    suitableFor: 'Mẫu thử nghiệm (prototype), chi tiết đơn giản, đồ gá tiện ích, in nhanh trong ngày.',
    speedEstimate: '⚡ 5 – 10 giây',
    textureQuality: 'Texture cơ bản 1K',
    topologyQuality: 'Lưới tam giác nhẹ tối ưu Slicer',
    features: [
      'Watertight Mesh (100% kín nước)',
      'Tốc độ sinh siêu tốc 5 - 10 giây',
      'Định dạng xuất chuẩn .STL & .GLB',
      'Chi phí siêu tiết kiệm: Chỉ 250 đ',
    ],
    badge: 'Tiết Kiệm 95%',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  trellis_pro: {
    id: 'trellis_pro',
    name: 'In Nâng Cao (Chi Tiết Sắc Nét)',
    engine: 'fal-ai/trellis-2',
    costUsd: 0.05,
    priceUsd: 0.05,
    priceVnd: 1250, // 1.250 VNĐ giá gốc
    description: 'Mô hình Microsoft Trellis 2 phân tích chiều sâu không gian đa hướng, bảo toàn góc cạnh hình học và chi tiết nổi phức tạp.',
    suitableFor: 'Vỏ hộp thiết bị, linh kiện cơ khí, đồ trang trí nội thất, phụ kiện máy in, đồ chơi có khớp.',
    speedEstimate: '🚀 15 – 25 giây',
    textureQuality: 'Texture HD 2K',
    topologyQuality: 'Lưới cấu trúc đa giác chi tiết cao',
    features: [
      'Tái hiện độ cong & gờ rãnh sắc nét',
      'Tương thích Bambu Studio & OrcaSlicer',
      'Hỗ trợ đục rỗng và tạo chân support mượt',
      'Độ chính xác cao: Chỉ 1.250 đ',
    ],
    badge: 'Khuyên Dùng ⭐',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  meshy_ultra: {
    id: 'meshy_ultra',
    name: 'In Chất Lượng Cao 4K (Thương Mại)',
    engine: 'fal-ai/meshy/v6-preview',
    costUsd: 0.80,
    priceUsd: 0.80,
    priceVnd: 20000, // 20.000 VNĐ giá gốc
    description: 'Đỉnh cao AI 3D thế hệ mới: Tích hợp Retopology lưới tứ giác (Quad Mesh) và bộ map vân PBR 4K siêu sắc nét cho sản phẩm thương mại cao cấp.',
    suitableFor: 'Figure nhân vật anime/game, quà tặng điêu khắc tinh xảo, mô hình đúc trang sức, in SLA Resin 8K.',
    speedEstimate: '👑 45 – 90 giây',
    textureQuality: 'Texture 4K PBR Master (Diffuse, Normal, Roughness)',
    topologyQuality: 'Lưới tứ giác Quad chuẩn chỉnh Render & Game Asset',
    features: [
      'Bản đồ vân nổi 4K PBR siêu chi tiết',
      'Retopology lưới tứ giác Quad sạch đẹp',
      'Chuẩn file xuất .3MF đa màu & .OBJ/.FBX',
      'Mô hình thương mại xuất sắc: 20.000 đ',
    ],
    badge: 'Ultra 4K Master 👑',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
};
