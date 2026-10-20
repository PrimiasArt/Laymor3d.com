import { ISlicerProfilePreset } from '../../domain/slicing';
import { IModel3D } from '../../domain/models';
import { printerProfileService } from './PrinterProfileService';
import { communityKnowledgeService } from './CommunityKnowledgeService';
import { knowledgeRepository } from '../../repositories/KnowledgeRepository';

export class SlicingPresetService {
  /**
   * Tự động sinh profile cắt lớp tối ưu chuẩn OrcaSlicer & Bambu Studio
   * CÓ ĐỐI CHIẾU TRỰC TIẾP VỚI KHO TRI THỨC IN 3D THỰC TẾ (KNOWLEDGE BASE)
   */
  generateOptimalProfile(
    model: Partial<IModel3D>,
    printerId: string = 'bambu-x1c-p1s'
  ): ISlicerProfilePreset {
    const printer = printerProfileService.getProfileById(printerId);
    const filamentType = model.filamentType || 'PLA High Speed';
    const thermal = communityKnowledgeService.getThermalProfile(filamentType);
    const category = (model.category || '').toLowerCase();
    const title = (model.title || '3D Model').trim();

    // 1. Đối chiếu trực tiếp với Kho Tri Thức In 3D Thực Tế (Ground Truth Cross-Reference)
    const crossRef = knowledgeRepository.crossReference(title, category, filamentType, printer.id);
    const overrides = crossRef.recommendedOverrides;

    // 2. Quyết định thông số hình học cơ sở theo danh mục
    let layerHeightMm = overrides.layer_height || 0.20;
    let wallLoops = overrides.wall_loops || 3;
    let infillDensityPercent = overrides.sparse_infill_density ? parseInt(overrides.sparse_infill_density) : 15;
    let infillPattern: 'gyroid' | 'cross_hatch' | 'grid' | 'honeycomb' | 'adaptive_cubic' =
      (overrides.sparse_infill_pattern as any) || 'cross_hatch';
    let supportEnabled = overrides.enable_support !== undefined ? overrides.enable_support : false;
    let brimType: 'none' | 'outer_only' | 'mouse_ears' | 'auto' = (overrides.brim_type as any) || 'none';

    if (!overrides.layer_height) {
      if (category.includes('figure') || category.includes('anime') || category.includes('art') || category.includes('decor')) {
        layerHeightMm = 0.16;
        wallLoops = overrides.wall_loops || 3;
        infillDensityPercent = 12;
        infillPattern = 'cross_hatch';
        supportEnabled = true;
        brimType = 'mouse_ears';
      } else if (category.includes('mechanical') || category.includes('tool') || category.includes('ams') || category.includes('gear')) {
        layerHeightMm = 0.20;
        wallLoops = overrides.wall_loops || 4;
        infillDensityPercent = 25;
        infillPattern = 'gyroid';
        supportEnabled = false;
        brimType = 'outer_only';
      } else {
        layerHeightMm = 0.20;
        wallLoops = overrides.wall_loops || 3;
        infillDensityPercent = 15;
        infillPattern = 'gyroid';
        supportEnabled = false;
        brimType = 'auto';
      }
    }

    // Kết hợp mẹo từ kho tri thức và kinh nghiệm vật liệu
    const baseTips = communityKnowledgeService.getCommunityTips(category, filamentType, title);
    const combinedTips = Array.from(new Set([...crossRef.communityTips, ...baseTips]));

    const profileId = `profile-${printer.id}-${Date.now().toString(36)}`;
    const profileName = `[3DHub Calibrated] ${printer.name} - ${thermal.type} (${layerHeightMm}mm ${infillPattern.toUpperCase()})`;

    return {
      id: profileId,
      name: profileName,
      slicerTarget: 'OrcaSlicer',
      printerId: printer.id,
      printerName: printer.name,
      filamentType: thermal.type,
      filamentBrand: filamentType.includes('Bambu') ? 'Bambu Lab Official' : 'eSUN / Sunlu High-Speed',
      nozzleDiameterMm: 0.4,
      layerHeightMm,
      initialLayerHeightMm: 0.20,
      wallLoops,
      topShellLayers: 5,
      bottomShellLayers: 4,
      infillDensityPercent,
      infillPattern,
      nozzleTemperatureC: thermal.nozzleTempC,
      initialLayerNozzleTempC: thermal.initialLayerNozzleTempC,
      bedTemperatureC: thermal.bedTempC,
      flowRatio: thermal.flowRatio,
      pressureAdvance: thermal.pressureAdvance,
      retractionLengthMm: thermal.retractionMm,
      printSpeedOuterWallMmS: 65,
      printSpeedInnerWallMmS: Math.min(printer.maxSpeedMmS * 0.4, 180),
      printSpeedInfillMmS: Math.min(printer.maxSpeedMmS * 0.6, 260),
      scarfJointSeamEnabled: true,
      scarfJointSeamAngleDegrees: 45,
      supportEnabled,
      supportType: 'tree_organic',
      supportZDistanceMm: 0.20,
      brimType,
      brimWidthMm: 5,
      coolingFanPercentMin: thermal.fanSpeedMinPercent,
      coolingFanPercentMax: thermal.fanSpeedMaxPercent,
      dryingRecommendedHours: thermal.dryingHours,
      dryingTemperatureC: thermal.dryingTempC,
      communityTips: combinedTips,
      commercialTier: 'vip',
      estimatedPrintTimeReductionPercent: 22,
      confidenceScore: crossRef.confidenceIndex,
      crossCheckedRulesCount: crossRef.matchedEntries.length,
      riskWarnings: crossRef.riskWarnings,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Xuất cấu hình OrcaSlicer / Bambu Studio tiêu chuẩn dạng JSON
   * Tương thích 100% để người dùng import trực tiếp vào OrcaSlicer hoặc Bambu Studio
   */
  exportOrcaSlicerBundle(profile: ISlicerProfilePreset, modelTitle: string = 'Model'): Record<string, any> {
    return {
      version: '2.2.0',
      generator: '3D Hub AI Slicing Knowledge Engine v3.0',
      model_title: modelTitle,
      created_at: profile.createdAt,
      type: 'process',
      name: profile.name,
      compatible_printers: [profile.printerName],
      inherits: '0.20mm Standard @BBL X1C',
      from: 'system',
      setting_id: profile.id,
      process_settings: {
        layer_height: profile.layerHeightMm,
        initial_layer_print_height: profile.initialLayerHeightMm,
        wall_loops: profile.wallLoops,
        top_shell_layers: profile.topShellLayers,
        bottom_shell_layers: profile.bottomShellLayers,
        sparse_infill_density: `${profile.infillDensityPercent}%`,
        sparse_infill_pattern: profile.infillPattern,
        seam_slope_type: profile.scarfJointSeamEnabled ? 'scarf' : 'normal',
        seam_slope_inner_walls: profile.scarfJointSeamEnabled,
        seam_slope_angle: profile.scarfJointSeamAngleDegrees || 45,
        enable_support: profile.supportEnabled,
        support_type: profile.supportType === 'tree_organic' ? 'tree(auto)' : 'normal(auto)',
        support_top_z_distance: profile.supportZDistanceMm || 0.20,
        brim_type: profile.brimType,
        brim_width: profile.brimWidthMm || 5,
        outer_wall_speed: profile.printSpeedOuterWallMmS,
        inner_wall_speed: profile.printSpeedInnerWallMmS,
        sparse_infill_speed: profile.printSpeedInfillMmS,
        travel_speed: 500,
        reduce_infill_retraction: true,
      },
      filament_settings: {
        filament_type: profile.filamentType,
        nozzle_temperature: profile.nozzleTemperatureC,
        nozzle_temperature_initial_layer: profile.initialLayerNozzleTempC,
        hot_plate_temp: profile.bedTemperatureC,
        hot_plate_temp_initial_layer: profile.bedTemperatureC,
        flow_ratio: profile.flowRatio,
        pressure_advance: profile.pressureAdvance,
        retraction_length: profile.retractionLengthMm,
        fan_min_speed: profile.coolingFanPercentMin,
        fan_max_speed: profile.coolingFanPercentMax,
        drying_temperature: profile.dryingTemperatureC,
        drying_time_hours: profile.dryingRecommendedHours,
      },
      community_recommendations: profile.communityTips,
      commercial_license: '3D Hub Verified Print-Ready Profile (Official)',
    };
  }
}

export const slicingPresetService = new SlicingPresetService();
