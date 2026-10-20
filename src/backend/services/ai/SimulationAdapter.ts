import { IAI3DJob, AIProviderType } from '../../domain/models';
import { IAI3DProvider, GenerateOptions } from '../../domain/ai-provider';

export class SimulationAdapter implements IAI3DProvider {
  readonly providerName: AIProviderType = 'simulation';

  async generateFromImage(imageUrlOrBase64: string, options?: GenerateOptions): Promise<IAI3DJob> {
    const jobId = `sim-job-${Date.now()}`;
    const modelType = options?.modelType || 'organic';

    // Samples of publicly accessible 3D models (.glb) from Three.js CDN and standard assets
    const sampleModels = [
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb',
    ];

    const chosenGlb = sampleModels[Math.floor(Math.random() * sampleModels.length)];

    return {
      id: jobId,
      engine: 'simulation',
      status: 'completed',
      progress: 100,
      prompt: options?.prompt || 'Procedural 3D model generated from 2D reference',
      inputImageUrl: imageUrlOrBase64,
      resultGlbUrl: chosenGlb,
      resultStlUrl: '/samples/sample-model.stl',
      modelType,
      estimatedPrintTime: Math.floor(60 + Math.random() * 180),
      createdAt: new Date().toISOString(),
    };
  }

  async checkJobStatus(jobId: string): Promise<IAI3DJob> {
    return {
      id: jobId,
      engine: 'simulation',
      status: 'completed',
      progress: 100,
      inputImageUrl: '',
      modelType: 'organic',
      createdAt: new Date().toISOString(),
    };
  }
}
