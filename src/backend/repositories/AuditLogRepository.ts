import { executeNeonQuery, isNeonConfigured } from '@/backend/services/neon/neonClient';

export interface IAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'role_change'
    | 'wallet_topup'
    | 'wallet_deduct'
    | 'product_create'
    | 'product_moderate'
    | 'printer_assign'
    | 'status_update'
    | 'order_cancel'
    | 'warranty_claim'
    | 'withdrawal_request'
    | 'withdrawal_approve'
    | 'env_switch'
    | 'config_update'
    | 'knowledge_submit'
    | 'knowledge_moderate'
    | 'knowledge_delete';
  actionTitle: string;
  entityType: 'user' | 'order' | 'product' | 'printer' | 'withdrawal' | 'config' | 'ai_knowledge';
  entityId?: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

const INITIAL_AUDIT_LOGS: IAuditLog[] = [
  {
    id: 'AUD-9901',
    actorId: 'usr-admin-1',
    actorName: 'Nguyễn Văn Admin',
    actorRole: 'admin',
    action: 'env_switch',
    actionTitle: 'Chuyển Đổi Môi Trường Hệ Thống',
    entityType: 'config',
    description: 'Chuyển sang môi trường Staging Sandbox (biên lợi nhuận 0%, màu creamy pastel cyan)',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'AUD-9902',
    actorId: 'usr-mod-1',
    actorName: 'Trần Thị Moderator',
    actorRole: 'mod',
    action: 'product_moderate',
    actionTitle: 'Phê Duyệt Sản Phẩm Seller',
    entityType: 'product',
    entityId: 'sel-1',
    description: 'Duyệt sản phẩm "Bambu Lab PLA Silk Dual-Color" đưa ra Cửa Hàng công khai',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'AUD-9903',
    actorId: 'usr-admin-1',
    actorName: 'Nguyễn Văn Admin',
    actorRole: 'admin',
    action: 'role_change',
    actionTitle: 'Nâng Cấp Quyền RBAC',
    entityType: 'user',
    entityId: 'usr-mod-1',
    description: 'Bổ sung quyền canAccessSeller và canManageProducts cho tài khoản Điều phối viên',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'AUD-9904',
    actorId: 'usr-seller-1',
    actorName: 'Hoàng 3D Maker',
    actorRole: 'seller',
    action: 'withdrawal_request',
    actionTitle: 'Tạo Lệnh Rút Tiền Ký Quỹ',
    entityType: 'withdrawal',
    entityId: 'WDR-8812',
    description: 'Yêu cầu rút 1.000.000 đ về tài khoản MBBank (STK: 0901234567)',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'AUD-9905',
    actorId: 'usr-admin-1',
    actorName: 'Nguyễn Văn Admin',
    actorRole: 'admin',
    action: 'withdrawal_approve',
    actionTitle: 'Xác Nhận Giải Ngân Rút Tiền',
    entityType: 'withdrawal',
    entityId: 'WDR-8812',
    description: 'Xác nhận chuyển khoản thành công 1.000.000 đ cho Seller',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
  {
    id: 'AUD-9906',
    actorId: 'usr-staff-1',
    actorName: 'Lê Kỹ Thuật Viên',
    actorRole: 'staff',
    action: 'printer_assign',
    actionTitle: 'Phân Bổ Lệnh In Thực Tế',
    entityType: 'printer',
    entityId: 'prt-1',
    description: 'Gán đơn hàng #DH3D-9912 sang máy in Bambu Lab X1-Carbon #01',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
];

class AuditLogRepository {
  private logs: IAuditLog[] = [...INITIAL_AUDIT_LOGS];

  getAllLogs(filters?: { action?: string; severity?: string; search?: string }): IAuditLog[] {
    let result = [...this.logs];

    if (filters?.action && filters.action !== 'all') {
      result = result.filter((l) => l.action === filters.action);
    }

    if (filters?.severity && filters.severity !== 'all') {
      result = result.filter((l) => l.severity === filters.severity);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.actionTitle.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q)
      );
    }

    return result;
  }

  log(data: Omit<IAuditLog, 'id' | 'timestamp'>): IAuditLog {
    const newEntry: IAuditLog = {
      ...data,
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(newEntry);
    return newEntry;
  }

  getAuditStats() {
    return {
      total: this.logs.length,
      critical: this.logs.filter((l) => l.severity === 'critical').length,
      warning: this.logs.filter((l) => l.severity === 'warning').length,
      info: this.logs.filter((l) => l.severity === 'info').length,
    };
  }

  async addKnowledgeAuditLogAsync(data: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: 'knowledge_submit' | 'knowledge_moderate' | 'knowledge_delete';
    actionTitle: string;
    entityId?: string;
    description: string;
    severity?: 'info' | 'warning' | 'critical';
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<IAuditLog> {
    const entry = this.log({
      actorId: data.actorId,
      actorName: data.actorName,
      actorRole: data.actorRole,
      action: data.action,
      actionTitle: data.actionTitle,
      entityType: 'ai_knowledge',
      entityId: data.entityId,
      description: data.description,
      severity: data.severity || 'info',
    });

    if (isNeonConfigured()) {
      await executeNeonQuery(
        `CREATE TABLE IF NOT EXISTS system_audit_logs (
          id SERIAL PRIMARY KEY,
          module_name VARCHAR(50) NOT NULL,
          action VARCHAR(100) NOT NULL,
          operator_id VARCHAR(64) DEFAULT 'system',
          details JSONB DEFAULT '{}'::jsonb,
          ip_address VARCHAR(45),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      );
      await executeNeonQuery(
        `INSERT INTO system_audit_logs (module_name, action, operator_id, details, ip_address)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          'ai_knowledge',
          data.action,
          data.actorId,
          JSON.stringify({
            auditId: entry.id,
            actorName: data.actorName,
            actorRole: data.actorRole,
            actionTitle: data.actionTitle,
            entityId: data.entityId || null,
            description: data.description,
            severity: entry.severity,
            ...(data.details || {}),
          }),
          data.ipAddress || null,
        ]
      );
    }

    return entry;
  }

  async listKnowledgeAuditLogsAsync(limit = 40): Promise<IAuditLog[]> {
    if (isNeonConfigured()) {
      const res = await executeNeonQuery<{
        id: number;
        action: string;
        operator_id: string;
        details: any;
        created_at: string;
      }>(
        `SELECT id, action, operator_id, details, created_at
         FROM system_audit_logs
         WHERE module_name = 'ai_knowledge'
         ORDER BY created_at DESC
         LIMIT $1`,
        [Math.min(100, Math.max(1, limit))]
      );
      if (res.success && Array.isArray(res.data)) {
        return res.data.map((row) => {
          const d = typeof row.details === 'string' ? JSON.parse(row.details) : row.details || {};
          return {
            id: d.auditId || `AUD-DB-${row.id}`,
            actorId: row.operator_id || 'system',
            actorName: d.actorName || row.operator_id || 'System',
            actorRole: d.actorRole || 'user',
            action: (row.action as any) || 'knowledge_moderate',
            actionTitle: d.actionTitle || row.action,
            entityType: 'ai_knowledge',
            entityId: d.entityId || undefined,
            description: d.description || '',
            severity: d.severity || 'info',
            timestamp: new Date(row.created_at).toISOString(),
          };
        });
      }
    }

    return this.logs.filter((l) => l.entityType === 'ai_knowledge').slice(0, limit);
  }
}

export const auditLogRepository = new AuditLogRepository();
