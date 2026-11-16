import fs from 'fs';
import path from 'path';
import {
  IKnowledgeEntry,
  ICrossReferenceResult,
  IRiskWarning,
  ISlicerParameterOverride,
  KnowledgeModerationStatus,
} from '../domain/knowledge';
import { supabaseCloudService } from '../db/supabaseClient';
import { executeNeonQuery, isNeonConfigured } from '../services/neon/neonClient';
import {
  computeKnowledgeContentHash,
  normalizeModerationStatus,
} from '../services/knowledge/KnowledgeSanitizer';

export const SEED_KNOWLEDGE_ENTRIES: IKnowledgeEntry[] = [
  {
    id: 'kn-sim-heat-creep-pla',
    title: 'Tắc đầu phun do Heat Creep khi in PLA đóng kín buồng nhiệt và Retraction dài',
    category: 'simulator_defect_learning',
    defectType: 'clogging',
    severity: 'critical',
    problemSymptom: 'Đang in khoảng 30-45 phút thì nhựa ngừng đùn hoàn toàn (in không khí), bánh răng Extruder kêu lạch cạch và cào khuyết sợi nhựa.',
    rootCause: 'Nhựa PLA có nhiệt độ chuyển thủy tinh thấp (Tg ~ 55-60°C). Khi đóng kín cửa máy hoặc rút nhựa (Retraction) > 1.5mm trên đầu Direct Drive, nhựa nóng bị kéo ngược lên vùng tản nhiệt (Cold Zone), nở phồng và kẹt cứng trong cổ họng.',
    solutionText: 'Giảm Retraction Length xuống 0.6 - 0.8mm, hạ nhiệt bàn in PLA xuống 55°C, bật quạt buồng / mở hé nắp kính trên của máy Bambu Lab X1C/P1S khi in PLA.',
    slicerOverrides: {
      retraction_length: 0.8,
      hot_plate_temp: 55,
      nozzle_temperature: 220,
    },
    triggerCondition: {
      paramKey: 'retractionDistanceMm',
      operator: '>',
      thresholdValue: 1.4,
      description: 'Retraction > 1.4mm trên đầu Direct Drive với nhựa PLA',
    },
    autoFixPatch: {
      retractionDistanceMm: 0.8,
      bedTemp: 55,
      nozzleTemp: 220,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PLA-CF'],
    confidenceScore: 99,
    verificationCount: 412,
    sourcePlatform: 'expert_curated',
    sourceReference: 'Bambu Lab Direct-Drive Extruder Thermal Analysis',
    tags: ['heat_creep', 'tac_dau_in', 'clogging', 'retraction', 'pla'],
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-sim-ringing-ghosting',
    title: 'Sóng âm bề mặt (Ringing / Ghosting) và trượt bước (Layer Shift) khi gia tốc vách ngoài quá cao',
    category: 'simulator_defect_learning',
    defectType: 'ringing',
    severity: 'high',
    problemSymptom: 'Bề mặt quanh các góc vuông hoặc chữ khắc nổi xuất hiện các gợn sóng lặp lại như bóng ma (Ghosting), hoặc các lớp trên bị lệch hẳn sang một bên.',
    rootCause: 'Khi tốc độ vách ngoài (Outer Wall Speed > 220mm/s) hoặc gia tốc vách ngoài (> 8000 mm/s²) vượt ngưỡng giảm chấn Input Shaping của khung máy, dao động cơ học dư thừa in hằn lên lớp nhựa.',
    solutionText: 'Giảm tốc độ vách ngoài (Outer Wall Speed) xuống 120 - 150 mm/s và gia tốc vách ngoài xuống 5000 mm/s² để bề mặt láng bóng như đúc khuôn.',
    slicerOverrides: {
      outer_wall_speed: 120,
    },
    triggerCondition: {
      paramKey: 'outerWallSpeed',
      operator: '>',
      thresholdValue: 200,
      description: 'Tốc độ vách ngoài > 200 mm/s gây rung chấn bề mặt',
    },
    autoFixPatch: {
      outerWallSpeed: 120,
      outerWallAcceleration: 5000,
      printSpeed: 220,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS', 'ASA'],
    confidenceScore: 98,
    verificationCount: 365,
    sourcePlatform: 'expert_curated',
    sourceReference: 'Klipper & Bambu Input Shaping Resonance Benchmark',
    tags: ['ringing', 'ghosting', 'layer_shift', 'outer_wall_speed', 'gia_toc'],
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-sim-delamination-abs',
    title: 'Tách lớp ngang (Layer Delamination) khi in nhựa kỹ thuật ABS/ASA bật quạt làm mát quá mạnh',
    category: 'simulator_defect_learning',
    defectType: 'delamination',
    severity: 'critical',
    problemSymptom: 'Thân sản phẩm xuất hiện các vết nứt toác nằm ngang giữa các lớp in, bẻ nhẹ bị tách rời theo thớ lớp.',
    rootCause: 'Nhựa ABS/ASA có độ co ngót nhiệt lớn. Khi quạt làm mát chi tiết (Part Cooling Fan) thổi mạnh (> 40%), lớp nhựa vừa đùn ra nguội đột ngột trước khi kịp khuếch tán phân tử vào lớp dưới, tạo ứng suất kéo làm nứt toác liên kết tầng.',
    solutionText: 'Hạ quạt làm mát (Cooling Fan) xuống 15-25% khi in ABS/ASA, nâng nhiệt đầu phun lên 260°C và nhiệt bàn in lên 95-100°C để giữ nhiệt buồng in.',
    slicerOverrides: {
      fan_max_speed: 20,
      nozzle_temperature: 260,
      hot_plate_temp: 100,
    },
    triggerCondition: {
      paramKey: 'coolingFanSpeed',
      operator: '>',
      thresholdValue: 45,
      description: 'Quạt làm mát > 45% khi in ABS/ASA gây nứt tách lớp',
    },
    autoFixPatch: {
      coolingFanSpeed: 20,
      nozzleTemp: 260,
      bedTemp: 100,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['ABS', 'ASA'],
    confidenceScore: 99,
    verificationCount: 290,
    sourcePlatform: 'expert_curated',
    sourceReference: 'Polymer Inter-Layer Diffusion & Thermal Shrinkage Study',
    tags: ['delamination', 'tach_lop', 'abs', 'cooling_fan'],
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-vn-humidity-petg',
    title: 'Xử lý ẩm nhựa PETG & TPU trong mùa nồm ẩm Việt Nam (85-95%)',
    category: 'vietnam_environment',
    defectType: 'moisture_bubbling',
    severity: 'high',
    problemSymptom: 'Nhựa đùn ra có tiếng nổ lách tách li ti, bề mặt rỗ bọt khí và tưa sợi kéo màng (stringing) rất nặng.',
    rootCause: 'Khí hậu nồm ẩm Việt Nam khiến nhựa PETG và TPU no nước chỉ sau 48h để ngoài không khí. Nước bị đun sôi ở 240°C trong vòi phun tạo bọt khí giãn nở tức thì.',
    solutionText: 'Sấy nhựa ở 65°C trong ít nhất 6 giờ bằng hộp sấy chuyên dụng. Trong Slicer, chỉnh Retraction = 1.0mm và giảm nhiệt đầu phun PETG xuống 240-245°C.',
    slicerOverrides: {
      drying_temperature: 65,
      drying_time_hours: 6,
      retraction_length: 1.0,
    },
    autoFixPatch: {
      retractionDistanceMm: 1.0,
      nozzleTemp: 242,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['PETG', 'PETG-CF', 'TPU', 'PA-CF'],
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
    title: 'Khôi phục độ dính bàn in PEI bằng nước ấm và Sunlight chống bong lớp 1',
    category: 'vietnam_environment',
    defectType: 'first_layer',
    severity: 'high',
    problemSymptom: 'Lớp in đầu tiên bị bong mép (warping) hoặc cuốn vào đầu phun dù đã chỉnh Z-offset chuẩn.',
    rootCause: 'Mồ hôi và dầu mỡ từ vân tay bám lên bề mặt PEI. Cồn Isopropyl Alcohol (IPA) chỉ hòa tan dầu mỡ và dàn đều ra chứ không rửa trôi hoàn toàn lớp nhờn.',
    solutionText: 'Tháo tấm PEI rửa trực tiếp dưới vòi nước ấm với nước rửa chén Sunlight. Trong Slicer, đặt độ dày lớp 1 (First Layer Height) = 0.24mm và bật Brim 5mm.',
    autoFixPatch: {
      firstLayerHeight: 0.24,
      brimEnabled: true,
      brimWidthMm: 5,
    },
    submittedBy: 'hlcai_admin',
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
    title: 'Giấu 90% vết nối viền ngoài Z-Seam bằng Aligned / Scarf Seam & Pressure Advance',
    category: 'slicer_tuning',
    defectType: 'z_seam_scarring',
    severity: 'medium',
    problemSymptom: 'Mặt ngoài của chi tiết tròn, trụ hoặc figure có đường sọc nổi cộm hoặc mụn nhựa (Z-seam blobs) gây mất thẩm mỹ.',
    rootCause: 'Điểm bắt đầu và kết thúc của một vòng viền ngoài tạo ra mối hàn nhựa thừa do áp lực buồng nóng chưa kịp giải phóng khi đổi lớp (thiếu Pressure Advance hoặc để Random Seam).',
    solutionText: 'Chuyển Seam Position sang "Aligned" hoặc "Back" để gom đường nối vào góc khuất, đồng thời tinh chỉnh hệ số Pressure Advance = 0.02 - 0.04.',
    slicerOverrides: {
      seam_slope_type: 'scarf',
      seam_slope_angle: 45,
      outer_wall_speed: 60,
    },
    autoFixPatch: {
      seamPosition: 'aligned',
      pressureAdvance: 0.025,
      retractionDistanceMm: 0.8,
    },
    submittedBy: 'hlcai_admin',
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
    id: 'kn-tree-support-interface',
    title: 'Tree Support Organic với Top Z-Distance 0.20mm gỡ êm tay không bị dính cứng',
    category: 'slicer_tuning',
    defectType: 'support_fusion',
    severity: 'high',
    problemSymptom: 'Support dính quá chặt vào mô hình (Support Fusion), khi bóc tách để lại chân nhựa lởm chởm hoặc làm gãy chi tiết nhỏ.',
    rootCause: 'Khoảng cách giữa đỉnh support và đáy mô hình (Support Top Z-Distance) quá nhỏ (<0.14mm) khiến nhựa nóng chảy hàn chết vào bề mặt mẫu in.',
    solutionText: 'Chuyển sang Tree Support Organic, đặt Support Top Z-Distance = 0.20mm (bằng 1 lớp in) và bật 2-3 Support Interface Layers.',
    slicerOverrides: {
      enable_support: true,
      support_type: 'tree(auto)',
      support_top_z_distance: 0.2,
    },
    triggerCondition: {
      paramKey: 'supportTopZDistance',
      operator: '<',
      thresholdValue: 0.14,
      description: 'Khoảng cách Top Z-Distance < 0.14mm gây dính chết Support vào mẫu',
    },
    autoFixPatch: {
      supportMode: 'tree',
      treeStyle: 'organic',
      supportTopZDistance: 0.2,
      supportInterfaceLayers: 2,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS'],
    applicableCategories: ['Art & Decor', 'Toys & Games'],
    confidenceScore: 98,
    verificationCount: 380,
    sourcePlatform: 'printables',
    sourceReference: 'PrusaSlicer & Bambu Studio Organic Support Best Practices',
    tags: ['tree_support', 'organic_support', 'khong_de_lai_seo', 'figure'],
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-mechanical-wall-priority',
    title: 'Tăng Wall Loops lên 3-4 lớp và Top Shell >= 4 lớp để chống phồng nóc (Pillowing) & tăng độ bền',
    category: 'commercial_practice',
    defectType: 'pillowing',
    severity: 'medium',
    problemSymptom: 'Mặt trên cùng bị lồi lõm lỗ chỗ (Pillowing) hoặc vách mỏng lộ đường gân ruột bên trong (Infill Ghosting).',
    rootCause: 'Số vòng tường (Wall Loops < 2) hoặc số lớp nóc (Top Shell Layers < 3) kết hợp với mật độ Infill thưa khiến nhựa lớp nóc bị sụp xuống các ô trống của Infill.',
    solutionText: 'Thiết lập tối thiểu 3-4 Wall Loops, 4-5 Top Shell Layers và giữ Infill >= 15% mẫu Gyroid.',
    slicerOverrides: {
      wall_loops: 3,
      top_shell_layers: 4,
      sparse_infill_density: '15%',
      sparse_infill_pattern: 'gyroid',
    },
    autoFixPatch: {
      wallLoops: 3,
      topShellLayers: 4,
      infillDensity: 15,
      infillType: 'gyroid',
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['PLA', 'PETG', 'ABS', 'PLA-CF'],
    confidenceScore: 99,
    verificationCount: 460,
    sourcePlatform: 'cnc_kitchen',
    sourceReference: 'CNC Kitchen: More Walls vs More Infill Mechanical Strength Benchmarks',
    tags: ['wall_loops', 'infill', 'pillowing', 'top_shell'],
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
  {
    id: 'kn-cross-hatch-highspeed',
    title: 'Tránh dùng mẫu ruột Grid ở tốc độ >200mm/s để chống cọ quẹt đầu phun gây đổ mẫu (Knock-Over)',
    category: 'slicer_tuning',
    defectType: 'knock_over',
    severity: 'high',
    problemSymptom: 'Máy in tốc độ cao phát ra tiếng cọ "cục cục" khi đi qua ruột và có nguy cơ hất văng mẫu in cao mảnh khỏi bàn nhiệt.',
    rootCause: 'Mẫu Grid infill có các đường nhựa cắt chéo qua nhau trên cùng một lớp, làm tích tụ điểm gồ. Ở tốc độ cao, đầu phun tông trực tiếp vào các điểm gồ này.',
    solutionText: 'Chuyển sang mẫu ruột Gyroid hoặc Honeycomb, bật Z-Hop = 0.4mm và bật Brim nếu mẫu cao.',
    slicerOverrides: {
      sparse_infill_pattern: 'gyroid',
    },
    autoFixPatch: {
      infillType: 'gyroid',
      zHopMm: 0.4,
      brimEnabled: true,
      brimWidthMm: 5,
    },
    submittedBy: 'hlcai_admin',
    applicablePrinters: ['all'],
    applicableFilaments: ['all'],
    confidenceScore: 99,
    verificationCount: 510,
    sourcePlatform: 'bambu_forum',
    sourceReference: 'Bambu Lab High-Speed Infill Collision Prevention Guide',
    tags: ['gyroid', 'grid_collision', 'knock_over', 'z_hop'],
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-08T00:00:00.000Z',
    isVerified: true,
  },
];

export type KnowledgeStorageBackend = 'neon_postgres' | 'supabase_kv' | 'local_memory';

interface NeonKnowledgeRow {
  id: string;
  title: string;
  category: IKnowledgeEntry['category'];
  defect_type: string | null;
  severity: IKnowledgeEntry['severity'] | null;
  problem_symptom: string | null;
  root_cause: string | null;
  solution_text: string;
  slicer_overrides: any;
  trigger_condition: any;
  auto_fix_patch: any;
  submitted_by_user_id: string | null;
  submitted_by: string | null;
  applicable_printers: string[] | null;
  applicable_filaments: string[] | null;
  applicable_categories: string[] | null;
  confidence_score: number | null;
  verification_count: number | null;
  source_platform: IKnowledgeEntry['sourcePlatform'] | null;
  source_reference: string | null;
  tags: string[] | null;
  moderation_status: KnowledgeModerationStatus | null;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  rejection_reason: string | null;
  content_hash: string | null;
  is_verified: boolean | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}

function parseJsonColumn<T>(val: unknown): T | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
        return undefined;
      }
      return parsed as T;
    } catch {
      return undefined;
    }
  }
  if (typeof val === 'object') {
    if (!Array.isArray(val) && Object.keys(val as object).length === 0) return undefined;
    return val as T;
  }
  return undefined;
}

function rowToKnowledgeEntry(row: NeonKnowledgeRow): IKnowledgeEntry {
  const moderationStatus: KnowledgeModerationStatus =
    row.moderation_status === 'pending' ||
    row.moderation_status === 'approved' ||
    row.moderation_status === 'rejected' ||
    row.moderation_status === 'archived'
      ? row.moderation_status
      : row.is_verified
        ? 'approved'
        : 'pending';

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    defectType: row.defect_type || 'custom_defect',
    severity: row.severity || 'medium',
    problemSymptom: row.problem_symptom || undefined,
    rootCause: row.root_cause || undefined,
    solutionText: row.solution_text,
    slicerOverrides: parseJsonColumn(row.slicer_overrides),
    triggerCondition: parseJsonColumn(row.trigger_condition),
    autoFixPatch: parseJsonColumn(row.auto_fix_patch),
    submittedByUserId: row.submitted_by_user_id || undefined,
    submittedBy: row.submitted_by || 'maker_user',
    applicablePrinters:
      Array.isArray(row.applicable_printers) && row.applicable_printers.length > 0
        ? row.applicable_printers
        : ['all'],
    applicableFilaments:
      Array.isArray(row.applicable_filaments) && row.applicable_filaments.length > 0
        ? row.applicable_filaments
        : ['PLA'],
    applicableCategories:
      Array.isArray(row.applicable_categories) && row.applicable_categories.length > 0
        ? row.applicable_categories
        : undefined,
    confidenceScore: typeof row.confidence_score === 'number' ? row.confidence_score : 75,
    verificationCount: typeof row.verification_count === 'number' ? row.verification_count : 0,
    sourcePlatform: row.source_platform || 'user_contributed',
    sourceReference: row.source_reference || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    moderationStatus,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
    rejectionReason: row.rejection_reason || undefined,
    contentHash: row.content_hash || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    isVerified: moderationStatus === 'approved',
  };
}

class KnowledgeRepository {
  private entries: IKnowledgeEntry[] = [];
  private filePath: string;
  private hydratedFromCloud = false;
  private neonSchemaReadyPromise: Promise<boolean> | null = null;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
    this.loadFromDisk();
    this.hydrateFromSupabase();
  }

  getStorageBackend(): KnowledgeStorageBackend {
    if (isNeonConfigured()) return 'neon_postgres';
    if (supabaseCloudService.isConfigured) return 'supabase_kv';
    return 'local_memory';
  }

  private async ensureNeonSchemaAndSeed(): Promise<boolean> {
    if (!isNeonConfigured()) return false;
    if (this.neonSchemaReadyPromise) {
      return this.neonSchemaReadyPromise;
    }

    this.neonSchemaReadyPromise = (async () => {
      try {
        const ddlStatements = [
          `CREATE TABLE IF NOT EXISTS ai_knowledge_rules (
            id VARCHAR(64) PRIMARY KEY,
            title TEXT NOT NULL,
            category VARCHAR(48) NOT NULL,
            defect_type VARCHAR(64),
            severity VARCHAR(16) DEFAULT 'medium',
            problem_symptom TEXT,
            root_cause TEXT,
            solution_text TEXT NOT NULL,
            slicer_overrides JSONB DEFAULT '{}'::jsonb,
            trigger_condition JSONB DEFAULT '{}'::jsonb,
            auto_fix_patch JSONB DEFAULT '{}'::jsonb,
            submitted_by_user_id VARCHAR(64),
            submitted_by VARCHAR(120),
            applicable_printers TEXT[] DEFAULT ARRAY['all']::TEXT[],
            applicable_filaments TEXT[] DEFAULT ARRAY['PLA']::TEXT[],
            applicable_categories TEXT[] DEFAULT ARRAY['all']::TEXT[],
            confidence_score INTEGER DEFAULT 75,
            verification_count INTEGER DEFAULT 0,
            source_platform VARCHAR(48) DEFAULT 'user_contributed',
            source_reference TEXT,
            tags TEXT[] DEFAULT ARRAY[]::TEXT[],
            moderation_status VARCHAR(24) DEFAULT 'pending',
            reviewed_by VARCHAR(120),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT,
            content_hash VARCHAR(64),
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );`,
          `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_status ON ai_knowledge_rules (moderation_status);`,
          `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_submitter ON ai_knowledge_rules (submitted_by_user_id);`,
          `CREATE INDEX IF NOT EXISTS idx_ai_knowledge_hash ON ai_knowledge_rules (content_hash);`,
        ];

        for (const stmt of ddlStatements) {
          const r = await executeNeonQuery(stmt);
          if (!r.success) return false;
        }

        const countRes = await executeNeonQuery<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM ai_knowledge_rules`
        );
        const existingCount = Number(countRes.data?.[0]?.cnt || '0');
        if (existingCount === 0) {
          for (const seed of SEED_KNOWLEDGE_ENTRIES) {
            const hash = computeKnowledgeContentHash({
              title: seed.title,
              defectType: seed.defectType,
              triggerCondition: seed.triggerCondition,
              problemSymptom: seed.problemSymptom,
            });
            await executeNeonQuery(
              `INSERT INTO ai_knowledge_rules (
                id, title, category, defect_type, severity, problem_symptom, root_cause,
                solution_text, slicer_overrides, trigger_condition, auto_fix_patch,
                submitted_by_user_id, submitted_by, applicable_printers, applicable_filaments,
                applicable_categories, confidence_score, verification_count, source_platform,
                source_reference, tags, moderation_status, reviewed_by, reviewed_at,
                content_hash, is_verified, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9::jsonb, $10::jsonb, $11::jsonb,
                $12, $13, $14::text[], $15::text[],
                $16::text[], $17, $18, $19,
                $20, $21::text[], 'approved', 'system_seed', $22,
                $23, TRUE, $24, $25
              ) ON CONFLICT (id) DO NOTHING`,
              [
                seed.id,
                seed.title,
                seed.category,
                seed.defectType || 'custom_defect',
                seed.severity || 'medium',
                seed.problemSymptom || '',
                seed.rootCause || '',
                seed.solutionText,
                JSON.stringify(seed.slicerOverrides || {}),
                JSON.stringify(seed.triggerCondition || {}),
                JSON.stringify(seed.autoFixPatch || {}),
                seed.submittedByUserId || 'usr-admin-01',
                seed.submittedBy || 'Laymor Engineering Lab',
                seed.applicablePrinters || ['all'],
                seed.applicableFilaments || ['PLA'],
                seed.applicableCategories || ['all'],
                seed.confidenceScore ?? 95,
                seed.verificationCount ?? 10,
                seed.sourcePlatform || 'expert_curated',
                seed.sourceReference || null,
                seed.tags || [],
                seed.updatedAt || new Date().toISOString(),
                hash,
                seed.createdAt || new Date().toISOString(),
                seed.updatedAt || new Date().toISOString(),
              ]
            );
          }
        }
        return true;
      } catch {
        this.neonSchemaReadyPromise = null;
        return false;
      }
    })();

    const ok = await this.neonSchemaReadyPromise;
    if (!ok) {
      this.neonSchemaReadyPromise = null;
    }
    return ok;
  }

  private hydrateFromSupabase(): void {
    this.ensureHydrated().catch(() => {});
  }

  async ensureHydrated(): Promise<void> {
    if (isNeonConfigured()) {
      const schemaOk = await this.ensureNeonSchemaAndSeed();
      if (schemaOk) {
        const res = await executeNeonQuery<NeonKnowledgeRow>(
          `SELECT * FROM ai_knowledge_rules ORDER BY updated_at DESC, created_at DESC`
        );
        if (res.success && Array.isArray(res.data)) {
          this.entries = res.data.map(rowToKnowledgeEntry);
          this.hydratedFromCloud = true;
          return;
        }
      }
    }

    if (this.hydratedFromCloud) return;
    this.hydratedFromCloud = true;
    try {
      if (!supabaseCloudService.isConfigured) return;
      const saved = await supabaseCloudService.loadKvState<{ entries?: IKnowledgeEntry[] }>(
        'laymor_knowledge_state'
      );
      if (saved?.entries && Array.isArray(saved.entries) && saved.entries.length > 0) {
        const map = new Map<string, IKnowledgeEntry>();
        for (const s of SEED_KNOWLEDGE_ENTRIES) {
          map.set(s.id, { ...s, moderationStatus: 'approved', isVerified: true });
        }
        for (const c of saved.entries) {
          const st = normalizeModerationStatus(c);
          map.set(c.id, { ...c, moderationStatus: st, isVerified: st === 'approved' });
        }
        this.entries = Array.from(map.values());
      }
    } catch {
      // Fallback to in-memory / local seed entries
    }
  }

  /**
   * Always fetches live rules from Neon PostgreSQL across serverless lambdas when configured.
   */
  async fetchAllEntriesFreshAsync(): Promise<{
    entries: IKnowledgeEntry[];
    storageBackend: KnowledgeStorageBackend;
  }> {
    if (isNeonConfigured()) {
      const ok = await this.ensureNeonSchemaAndSeed();
      if (ok) {
        const res = await executeNeonQuery<NeonKnowledgeRow>(
          `SELECT * FROM ai_knowledge_rules ORDER BY updated_at DESC, created_at DESC`
        );
        if (res.success && Array.isArray(res.data)) {
          const fresh = res.data.map(rowToKnowledgeEntry);
          this.entries = fresh;
          this.hydratedFromCloud = true;
          return { entries: fresh, storageBackend: 'neon_postgres' };
        }
      }
    }

    await this.ensureHydrated();
    return {
      entries: this.getAllEntries(),
      storageBackend: supabaseCloudService.isConfigured ? 'supabase_kv' : 'local_memory',
    };
  }

  async findByContentHashAsync(
    contentHash: string,
    excludeId?: string
  ): Promise<IKnowledgeEntry | null> {
    if (!contentHash) return null;
    if (isNeonConfigured()) {
      const ok = await this.ensureNeonSchemaAndSeed();
      if (ok) {
        const res = excludeId
          ? await executeNeonQuery<NeonKnowledgeRow>(
              `SELECT * FROM ai_knowledge_rules WHERE content_hash = $1 AND id <> $2 LIMIT 1`,
              [contentHash, excludeId]
            )
          : await executeNeonQuery<NeonKnowledgeRow>(
              `SELECT * FROM ai_knowledge_rules WHERE content_hash = $1 LIMIT 1`,
              [contentHash]
            );
        if (res.success && res.data && res.data[0]) {
          return rowToKnowledgeEntry(res.data[0]);
        }
      }
    }
    return (
      this.entries.find(
        (e) => e.contentHash === contentHash && (!excludeId || e.id !== excludeId)
      ) || null
    );
  }

  async getEntryByIdAsync(id: string): Promise<IKnowledgeEntry | null> {
    if (isNeonConfigured()) {
      const ok = await this.ensureNeonSchemaAndSeed();
      if (ok) {
        const res = await executeNeonQuery<NeonKnowledgeRow>(
          `SELECT * FROM ai_knowledge_rules WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.success && res.data && res.data[0]) {
          return rowToKnowledgeEntry(res.data[0]);
        }
        if (res.success) return null;
      }
    }
    await this.ensureHydrated();
    return this.getEntryById(id) || null;
  }

  private persistToSupabase(): void {
    this.persistToSupabaseAsync().catch(() => {});
  }

  async persistToSupabaseAsync(): Promise<boolean> {
    if (!supabaseCloudService.isConfigured) return false;
    try {
      return await supabaseCloudService.saveKvState('laymor_knowledge_state', {
        entries: this.entries,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      return false;
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, IKnowledgeEntry>();
          for (const s of SEED_KNOWLEDGE_ENTRIES) {
            map.set(s.id, { ...s, moderationStatus: 'approved', isVerified: true });
          }
          for (const d of parsed) {
            const st = normalizeModerationStatus(d);
            map.set(d.id, { ...d, moderationStatus: st, isVerified: st === 'approved' });
          }
          this.entries = Array.from(map.values());
          return;
        }
      }
    } catch (e: any) {
      console.warn('[KnowledgeRepository] Khởi tạo bộ chuẩn:', e.message);
    }

    this.entries = SEED_KNOWLEDGE_ENTRIES.map((s) => ({
      ...s,
      moderationStatus: 'approved',
      isVerified: true,
    }));
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch {
      // Ignore read-only filesystem on Vercel serverless
    }
    if (supabaseCloudService.isConfigured) {
      this.persistToSupabase();
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
          (k.rootCause && k.rootCause.toLowerCase().includes(q)) ||
          (k.defectType && k.defectType.toLowerCase().includes(q)) ||
          k.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

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
      const status = normalizeModerationStatus(entry);
      if (!entry.isVerified || status !== 'approved') continue;

      const filamentMatch =
        entry.applicableFilaments.includes('all') ||
        entry.applicableFilaments.some((f) => filLower.includes(f.toLowerCase()) || f.toLowerCase().includes(filLower));

      const printerMatch =
        entry.applicablePrinters.includes('all') || entry.applicablePrinters.includes(printerId);

      const categoryMatch =
        !entry.applicableCategories ||
        entry.applicableCategories.length === 0 ||
        entry.applicableCategories.some((c) => catLower.includes(c.toLowerCase()) || titleLower.includes(c.toLowerCase()));

      if (filamentMatch && printerMatch && categoryMatch) {
        matchedEntries.push(entry);
        communityTips.push(entry.solutionText);
        if (entry.slicerOverrides) {
          Object.assign(recommendedOverrides, entry.slicerOverrides);
        }
        if (entry.severity === 'critical' || entry.severity === 'high') {
          riskWarnings.push({
            severity: entry.severity === 'critical' ? 'high' : 'medium',
            title: entry.title,
            description: entry.problemSymptom || entry.rootCause || '',
            suggestedFix: entry.solutionText,
          });
        }
      }
    }

    const avgConfidence =
      matchedEntries.length > 0
        ? Math.round(matchedEntries.reduce((sum, e) => sum + e.confidenceScore, 0) / matchedEntries.length)
        : 92;

    return {
      matchedEntries,
      riskWarnings,
      recommendedOverrides,
      communityTips: Array.from(new Set(communityTips)),
      confidenceIndex: avgConfidence,
      totalCrossCheckedRules: this.entries.length,
    };
  }

  private buildNormalizedEntry(
    entry: Partial<IKnowledgeEntry> & { title: string; solutionText: string },
    existing?: IKnowledgeEntry
  ): IKnowledgeEntry {
    const now = new Date().toISOString();
    const moderationStatus: KnowledgeModerationStatus = entry.moderationStatus
      ? entry.moderationStatus
      : existing
        ? normalizeModerationStatus({ ...existing, ...entry })
        : entry.isVerified === true
          ? 'approved'
          : 'pending';
    const isVerified = moderationStatus === 'approved';
    const base: IKnowledgeEntry = {
      id:
        existing?.id ||
        entry.id ||
        `kn-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: entry.title,
      category: entry.category || existing?.category || 'simulator_defect_learning',
      defectType: entry.defectType || existing?.defectType || 'custom_defect',
      severity: entry.severity || existing?.severity || 'medium',
      problemSymptom: entry.problemSymptom ?? existing?.problemSymptom,
      rootCause: entry.rootCause ?? existing?.rootCause,
      solutionText: entry.solutionText,
      slicerOverrides: entry.slicerOverrides ?? existing?.slicerOverrides,
      triggerCondition: entry.triggerCondition ?? existing?.triggerCondition,
      autoFixPatch: entry.autoFixPatch ?? existing?.autoFixPatch,
      submittedByUserId: entry.submittedByUserId ?? existing?.submittedByUserId,
      submittedBy: entry.submittedBy || existing?.submittedBy || 'maker_user',
      applicablePrinters: entry.applicablePrinters || existing?.applicablePrinters || ['all'],
      applicableFilaments: entry.applicableFilaments || existing?.applicableFilaments || ['PLA', 'PETG'],
      applicableCategories: entry.applicableCategories ?? existing?.applicableCategories,
      confidenceScore: entry.confidenceScore ?? existing?.confidenceScore ?? (isVerified ? 92 : 75),
      verificationCount: entry.verificationCount ?? existing?.verificationCount ?? (isVerified ? 1 : 0),
      sourcePlatform: entry.sourcePlatform || existing?.sourcePlatform || 'user_contributed',
      sourceReference: entry.sourceReference ?? existing?.sourceReference,
      tags: entry.tags || existing?.tags || ['defect_learning', '3dsim'],
      moderationStatus,
      reviewedBy: entry.reviewedBy ?? existing?.reviewedBy,
      reviewedAt: entry.reviewedAt ?? existing?.reviewedAt,
      rejectionReason: entry.rejectionReason ?? existing?.rejectionReason,
      contentHash:
        entry.contentHash ||
        existing?.contentHash ||
        computeKnowledgeContentHash({
          title: entry.title,
          defectType: entry.defectType || existing?.defectType,
          triggerCondition: entry.triggerCondition ?? existing?.triggerCondition,
          problemSymptom: entry.problemSymptom ?? existing?.problemSymptom,
        }),
      createdAt: existing?.createdAt || entry.createdAt || now,
      updatedAt: now,
      isVerified,
    };
    return base;
  }

  upsertEntry(entry: Partial<IKnowledgeEntry> & { title: string; solutionText: string }): IKnowledgeEntry {
    const existingIndex = entry.id ? this.entries.findIndex((k) => k.id === entry.id) : -1;
    const existing = existingIndex >= 0 ? this.entries[existingIndex] : undefined;
    const saved = this.buildNormalizedEntry(entry, existing);

    if (existingIndex >= 0) {
      this.entries[existingIndex] = saved;
    } else {
      this.entries.unshift(saved);
    }
    this.saveToDisk();
    return saved;
  }

  /**
   * Persists rule synchronously to Neon PostgreSQL when configured and reports true persistence status.
   */
  async upsertEntryDurableAsync(
    entry: Partial<IKnowledgeEntry> & { title: string; solutionText: string }
  ): Promise<{
    entry: IKnowledgeEntry;
    persistedToDb: boolean;
    storageBackend: KnowledgeStorageBackend;
    error?: string;
  }> {
    const existing = entry.id ? await this.getEntryByIdAsync(entry.id) : null;
    const normalized = this.buildNormalizedEntry(entry, existing || undefined);

    // Update in-memory list immediately so local cache reflects write
    const idx = this.entries.findIndex((k) => k.id === normalized.id);
    if (idx >= 0) {
      this.entries[idx] = normalized;
    } else {
      this.entries.unshift(normalized);
    }
    this.saveToDisk();

    if (isNeonConfigured()) {
      const schemaOk = await this.ensureNeonSchemaAndSeed();
      if (!schemaOk) {
        return {
          entry: normalized,
          persistedToDb: false,
          storageBackend: 'local_memory',
          error: 'Không thể khởi tạo bảng ai_knowledge_rules trên Neon PostgreSQL.',
        };
      }

      const res = await executeNeonQuery<NeonKnowledgeRow>(
        `INSERT INTO ai_knowledge_rules (
          id, title, category, defect_type, severity, problem_symptom, root_cause,
          solution_text, slicer_overrides, trigger_condition, auto_fix_patch,
          submitted_by_user_id, submitted_by, applicable_printers, applicable_filaments,
          applicable_categories, confidence_score, verification_count, source_platform,
          source_reference, tags, moderation_status, reviewed_by, reviewed_at,
          rejection_reason, content_hash, is_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9::jsonb, $10::jsonb, $11::jsonb,
          $12, $13, $14::text[], $15::text[],
          $16::text[], $17, $18, $19,
          $20, $21::text[], $22, $23, $24,
          $25, $26, $27, $28, $29
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          defect_type = EXCLUDED.defect_type,
          severity = EXCLUDED.severity,
          problem_symptom = EXCLUDED.problem_symptom,
          root_cause = EXCLUDED.root_cause,
          solution_text = EXCLUDED.solution_text,
          slicer_overrides = EXCLUDED.slicer_overrides,
          trigger_condition = EXCLUDED.trigger_condition,
          auto_fix_patch = EXCLUDED.auto_fix_patch,
          applicable_printers = EXCLUDED.applicable_printers,
          applicable_filaments = EXCLUDED.applicable_filaments,
          applicable_categories = EXCLUDED.applicable_categories,
          confidence_score = EXCLUDED.confidence_score,
          verification_count = EXCLUDED.verification_count,
          source_platform = EXCLUDED.source_platform,
          source_reference = EXCLUDED.source_reference,
          tags = EXCLUDED.tags,
          moderation_status = EXCLUDED.moderation_status,
          reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = EXCLUDED.reviewed_at,
          rejection_reason = EXCLUDED.rejection_reason,
          content_hash = EXCLUDED.content_hash,
          is_verified = EXCLUDED.is_verified,
          updated_at = EXCLUDED.updated_at
        RETURNING *`,
        [
          normalized.id,
          normalized.title,
          normalized.category,
          normalized.defectType || 'custom_defect',
          normalized.severity || 'medium',
          normalized.problemSymptom || '',
          normalized.rootCause || '',
          normalized.solutionText,
          JSON.stringify(normalized.slicerOverrides || {}),
          JSON.stringify(normalized.triggerCondition || {}),
          JSON.stringify(normalized.autoFixPatch || {}),
          normalized.submittedByUserId || null,
          normalized.submittedBy || 'maker_user',
          normalized.applicablePrinters || ['all'],
          normalized.applicableFilaments || ['PLA'],
          normalized.applicableCategories || ['all'],
          normalized.confidenceScore,
          normalized.verificationCount,
          normalized.sourcePlatform,
          normalized.sourceReference || null,
          normalized.tags || [],
          normalized.moderationStatus || 'pending',
          normalized.reviewedBy || null,
          normalized.reviewedAt || null,
          normalized.rejectionReason || null,
          normalized.contentHash || null,
          normalized.isVerified,
          normalized.createdAt,
          normalized.updatedAt,
        ]
      );

      if (res.success && res.data?.[0]) {
        const mapped = rowToKnowledgeEntry(res.data[0]);
        const i = this.entries.findIndex((k) => k.id === mapped.id);
        if (i >= 0) this.entries[i] = mapped;
        return {
          entry: mapped,
          persistedToDb: true,
          storageBackend: 'neon_postgres',
        };
      }

      return {
        entry: normalized,
        persistedToDb: false,
        storageBackend: 'local_memory',
        error: res.error || 'Ghi vào Neon PostgreSQL thất bại.',
      };
    }

    if (supabaseCloudService.isConfigured) {
      const ok = await this.persistToSupabaseAsync();
      return {
        entry: normalized,
        persistedToDb: ok,
        storageBackend: ok ? 'supabase_kv' : 'local_memory',
        error: ok ? undefined : 'Supabase KV save returned false.',
      };
    }

    return {
      entry: normalized,
      persistedToDb: false,
      storageBackend: 'local_memory',
    };
  }

  async moderateEntryAsync(params: {
    id: string;
    action: 'approve' | 'reject' | 'unverify' | 'archive';
    reviewerName: string;
    rejectionReason?: string;
  }): Promise<{
    entry: IKnowledgeEntry | null;
    persistedToDb: boolean;
    storageBackend: KnowledgeStorageBackend;
    error?: string;
  }> {
    const existing = await this.getEntryByIdAsync(params.id);
    if (!existing) {
      return {
        entry: null,
        persistedToDb: false,
        storageBackend: this.getStorageBackend(),
        error: 'Không tìm thấy bài học lỗi để kiểm duyệt.',
      };
    }

    const now = new Date().toISOString();
    let moderationStatus: KnowledgeModerationStatus = 'pending';
    let rejectionReason: string | undefined = undefined;
    let verificationCount = existing.verificationCount;
    let confidenceScore = existing.confidenceScore;

    if (params.action === 'approve') {
      moderationStatus = 'approved';
      verificationCount = Math.max(1, (existing.verificationCount || 0) + 1);
      confidenceScore = Math.max(existing.confidenceScore || 80, 95);
    } else if (params.action === 'reject') {
      moderationStatus = 'rejected';
      rejectionReason =
        params.rejectionReason?.trim() || 'Chưa đạt tiêu chuẩn kiểm chứng kỹ thuật của Admin.';
    } else if (params.action === 'archive') {
      moderationStatus = 'archived';
    } else {
      moderationStatus = 'pending';
    }

    return this.upsertEntryDurableAsync({
      ...existing,
      moderationStatus,
      isVerified: moderationStatus === 'approved',
      reviewedBy: params.reviewerName,
      reviewedAt: now,
      rejectionReason,
      verificationCount,
      confidenceScore,
      updatedAt: now,
    });
  }

  async upsertEntryAsync(
    entry: Partial<IKnowledgeEntry> & { title: string; solutionText: string }
  ): Promise<IKnowledgeEntry> {
    const res = await this.upsertEntryDurableAsync(entry);
    return res.entry;
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

  async deleteEntryDurableAsync(id: string): Promise<{
    deleted: boolean;
    persistedToDb: boolean;
    storageBackend: KnowledgeStorageBackend;
    error?: string;
  }> {
    if (isNeonConfigured()) {
      const schemaOk = await this.ensureNeonSchemaAndSeed();
      if (!schemaOk) {
        return {
          deleted: false,
          persistedToDb: false,
          storageBackend: 'local_memory',
          error: 'Không thể kết nối Neon PostgreSQL để xóa rule.',
        };
      }
      const res = await executeNeonQuery<{ id: string }>(
        `DELETE FROM ai_knowledge_rules WHERE id = $1 RETURNING id`,
        [id]
      );
      if (!res.success) {
        return {
          deleted: false,
          persistedToDb: false,
          storageBackend: 'local_memory',
          error: res.error,
        };
      }
      const deletedCount = res.data?.length || 0;
      this.deleteEntry(id);
      return {
        deleted: deletedCount > 0,
        persistedToDb: true,
        storageBackend: 'neon_postgres',
      };
    }

    await this.ensureHydrated();
    const deleted = this.deleteEntry(id);
    if (deleted && supabaseCloudService.isConfigured) {
      const ok = await this.persistToSupabaseAsync();
      return {
        deleted: true,
        persistedToDb: ok,
        storageBackend: ok ? 'supabase_kv' : 'local_memory',
      };
    }
    return {
      deleted,
      persistedToDb: false,
      storageBackend: 'local_memory',
    };
  }

  async deleteEntryAsync(id: string): Promise<boolean> {
    const res = await this.deleteEntryDurableAsync(id);
    return res.deleted;
  }
}

export const knowledgeRepository = new KnowledgeRepository();
