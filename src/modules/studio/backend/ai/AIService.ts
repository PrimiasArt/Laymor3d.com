import { IAI3DJob, AIProviderType } from '@/backend/domain/models';
import { IAI3DProvider, GenerateOptions } from '@/backend/domain/ai-provider';
import { FalTrellisAdapter } from './FalTrellisAdapter';
import { MeshyAdapter } from './MeshyAdapter';
import { TripoAdapter } from './TripoAdapter';
import { SimulationAdapter } from './SimulationAdapter';
import { modelRepository } from '@/backend/repositories/ModelRepository';

export class AIService {
  private providers: Map<AIProviderType, IAI3DProvider> = new Map();

  constructor() {
    this.providers.set('tripo', new TripoAdapter());
    this.providers.set('fal-trellis', new FalTrellisAdapter());
    this.providers.set('meshy', new MeshyAdapter());
    this.providers.set('simulation', new SimulationAdapter());
  }

  getProvider(type: AIProviderType): IAI3DProvider {
    return this.providers.get(type) || this.providers.get('simulation')!;
  }

  async generate3D(
    imageUrlOrBase64: string,
    engine: AIProviderType = 'simulation',
    options?: GenerateOptions
  ): Promise<IAI3DJob> {
    const provider = this.getProvider(engine);
    
    // Simulate intelligent prompt optimization (similar to Gemini spatial reasoning)
    const refinedOptions: GenerateOptions = {
      ...options,
      prompt: options?.prompt 
        ? `${options.prompt}, watertight mesh, manifold geometry, optimized for 3D printing FDM/SLA`
        : 'Detailed 3D manifold model, watertight mesh, suitable for 3D printing',
    };

    const job = await provider.generateFromImage(imageUrlOrBase64, refinedOptions);
    modelRepository.saveAIJob(job);
    return job;
  }

  async getJob(jobId: string): Promise<IAI3DJob | undefined> {
    return modelRepository.getAIJob(jobId);
  }

  getAllJobs(): IAI3DJob[] {
    return modelRepository.getAllAIJobs();
  }
}

export const aiService = new AIService();
