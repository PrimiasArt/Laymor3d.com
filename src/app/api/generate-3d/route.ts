import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/backend/services/ai/AIService';
import { AIProviderType } from '@/backend/domain/models';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, imageBase64, engine = 'simulation', prompt, modelType = 'organic' } = body;

    const sourceImage = imageUrl || imageBase64;
    if (!sourceImage) {
      return NextResponse.json({ error: 'Hình ảnh 2D là bắt buộc (imageUrl hoặc imageBase64)' }, { status: 400 });
    }

    const job = await aiService.generate3D(sourceImage, engine as AIProviderType, {
      prompt,
      modelType,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi khi tạo mô hình 3D' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = await aiService.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Không tìm thấy job' }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  const jobs = aiService.getAllJobs();
  return NextResponse.json({ jobs });
}
