import { NextRequest, NextResponse } from 'next/server';
import { knowledgeRepository } from '@/backend/repositories/KnowledgeRepository';
import { auditLogRepository } from '@/backend/repositories/AuditLogRepository';
import { isNeonConfigured } from '@/backend/services/neon/neonClient';
import { supabaseCloudService } from '@/backend/db/supabaseClient';
import { isModerationAdmin, resolveRequestUser } from '@/backend/services/auth/sessionGuard';
import {
  normalizeModerationStatus,
  sanitizeKnowledgeCreatePayload,
  sanitizeText,
} from '@/backend/services/knowledge/KnowledgeSanitizer';
import {
  buildKnowledgeCsv,
  buildKnowledgeWorkbookXlsx,
  parseKnowledgeSpreadsheetBuffer,
} from '@/backend/services/knowledge/KnowledgeExcelCodec';
import { IKnowledgeEntry } from '@/backend/domain/knowledge';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 400;

function isDatabaseConfigured(): boolean {
  return isNeonConfigured() || supabaseCloudService.isConfigured;
}

function buildBackendLabel(backend: string): string {
  if (backend === 'neon_postgres') return 'Neon PostgreSQL';
  if (backend === 'supabase_kv') return 'Supabase Cloud KV';
  return 'Bộ nhớ tạm (RAM/Disk)';
}

