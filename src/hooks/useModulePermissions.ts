'use client';

import { useState, useEffect, useCallback } from 'react';
import { SystemModuleKey, IModuleRoleMatrix, DEFAULT_MODULE_PERMISSIONS } from '@/backend/domain/config';
import { UserRole } from '@/backend/domain/user';
import { useUserSession } from './useUserSession';

export function useModulePermissions() {
  const { currentUser } = useUserSession();
  const [matrix, setMatrix] = useState<IModuleRoleMatrix>(DEFAULT_MODULE_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (res.ok && data.config?.modulePermissions) {
        setMatrix(data.config.modulePermissions);
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình module permissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isModuleVisible = useCallback(
    (moduleKey: SystemModuleKey, explicitRole?: UserRole): boolean => {
      const role = explicitRole || currentUser?.role || 'user';
      if (!matrix[moduleKey]) return true;
      return matrix[moduleKey][role] ?? true;
    },
    [matrix, currentUser?.role]
  );

  const toggleModuleForRole = async (
    moduleKey: SystemModuleKey,
    role: UserRole,
    isEnabled: boolean
  ): Promise<boolean> => {
    // Optimistic update
    setMatrix((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [role]: isEnabled,
      },
    }));

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'modulePermissions',
          moduleKey,
          role,
          isEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await fetchPermissions();
        return false;
      }
      return true;
    } catch (err) {
      console.error('Lỗi lưu phân quyền module:', err);
      await fetchPermissions();
      return false;
    }
  };

  return {
    matrix,
    isLoading,
    isModuleVisible,
    toggleModuleForRole,
    refreshPermissions: fetchPermissions,
  };
}
