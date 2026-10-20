import fs from 'fs';
import path from 'path';
import {
  ISystemConfig,
  DEFAULT_SYSTEM_CONFIG,
  IMaterialCostConfig,
  IOperationCostConfig,
  IAICostConfig,
  IApiKeysConfig,
  AppEnvironment,
  ICommercialConfig,
  IModuleRoleMatrix,
  SystemModuleKey,
} from '@/backend/domain/config';
import { UserRole } from '@/backend/domain/user';

class ConfigRepository {
  private config: ISystemConfig = { ...DEFAULT_SYSTEM_CONFIG };
  private filePath: string = path.join(process.cwd(), 'data', 'system_config.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.config = {
          ...DEFAULT_SYSTEM_CONFIG,
          ...parsed,
          apiKeys: {
            ...DEFAULT_SYSTEM_CONFIG.apiKeys,
            ...(parsed.apiKeys || {}),
          },
        };
      }

      // Đọc đồng bộ từ biến môi trường nếu có
      if (process.env.GEMINI_API_KEY && !this.config.apiKeys.geminiApiKey) {
        this.config.apiKeys.geminiApiKey = process.env.GEMINI_API_KEY;
      }
      if (process.env.FAL_KEY && !this.config.apiKeys.falKey) {
        this.config.apiKeys.falKey = process.env.FAL_KEY;
      }
      if (process.env.MESHY_API_KEY && !this.config.apiKeys.meshyApiKey) {
        this.config.apiKeys.meshyApiKey = process.env.MESHY_API_KEY;
      }

      // Đẩy ngược lại biến môi trường của tiến trình hiện tại
      if (this.config.apiKeys.geminiApiKey) {
        process.env.GEMINI_API_KEY = this.config.apiKeys.geminiApiKey;
      }
    } catch (e: any) {
      console.warn('[ConfigRepository] Không thể đọc cấu hình từ đĩa, sử dụng mặc định:', e.message);
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf-8');

      // Ghi chú đồng bộ biến môi trường runtime
      if (this.config.apiKeys?.geminiApiKey) {
        process.env.GEMINI_API_KEY = this.config.apiKeys.geminiApiKey;
      }
      if (this.config.apiKeys?.falKey) {
        process.env.FAL_KEY = this.config.apiKeys.falKey;
      }
      if (this.config.apiKeys?.meshyApiKey) {
        process.env.MESHY_API_KEY = this.config.apiKeys.meshyApiKey;
      }
    } catch (e: any) {
      console.warn('[ConfigRepository] Không thể lưu cấu hình ra đĩa:', e.message);
    }
  }

  getConfig(): ISystemConfig {
    return { ...this.config };
  }

  getEnvironment(): AppEnvironment {
    return this.config.environment || 'official';
  }

  isOfficial(): boolean {
    return this.getEnvironment() === 'official';
  }

  isStaging(): boolean {
    return this.getEnvironment() === 'staging';
  }

  setEnvironment(env: AppEnvironment, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.environment = env;
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;

    // Khi chuyển sang official: tự động áp dụng biên lợi nhuận thương mại
    if (env === 'official') {
      if (this.config.commercial?.commercialMarginPercent) {
        this.config.operations.profitMarginPercent = this.config.commercial.commercialMarginPercent;
      }
    } else {
      // Khi ở staging: mặc định giá gốc 0% phụ thu để test
      this.config.operations.profitMarginPercent = 0;
    }

    this.saveToDisk();
    return this.getConfig();
  }

  updateCommercial(commercial: Partial<ICommercialConfig>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.commercial = { ...this.config.commercial, ...commercial };
    if (commercial.commercialMarginPercent !== undefined && this.isOfficial()) {
      this.config.operations.profitMarginPercent = commercial.commercialMarginPercent;
    }
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  updateMaterials(materials: Partial<IMaterialCostConfig>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.materials = { ...this.config.materials, ...materials };
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  updateOperations(operations: Partial<IOperationCostConfig>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.operations = { ...this.config.operations, ...operations };
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  updateAIPricing(aiPricing: Partial<IAICostConfig>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.aiPricing = { ...this.config.aiPricing, ...aiPricing };
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  updateApiKeys(keys: Partial<IApiKeysConfig>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.apiKeys = { ...this.config.apiKeys, ...keys };
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  // Quản lý Ma Trận Quyền Module theo Role
  updateModulePermissions(matrix: Partial<IModuleRoleMatrix>, updatedBy: string = 'Admin'): ISystemConfig {
    this.config.modulePermissions = {
      ...this.config.modulePermissions,
      ...matrix,
    };
    this.config.updatedAt = new Date().toISOString();
    this.config.updatedBy = updatedBy;
    this.saveToDisk();
    return this.getConfig();
  }

  setModulePermission(moduleKey: SystemModuleKey, role: UserRole, isEnabled: boolean, updatedBy: string = 'Admin'): ISystemConfig {
    if (this.config.modulePermissions[moduleKey]) {
      this.config.modulePermissions[moduleKey][role] = isEnabled;
      this.config.updatedAt = new Date().toISOString();
      this.config.updatedBy = updatedBy;
      this.saveToDisk();
    }
    return this.getConfig();
  }

  isModuleEnabled(moduleKey: SystemModuleKey, role: UserRole): boolean {
    const mod = this.config.modulePermissions[moduleKey];
    if (!mod) return true;
    return mod[role] ?? true;
  }

  // Tiện ích lấy giá theo từng loại vật liệu (đ/gram) có tính % chi phí
  getMaterialGramPrice(materialName: string): number {
    const marginMultiplier = 1 + (this.config.operations.profitMarginPercent || 0) / 100;
    const mat = materialName.toLowerCase();

    let costPerKg = this.config.materials.plaPerKgVnd;
    if (mat.includes('petg-cf') || mat.includes('carbon')) {
      costPerKg = this.config.materials.petgCfPerKgVnd;
    } else if (mat.includes('petg')) {
      costPerKg = this.config.materials.petgPerKgVnd;
    } else if (mat.includes('abs')) {
      costPerKg = this.config.materials.absPerKgVnd;
    } else if (mat.includes('resin') || mat.includes('sla')) {
      costPerKg = this.config.materials.resinPerLiterVnd;
    }

    const baseCostPerGram = costPerKg / 1000;
    return Math.round(baseCostPerGram * marginMultiplier);
  }

  // Tiện ích lấy phí AI theo tier có tính % chi phí
  getAITierFee(tierId?: string): number {
    const marginMultiplier = 1 + (this.config.operations.profitMarginPercent || 0) / 100;
    let baseVnd = 0;
    if (tierId === 'tripo_fast') baseVnd = this.config.aiPricing.tripoVnd;
    else if (tierId === 'trellis_pro') baseVnd = this.config.aiPricing.trellisVnd;
    else if (tierId === 'meshy_ultra') baseVnd = this.config.aiPricing.meshyVnd;

    return Math.round(baseVnd * marginMultiplier);
  }

  getGeminiApiKey(): string {
    return this.config.apiKeys.geminiApiKey || process.env.GEMINI_API_KEY || '';
  }

  getPreferredGeminiModel(): string {
    return this.config.apiKeys.preferredGeminiModel || 'gemini-2.0-flash';
  }
}

export const configRepository = new ConfigRepository();
