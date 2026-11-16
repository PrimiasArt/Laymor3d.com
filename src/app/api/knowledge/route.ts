import { NextRequest, NextResponse } from 'next/server';
import {
  knowledgeRepository,
  KnowledgeStorageBackend,
} from '@/backend/repositories/KnowledgeRepository';
import { auditLogRepository } from '@/backend/repositories/AuditLogRepository';
import { supabaseCloudService } from '@/backend/db/supabaseClient';
import { isNeonConfigured } from '@/backend/services/neon/neonClient';
import { isModerationAdmin, resolveRequestUser } from '@/backend/services/auth/sessionGuard';
import {
  normalizeModerationStatus,
  sanitizeKnowledgeCreatePayload,
  sanitizeText,
} from '@/backend/services/knowledge/KnowledgeSanitizer';
import { IKnowledgeEntry } from '@/backend/domain/knowledge';

// Simple per-instance rate limiter for knowledge submissions (anti-spam)
const submitRateWindowMs = 10 * 60 * 1000;
const submitMaxPerWindow = 20;
const userSubmitTimestamps = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const prev = userSubmitTimestamps.get(userId) || [];
  const recent = prev.filter((t) => now - t < submitRateWindowMs);
  if (recent.length >= submitMaxPerWindow) {
    userSubmitTimestamps.set(userId, recent);
    return true;
  }
  recent.push(now);
  userSubmitTimestamps.set(userId, recent);
  return false;
}

function isDatabaseConfigured(): boolean {
  return isNeonConfigured() || supabaseCloudService.isConfigured;
}

function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  );
}

function isOwnEntry(entry: IKnowledgeEntry, userId: string, username?: string, name?: string): boolean {
  if (entry.submittedByUserId && entry.submittedByUserId === userId) return true;
  if (!entry.submittedByUserId && entry.submittedBy) {
    return entry.submittedBy === username || entry.submittedBy === name;
  }
  return false;
}

function filterEntriesByVisibility(
  allEntries: IKnowledgeEntry[],
  user: Awaited<ReturnType<typeof resolveRequestUser>>['user']
): IKnowledgeEntry[] {
  if (isModerationAdmin(user)) {
    return allEntries;
  }

  return allEntries.filter((entry) => {
    const status = normalizeModerationStatus(entry);
    if (status === 'approved' && entry.isVerified) return true;
    if (user && (status === 'pending' || status === 'rejected')) {
      return isOwnEntry(entry, user.id, user.username, user.name);
    }
    return false;
  });
}

function formatLegacyItem(e: IKnowledgeEntry) {
  return {
    ...e,
    content: e.solutionText || e.problemSymptom || '',
    triggerConditionText:
      typeof e.triggerCondition === 'string'
        ? e.triggerCondition
        : e.triggerCondition?.description || '',
    triggerCondition:
      typeof e.triggerCondition === 'string'
        ? e.triggerCondition
        : e.triggerCondition?.description || '',
  };
}

