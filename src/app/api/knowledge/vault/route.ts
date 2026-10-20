import { NextRequest, NextResponse } from 'next/server';
import { obsidianVaultService } from '@/backend/services/knowledge/ObsidianVaultService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const folder = searchParams.get('folder') || undefined;
    const modelName = searchParams.get('model');

    if (modelName) {
      const modelNote = obsidianVaultService.getModelKnowledge(modelName);
      return NextResponse.json({
        success: true,
        note: modelNote,
      });
    }

    const stats = obsidianVaultService.getVaultStats();
    const notes = obsidianVaultService.searchNotes(query, folder);

    return NextResponse.json({
      success: true,
      stats,
      notes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi khi truy vấn Obsidian Vault' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folder = 'Models', filename, content } = body;

    if (!filename || !content) {
      return NextResponse.json(
        { success: false, error: 'Thiếu filename hoặc content' },
        { status: 400 }
      );
    }

    const savedPath = obsidianVaultService.saveNote(folder, filename, content);

    return NextResponse.json({
      success: true,
      savedPath,
      stats: obsidianVaultService.getVaultStats(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi khi ghi tệp Obsidian Vault' },
      { status: 500 }
    );
  }
}
