export type KnowledgeCategory =
  | 'troubleshooting'        // Khắc phục lỗi in (stringing, warping, z-seam, elephant foot, delamination...)
  | 'material_benchmark'      // Đặc tính & định mức nhựa (nhiệt độ, co ngót, sấy nhựa, độ bền)
  | 'slicer_tuning'          // Tinh chỉnh OrcaSlicer / Bambu (Scarf seam, tree support, pressure advance)
  | 'printer_hardware'       // Phần cứng máy in (vòi thép tôi, bàn PEI, quạt gió, buồng nhiệt)
  | 'vietnam_environment'    // Khí hậu Việt Nam (độ ẩm 85-95% mùa nồm, vệ sinh PEI bằng Sunlight)
  | 'commercial_practice';   // Kinh nghiệm vận hành xưởng in thương mại (tối ưu giờ máy, phế phẩm)

export interface ISlicerParameterOverride {
  layer_height?: number;
  initial_layer_print_height?: number;
  wall_loops?: number;
  top_shell_layers?: number;
  bottom_shell_layers?: number;
  sparse_infill_density?: string;
  sparse_infill_pattern?: string;
  seam_slope_type?: 'scarf' | 'normal';
  seam_slope_angle?: number;
  enable_support?: boolean;
  support_type?: string;
  support_top_z_distance?: number;
  brim_type?: string;
  brim_width?: number;
  outer_wall_speed?: number;
  inner_wall_speed?: number;
  sparse_infill_speed?: number;
  nozzle_temperature?: number;
  nozzle_temperature_initial_layer?: number;
  hot_plate_temp?: number;
  flow_ratio?: number;
  pressure_advance?: number;
  retraction_length?: number;
  fan_min_speed?: number;
  fan_max_speed?: number;
  drying_temperature?: number;
  drying_time_hours?: number;
  [key: string]: any;
}

export interface IKnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  problemSymptom?: string;              // Dấu hiệu nhận biết lỗi hoặc câu hỏi kỹ thuật
  rootCause?: string;                   // Nguyên nhân gốc rễ (vật lý, nhiệt học, khí hậu)
  solutionText: string;                 // Giải pháp và hướng dẫn thực thi
  slicerOverrides?: ISlicerParameterOverride; // Cấu hình thông số OrcaSlicer override cụ thể
  applicablePrinters: string[];         // e.g. ['all'] hoặc ['bambu-x1c-p1s', 'creality-k1']
  applicableFilaments: string[];        // e.g. ['PLA', 'PETG', 'TPU', 'ABS', 'Carbon Fiber']
  applicableCategories?: string[];      // e.g. ['Figure / Anime', 'Mechanical', 'Household']
  confidenceScore: number;              // 0 - 100 (độ tin cậy được cộng đồng chứng thực)
  verificationCount: number;            // Số ca in thành công / xác nhận từ cộng đồng
  sourcePlatform: 'reddit' | 'bambu_forum' | 'makerworld' | 'printables' | 'vietnam_community' | 'cnc_kitchen' | 'expert_curated';
  sourceReference?: string;             // Nguồn bài viết / video / diễn đàn
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
}

export interface IRiskWarning {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedFix: string;
}

export interface ICrossReferenceResult {
  matchedEntries: IKnowledgeEntry[];
  riskWarnings: IRiskWarning[];
  recommendedOverrides: ISlicerParameterOverride;
  communityTips: string[];
  confidenceIndex: number; // 0 - 100
  totalCrossCheckedRules: number;
}
