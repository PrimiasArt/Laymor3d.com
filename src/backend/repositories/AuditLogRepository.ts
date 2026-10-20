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
    | 'config_update';
  actionTitle: string;
  entityType: 'user' | 'order' | 'product' | 'printer' | 'withdrawal' | 'config';
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
}

export const auditLogRepository = new AuditLogRepository();
