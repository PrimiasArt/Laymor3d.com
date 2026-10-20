import fs from 'fs';
import path from 'path';
import { IKnowledgeEntry, ICrossReferenceResult, IRiskWarning, ISlicerParameterOverride } from '@/backend/domain/knowledge';

export const SEED_KNOWLEDGE_ENTRIES: IKnowledgeEntry[] = [
  {
    id: 'kn-vn-humidity-petg',
    title: 'Xử lý ẩm nhựa PETG & TPU trong mùa nồm ẩm Việt Nam (85-95%)',
    category: 'vietnam_environment',
    problemSymptom: 'Nhựa đùn ra có tiếng nổ lách tách li ti, bề mặt rỗ bọt khí và tưa sợi kéo màng (stringing) rất nặng.',
    rootCause: 'Khí hậu nồm ẩm Việt Nam khiến nhựa PETG và TPU no nước chỉ sau 48h để ngoài không khí. Nước bị đun sôi ở 240°C trong vòi phun tạo bọt khí giãn nở tức thì.',
    solutionText: 'Sấy nhựa ở 65°C trong ít nhất 6 giờ bằng hộp sấy hoặc nồi chiên không dầu/máy sấy thực phẩm. In trực tiếp từ hộp sấy kín có bịch hạt hút ẩm Silica Gel.',
    slicerOverrides: {
      drying_temperature: 65,
      drying_time_hours: 6,
      retraction_length: 0.9,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PETG', 'PETG-CF', 'TPU', 'Nylon', 'PA-CF'],
    confidenceScore: 98,
    verificationCount: 245,
    sourcePlatform: 'vietnam_community',
    sourceReference: 'Cộng đồng In 3D Việt Nam & Kinh nghiệm xưởng in nhiệt đới',
    tags: ['do_am_viet_nam', 'say_nhua', 'petg_no_bot', 'stringing'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-pei-bed-cleaning',
    title: 'Khôi phục độ dính bàn in PEI bằng nước ấm và Sunlight',
    category: 'vietnam_environment',
    problemSymptom: 'Lớp in đầu tiên bị bong mép (warping) hoặc không dính bàn PEI dù đã chỉnh Z-offset chuẩn.',
    rootCause: 'Mồ hôi và dầu mỡ từ vân tay bám lên bề mặt PEI. Cồn Isopropyl Alcohol (IPA) chỉ hòa tan dầu mỡ và dàn đều ra chứ không rửa trôi hoàn toàn lớp nhờn.',
    solutionText: 'Tháo tấm PEI rửa trực tiếp dưới vòi nước ấm với nước rửa chén Sunlight và miếng bọt biển mềm. Xả sạch và lau khô bằng khăn vi sợi sạch. Tuyệt đối không chạm tay vào vùng in sau khi rửa.',
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS', 'TPU'],
    confidenceScore: 99,
    verificationCount: 420,
    sourcePlatform: 'vietnam_community',
    sourceReference: 'Bambu Lab User Group & Prusa Research Service Bulletin',
    tags: ['ban_in_pei', 've_sinh_sunlight', 'bong_mep', 'adhesion'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-scarf-joint-seam',
    title: 'Giấu 90% vết nối viền ngoài Z-seam bằng Scarf Joint Seam trong OrcaSlicer',
    category: 'slicer_tuning',
    problemSymptom: 'Mặt ngoài của chi tiết tròn, trụ hoặc figure có đường sọc nổi cộm (Z-seam) gây mất thẩm mỹ nghiêm trọng.',
    rootCause: 'Điểm bắt đầu và kết thúc của một vòng viền ngoài tạo ra mối hàn nhựa thừa do áp lực đầu đùn chưa kịp giảm khi đổi lớp.',
    solutionText: 'Kích hoạt tính năng "Scarf Joint Seam" trong OrcaSlicer ở góc vát 45°. Đầu in sẽ giảm dần lượng nhựa theo đường dốc nghiêng và bắt đầu lớp mới cũng theo góc nghiêng, hòa tan hoàn toàn mối nối vào thân vỏ.',
    slicerOverrides: {
      seam_slope_type: 'scarf',
      seam_slope_angle: 45,
      outer_wall_speed: 60,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS'],
    applicableCategories: ['Art & Decor', 'Toys & Games', 'Household'],
    confidenceScore: 97,
    verificationCount: 310,
    sourcePlatform: 'bambu_forum',
    sourceReference: 'OrcaSlicer v2.x Algorithmic Seam Whitepaper',
    tags: ['scarf_seam', 'z_seam', 'orcaslicer', 'tham_my'],
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-hardened-steel-cf',
    title: 'Bắt buộc dùng vòi phun thép tôi cứng (Hardened Steel) khi in nhựa sợi Carbon',
    category: 'printer_hardware',
    problemSymptom: 'Sau khi in nửa cuộn PETG-CF hoặc PA-CF, các bản in sau bị xơ, mất chi tiết, sai kích thước lỗ nghiêm trọng.',
    rootCause: 'Sợi micro carbon có độ cứng cực cao, đóng vai trò như giấy nhám mài mòn lỗ vòi phun bằng đồng (Brass nozzle) từ 0.4mm nở toét thành 0.6-0.7mm trong thời gian ngắn.',
    solutionText: 'Nâng cấp cụm đầu in sang vòi thép tôi cứng (Hardened Steel Nozzle) hoặc vòi Ruby/Carbide. Tăng nhiệt độ nung chảy thêm 5-10°C vì thép dẫn nhiệt kém hơn đồng.',
    slicerOverrides: {
      nozzle_temperature: 255,
      nozzle_temperature_initial_layer: 260,
      flow_ratio: 0.96,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PETG-CF', 'PLA-CF', 'PA-CF', 'PA6-CF'],
    applicableCategories: ['Mechanical & Functional', 'Tools & Utilities'],
    confidenceScore: 100,
    verificationCount: 520,
    sourcePlatform: 'cnc_kitchen',
    sourceReference: 'CNC Kitchen Abrasive Filament Wear Test Series',
    tags: ['carbon_fiber', 'petg_cf', 'voi_thep_toi', 'mon_dau_in'],
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-pla-silk-adhesion',
    title: 'Tăng nhiệt độ in PLA Silk để tránh giòn gãy giữa các lớp',
    category: 'material_benchmark',
    problemSymptom: 'Mô hình in bằng PLA Silk (nhũ bóng) rất dễ bị tách đôi lớp in theo phương ngang khi dùng lực bẻ nhẹ.',
    rootCause: 'Chất phụ gia elastomer tạo độ bóng ánh kim làm giảm độ liên kết phân tử giữa các lớp nhựa nếu in ở nhiệt độ thấp chuẩn của PLA thường (200-210°C).',
    solutionText: 'Tăng nhiệt độ vòi phun lên 225-230°C và giảm nhẹ quạt làm nguội xuống 70% để các lớp nhựa nóng chảy hòa quyện vào nhau tối đa.',
    slicerOverrides: {
      nozzle_temperature: 225,
      nozzle_temperature_initial_layer: 230,
      fan_max_speed: 70,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA Silk', 'Silk PLA'],
    confidenceScore: 96,
    verificationCount: 185,
    sourcePlatform: 'reddit',
    sourceReference: 'r/3Dprinting Silk PLA Layer Adhesion Consensus',
    tags: ['pla_silk', 'nhiet_do_in', 'tach_lop', 'layer_adhesion'],
    createdAt: '2026-10-03T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-pla-matte-flow',
    title: 'Giảm Flow Ratio xuống 0.94 đối với PLA Matte để xóa vết sần mặt trên',
    category: 'material_benchmark',
    problemSymptom: 'Mặt trên cùng (Top surface) của bản in PLA Matte bị cộm sần, đầu in phát ra tiếng kêu cọ quẹt khi di chuyển nhanh.',
    rootCause: 'PLA Matte có cấu trúc vi mô xốp tạo bề mặt nhám mờ, khi đùn ra khỏi vòi phun nhựa có xu hướng nở phồng thể tích lớn hơn PLA bóng tiêu chuẩn.',
    solutionText: 'Giảm Flow Ratio (Hệ số đùn) từ 0.98 xuống 0.93 - 0.94 trong filament settings. Bật tính năng Ironing nếu muốn mặt trên nhẵn mịn tuyệt đối.',
    slicerOverrides: {
      flow_ratio: 0.94,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA Matte', 'Matte PLA'],
    confidenceScore: 95,
    verificationCount: 220,
    sourcePlatform: 'bambu_forum',
    sourceReference: 'Bambu Lab Filament Tuning Guide for Matte PLA',
    tags: ['pla_matte', 'flow_ratio', 'top_surface', 'no_nhua'],
    createdAt: '2026-10-03T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-tree-support-interface',
    title: 'Tree Support Organic với Top Z-Distance 0.20mm gỡ êm tay không để lại sẹo',
    category: 'slicer_tuning',
    problemSymptom: 'Support dính quá chặt vào mô hình, khi bóc tách để lại chân nhựa lởm chởm hoặc làm gãy ngón tay/chi tiết nhỏ của figure.',
    rootCause: 'Khoảng cách giữa đỉnh support và đáy mô hình (Top Z Distance) quá nhỏ (<0.14mm) khiến nhựa nóng chảy dính chặt vào nhau.',
    solutionText: 'Chuyển sang Tree Support Organic. Đặt Top Z-distance = 0.20mm (bằng đúng 1 lớp in) và đặt 3 Interface Layers đặc. Support sẽ tự động tách rời sạch sẽ chỉ bằng một cái búng tay.',
    slicerOverrides: {
      enable_support: true,
      support_type: 'tree(auto)',
      support_top_z_distance: 0.20,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS'],
    applicableCategories: ['Art & Decor', 'Toys & Games'],
    confidenceScore: 98,
    verificationCount: 380,
    sourcePlatform: 'printables',
    sourceReference: 'PrusaSlicer & OrcaSlicer Organic Support Best Practices',
    tags: ['tree_support', 'organic_support', 'khong_de_lai_seo', 'figure'],
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-mechanical-wall-priority',
    title: 'Tăng Wall Loops lên 4-5 lớp thay vì tăng Infill để tăng 80% độ chịu lực cơ học',
    category: 'commercial_practice',
    problemSymptom: 'Chi tiết cơ khí, ngàm kẹp, bánh răng in 50% infill vẫn bị gãy nứt khi chịu tải trọng uốn.',
    rootCause: 'Theo nguyên lý cơ học kết cấu rỗng (Stress Tensor), ứng suất tập trung 85% ở thành ngoài cùng của chi tiết. Ruột đặc bên trong đóng góp rất ít vào độ bền uốn.',
    solutionText: 'Thiết lập 4 đến 5 Wall Loops và giữ Infill ở mức 25% (Gyroid). Bạn sẽ có một chi tiết cứng cáp gấp đôi trong khi tiết kiệm 20% nhựa và 15% thời gian in.',
    slicerOverrides: {
      wall_loops: 4,
      sparse_infill_density: '25%',
      sparse_infill_pattern: 'gyroid',
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PETG', 'PETG-CF', 'ABS', 'PLA+'],
    applicableCategories: ['Mechanical & Functional', 'Tools & Utilities'],
    confidenceScore: 99,
    verificationCount: 460,
    sourcePlatform: 'cnc_kitchen',
    sourceReference: 'CNC Kitchen: More Walls vs More Infill Mechanical Strength Benchmarks',
    tags: ['wall_loops', 'infill', 'do_ben_co_hoc', 'tiet_kiem_nhua'],
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-cross-hatch-highspeed',
    title: 'Dùng Cross Hatch hoặc Gyroid ở tốc độ >200mm/s để tránh gãy đầu đùn',
    category: 'slicer_tuning',
    problemSymptom: 'Máy in tốc độ cao (Bambu Lab, Creality K1, Voron) phát ra tiếng đập "cục cục" và có nguy cơ làm lệch bước hoặc gãy đầu gá khi in ruột.',
    rootCause: 'Mẫu Grid infill có các đường nhựa cắt ngang qua nhau ở cùng một độ cao. Ở tốc độ cao, vòi phun va quẹt trực tiếp vào các điểm giao nhau bị gồ lên.',
    solutionText: 'Bắt buộc chuyển sang mẫu ruột Cross Hatch (Bambu Studio mới) hoặc Gyroid. Các mẫu này không bao giờ cắt chéo nhau trên cùng một lớp, triệt tiêu hoàn toàn va chạm cơ học.',
    slicerOverrides: {
      sparse_infill_pattern: 'cross_hatch',
    },
    applicablePrinters: ['bambu-x1c-p1s', 'bambu-a1-mini', 'creality-k1', 'voron-24'],
    applicableFilaments: ['all'],
    confidenceScore: 99,
    verificationCount: 510,
    sourcePlatform: 'bambu_forum',
    sourceReference: 'Bambu Lab Studio v1.9 Cross Hatch Infill Documentation',
    tags: ['cross_hatch', 'gyroid', 'corexy', 'chong_va_dau_in'],
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-warping-mouse-ears',
    title: 'Bật Brim dạng Mouse Ears (tai chuột) 8mm ở các góc nhọn của hộp lớn để chống co ngót',
    category: 'troubleshooting',
    problemSymptom: 'Các mô hình hộp chữ nhật lớn có các góc nhọn bị nhấc bổng cong mép khỏi bàn in (Warping).',
    rootCause: 'Ứng suất co ngót nhiệt tập trung cao nhất tại các góc nhọn (Stress Concentration).',
    solutionText: 'Chọn kiểu viền Brim = "Mouse Ears" (tai chuột) đường kính 8-10mm ở các góc nhọn. Tai chuột bám cực chắc nhưng bẻ gỡ sạch sẽ chỉ trong 2 giây mà không cần dùng dao gọt bavia cả chu vi bản in.',
    slicerOverrides: {
      brim_type: 'mouse_ears',
      brim_width: 8,
    },
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS'],
    applicableCategories: ['Household', 'Tools & Utilities'],
    confidenceScore: 97,
    verificationCount: 330,
    sourcePlatform: 'reddit',
    sourceReference: 'r/FixMyPrint Warping Corner Prevention Tips',
    tags: ['mouse_ears', 'brim', 'chong_cong_mep', 'warping'],
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-bambu-ams-tpu-warning',
    title: 'CẢNH BÁO: Tuyệt đối không nạp nhựa TPU dẻo mềm vào bộ chuyển màu tự động Bambu AMS',
    category: 'printer_hardware',
    problemSymptom: 'Bambu AMS bị kẹt ống dẫn PTFE, đèn đỏ nhấp nháy, bánh răng đùn cuốn nát sợi nhựa không thể thụt lùi.',
    rootCause: 'Nhựa TPU 95A hoặc 85A quá dẻo mềm. Cơ chế rút đẩy tự động của AMS có quãng đường ống PTFE dài và nhiều góc cua gắt, khiến sợi TPU bị cuộn xoắn kẹt cứng.',
    solutionText: 'Nạp nhựa TPU trực tiếp từ giá treo cuộn ngoài (External Spool Holder) đi thẳng vào cụm đầu in Toolhead qua cổng phụ, không cắm qua bộ AMS.',
    applicablePrinters: ['bambu-x1c-p1s', 'bambu-a1-mini'],
    applicableFilaments: ['TPU', 'TPU 95A', 'TPU 85A', 'TPE'],
    confidenceScore: 100,
    verificationCount: 650,
    sourcePlatform: 'bambu_forum',
    sourceReference: 'Bambu Lab Official AMS Filament Compatibility Matrix',
    tags: ['bambu_ams', 'tpu_warning', 'ket_nhua', 'external_spool'],
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
];

class KnowledgeRepository {
  private entries: IKnowledgeEntry[] = [];
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.entries = parsed;
          return;
        }
      }
    } catch (e: any) {
      console.warn('[KnowledgeRepository] Không thể đọc knowledge_base.json, khởi tạo bộ chuẩn:', e.message);
    }

    // Khởi tạo từ bộ hạt nhân chuẩn
    this.entries = [...SEED_KNOWLEDGE_ENTRIES];
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (e: any) {
      console.warn('[KnowledgeRepository] Không thể lưu knowledge_base.json:', e.message);
    }
  }

  getAllEntries(): IKnowledgeEntry[] {
    return [...this.entries];
  }

  getEntryById(id: string): IKnowledgeEntry | undefined {
    return this.entries.find((k) => k.id === id);
  }

  searchEntries(query?: string, category?: string, filament?: string, printerId?: string): IKnowledgeEntry[] {
    let result = [...this.entries];

    if (category && category !== 'all') {
      result = result.filter((k) => k.category === category);
    }

    if (filament && filament !== 'all') {
      const filLower = filament.toLowerCase();
      result = result.filter(
        (k) =>
          k.applicableFilaments.includes('all') ||
          k.applicableFilaments.some((f) => f.toLowerCase().includes(filLower) || filLower.includes(f.toLowerCase()))
      );
    }

    if (printerId && printerId !== 'all') {
      result = result.filter(
        (k) => k.applicablePrinters.includes('all') || k.applicablePrinters.includes(printerId)
      );
    }

    if (query && query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.solutionText.toLowerCase().includes(q) ||
          (k.problemSymptom && k.problemSymptom.toLowerCase().includes(q)) ||
          k.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * CÔNG CỤ ĐỐI CHIẾU TRI THỨC (CROSS-REFERENCE ENGINE)
   * Tự động quét mô hình, máy in và loại nhựa để trích xuất các quy tắc đối chiếu,
   * cảnh báo rủi ro kỹ thuật và bộ thông số override chuẩn xác nhất.
   */
  crossReference(
    modelTitle: string = '',
    category: string = '',
    filamentType: string = 'PLA',
    printerId: string = 'bambu-x1c-p1s'
  ): ICrossReferenceResult {
    const matchedEntries: IKnowledgeEntry[] = [];
    const riskWarnings: IRiskWarning[] = [];
    const recommendedOverrides: ISlicerParameterOverride = {};
    const communityTips: string[] = [];

    const filLower = filamentType.toLowerCase();
    const catLower = category.toLowerCase();
    const titleLower = modelTitle.toLowerCase();

    for (const entry of this.entries) {
      let isMatch = false;

      // 1. Kiểm tra độ tương thích vật liệu
      const filamentMatch =
        entry.applicableFilaments.includes('all') ||
        entry.applicableFilaments.some((f) => filLower.includes(f.toLowerCase()) || f.toLowerCase().includes(filLower));

      // 2. Kiểm tra độ tương thích máy in
      const printerMatch =
        entry.applicablePrinters.includes('all') || entry.applicablePrinters.includes(printerId);

      // 3. Kiểm tra độ tương thích danh mục / tiêu đề
      const categoryMatch =
        !entry.applicableCategories ||
        entry.applicableCategories.length === 0 ||
        entry.applicableCategories.some((c) => catLower.includes(c.toLowerCase()) || titleLower.includes(c.toLowerCase()));

      if (filamentMatch && printerMatch && categoryMatch) {
        isMatch = true;
      }

      if (isMatch) {
        matchedEntries.push(entry);

        // Gom các mẹo thực tiễn
        communityTips.push(entry.solutionText);

        // Gom các thông số override
        if (entry.slicerOverrides) {
          Object.assign(recommendedOverrides, entry.slicerOverrides);
        }

        // Bóc tách cảnh báo rủi ro cao nếu có
        if (entry.id === 'kn-bambu-ams-tpu-warning' && filLower.includes('tpu') && printerId.includes('bambu')) {
          riskWarnings.push({
            severity: 'high',
            title: 'Nguy cơ kẹt ống Bambu AMS với nhựa TPU',
            description: entry.problemSymptom || '',
            suggestedFix: entry.solutionText,
          });
        } else if (entry.id === 'kn-hardened-steel-cf' && (filLower.includes('carbon') || filLower.includes('cf'))) {
          riskWarnings.push({
            severity: 'medium',
            title: 'Yêu cầu vòi phun thép tôi cứng (Hardened Steel)',
            description: entry.problemSymptom || '',
            suggestedFix: entry.solutionText,
          });
        }
      }
    }

    // Tính chỉ số tin cậy trung bình của các quy tắc đối chiếu được
    const avgConfidence =
      matchedEntries.length > 0
        ? Math.round(matchedEntries.reduce((sum, e) => sum + e.confidenceScore, 0) / matchedEntries.length)
        : 90;

    return {
      matchedEntries,
      riskWarnings,
      recommendedOverrides,
      communityTips: Array.from(new Set(communityTips)),
      confidenceIndex: avgConfidence,
      totalCrossCheckedRules: this.entries.length,
    };
  }

  upsertEntry(entry: Partial<IKnowledgeEntry> & { title: string; solutionText: string }): IKnowledgeEntry {
    const existingIndex = this.entries.findIndex((k) => k.id === entry.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = this.entries[existingIndex];
      const updated: IKnowledgeEntry = {
        ...existing,
        ...entry,
        id: existing.id,
        updatedAt: now,
      };
      this.entries[existingIndex] = updated;
      this.saveToDisk();
      return updated;
    }

    const newId = entry.id || `kn-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: IKnowledgeEntry = {
      id: newId,
      title: entry.title,
      category: entry.category || 'slicer_tuning',
      problemSymptom: entry.problemSymptom,
      rootCause: entry.rootCause,
      solutionText: entry.solutionText,
      slicerOverrides: entry.slicerOverrides,
      applicablePrinters: entry.applicablePrinters || ['all'],
      applicableFilaments: entry.applicableFilaments || ['PLA'],
      applicableCategories: entry.applicableCategories,
      confidenceScore: entry.confidenceScore || 90,
      verificationCount: entry.verificationCount || 1,
      sourcePlatform: entry.sourcePlatform || 'expert_curated',
      sourceReference: entry.sourceReference,
      tags: entry.tags || ['slicer'],
      createdAt: now,
      updatedAt: now,
      isVerified: entry.isVerified ?? true,
    };

    this.entries.unshift(newEntry);
    this.saveToDisk();
    return newEntry;
  }

  deleteEntry(id: string): boolean {
    const initialLen = this.entries.length;
    this.entries = this.entries.filter((k) => k.id !== id);
    if (this.entries.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }
}

export const knowledgeRepository = new KnowledgeRepository();
