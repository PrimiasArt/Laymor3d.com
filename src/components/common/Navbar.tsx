'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Box,
  Sparkles,
  Wallet,
  Plus,
  ShoppingBag,
  ChevronDown,
  Building2,
  ChevronRight,
  Store,
  User,
  Users,
  Menu,
  X,
  Cpu,
} from 'lucide-react';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useUserSession } from '@/hooks/useUserSession';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { TopUpModal } from '@/components/wallet/TopUpModal';
import { GoogleAuthModal } from '@/components/common/GoogleAuthModal';
import { UserRole } from '@/backend/domain/user';

export function Navbar() {
  const pathname = usePathname();
  const { balanceVnd, isTopUpModalOpen, setIsTopUpModalOpen, topUpBalance } = useUserWallet();
  const { currentUser, permissions, allUsers, switchUser } = useUserSession();
  const { isModuleVisible } = useModulePermissions();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Clean Customer Navigation (Homepage + AI Studio + 3D Simulator Pro + E-Commerce Shop)
  const navItems: Array<{ label: string; href: string; icon: any; isSpaApp?: boolean }> = [
    { label: 'Trang Chủ', href: '/', icon: Box },
  ];
  if (isModuleVisible('studio')) {
    navItems.push({ label: 'AI Studio', href: '/studio', icon: Sparkles });
  }
  navItems.push({ label: '3D Simulator (/3dsim)', href: '/3dsim', icon: Cpu, isSpaApp: true });
  if (isModuleVisible('shop')) {
    navItems.push({ label: 'Cửa Hàng & In 3D', href: '/shop', icon: ShoppingBag });
  }

  // Full items list for Mobile Drawer navigation
  const mobileNavItems = [...navItems];
  if (currentUser?.role === 'admin') {
    mobileNavItems.push({ label: 'Quản Lý Người Dùng', href: '/admin?tab=users', icon: Users });
    mobileNavItems.push({ label: 'Quản Lý Sản Phẩm & Kho', href: '/admin?tab=products', icon: ShoppingBag });
    mobileNavItems.push({ label: 'Kênh Gian Hàng (Seller)', href: '/seller', icon: Store });
    mobileNavItems.push({ label: 'Trung Tâm Quản Trị Hệ Thống', href: '/admin', icon: Building2 });
  } else if (currentUser?.role === 'mod') {
    mobileNavItems.push({ label: 'Quản Lý Sản Phẩm & Kho', href: '/admin?tab=products', icon: ShoppingBag });
    mobileNavItems.push({ label: 'Kênh Gian Hàng (Seller)', href: '/seller', icon: Store });
    mobileNavItems.push({ label: 'Quản Trị Điều Phối Xưởng', href: '/admin', icon: Building2 });
  } else if (currentUser?.role === 'seller' || permissions.canAccessSeller) {
    mobileNavItems.push({ label: 'Kênh Người Bán (Seller)', href: '/seller', icon: Store });
  } else if (permissions.canAccessAdmin && isModuleVisible('admin_hub')) {
    mobileNavItems.push({
      label: 'Quản Trị Hệ Thống',
      href: '/admin',
      icon: Building2,
    });
  }

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          text: 'ADMIN',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'mod':
        return {
          text: 'MOD',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'seller':
        return {
          text: 'SELLER',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'staff':
        return {
          text: 'STAFF',
          bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      default:
        return {
          text: 'USER',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const currentBadge = getRoleBadge(currentUser?.role);
  const isAdmin = currentUser?.role === 'admin';
  const hasAdminAccess = permissions.canAccessAdmin && isModuleVisible('admin_hub');

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
        {/* Apple VisionOS Floating Frosted Glass Capsule Bar */}
        <div className="max-w-7xl mx-auto h-16 rounded-full px-3.5 sm:px-6 lg:px-7 flex items-center justify-between vision-glass shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-slate-200/90 bg-white/85 backdrop-blur-2xl relative">
          {/* Brand Logo with VisionOS Circular Glass Icon */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 backdrop-blur-md border border-cyan-500/25 flex items-center justify-center text-cyan-700 transition-all shadow-xs group-hover:scale-105">
              <Box className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-600" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                LAYMOR 3D
              </span>
            </div>
          </Link>

          {/* Center Customer Navigation - VisionOS Segmented Pill Control */}
          <nav className="hidden lg:flex items-center p-1 rounded-full bg-slate-100/80 backdrop-blur-xl border border-slate-200/80 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const className = `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold shadow-sm'
                  : item.isSpaApp
                  ? 'text-cyan-800 hover:text-cyan-950 font-bold bg-cyan-50/80 hover:bg-cyan-100/90 border border-cyan-200/70'
                  : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/80'
              }`;
              if (item.isSpaApp) {
                return (
                  <a key={item.href} href={item.href} className={className}>
                    <Icon className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                    <span>{item.label}</span>
                  </a>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={className}>
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile, Action Buttons & VisionOS Wallet Capsule */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Direct Admin Command Link for Admin & Mod */}
            {hasAdminAccess && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs border backdrop-blur-md active:scale-95 ${
                  pathname === '/admin'
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-300 shadow-xs'
                    : 'bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 border-slate-200'
                }`}
                title="Trung tâm Quản trị hệ thống & Xưởng in"
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                <span className="hidden xl:inline">Quản Trị</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              </Link>
            )}

            {/* VisionOS Glass Wallet Pill Button */}
            {isModuleVisible('wallet') && (
              <button
                onClick={() => setIsTopUpModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-cyan-50/80 hover:bg-cyan-100/80 border border-cyan-200 text-slate-800 text-xs font-medium transition-all shadow-xs backdrop-blur-md active:scale-95 group shrink-0"
                title="Nạp tiền vào ví qua VietQR hoặc MoMo"
              >
                <Wallet className="w-3.5 h-3.5 text-cyan-600 group-hover:scale-110 transition-transform" />
                <span suppressHydrationWarning className="font-bold text-xs tracking-tight text-cyan-900 font-mono">
                  {new Intl.NumberFormat('en-US').format(currentUser?.walletBalanceVnd ?? balanceVnd)} đ
                </span>
                <span className="w-4 h-4 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] hidden sm:flex">
                  <Plus className="w-2.5 h-2.5" />
                </span>
              </button>
            )}

            {/* VisionOS User Profile Trigger */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:pr-2 rounded-full bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 transition-all text-left shadow-xs backdrop-blur-md"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                  {currentUser?.avatar ? (
                    <Image
                      src={currentUser.avatar}
                      alt={currentUser.name || 'User'}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs font-semibold">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div className="hidden xl:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[85px]">
                      {currentUser?.name || 'Tài khoản'}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${currentBadge.bg}`}
                    >
                      {currentBadge.text}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border xl:hidden ${currentBadge.bg}`}
                >
                  {currentBadge.text}
                </span>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* VisionOS Popover Glass Sheet */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-32px)] rounded-[28px] vision-glass-panel border border-slate-200/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] p-4 z-50 space-y-3 text-slate-800 animate-fadeIn bg-white/95">
                  {/* Current User Header */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                        {currentUser?.avatar ? (
                          <Image
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-700">
                            {currentUser?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${currentBadge.bg}`}
                          >
                            {currentBadge.text}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                        <p className="text-[11px] text-cyan-700 font-bold mt-0.5">
                          Ví: {(currentUser?.walletBalanceVnd ?? balanceVnd).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                    </div>

                    {/* Link to My Profile */}
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="mt-2.5 w-full flex items-center justify-between py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all border border-slate-200/80 shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Hồ Sơ Cá Nhân &amp; Đơn Hàng</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    {/* Dành riêng cho ADMIN: Quản Lý Người Dùng */}
                    {isAdmin && (
                      <Link
                        href="/admin?tab=users"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="mt-1.5 w-full flex items-center justify-between py-2 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 text-xs font-bold transition-all border border-cyan-200 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Quản Lý Người Dùng</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-600 text-white font-bold">
                          Admin
                        </span>
                      </Link>
                    )}

                    {/* Dành cho ADMIN và MOD: Quản Lý Sản Phẩm & Kho Hàng */}
                    {(isAdmin || currentUser?.role === 'mod') && (
                      <Link
                        href="/admin?tab=products"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="mt-1.5 w-full flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all border border-emerald-200 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Quản Lý Sản Phẩm &amp; Kho</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-semibold">
                          Kho
                        </span>
                      </Link>
                    )}

                    {/* Dành cho ADMIN, MOD và SELLER: Kênh Gian Hàng (Seller Hub) */}
                    {(isAdmin || currentUser?.role === 'mod' || currentUser?.role === 'seller' || permissions.canAccessSeller) && (
                      <Link
                        href="/seller"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="mt-1.5 w-full flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all border border-amber-200 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-amber-600" />
                          <span>Kênh Gian Hàng (Seller Hub)</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                      </Link>
                    )}

                    {/* Dành cho ADMIN, MOD, STAFF: Trang Quản Trị Hệ Thống */}
                    {permissions.canAccessAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-all shadow-xs border border-slate-200"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Mở Trang Quản Trị Hệ Thống</span>
                      </Link>
                    )}
                  </div>

                  {/* Google Login Fast Button */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsGoogleAuthModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition-all shadow-xs border border-slate-200 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Đăng nhập với Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95 ml-0.5"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-cyan-600" />
              ) : (
                <Menu className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Sheet */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-2 max-w-7xl mx-auto rounded-[28px] vision-glass-panel border border-slate-200/90 p-4 shadow-xl backdrop-blur-3xl space-y-3 animate-fadeIn text-slate-800 bg-white/95">
            {/* Mobile Navigation Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-cyan-50 text-cyan-800 border-cyan-200 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-cyan-600" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Wallet Button in Mobile Drawer */}
            {isModuleVisible('wallet') && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsTopUpModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200 text-xs text-slate-800 transition-all hover:bg-cyan-100/70"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-cyan-600" />
                  <span className="font-semibold text-slate-700">Ví 3D Hub:</span>
                  <span className="font-mono font-bold text-cyan-900">
                    {(currentUser?.walletBalanceVnd ?? balanceVnd).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-600 text-white font-bold text-[11px] shadow-xs">
                  + Nạp Ví
                </span>
              </button>
            )}

            {/* Fast Google Login in Mobile Drawer */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsGoogleAuthModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition-all shadow-xs border border-slate-200 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>
          </div>
        )}
      </header>

      {/* TopUp Modal with VietQR & MoMo */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        currentBalanceVnd={currentUser?.walletBalanceVnd ?? balanceVnd}
        onTopUp={topUpBalance}
      />

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isGoogleAuthModalOpen}
        onClose={() => setIsGoogleAuthModalOpen(false)}
      />
    </>
  );
}
