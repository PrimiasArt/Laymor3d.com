export interface IExpertPrintProfile {
  modelId: string;
  modelName: string;
  filamentType: string;
  filamentBrand: string;
  nozzleSizeMm: number; // 0.4mm
  layerHeightMm: number; // 0.16mm - 0.20mm
  firstLayerHeightMm: number; // 0.24mm
  nozzleTempC: number; // 215°C
  firstLayerNozzleTempC: number; // 220°C
  bedTempC: number; // 60°C
  outerWallSpeedMmS: number; // 80 mm/s
  innerWallSpeedMmS: number; // 150 mm/s
  infillSpeedMmS: number; // 250 mm/s
  topSurfaceSpeedMmS: number; // 60 mm/s
  retractionDistanceMm: number; // 0.8 mm (Direct Drive)
  retractionSpeedMmS: number; // 30 mm/s
  zHopMm: number; // 0.4 mm
  coolingFanPercent: number; // 100%
  minLayerTimeSec: number; // 8 sec
  infillPattern: 'Gyroid' | 'Grid' | 'Adaptive Cubic' | 'Honeycomb';
  infillDensityPercent: number; // 15%
  seamPosition: 'Aligned' | 'Back' | 'Nearest' | 'Scarf Joint' | 'Random';
  ironingEnabled: boolean; // Làm mịn bề mặt trên cùng
  treeSupportParams: {
    branchAngleDeg: number; // 40°
    branchDiameterMm: number; // 2.5mm
    topInterfaceLayers: number; // 3 layers
    topInterfaceSpacingMm: number; // 0.2mm (dễ bóc)
  };
  proTips: string[];
}

export interface IExpertPrintProfileVariant extends IExpertPrintProfile {
  variantId: string;
  variantTitle: string; // ví dụ: "0.2mm layer, 2 walls, 8% infill" hoặc "No ironing | Changed supports | Settings for speed"
  creatorName: string; // ví dụ: "ModelWorks3D", "MakerWorld Designer", "3D Hub AI Slicer"
  creatorBadge: 'Designer' | 'AI Tuner' | 'Community Master' | 'Verified Maker';
  creatorNotes: string; // Ghi chú giải thích lý do cấu hình như vậy cho mẫu này
  wallLoops: number;
  wallGenerator?: 'Arachne' | 'Classic';
  estimatedHours: number; // e.g. 1.6
  estimatedFilamentGrams: number; // e.g. 35
  platesCount: number; // e.g. 1
  rating: number; // e.g. 4.9
  ratingCount: number; // e.g. 371
  downloadsCount: number; // e.g. 786
  likesCount: number; // e.g. 420
  compatiblePrinters: string[]; // e.g. ['P1S', 'X1 Carbon', 'A1', 'K1 Max', 'Prusa MK4']
  targetStyle: 'speed' | 'quality' | 'strength' | 'multi_color';
  recommendedSettingsList?: {
    layerHeight: string; // e.g. "0.2 mm"
    walls: number; // e.g. 2
    infill: string; // e.g. "8%"
    supports: string; // e.g. "Activated" | "Enabled" | "Disabled"
    material: string; // e.g. "PLA recommended"
  };
  forBestResultsList?: string[]; // e.g. ["Use good part cooling", "Enable slow outer walls", "Carefully remove supports", "Use high-quality PLA filaments"]
  outcomeStatement?: string; // e.g. "With these settings, you will get a stable and detailed owl whose exceptional wood look will delight every observer"
  releaseDate?: string; // e.g. "2026-06-16"
  galleryImages?: string[]; // 3 preview pictures for the profile
}

export interface IWalletTransaction {
  id: string;
  type: 'deposit' | 'unlock_profile';
  amountVnd: number;
  description: string;
  timestamp: string;
}

export interface IUserWallet {
  balanceVnd: number;
  unlockedProfileIds: string[];
  transactions: IWalletTransaction[];
}
