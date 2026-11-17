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
} from '../domain/config';
import { UserRole } from '../domain/user';
import { executeNeonQuery, isNeonConfigured } from '../services/neon/neonClient';
import { supabaseCloudService } from '../db/supabaseClient';

export type ConfigStorageBackend = 'neon_postgres' | 'supabase_kv' | 'disk_memory';

class ConfigRepository {
  private config: ISystemConfig = { ...DEFAULT_SYSTEM_CONFIG };
  private filePath: string = path.join(process.cwd(), 'data', 'system_config.json');
  private hydratedFromDb: boolean = false;
  private hydrationPromise: Promise<void> | null = null;
  private lastStorageBackend: ConfigStorageBackend = 'disk_memory';

  constructor() {
    this.loadFromDisk();
  }

  private mergeConfig(parsed: Partial<ISystemConfig>): void {
    this.config = {
      ...DEFAULT_SYSTEM_CONFIG,
      ...this.config,
      ...parsed,
      commercial: {
        ...DEFAULT_SYSTEM_CONFIG.commercial,
        ...(parsed.commercial || this.config.commercial),
      },
      materials: {
        ...DEFAULT_SYSTEM_CONFIG.materials,
        ...(parsed.materials || this.config.materials),
      },
      operations: {
        ...DEFAULT_SYSTEM_CONFIG.operations,
        ...(parsed.operations || this.config.operations),
      },
      aiPricing: {
        ...DEFAULT_SYSTEM_CONFIG.aiPricing,
        ...(parsed.aiPricing || this.config.aiPricing),
      },
      apiKeys: {
        ...DEFAULT_SYSTEM_CONFIG.apiKeys,
        ...this.config.apiKeys,
        ...(parsed.apiKeys || {}),
      },
      modulePermissions: {
        ...DEFAULT_SYSTEM_CONFIG.modulePermissions,
        ...(parsed.modulePermissions || this.config.modulePermissions),
      },
    };
    this.syncEnvFromConfig();
  }

  private syncEnvFromConfig(): void {
    if (!this.config.apiKeys) return;
    if (this.config.apiKeys.geminiApiKey) {
      process.env.GEMINI_API_KEY = this.config.apiKeys.geminiApiKey;
    } else if (process.env.GEMINI_API_KEY) {
      this.config.apiKeys.geminiApiKey = process.env.GEMINI_API_KEY;
    }
    if (this.config.apiKeys.falKey) {
      process.env.FAL_KEY = this.config.apiKeys.falKey;
    } else if (process.env.FAL_KEY) {
      this.config.apiKeys.falKey = process.env.FAL_KEY;
    }
    if (this.config.apiKeys.meshyApiKey) {
      process.env.MESHY_API_KEY = this.config.apiKeys.meshyApiKey;
    } else if (process.env.MESHY_API_KEY) {
      this.config.apiKeys.meshyApiKey = process.env.MESHY_API_KEY;
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.mergeConfig(parsed);
      } else {
        this.syncEnvFromConfig();
      }
    } catch (e: any) {
      console.warn('[ConfigRepository] Không thể đọc cấu hình từ đĩa, sử dụng mặc định:', e.message);
    }
  }

  private saveToDisk(): void {
    try {
      this.syncEnvFromConfig();
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e: any) {
      console.warn('[ConfigRepository] Không thể lưu cấu hình ra đĩa:', e.message);
    }
  }

  private async ensureNeonTableAsync(): Promise<void> {
    await executeNeonQuery(
      `CREATE TABLE IF NOT EXISTS system_config_store (
        id VARCHAR(64) PRIMARY KEY,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`
    );
  }

  async ensureHydratedAsync(forceRefresh = false): Promise<ConfigStorageBackend> {
    if (this.hydratedFromDb && !forceRefresh) {
      return this.lastStorageBackend;
    }
    if (this.hydrationPromise && !forceRefresh) {
      await this.hydrationPromise;
      return this.lastStorageBackend;
    }

    const work = (async () => {
      if (isNeonConfigured()) {
        try {
          await this.ensureNeonTableAsync();
          const res = await executeNeonQuery<{ config: Partial<ISystemConfig> }>(
            `SELECT config FROM system_config_store WHERE id = 'global_system_config' LIMIT 1;`
          );
          if (res.success && res.data && res.data.length > 0 && res.data[0].config) {
            this.mergeConfig(res.data[0].config);
          }
          this.lastStorageBackend = 'neon_postgres';
          this.hydratedFromDb = true;
          return;
        } catch (err: any) {
          console.warn('[ConfigRepository] Neon hydrate failed:', err?.message || err);
        }
      }

      if (supabaseCloudService.isConfigured) {
        try {
          const saved = await supabaseCloudService.loadKvState<Partial<ISystemConfig>>('laymor_system_config');
          if (saved) {
            this.mergeConfig(saved);
          }
          this.lastStorageBackend = 'supabase_kv';
          this.hydratedFromDb = true;
          return;
        } catch {
          // Ignore KV fallback errors
        }
      }

      this.syncEnvFromConfig();
      this.hydratedFromDb = true;
    })();

    this.hydrationPromise = work;
    try {
      await work;
    } finally {
      if (this.hydrationPromise === work) {
        this.hydrationPromise = null;
      }
    }
    return this.lastStorageBackend;
  }

  async persistDurableAsync(): Promise<{
    persistedToDb: boolean;
    storageBackend: ConfigStorageBackend;
    error?: string;
  }> {
    this.saveToDisk();

    if (isNeonConfigured()) {
      try {
        await this.ensureNeonTableAsync();
        const writeRes = await executeNeonQuery(
          `INSERT INTO system_config_store (id, config, updated_at)
           VALUES ('global_system_config', $1::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
             config = EXCLUDED.config,
             updated_at = CURRENT_TIMESTAMP;`,
          [JSON.stringify(this.config)]
        );
        if (!writeRes.success) {
          return {
            persistedToDb: false,
            storageBackend: 'neon_postgres',
            error: writeRes.error || 'Lỗi lưu cấu hình lên Neon PostgreSQL',
          };
        }
        this.lastStorageBackend = 'neon_postgres';
        this.hydratedFromDb = true;
        return { persistedToDb: true, storageBackend: 'neon_postgres' };
      } catch (err: any) {
        return {
          persistedToDb: false,
          storageBackend: 'neon_postgres',
          error: err?.message || 'Lỗi lưu cấu hình lên Neon PostgreSQL',
        };
      }
    }

    if (supabaseCloudService.isConfigured) {
      const ok = await supabaseCloudService.saveKvState('laymor_system_config', this.config);
      if (ok) {
        this.lastStorageBackend = 'supabase_kv';
        this.hydratedFromDb = true;
        return { persistedToDb: true, storageBackend: 'supabase_kv' };
      }
    }

    return { persistedToDb: false, storageBackend: 'disk_memory' };
  }

  getStorageBackend(): ConfigStorageBackend {
    return this.lastStorageBackend;
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
