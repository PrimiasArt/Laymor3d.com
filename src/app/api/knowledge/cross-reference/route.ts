import { NextRequest, NextResponse } from 'next/server';
import { knowledgeRepository } from '@/backend/repositories/KnowledgeRepository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelTitle = '', category = '', filamentType = 'PLA', printerId = 'bambu-x1c-p1s' } = body;

    const result = knowledgeRepository.crossReference(modelTitle, category, filamentType, printerId);

    return NextResponse.json({
      success: true,
      query: {
        modelTitle,
        category,
        filamentType,
        printerId,
      },
      crossReference: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