function isOwnEntry(entry: IKnowledgeEntry, userId: string, username?: string, name?: string): boolean {
  if (entry.submittedByUserId && entry.submittedByUserId === userId) return true;
  if (!entry.submittedByUserId && entry.submittedBy) {
    return entry.submittedBy === username || entry.submittedBy === name;
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get('template') === '1';
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const statusFilter = searchParams.get('status') || 'all';
    const categoryFilter = searchParams.get('category') || 'all';

    if (isTemplate) {
      const buf = buildKnowledgeWorkbookXlsx([], { templateOnly: true });
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="laymor_ai_knowledge_template.xlsx"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const [{ entries: allRaw }, { user }] = await Promise.all([
      knowledgeRepository.fetchAllEntriesFreshAsync(),
      resolveRequestUser(req),
    ]);

    const adminCaller = isModerationAdmin(user);
    let visible = adminCaller
      ? allRaw
      : allRaw.filter((e) => {
          const st = normalizeModerationStatus(e);
          if (st === 'approved' && e.isVerified) return true;
          if (user && (st === 'pending' || st === 'rejected')) {
            return isOwnEntry(e, user.id, user.username, user.name);
          }
          return false;
        });

    if (statusFilter !== 'all') {
      visible = visible.filter((e) => normalizeModerationStatus(e) === statusFilter);
    }
    if (categoryFilter !== 'all') {
      visible = visible.filter((e) => e.category === categoryFilter);
    }

    visible = [...visible].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const dateStamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const csvBuf = buildKnowledgeCsv(visible);
      return new NextResponse(new Uint8Array(csvBuf), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="laymor_ai_knowledge_${dateStamp}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const xlsxBuf = buildKnowledgeWorkbookXlsx(visible, { templateOnly: false });
    return new NextResponse(new Uint8Array(xlsxBuf), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laymor_ai_knowledge_${dateStamp}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi xuất file Excel tri thức AI.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng đăng nhập tài khoản Laymor3D / AI Trainer trước khi nhập file Excel.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const adminCaller = isModerationAdmin(user);
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let fileName = 'upload.xlsx';
    let publishImmediately = false;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const uploaded = form.get('file');
      if (!uploaded || typeof uploaded === 'string') {
        return NextResponse.json(
          { success: false, error: 'Thiếu file Excel (.xlsx) hoặc .csv trong form upload.' },
          { status: 400 }
        );
      }
      if (uploaded.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { success: false, error: 'File vượt quá giới hạn 5MB.' },
          { status: 413 }
        );
      }
      fileName = uploaded.name || 'upload.xlsx';
      fileBuffer = Buffer.from(await uploaded.arrayBuffer());
      publishImmediately = String(form.get('publishImmediately') || '').toLowerCase() === 'true';
    } else {
      const raw = Buffer.from(await req.arrayBuffer());
      if (raw.length === 0) {
        return NextResponse.json({ success: false, error: 'File upload rỗng.' }, { status: 400 });
      }
      if (raw.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ success: false, error: 'File vượt quá 5MB.' }, { status: 413 });
      }
      fileBuffer = raw;
    }

    const parsed = parseKnowledgeSpreadsheetBuffer(fileBuffer);
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Không tìm thấy dòng tri thức mới hợp lệ nào trong file Excel/CSV (lưu ý dòng [VÍ DỤ] được bỏ qua tự động).',
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `Mỗi lần import tối đa ${MAX_IMPORT_ROWS} dòng (file hiện có ${parsed.rows.length} dòng). Vui lòng chia nhỏ file.`,
        },
        { status: 400 }
      );
    }

    const importedEntries: IKnowledgeEntry[] = [];
    const errorRows: Array<{ row: number; title: string; reason: string }> = [];
    let skippedDuplicates = 0;
    let lastBackend = 'memory_fallback';

    for (const row of parsed.rows) {
      const sanitized = sanitizeKnowledgeCreatePayload({
        title: row.title,
        category: row.category || 'simulator_defect_learning',
        defectType: row.defectType || 'custom_defect',
        severity: row.severity || 'medium',
        problemSymptom: row.problemSymptom,
        rootCause: row.rootCause,
        effectiveSolution: row.solutionText,
        applicablePrinters: row.applicablePrinters,
        applicableFilaments: row.applicableFilaments,
        triggerCondition: row.triggerCondition,
        autoFixPatch: row.autoFixPatch,
        tags: row.tags,
      });

      if (!sanitized.ok) {
        errorRows.push({
          row: row.rowNumber,
          title: row.title || '(Trống)',
          reason: sanitized.error,
        });
        continue;
      }

      const cleanId = row.id ? sanitizeText(row.id, 64) : undefined;
      const existingById =
        adminCaller && cleanId ? await knowledgeRepository.getEntryByIdAsync(cleanId) : null;

      if (!existingById) {
        const dup = await knowledgeRepository.findByContentHashAsync(sanitized.data.contentHash);
        if (dup) {
          skippedDuplicates++;
          continue;
        }
      }

      const now = new Date().toISOString();
      // Trainers & regular accounts ALWAYS land in pending queue; Admins may publish or queue
      const finalStatus = adminCaller
        ? publishImmediately && row.requestedStatus !== 'pending'
          ? 'approved'
          : 'pending'
        : 'pending';
      const finalVerified = finalStatus === 'approved';

      const saveResult = await knowledgeRepository.upsertEntryDurableAsync({
        id: existingById?.id || cleanId,
        title: sanitized.data.title,
        category: sanitized.data.category,
        defectType: sanitized.data.defectType,
        severity: sanitized.data.severity,
        problemSymptom: sanitized.data.problemSymptom,
        rootCause: sanitized.data.rootCause,
        solutionText: sanitized.data.solutionText,
        slicerOverrides: sanitized.data.slicerOverrides,
        triggerCondition: sanitized.data.triggerCondition,
        autoFixPatch: sanitized.data.autoFixPatch,
        applicablePrinters: sanitized.data.applicablePrinters,
        applicableFilaments: sanitized.data.applicableFilaments,
        applicableCategories: sanitized.data.applicableCategories,
        tags: sanitized.data.tags,
        contentHash: sanitized.data.contentHash,
        submittedByUserId: existingById?.submittedByUserId || user.id,
        submittedBy: existingById?.submittedBy || user.username || user.name,
        confidenceScore: adminCaller ? 95 : 75,
        verificationCount: adminCaller ? Math.max(1, existingById?.verificationCount || 1) : 0,
        sourcePlatform: adminCaller ? 'expert_curated' : 'user_contributed',
        moderationStatus: finalStatus,
        isVerified: finalVerified,
        reviewedBy: finalVerified ? user.username || user.name : undefined,
        reviewedAt: finalVerified ? now : undefined,
        rejectionReason: undefined,
      });

      lastBackend = saveResult.storageBackend;
      if (isDatabaseConfigured() && !saveResult.persistedToDb) {
        return NextResponse.json(
          {
            success: false,
            error:
              saveResult.error ||
              'Database tạm gián đoạn trong khi lưu lô Excel. Không ghi nhận lưu giả.',
            importedCount: importedEntries.length,
          },
          { status: 503 }
        );
      }

      importedEntries.push(saveResult.entry);
    }

    const batchStatusLabel = adminCaller && publishImmediately ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT';
    if (importedEntries.length > 0) {
      await auditLogRepository.addKnowledgeAuditLogAsync({
        actorId: user.id,
        actorName: user.name || user.username || user.id,
        actorRole: user.role,
        action: adminCaller && publishImmediately ? 'knowledge_moderate' : 'knowledge_submit',
        actionTitle: `Import Excel (${importedEntries.length} quy tắc → ${batchStatusLabel})`,
        description: `Tệp "${fileName}": nhập ${importedEntries.length} quy tắc, bỏ qua trùng ${skippedDuplicates}, lỗi ${errorRows.length} (${buildBackendLabel(lastBackend)})`,
        severity: 'info',
        details: {
          importedCount: importedEntries.length,
          skippedDuplicates,
          errorCount: errorRows.length,
          storageBackend: lastBackend,
        },
      });
    }

    const backendLabel = buildBackendLabel(lastBackend);
    const message =
      importedEntries.length > 0
        ? adminCaller && publishImmediately
          ? `✓ Đã import & duyệt ngay ${importedEntries.length} quy tắc từ ${parsed.format.toUpperCase()} lên ${backendLabel}!`
          : `✓ Đã import ${importedEntries.length} quy tắc vào hàng CHỜ DUYỆT trên ${backendLabel} để Admin kiểm duyệt!`
        : `Không có dòng mới được thêm (trùng lặp: ${skippedDuplicates}, lỗi định dạng: ${errorRows.length}).`;

    return NextResponse.json({
      success: true,
      format: parsed.format,
      importedCount: importedEntries.length,
      skippedDuplicates,
      skippedExampleRows: parsed.skippedExampleRows,
      errorCount: errorRows.length,
      errors: errorRows.slice(0, 20),
      entries: importedEntries,
      storageBackend: lastBackend,
      storageLabel: backendLabel,
      message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi đọc hoặc nhập file Excel/CSV.' },
      { status: 400 }
    );
  }
}
