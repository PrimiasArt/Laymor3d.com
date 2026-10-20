import { NextRequest, NextResponse } from 'next/server';
import { slicingPresetService } from '@/backend/services/slicing/SlicingPresetService';
import { modelRepository } from '@/backend/repositories/ModelRepository';
import { printerProfileService } from '@/backend/services/slicing/PrinterProfileService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId');
    const printerId = searchParams.get('printerId') || 'bambu-x1c-p1s';
    const format = searchParams.get('format'); // 'download' | 'json'

    let targetModel = modelId ? modelRepository.getModelById(modelId) : null;
    if (!targetModel) {
      targetModel = {
        id: modelId || 'model-custom',
        title: searchParams.get('title') || 'Mô Hình In 3D Đa Năng',
        author: 'Community Designer',
        platform: 'makerworld',
        sourceUrl: '',
        thumbnailUrl: '/placeholder.svg',
        downloads: 5000,
        prints: 2000,
        likes: 1200,
        tags: ['bambu', '3mf', 'orcaslicer'],
        category: searchParams.get('category') || 'Mechanical & Functional',
        filamentType: searchParams.get('filament') || 'PLA High Speed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const profile = slicingPresetService.generateOptimalProfile(targetModel, printerId);
    const bundle = slicingPresetService.exportOrcaSlicerBundle(profile, targetModel.title);

    // Nếu người dùng muốn tải trực tiếp file .json để nạp vào OrcaSlicer
    if (format === 'download') {
      const sanitizedTitle = targetModel.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const filename = `3dhub_orcaslicer_${sanitizedTitle}_${printerId}.json`;
      const jsonContent = JSON.stringify(bundle, null, 2);

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      model: targetModel,
      profile,
      bundle,
      availablePrinters: printerProfileService.getAllProfiles(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelTitle, category, filamentType, printerId = 'bambu-x1c-p1s' } = body;

    const mockModel = {
      id: `custom-${Date.now().toString(36)}`,
      title: modelTitle || 'Mô hình tùy chỉnh',
      author: 'User Request',
      platform: 'ai-generated' as const,
      sourceUrl: '',
      thumbnailUrl: '',
      downloads: 1,
      prints: 1,
      likes: 1,
      tags: ['custom-slice'],
      category: category || 'Household',
      filamentType: filamentType || 'PLA High Speed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profile = slicingPresetService.generateOptimalProfile(mockModel, printerId);
    const bundle = slicingPresetService.exportOrcaSlicerBundle(profile, mockModel.title);

    return NextResponse.json({
      success: true,
      profile,
      bundle,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
