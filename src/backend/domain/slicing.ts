export interface IPrinterProfile {
  id: string;
  name: string;
  manufacturer: 'Bambu Lab' | 'Prusa' | 'Creality' | 'Anycubic' | 'Custom';
  bedDimensions: {
    x: number; // mm (Width)
    y: number; // mm (Depth)
    z: number; // mm (Height)
  };
  maxSpeedMmS: number;
  heatedBed: boolean;
  recommendedSupport: 'tree' | 'normal';
  accentColor: string;
}

export type SupportType = 'tree' | 'normal' | 'none';

export interface ISupportConfig {
  enabled: boolean;
  type: SupportType;
  overhangThresholdDegrees: number; // Ví dụ: 45° hoặc 55°
  supportDensityPercent: number; // 10% - 25%
  interfaceLayers: number;
}

export interface IPrintEstimation {
  layerHeightMm: number;
  totalLayers: number;
  modelDimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  isOutOfBounds: boolean;
  outOfBoundsAxes: ('X' | 'Y' | 'Z')[];
  estimatedPrintTimeMinutes: number;
  filamentWeightGrams: number;
  filamentLengthMeters: number;
  estimatedCostVnd: number;
  hasOverhangRisk: boolean;
  aiSupportRecommendation: {
    suggestedType: SupportType;
    reason: string;
  };
}

export interface ISlicerProfilePreset {
  id: string;
  name: string;
  slicerTarget: 'OrcaSlicer' | 'BambuStudio' | 'PrusaSlicer' | 'Cura';
  printerId: string;
  printerName: string;
  filamentType: string;
  filamentBrand?: string;
  nozzleDiameterMm: number; // 0.4
  layerHeightMm: number; // 0.16 or 0.20
  initialLayerHeightMm: number; // 0.20
  wallLoops: number; // 3
  topShellLayers: number; // 5
  bottomShellLayers: number; // 4
  infillDensityPercent: number; // 15
  infillPattern: 'gyroid' | 'cross_hatch' | 'grid' | 'honeycomb' | 'adaptive_cubic';
  nozzleTemperatureC: number; // 215
  initialLayerNozzleTempC: number; // 220
  bedTemperatureC: number; // 55
  flowRatio: number; // 0.98
  pressureAdvance: number; // 0.024
  retractionLengthMm: number; // 0.8
  printSpeedOuterWallMmS: number; // 60
  printSpeedInnerWallMmS: number; // 150
  printSpeedInfillMmS: number; // 250
  scarfJointSeamEnabled: boolean; // true (giấu vết nối viền)
  scarfJointSeamAngleDegrees?: number; // 45
  supportEnabled: boolean;
  supportType?: 'tree_organic' | 'standard';
  supportZDistanceMm?: number; // 0.2
  brimType: 'none' | 'outer_only' | 'mouse_ears' | 'auto';
  brimWidthMm?: number; // 5
  coolingFanPercentMin: number; // 30
  coolingFanPercentMax: number; // 100
  dryingRecommendedHours?: number; // 4
  dryingTemperatureC?: number; // 50
  communityTips: string[];
  commercialTier: 'free' | 'vip' | 'farm_optimized';
  estimatedPrintTimeReductionPercent?: number; // e.g. 18%
  confidenceScore?: number; // 0 - 100
  crossCheckedRulesCount?: number;
  riskWarnings?: { severity: 'low' | 'medium' | 'high'; title: string; description: string; suggestedFix: string }[];
  createdAt: string;
}

