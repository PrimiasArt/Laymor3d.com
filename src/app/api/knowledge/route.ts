import { NextRequest, NextResponse } from 'next/server';
import { knowledgeRepository } from '@/backend/repositories/KnowledgeRepository';
import { IKnowledgeEntry } from '@/backend/domain/knowledge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;
    const filament = searchParams.get('filament') || undefined;
    const printerId = searchParams.get('printerId') || undefined;

    const entries = knowledgeRepository.searchEntries(query, category, filament, printerId);
    const all = knowledgeRepository.getAllEntries();

    // Thống kê nhanh theo danh mục
    const categoryCounts: Record<string, number> = {};
    for (const e of all) {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      entries,
      totalCount: all.length,
      filteredCount: entries.length,
      categoryCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, solutionText, problemSymptom, rootCause, slicerOverrides, applicablePrinters, applicableFilaments, tags, id } = body;

    if (!title || !solutionText) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề và nội dung giải pháp là bắt buộc.' },
        { status: 400 }
      );
    }

    const saved = knowledgeRepository.upsertEntry({
      id,
      title,
      category,
      solutionText,
      problemSymptom,
      rootCause,
      slicerOverrides,
      applicablePrinters,
      applicableFilaments,
      tags,
      isVerified: true,
      confidenceScore: 95,
      verificationCount: 1,
      sourcePlatform: 'expert_curated',
    });

    return NextResponse.json({
      success: true,
      entry: saved,
      message: 'Đã lưu tri thức in 3D đối chiếu thành công!',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số ID tri thức cần xóa' }, { status: 400 });
    }

    const deleted = knowledgeRepository.deleteEntry(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bản ghi tri thức' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi tri thức' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