function filterEntriesByQuery(
  entries: IKnowledgeEntry[],
  opts: { query?: string; category?: string; filament?: string; printerId?: string; status?: string }
): IKnowledgeEntry[] {
  let result = [...entries];

  if (opts.status && opts.status !== 'all') {
    result = result.filter((k) => normalizeModerationStatus(k) === opts.status);
  }
  if (opts.category && opts.category !== 'all') {
    result = result.filter((k) => k.category === opts.category);
  }
  if (opts.filament && opts.filament !== 'all') {
    const filLower = opts.filament.toLowerCase();
    result = result.filter(
      (k) =>
        k.applicableFilaments.includes('all') ||
        k.applicableFilaments.some(
          (f) => f.toLowerCase().includes(filLower) || filLower.includes(f.toLowerCase())
        )
    );
  }
  if (opts.printerId && opts.printerId !== 'all') {
    result = result.filter(
      (k) => k.applicablePrinters.includes('all') || k.applicablePrinters.includes(opts.printerId!)
    );
  }
  if (opts.query && opts.query.trim().length > 0) {
    const q = opts.query.toLowerCase().trim();
    result = result.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        k.solutionText.toLowerCase().includes(q) ||
        (k.problemSymptom && k.problemSymptom.toLowerCase().includes(q)) ||
        (k.rootCause && k.rootCause.toLowerCase().includes(q)) ||
        (k.defectType && k.defectType.toLowerCase().includes(q)) ||
        (k.submittedBy && k.submittedBy.toLowerCase().includes(q)) ||
        k.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function buildBackendLabel(backend: KnowledgeStorageBackend): string {
  if (backend === 'neon_postgres') return 'Neon PostgreSQL';
  if (backend === 'supabase_kv') return 'Supabase Cloud KV';
  return 'Bộ nhớ tạm (RAM/Disk)';
}

export async function GET(req: NextRequest) {
  try {
    const [{ entries: allRaw, storageBackend }, { user, verifiedByToken }] = await Promise.all([
      knowledgeRepository.fetchAllEntriesFreshAsync(),
      resolveRequestUser(req),
    ]);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;
    const filament = searchParams.get('filament') || undefined;
    const printerId = searchParams.get('printerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const includeAudit = searchParams.get('includeAudit') === '1';

    const visibleEntries = filterEntriesByVisibility(allRaw, user);
    const filtered = filterEntriesByQuery(visibleEntries, {
      query,
      category,
      filament,
      printerId,
      status,
    });

    const categoryCounts: Record<string, number> = {};
    const moderationCounts = { pending: 0, approved: 0, rejected: 0, archived: 0 };
    for (const e of visibleEntries) {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      const st = normalizeModerationStatus(e);
      moderationCounts[st] = (moderationCounts[st] || 0) + 1;
    }

    const items = filtered.map(formatLegacyItem);
    const auditLogs =
      includeAudit && isModerationAdmin(user)
        ? await auditLogRepository.listKnowledgeAuditLogsAsync(50)
        : undefined;

    return NextResponse.json({
      success: true,
      entries: filtered,
      items,
      totalCount: visibleEntries.length,
      filteredCount: filtered.length,
      categoryCounts,
      moderationCounts,
      storageBackend,
      storageLabel: buildBackendLabel(storageBackend),
      persisted: storageBackend === 'neon_postgres' || storageBackend === 'supabase_kv',
      viewer: user
        ? {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            isAdmin: isModerationAdmin(user),
            verifiedByToken,
          }
        : null,
      ...(auditLogs ? { auditLogs } : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng đăng nhập tài khoản Laymor3D để gửi bài học cho AI.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const effectiveSolution = String(body.solutionText || body.content || body.explanation || '').trim();
    const sanitized = sanitizeKnowledgeCreatePayload({
      ...body,
      effectiveSolution,
    });

    if (!sanitized.ok) {
      return NextResponse.json({ success: false, error: sanitized.error }, { status: 400 });
    }

    const adminCaller = isModerationAdmin(user);
    const targetId = typeof body.id === 'string' && body.id.trim() ? sanitizeText(body.id, 64) : undefined;
    const existing = targetId ? await knowledgeRepository.getEntryByIdAsync(targetId) : null;

    if (existing) {
      const canEditExisting =
        adminCaller ||
        (isOwnEntry(existing, user.id, user.username, user.name) &&
          normalizeModerationStatus(existing) !== 'approved');
      if (!canEditExisting) {
        return NextResponse.json(
          {
            success: false,
            error: 'Chỉ Quản trị viên hoặc tác giả bài chờ duyệt mới có thể chỉnh sửa quy tắc này.',
          },
          { status: 403 }
        );
      }
    } else if (!adminCaller && isRateLimited(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bạn gửi quá nhiều quy tắc trong thời gian ngắn. Vui lòng đợi vài phút trước khi gửi tiếp.',
        },
        { status: 429 }
      );
    }

    // Check duplicate rule signature on new inserts
    if (!existing) {
      const duplicate = await knowledgeRepository.findByContentHashAsync(sanitized.data.contentHash);
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Quy tắc tương tự đã tồn tại (${duplicate.title} — ${normalizeModerationStatus(duplicate) === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'}).`,
            duplicateId: duplicate.id,
          },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const moderationStatus = adminCaller
      ? existing && body.isVerified === false
        ? 'pending'
        : 'approved'
      : 'pending';
    const isVerified = moderationStatus === 'approved';

    const saveResult = await knowledgeRepository.upsertEntryDurableAsync({
      id: existing?.id || targetId,
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
      sourceReference: sanitized.data.sourceReference,
      contentHash: sanitized.data.contentHash,
      submittedByUserId: existing?.submittedByUserId || user.id,
      submittedBy: existing?.submittedBy || user.username || user.name,
      confidenceScore: adminCaller ? 95 : 75,
      verificationCount: adminCaller ? Math.max(1, existing?.verificationCount || 1) : 0,
      sourcePlatform: adminCaller ? existing?.sourcePlatform || 'expert_curated' : 'user_contributed',
      moderationStatus,
      isVerified,
      reviewedBy: isVerified ? user.username || user.name : undefined,
      reviewedAt: isVerified ? now : undefined,
      rejectionReason: undefined,
    });

    if (isDatabaseConfigured() && !saveResult.persistedToDb) {
      return NextResponse.json(
        {
          success: false,
          error:
            saveResult.error ||
            'Hệ thống Database không thể lưu dữ liệu lúc này. Không ghi nhận trạng thái lưu giả.',
          persistedToDb: false,
          storageBackend: saveResult.storageBackend,
        },
        { status: 503 }
      );
    }

    await auditLogRepository.addKnowledgeAuditLogAsync({
      actorId: user.id,
      actorName: user.name || user.username || user.id,
      actorRole: user.role,
      action: adminCaller ? 'knowledge_moderate' : 'knowledge_submit',
      actionTitle: adminCaller
        ? existing
          ? 'Admin Cập Nhật Quy Tắc AI'
          : 'Admin Thêm & Duyệt Quy Tắc AI'
        : 'Thành Viên Gửi Bài Học Lỗi AI (Chờ Duyệt)',
      entityId: saveResult.entry.id,
      description: `${saveResult.entry.title} [${moderationStatus.toUpperCase()}] -> ${buildBackendLabel(saveResult.storageBackend)}`,
      severity: 'info',
      details: {
        moderationStatus,
        storageBackend: saveResult.storageBackend,
      },
      ipAddress: getClientIp(req),
    });

    const message = adminCaller
      ? `Đã lưu & phát hành quy tắc lên ${buildBackendLabel(saveResult.storageBackend)}!`
      : `Đã gửi vào hàng chờ Admin duyệt (${buildBackendLabel(saveResult.storageBackend)}). Bạn có thể bật Sandbox Cá Nhân để dùng thử ngay trên máy của bạn!`;

    return NextResponse.json({
      success: true,
      entry: {
        ...saveResult.entry,
        content: saveResult.entry.solutionText,
      },
      persistedToDb: saveResult.persistedToDb,
      storageBackend: saveResult.storageBackend,
      storageLabel: buildBackendLabel(saveResult.storageBackend),
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập phiên làm việc.' },
        { status: 401 }
      );
    }
    if (!isModerationAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chỉ Quản trị viên (Admin/Moderator) mới có quyền kiểm duyệt quy tắc AI.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = sanitizeText(body.id, 64);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu id quy tắc cần kiểm duyệt.' }, { status: 400 });
    }

    let action: 'approve' | 'reject' | 'unverify' | 'archive' | undefined;
    if (
      body.action === 'approve' ||
      body.action === 'reject' ||
      body.action === 'unverify' ||
      body.action === 'archive'
    ) {
      action = body.action;
    } else if (typeof body.isVerified === 'boolean') {
      action = body.isVerified ? 'approve' : 'unverify';
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Hành động kiểm duyệt không hợp lệ (approve/reject/unverify/archive).' },
        { status: 400 }
      );
    }

    const rejectionReason = sanitizeText(body.rejectionReason, 400) || undefined;
    const modResult = await knowledgeRepository.moderateEntryAsync({
      id,
      action,
      reviewerName: user.username || user.name || user.id,
      rejectionReason,
    });

    if (!modResult.entry) {
      return NextResponse.json({ success: false, error: modResult.error || 'Không tìm thấy quy tắc.' }, { status: 404 });
    }

    if (isDatabaseConfigured() && !modResult.persistedToDb) {
      return NextResponse.json(
        {
          success: false,
          error: modResult.error || 'Cập nhật trạng thái kiểm duyệt xuống Database thất bại.',
          persistedToDb: false,
        },
        { status: 503 }
      );
    }

    await auditLogRepository.addKnowledgeAuditLogAsync({
      actorId: user.id,
      actorName: user.name || user.username || user.id,
      actorRole: user.role,
      action: 'knowledge_moderate',
      actionTitle: `Kiểm Duyệt Quy Tắc AI (${action.toUpperCase()})`,
      entityId: modResult.entry.id,
      description: `${modResult.entry.title} -> ${modResult.entry.moderationStatus}${rejectionReason ? ` (${rejectionReason})` : ''}`,
      severity: action === 'reject' ? 'warning' : 'info',
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...modResult.entry,
        content: modResult.entry.solutionText,
      },
      persistedToDb: modResult.persistedToDb,
      storageBackend: modResult.storageBackend,
      message:
        action === 'approve'
          ? 'Đã duyệt & phát hành quy tắc cho toàn hệ thống AI!'
          : action === 'reject'
            ? 'Đã từ chối quy tắc và lưu lý do phản hồi.'
            : action === 'archive'
              ? 'Đã lưu trữ (ẩn khỏi AI sản xuất).'
              : 'Đã chuyển quy tắc về trạng thái Chờ duyệt.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Support moderation toggles when only { id, action | isVerified } is sent, otherwise full update
  const cloned = req.clone();
  try {
    const body = await cloned.json();
    const hasModerationOnly =
      Boolean(body?.id) &&
      !body?.title &&
      !body?.solutionText &&
      !body?.content &&
      (body?.action !== undefined || typeof body?.isVerified === 'boolean');
    if (hasModerationOnly) {
      return PATCH(req);
    }
  } catch {
    // Fall through to POST handler validation
  }
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để xóa quy tắc.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeText(searchParams.get('id') || '', 64);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số ID tri thức cần xóa.' }, { status: 400 });
    }

    const existing = await knowledgeRepository.getEntryByIdAsync(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bản ghi tri thức.' }, { status: 404 });
    }

    const adminCaller = isModerationAdmin(user);
    const canDeleteOwnPending =
      isOwnEntry(existing, user.id, user.username, user.name) &&
      normalizeModerationStatus(existing) !== 'approved';

    if (!adminCaller && !canDeleteOwnPending) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chỉ Quản trị viên hoặc tác giả tự rút bài chưa duyệt mới được phép xóa.',
        },
        { status: 403 }
      );
    }

    const delRes = await knowledgeRepository.deleteEntryDurableAsync(id);
    if (isDatabaseConfigured() && !delRes.persistedToDb) {
      return NextResponse.json(
        { success: false, error: delRes.error || 'Lỗi xóa bản ghi khỏi Neon Database.' },
        { status: 503 }
      );
    }
    if (!delRes.deleted) {
      return NextResponse.json({ success: false, error: 'Không thể xóa bản ghi.' }, { status: 404 });
    }

    await auditLogRepository.addKnowledgeAuditLogAsync({
      actorId: user.id,
      actorName: user.name || user.username || user.id,
      actorRole: user.role,
      action: 'knowledge_delete',
      actionTitle: 'Xóa Quy Tắc Tri Thức AI',
      entityId: id,
      description: `Đã xóa rule: ${existing.title}`,
      severity: 'warning',
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      persistedToDb: delRes.persistedToDb,
      storageBackend: delRes.storageBackend,
      message: `Đã xóa bản ghi tri thức khỏi ${buildBackendLabel(delRes.storageBackend)}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
