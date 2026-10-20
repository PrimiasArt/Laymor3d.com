'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { AppEnvironment, ICommercialConfig, DEFAULT_COMMERCIAL_CONFIG } from '@/backend/domain/config';
import { useUserSession } from '@/hooks/useUserSession';

export function useSystemEnvironment() {
  const pathname = usePathname();
  const isStagingPath = pathname?.startsWith('/staging');

  const { currentUser } = useUserSession();
  const isAdmin = currentUser?.role === 'admin';

  const [environment, setEnvironment] = useState<AppEnvironment>('official');
  const [commercial, setCommercial] = useState<ICommercialConfig>(DEFAULT_COMMERCIAL_CONFIG);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const fetchEnvironment = useCallback(async () => {
    try {
      const res = await fetch('/api/system/environment');
      const data = await res.json();
      if (res.ok && data.success) {
        setEnvironment(data.environment);
        if (data.commercial) setCommercial(data.commercial);
        if (data.profitMarginPercent !== undefined) setProfitMarginPercent(data.profitMarginPercent);
      }
    } catch (err) {
      console.error('Failed to fetch system environment:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironment();

    const handleEnvChanged = (e: any) => {
      if (e.detail?.environment) {
        setEnvironment(e.detail.environment);
      }
    };
    window.addEventListener('3dhub-environment-change', handleEnvChanged);
    return () => window.removeEventListener('3dhub-environment-change', handleEnvChanged);
  }, [fetchEnvironment]);

  // Nút chuyển đổi môi trường chỉ Admin mới thực hiện được
  const toggleEnvironment = useCallback(
    async (target?: AppEnvironment): Promise<boolean> => {
      if (!isAdmin) {
        showToast('Chỉ Quản trị viên (Admin) mới có quyền chuyển đổi môi trường!');
        return false;
      }

      setIsSwitching(true);
      const nextEnv: AppEnvironment = target || (environment === 'official' ? 'staging' : 'official');
      try {
        const res = await fetch('/api/system/environment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environment: nextEnv }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setEnvironment(nextEnv);
          showToast(data.message || `Đã chuyển sang môi trường: ${nextEnv.toUpperCase()}`);

          if (typeof window !== 'undefined') {
            document.documentElement.setAttribute('data-env', nextEnv);
            window.dispatchEvent(
              new CustomEvent('3dhub-environment-change', { detail: { environment: nextEnv } })
            );
          }
          return true;
        } else {
          showToast(`Lỗi: ${data.error || 'Không thể chuyển đổi môi trường'}`);
          return false;
        }
      } catch (err: any) {
        showToast(`Lỗi kết nối: ${err.message}`);
        return false;
      } finally {
        setIsSwitching(false);
      }
    },
    [environment, isAdmin, showToast]
  );

  // Phân giải môi trường hiệu lực:
  // 1. Nếu đang ở URL /staging: Luôn là 'staging'
  // 2. Nếu Admin tự chuyển: theo trạng thái toggle
  // 3. Với các role khác ở URL thường: Luôn là 'official'
  const effectiveEnv: AppEnvironment = isStagingPath ? 'staging' : (isAdmin ? environment : 'official');
  const effectiveIsOfficial = effectiveEnv === 'official';
  const effectiveIsStaging = effectiveEnv === 'staging';

  // Đồng bộ thuộc tính data-env trên HTML document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-env', effectiveEnv);
    }
  }, [effectiveEnv]);

  return {
    environment: effectiveEnv,
    rawEnvironment: environment,
    isOfficial: effectiveIsOfficial,
    isStaging: effectiveIsStaging,
    isStagingPath,
    commercial,
    profitMarginPercent: effectiveIsOfficial ? (commercial?.commercialMarginPercent || 25) : 0,
    isLoading,
    isSwitching,
    toastMessage,
    showToast,
    isAdmin,
    refreshEnvironment: fetchEnvironment,
    toggleEnvironment,
  };
}
