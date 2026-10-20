export type UserRole = 'admin' | 'mod' | 'seller' | 'staff' | 'user';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  walletBalanceVnd: number;
  phone?: string;
  address?: string;
  createdAt: string;
  status: 'active' | 'suspended';
  googleId?: string;
  sellerStoreName?: string;
  sellerRating?: number;
  sellerPendingBalanceVnd?: number;
}

export interface IPermission {
  canAccessAdmin: boolean;
  canAccessSeller: boolean;
  canManageUsers: boolean;
  canManageOrders: boolean;
  canManageProducts: boolean;
  canModerateCommunity: boolean;
  canAdjustWallet: boolean;
  canConfigureAIPricing: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, IPermission> = {
  admin: {
    canAccessAdmin: true,
    canAccessSeller: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageProducts: true,
    canModerateCommunity: true,
    canAdjustWallet: true,
    canConfigureAIPricing: true,
  },
  mod: {
    canAccessAdmin: true,
    canAccessSeller: true,
    canManageUsers: false,
    canManageOrders: true,
    canManageProducts: true,
    canModerateCommunity: true,
    canAdjustWallet: false,
    canConfigureAIPricing: false,
  },
  seller: {
    canAccessAdmin: false,
    canAccessSeller: true,
    canManageUsers: false,
    canManageOrders: true, // Quản lý đơn hàng phát sinh từ shop của seller
    canManageProducts: true, // Đăng bán & chỉnh sửa sản phẩm, mô hình của gian hàng
    canModerateCommunity: false,
    canAdjustWallet: false,
    canConfigureAIPricing: false,
  },
  staff: {
    canAccessAdmin: true,
    canAccessSeller: false,
    canManageUsers: false,
    canManageOrders: true,
    canManageProducts: false,
    canModerateCommunity: false,
    canAdjustWallet: false,
    canConfigureAIPricing: false,
  },
  user: {
    canAccessAdmin: false,
    canAccessSeller: false,
    canManageUsers: false,
    canManageOrders: false,
    canManageProducts: false,
    canModerateCommunity: false,
    canAdjustWallet: false,
    canConfigureAIPricing: false,
  },
};

export const INITIAL_USERS: IUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Nguyễn Văn Admin',
    email: 'admin@3dhub.vn',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    walletBalanceVnd: 5000000,
    phone: '0901234567',
    address: 'Trụ sở 3D Hub, Quận 1, TP. Hồ Chí Minh',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr-mod-1',
    name: 'Trần Thị Moderator',
    email: 'mod@3dhub.vn',
    role: 'mod',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    walletBalanceVnd: 1200000,
    phone: '0912345678',
    address: 'Tòa nhà Innovation, Cầu Giấy, Hà Nội',
    createdAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr-seller-1',
    name: 'Hoàng 3D Maker (Seller)',
    email: 'seller@3dhub.vn',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    walletBalanceVnd: 1850000,
    phone: '0977889900',
    address: 'Khu Công Nghiệp Tân Bình, TP. Hồ Chí Minh',
    createdAt: '2026-02-10T00:00:00.000Z',
    status: 'active',
    sellerStoreName: 'Hoàng 3D Maker Studio',
    sellerRating: 4.9,
    sellerPendingBalanceVnd: 420000,
  },
  {
    id: 'usr-staff-1',
    name: 'Lê Kỹ Thuật (Xưởng In 3D)',
    email: 'staff@3dhub.vn',
    role: 'staff',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    walletBalanceVnd: 850000,
    phone: '0987654321',
    address: 'Xưởng in FDM Farm số 1, Bình Thạnh, TP. HCM',
    createdAt: '2026-02-01T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr-customer-1',
    name: 'Phạm Minh Maker',
    email: 'maker@gmail.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    walletBalanceVnd: 250000,
    phone: '0933445566',
    address: '123 Đường Điện Biên Phủ, TP. Đà Nẵng',
    createdAt: '2026-03-10T00:00:00.000Z',
    status: 'active',
  },
];
