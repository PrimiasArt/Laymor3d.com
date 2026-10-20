export interface IFilamentThermalProfile {
  type: string;
  nozzleTempC: number;
  initialLayerNozzleTempC: number;
  bedTempC: number;
  flowRatio: number;
  pressureAdvance: number;
  retractionMm: number;
  fanSpeedMinPercent: number;
  fanSpeedMaxPercent: number;
  dryingTempC: number;
  dryingHours: number;
  densityGPerCm3: number;
}

export class CommunityKnowledgeService {
  /**
   * Bảng thông số vật liệu chuẩn đã kiểm chứng từ cộng đồng & nhà sản xuất
   */
  getThermalProfile(filamentName: string = 'PLA'): IFilamentThermalProfile {
    const f = filamentName.toLowerCase();

    if (f.includes('petg-cf') || f.includes('carbon')) {
      return {
        type: 'PETG-CF Carbon Fiber',
        nozzleTempC: 255,
        initialLayerNozzleTempC: 260,
        bedTempC: 75,
        flowRatio: 0.96,
        pressureAdvance: 0.038,
        retractionMm: 0.9,
        fanSpeedMinPercent: 20,
        fanSpeedMaxPercent: 60,
        dryingTempC: 65,
        dryingHours: 8,
        densityGPerCm3: 1.29,
      };
    }

    if (f.includes('petg')) {
      return {
        type: 'PETG High Flow',
        nozzleTempC: 245,
        initialLayerNozzleTempC: 250,
        bedTempC: 70,
        flowRatio: 0.95,
        pressureAdvance: 0.032,
        retractionMm: 0.8,
        fanSpeedMinPercent: 30,
        fanSpeedMaxPercent: 70,
        dryingTempC: 65,
        dryingHours: 6,
        densityGPerCm3: 1.27,
      };
    }

    if (f.includes('tpu') || f.includes('flex')) {
      return {
        type: 'TPU 95A Flexible',
        nozzleTempC: 225,
        initialLayerNozzleTempC: 230,
        bedTempC: 45,
        flowRatio: 1.05,
        pressureAdvance: 0.045,
        retractionMm: 0.4,
        fanSpeedMinPercent: 80,
        fanSpeedMaxPercent: 100,
        dryingTempC: 55,
        dryingHours: 8,
        densityGPerCm3: 1.22,
      };
    }

    if (f.includes('abs') || f.includes('asa')) {
      return {
        type: 'ABS / ASA Engineering',
        nozzleTempC: 265,
        initialLayerNozzleTempC: 270,
        bedTempC: 95,
        flowRatio: 0.94,
        pressureAdvance: 0.028,
        retractionMm: 0.7,
        fanSpeedMinPercent: 0,
        fanSpeedMaxPercent: 25,
        dryingTempC: 70,
        dryingHours: 6,
        densityGPerCm3: 1.05,
      };
    }

    // Default: PLA / PLA+ / PLA Matte
    const isMatte = f.includes('matte') || f.includes('nhám');
    const isSilk = f.includes('silk');

    return {
      type: isMatte ? 'PLA Matte Nhám' : isSilk ? 'PLA Silk Bóng' : 'PLA High Speed',
      nozzleTempC: isSilk ? 225 : 215,
      initialLayerNozzleTempC: 220,
      bedTempC: 55,
      flowRatio: isMatte ? 0.94 : isSilk ? 0.92 : 0.98,
      pressureAdvance: 0.022,
      retractionMm: 0.8,
      fanSpeedMinPercent: 80,
      fanSpeedMaxPercent: 100,
      dryingTempC: 50,
      dryingHours: 4,
      densityGPerCm3: 1.24,
    };
  }

  /**
   * Trích xuất mẹo in thực tiễn (Discourse, Reddit & Khí hậu Việt Nam)
   */
  getCommunityTips(category: string = '', filamentType: string = 'PLA', modelTitle: string = ''): string[] {
    const tips: string[] = [];
    const cat = category.toLowerCase();
    const fil = filamentType.toLowerCase();
    const title = modelTitle.toLowerCase();

    // 1. Mẹo khí hậu Việt Nam (Đặc thù độ ẩm cao 80-95%)
    if (fil.includes('petg') || fil.includes('tpu') || fil.includes('abs')) {
      tips.push('🇻🇳 Mẹo khí hậu Việt Nam: Nhựa hút ẩm rất nhanh trong mùa nồm. Khuyên sấy ở 65°C trong 6 giờ trước khi in để triệt tiêu hoàn toàn tiếng nổ lách tách và hiện tượng tưa sợi (stringing).');
    } else {
      tips.push('🇻🇳 Mẹo bàn in PEI tại VN: Vệ sinh bàn PEI định kỳ bằng nước ấm và nước rửa chén Sunlight, lau khô bằng khăn vi sợi. Tuyệt đối không dùng cồn rửa bàn khi còn nóng để tránh làm giảm độ dính.');
    }

    // 2. Mẹo thẩm mỹ & mối nối (Scarf Joint Seam)
    tips.push('💎 Tối ưu thẩm mỹ viền: Bật tính năng Scarf Joint Seam (OrcaSlicer) ở góc vát 45° để làm phẳng 90% vết nối Z-seam, tạo bề mặt láng mịn như đúc nhựa công nghiệp.');

    // 3. Mẹo theo danh mục mô hình
    if (cat.includes('figure') || cat.includes('anime') || cat.includes('art') || cat.includes('decor')) {
      tips.push('🎨 Tối ưu mô hình mỹ thuật: Áp dụng Variable Layer Height (0.08mm - 0.16mm) ở các phần cong trên đỉnh đầu để xóa bỏ hoàn toàn vân lớp bậc thang mà không tăng quá nhiều thời gian in.');
      tips.push('🌳 Tree Support Organic: Đặt Support Z-distance = 0.20mm (bằng đúng 1 lớp in) để gỡ support êm tay mà không để lại sẹo nhựa trên bề mặt.');
    } else if (cat.includes('mechanical') || cat.includes('tool') || cat.includes('ams') || cat.includes('gear')) {
      tips.push('⚙️ Tối ưu cơ khí & chịu lực: Tăng số vòng viền (Wall Loops) lên 4-5 lớp thay vì tăng Infill. 80% độ cứng cơ học của chi tiết in 3D nằm ở lớp vỏ viền ngoài.');
      tips.push('🔄 Mẫu ruột Cross Hatch / Gyroid: Tránh dùng Grid infill vì đầu in sẽ va quẹt vào các điểm giao nhau ở tốc độ cao trên 200 mm/s.');
    } else {
      tips.push('⚡ Tối ưu thời gian in xưởng: Bật chế độ Combine Infill (mỗi 2 lớp vỏ mới in 1 lớp ruột 0.4mm) giúp tiết kiệm 18-25% tổng thời gian in mà vẫn giữ độ cứng.');
    }

    // 4. Mẹo chống cong mép (Warping)
    if (title.includes('box') || title.includes('case') || title.includes('tray') || cat.includes('household')) {
      tips.push('🛡️ Chống cong góc mép (Warping): Với chi tiết đáy phẳng lớn, bật "Brim Ear" (Mouse Ears) ở 4 góc với đường kính 8mm để giữ chặt mép bàn in PEI mà gỡ bỏ cực kỳ dễ dàng.');
    }

    return tips;
  }
}

export const communityKnowledgeService = new CommunityKnowledgeService();
