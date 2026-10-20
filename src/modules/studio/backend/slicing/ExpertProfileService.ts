import { IExpertPrintProfile } from '@/backend/domain/wallet';

export const EXPERT_PRINT_PROFILES: Record<string, IExpertPrintProfile> = {
  benchy: {
    modelId: 'benchy',
    modelName: '3D Benchy - The Jolly Benchmark',
    filamentType: 'PLA Standard / PLA Matte',
    filamentBrand: 'Bambu Lab PLA Basic / eSun PLA+',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.16, // Lớp 0.16mm để các đường cong mũi thuyền sắc nét nhất
    firstLayerHeightMm: 0.20,
    nozzleTempC: 215,
    firstLayerNozzleTempC: 220,
    bedTempC: 55,
    outerWallSpeedMmS: 60, // Đi chậm lớp ngoài để bề mặt bóng láng
    innerWallSpeedMmS: 120,
    infillSpeedMmS: 200,
    topSurfaceSpeedMmS: 50,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 35,
    zHopMm: 0.2,
    coolingFanPercent: 100,
    minLayerTimeSec: 6, // Tránh ống khói bị chảy nhựa do in quá nhanh
    infillPattern: 'Gyroid',
    infillDensityPercent: 15,
    seamPosition: 'Back', // Giấu đường may ở góc sau đuôi tàu
    ironingEnabled: true,
    treeSupportParams: {
      branchAngleDeg: 45,
      branchDiameterMm: 2.0,
      topInterfaceLayers: 2,
      topInterfaceSpacingMm: 0.2,
    },
    proTips: [
      '🔥 Khắc phục "Benchy Hull Line": Đặt Outer Wall Speed cố định 60 mm/s cho toàn bộ chiều cao để lưu lượng nhựa đùn đều tuyệt đối.',
      '🌬️ Ống khói sắc nét: Đặt "Minimum Layer Time" là 7 giây để quạt kịp làm nguội lớp nhựa trước khi đầu in đắp lớp tiếp theo.',
      '🌉 Cầu vòm Cabin không bị xệ (Bridging): Tăng Bridge Fan Speed lên 100%, giảm Bridge Speed xuống 25 mm/s.',
      '🎯 Bàn in sạch: Lau bàn PEI bằng cồn Isopropyl (IPA) 90%+ trước khi in để đáy thuyền bám chắc, không bị cong góc (warping).'
    ],
  },
  dragon: {
    modelId: 'dragon',
    modelName: 'Articulated Crystal Dragon V3',
    filamentType: 'PLA Silk Dual / Triple Color',
    filamentBrand: 'Polymaker Silk / Eryone Dual-Color',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.16,
    firstLayerHeightMm: 0.24,
    nozzleTempC: 220, // Tăng 5 độ để nhựa Silk đạt độ bóng kim loại cực đại
    firstLayerNozzleTempC: 225,
    bedTempC: 60,
    outerWallSpeedMmS: 50, // Nhựa Silk in chậm sẽ bóng hơn in nhanh
    innerWallSpeedMmS: 100,
    infillSpeedMmS: 180,
    topSurfaceSpeedMmS: 45,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
    zHopMm: 0.4,
    coolingFanPercent: 100,
    minLayerTimeSec: 8,
    infillPattern: 'Gyroid',
    infillDensityPercent: 18,
    seamPosition: 'Scarf Joint', // Giấu đường seam hoàn toàn trên thân rồng
    ironingEnabled: false,
    treeSupportParams: {
      branchAngleDeg: 40,
      branchDiameterMm: 2.5,
      topInterfaceLayers: 3,
      topInterfaceSpacingMm: 0.22, // Khe hở 0.22mm giúp bóc Tree Support bằng tay nhẹ nhàng
    },
    proTips: [
      '🐉 Chống dính khớp rồng (Print-in-Place): Tắt "Elephant Foot Compensation" nếu khớp đầu tiên quá lỏng, hoặc chỉnh XY Hole Compensation +0.05mm.',
      '🌿 Cấu hình Tree Support chuẩn: Chỉ bật Support chạm vào Build Plate ("On build plate only"), tránh để support mọc đâm vào giữa các khớp xoay.',
      '✨ Hiệu ứng Silk bóng lóa: Giữ tốc độ lớp ngoài đồng nhất (Outer Wall 50 mm/s) và nâng nhiệt độ lên 220°C.',
      '🛑 Bóc tách support: Đợi bàn in nguội hẳn xuống dưới 35°C trước khi nhấc mô hình ra để tránh gãy sừng rồng.'
    ],
  },
  robot: {
    modelId: 'robot',
    modelName: 'Retro Fidget Bot Companion',
    filamentType: 'PETG / PLA Matte',
    filamentBrand: 'Bambu Lab PETG Basic / Sunlu PETG',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.20,
    firstLayerHeightMm: 0.24,
    nozzleTempC: 245,
    firstLayerNozzleTempC: 250,
    bedTempC: 75,
    outerWallSpeedMmS: 80,
    innerWallSpeedMmS: 140,
    infillSpeedMmS: 220,
    topSurfaceSpeedMmS: 55,
    retractionDistanceMm: 1.0,
    retractionSpeedMmS: 35,
    zHopMm: 0.4,
    coolingFanPercent: 60, // PETG cần ít quạt hơn để liên kết lớp bền chắc
    minLayerTimeSec: 10,
    infillPattern: 'Adaptive Cubic',
    infillDensityPercent: 20,
    seamPosition: 'Aligned',
    ironingEnabled: true, // Mặt trên của ngực và đầu robot được là phẳng lỳ
    treeSupportParams: {
      branchAngleDeg: 42,
      branchDiameterMm: 2.2,
      topInterfaceLayers: 3,
      topInterfaceSpacingMm: 0.25,
    },
    proTips: [
      '🤖 Khử tơ kéo sợi (Stringing) trên PETG: Sấy khô cuộn nhựa ở 65°C trong 4-6 giờ trước khi in.',
      '🛡️ Gián cách Support PETG: Đặt Z-distance của Support lên 0.25mm - 0.28mm vì PETG dính rất chặt vào chính nó.',
      '🪞 Ironing đỉnh đầu: Bật "Ironing All Top Surfaces" với dòng nhựa 12% để bề mặt phẳng như đúc khuôn ép nhựa.'
    ],
  },
  gear: {
    modelId: 'gear',
    modelName: 'Planetary Gear Bearing',
    filamentType: 'PETG / ABS (Độ bền cơ học cao)',
    filamentBrand: 'eSun ABS+ / Bambu PETG-CF',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.16,
    firstLayerHeightMm: 0.20,
    nozzleTempC: 250,
    firstLayerNozzleTempC: 255,
    bedTempC: 90,
    outerWallSpeedMmS: 60,
    innerWallSpeedMmS: 100,
    infillSpeedMmS: 150,
    topSurfaceSpeedMmS: 40,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
    zHopMm: 0.2,
    coolingFanPercent: 30,
    minLayerTimeSec: 12,
    infillPattern: 'Gyroid',
    infillDensityPercent: 30, // Khối bánh răng cần cứng cáp chịu lực
    seamPosition: 'Nearest',
    ironingEnabled: false,
    treeSupportParams: {
      branchAngleDeg: 45,
      branchDiameterMm: 2.0,
      topInterfaceLayers: 0,
      topInterfaceSpacingMm: 0,
    },
    proTips: [
      '⚙️ TUYỆT ĐỐI KHÔNG BẬT SUPPORT: Mô hình bánh răng hành tinh có góc thoát 45°, bật support sẽ làm kẹt các rãnh răng không xoay được.',
      '📏 Triệt tiêu chân voi (Elephant Foot): Bật Elephant Foot Compensation = 0.20mm để lớp đầu tiên không bị bành rộng làm dính bánh răng.',
      '🔄 Xoay trơn ngay lần đầu: Sau khi nhấc ra khỏi bàn in, dùng tay vặn nhẹ hoặc dùng cờ lê lục giác xoay trục giữa để bẻ gãy các liên kết siêu nhỏ.'
    ],
  },
  helmet: {
    modelId: 'helmet',
    modelName: 'Cyberpunk Mecha Helmet',
    filamentType: 'ABS / PLA-CF (Carbon Fiber)',
    filamentBrand: 'Bambu Lab PLA-CF / Polymaker PolyLite ABS',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.20,
    firstLayerHeightMm: 0.24,
    nozzleTempC: 255,
    firstLayerNozzleTempC: 260,
    bedTempC: 95,
    outerWallSpeedMmS: 70,
    innerWallSpeedMmS: 140,
    infillSpeedMmS: 200,
    topSurfaceSpeedMmS: 50,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 35,
    zHopMm: 0.4,
    coolingFanPercent: 20,
    minLayerTimeSec: 15,
    infillPattern: 'Gyroid',
    infillDensityPercent: 12, // Giảm infill để nón nhẹ và tiết kiệm nhựa
    seamPosition: 'Back', // Đẩy toàn bộ đường may về sống gờ sau gáy
    ironingEnabled: false,
    treeSupportParams: {
      branchAngleDeg: 45,
      branchDiameterMm: 2.8,
      topInterfaceLayers: 3,
      topInterfaceSpacingMm: 0.24,
    },
    proTips: [
      '🪖 Định hướng in tối ưu: Đặt đỉnh nón hướng lên trên, góc nghiêng 15° về phía sau để giảm diện tích support mặt trước visor.',
      '🛡️ Tree Support cằm & tai: Bật "Tree Hybrid" để các cành cây vươn từ ngoài bàn in ôm vào cằm, tuyệt đối không chạm vào mắt kính.',
      '🔥 Chống nứt cong vênh (Warping): Với nhựa ABS cần đóng kín buồng in (Chamber) đạt trên 45°C và bật Brim 10mm.'
    ],
  },
  turbine: {
    modelId: 'turbine',
    modelName: 'Jet Engine Turbofan & Cowling',
    filamentType: 'PETG / PA-CF (Nylon Siêu Bền Chịu Nhiệt)',
    filamentBrand: 'Bambu PA6-CF / eSun PETG',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.12, // Lớp siêu mỏng 0.12mm cho cánh quạt chuẩn khí động học
    firstLayerHeightMm: 0.20,
    nozzleTempC: 265,
    firstLayerNozzleTempC: 270,
    bedTempC: 100,
    outerWallSpeedMmS: 45, // Đi chậm để góc nghiêng cánh quạt không bị cong xước
    innerWallSpeedMmS: 90,
    infillSpeedMmS: 130,
    topSurfaceSpeedMmS: 35,
    retractionDistanceMm: 1.2,
    retractionSpeedMmS: 40,
    zHopMm: 0.3,
    coolingFanPercent: 80,
    minLayerTimeSec: 10,
    infillPattern: 'Adaptive Cubic',
    infillDensityPercent: 25,
    seamPosition: 'Random', // Phân tán đường seam trên cánh quạt để cân bằng động
    ironingEnabled: true,
    treeSupportParams: {
      branchAngleDeg: 42,
      branchDiameterMm: 2.2,
      topInterfaceLayers: 4,
      topInterfaceSpacingMm: 0.20,
    },
    proTips: [
      '✈️ Cân bằng động cánh quạt: Cần in với tốc độ đồng đều và Random Seam để trọng lượng các cánh quạt đối xứng tuyệt đối.',
      '🌬️ Quạt tản nhiệt mép hút gió: Khi in miệng vỏ nacelle phía trước, tăng quạt làm mát lên 100% để mép vành tròn không bị xệ.',
      '⚙️ Lắp bạc đạn: Dùng giấy ráp mịn 800 grit mài nhẹ trục giữa để lắp vừa khít vòng bi 608zz.'
    ],
  },
  eiffel: {
    modelId: 'eiffel',
    modelName: 'Paris Eiffel Tower Miniature',
    filamentType: 'PLA Matte Bronze / Antique Brass',
    filamentBrand: 'Bambu Lab PLA Matte / Polymaker Bronze',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.12,
    firstLayerHeightMm: 0.16,
    nozzleTempC: 205,
    firstLayerNozzleTempC: 210,
    bedTempC: 50,
    outerWallSpeedMmS: 40,
    innerWallSpeedMmS: 80,
    infillSpeedMmS: 120,
    topSurfaceSpeedMmS: 30,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 45,
    zHopMm: 0.4,
    coolingFanPercent: 100,
    minLayerTimeSec: 5,
    infillPattern: 'Grid',
    infillDensityPercent: 20,
    seamPosition: 'Nearest',
    ironingEnabled: true,
    treeSupportParams: {
      branchAngleDeg: 38,
      branchDiameterMm: 2.0,
      topInterfaceLayers: 3,
      topInterfaceSpacingMm: 0.18,
    },
    proTips: [
      '🗼 Triệt tiêu tơ kéo (Stringing): Hạ nhiệt độ xuống 205°C và bật Z-hop để tránh đầu in va quẹt làm gãy các nan tháp Eiffel.',
      '🌉 Cầu vòm tầng 1: Tree Support chỉ đỡ đúng tâm trần vòm, sau khi nguội vặn nhẹ theo chiều xoắn ốc là gỡ sạch.',
      '⚡ Độ cứng kim thu lôi: Ở 15 lớp in chóp tháp trên cùng, hạ tốc độ xuống 15 mm/s để đầu kim không bị rung lắc.'
    ],
  },
  custom: {
    modelId: 'custom',
    modelName: 'Mô Hình 3D Tải Lên (Custom File)',
    filamentType: 'PLA Standard / PETG',
    filamentBrand: 'Tùy chọn theo yêu cầu',
    nozzleSizeMm: 0.4,
    layerHeightMm: 0.20,
    firstLayerHeightMm: 0.24,
    nozzleTempC: 215,
    firstLayerNozzleTempC: 220,
    bedTempC: 60,
    outerWallSpeedMmS: 80,
    innerWallSpeedMmS: 150,
    infillSpeedMmS: 250,
    topSurfaceSpeedMmS: 60,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
    zHopMm: 0.4,
    coolingFanPercent: 100,
    minLayerTimeSec: 8,
    infillPattern: 'Gyroid',
    infillDensityPercent: 15,
    seamPosition: 'Aligned',
    ironingEnabled: true,
    treeSupportParams: {
      branchAngleDeg: 40,
      branchDiameterMm: 2.5,
      topInterfaceLayers: 3,
      topInterfaceSpacingMm: 0.2,
    },
    proTips: [
      '📁 File tải lên đã được tự động tính toán thể tích và căn phẳng mặt đáy (Grounded at Y=0).',
      '🌳 Kiểm tra góc treo: Bật Tree Support tự động nếu mô hình có các góc nhô vượt quá 45° - 50°.',
      '💎 Làm mịn mặt trên (Ironing): Đầu phun chạy lướt 60 mm/s đùn 10% nhựa nóng để láng mịn bề mặt.',
      '📐 Kích thước thực tế: Kiểm tra bảng thông số X-Y-Z mm để đảm bảo vừa với kích thước bàn in đã chọn.'
    ],
  },
};

export class ExpertProfileService {
  getProfile(modelId: string): IExpertPrintProfile {
    return EXPERT_PRINT_PROFILES[modelId] || EXPERT_PRINT_PROFILES.benchy;
  }
}

export const expertProfileService = new ExpertProfileService();
