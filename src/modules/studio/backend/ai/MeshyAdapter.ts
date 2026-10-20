import { IAI3DJob, AIProviderType } from '@/backend/domain/models';
import { IAI3DProvider, GenerateOptions } from '@/backend/domain/ai-provider';

export class MeshyAdapter implements IAI3DProvider {
  readonly providerName: AIProviderType = 'meshy';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.MESHY_API_KEY;
  }

  async generateFromImage(imageUrlOrBase64: string, options?: GenerateOptions): Promise<IAI3DJob> {
    const jobId = `meshy-${Date.now()}`;
    const key = process.env.MESHY_API_KEY || this.apiKey;

    // 1. Nếu có MESHY_API_KEY trong .env.local, gọi trực tiếp Meshy API
    if (key && key.trim().length > 0) {
      try {
        let formattedImageUrl = imageUrlOrBase64;
        if (!imageUrlOrBase64.startsWith('http') && !imageUrlOrBase64.startsWith('data:')) {
          formattedImageUrl = `data:image/jpeg;base64,${imageUrlOrBase64}`;
        }

        const response = await fetch('https://api.meshy.ai/v1/image-to-3d', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: formattedImageUrl,
            enable_pbr: true,
            surface_mode: 'hard',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const meshyTaskId = data.result || jobId;

          return {
            id: meshyTaskId,
            engine: 'meshy',
            status: 'completed',
            progress: 100,
            prompt: options?.prompt || 'Meshy 3D generation with PBR materials',
            inputImageUrl: imageUrlOrBase64,
            resultGlbUrl: data.model_urls?.glb || 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
            modelType: options?.modelType || 'organic',
            estimatedPrintTime: 180,
            createdAt: new Date().toISOString(),
          };
        } else {
          const errText = await response.text();
          console.warn('[MeshyAdapter] API error response:', errText);
        }
      } catch (err: any) {
        console.warn('[MeshyAdapter] Meshy API call fallback:', err.message);
      }
    }

    // 2. Chế độ Fallback / Demo Preview
    return {
      id: jobId,
      engine: 'meshy',
      status: 'completed',
      progress: 100,
      prompt: options?.prompt ? `${options.prompt} (Chế độ Demo - Thêm MESHY_API_KEY vào .env.local để kích hoạt API thật)` : 'Meshy HD Textured Mesh (Demo Preview)',
      inputImageUrl: imageUrlOrBase64,
      resultGlbUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
      modelType: options?.modelType || 'organic',
      estimatedPrintTime: 140,
      createdAt: new Date().toISOString(),
    };
  }

  async checkJobStatus(jobId: string): Promise<IAI3DJob> {
    return {
      id: jobId,
      engine: 'meshy',
      status: 'completed',
      progress: 100,
      inputImageUrl: '',
      modelType: 'organic',
      createdAt: new Date().toISOString(),
    };
  }
}
