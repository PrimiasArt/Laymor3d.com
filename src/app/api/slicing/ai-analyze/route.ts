import { NextRequest, NextResponse } from 'next/server';
import { aiSlicingProfileService } from '@/backend/services/slicing/AISlicingProfileService';
import { obsidianVaultService } from '@/backend/services/knowledge/ObsidianVaultService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      modelId = 'benchy',
      modelName = '3D Model',
      fileName,
      dimensionsMm = { x: 60, y: 31, z: 48 },
      volumeCm3,
      triangleCount,
      printerId = 'bambu-x1c-p1s',
      printerName,
      filamentType = 'PLA Basic',
      filamentBrand,
      userRequirements,
    } = body;

    const profiles = await aiSlicingProfileService.generateProfiles({
      modelId,
      modelName,
      fileName,
      dimensionsMm,
      volumeCm3,
      triangleCount,
      printerId,
      printerName,
      filamentType,
      filamentBrand,
      userRequirements,
    });

    const inspection = aiSlicingProfileService.inspectGeometry({
      modelId,
      modelName,
      fileName,
      dimensionsMm,
      volumeCm3,
      triangleCount,
    });

    const matchedNote = obsidianVaultService.getModelKnowledge(modelName);
    const relatedNotes = obsidianVaultService.searchNotes(modelName).slice(0, 4);
    const stats = obsidianVaultService.getVaultStats();

    return NextResponse.json({
      success: true,
      modelName,
      inspection,
      profiles,
      vaultKnowledge: {
        matchedNote,
        relatedNotes,
        stats,
      },
    });
  } catch (err: any) {
    console.error('API /api/slicing/ai-analyze error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi phân tích AI Slicer Profile' },
      { status: 500 }
    );
  }
}
