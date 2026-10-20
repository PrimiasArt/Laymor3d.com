'use client';

import { useState, useEffect, useCallback } from 'react';
import { IUser, UserRole, IPermission, ROLE_PERMISSIONS } from '@/backend/domain/user';

export function useUserSession() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [permissions, setPermissions] = useState<IPermission>(ROLE_PERMISSIONS.user);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setPermissions(data.permissions || ROLE_PERMISSIONS[data.user.role as UserRole]);
        setAllUsers(data.allUsers || []);
      }
    } catch (err) {
      console.error('Session fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const switchUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_user', userId }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setPermissions(data.permissions);
        showToast(`Đã chuyển sang tài khoản: ${data.user.name} (${data.user.role.toUpperCase()})`);
        return true;
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
    return false;
  }, [showToast]);

  const switchRole = useCallback(async (newRole: UserRole) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_role', role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setPermissions(data.permissions);
        showToast(`Đã đổi vai trò sang: ${newRole.toUpperCase()}`);
        return true;
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`);
    }
    return false;
  }, [showToast]);

  return {
    currentUser,
    permissions,
    allUsers,
    isLoading,
    toastMessage,
    showToast,
    refreshSession: fetchSession,
    switchUser,
    switchRole,
    isAdmin: currentUser?.role === 'admin',
    isMod: currentUser?.role === 'mod',
    isStaff: currentUser?.role === 'staff',
    isCustomer: currentUser?.role === 'user',
  };
}
