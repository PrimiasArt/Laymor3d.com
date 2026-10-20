import { IAI3DJob, AIProviderType } from './models';

export interface GenerateOptions {
  prompt?: string;
  quality?: 'fast' | 'balanced' | 'ultra';
  modelType?: 'organic' | 'mechanical' | 'decor';
  format?: 'glb' | 'stl';
}

export interface IAI3DProvider {
  readonly providerName: AIProviderType;
  generateFromImage(imageUrlOrBase64: string, options?: GenerateOptions): Promise<IAI3DJob>;
  checkJobStatus(jobId: string): Promise<IAI3DJob>;
}
