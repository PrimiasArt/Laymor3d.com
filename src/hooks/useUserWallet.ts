'use client';

import { useState, useEffect, useCallback } from 'react';
import { IExpertPrintProfile } from '@/backend/domain/wallet';
import { EXPERT_PRINT_PROFILES } from '@/backend/services/slicing/ExpertProfileService';

export function useUserWallet() {
  const [balanceVnd, setBalanceVnd] = useState<number>(100000); // 100.000 VNĐ cho tài khoản demo
  const [unlockedProfileIds, setUnlockedProfileIds] = useState<string[]>(['benchy']);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with API on mount
  useEffect(() => {
    fetch('/api/wallet')
      .then(res => res.json())
      .then(data => {
        if (data.balanceVnd !== undefined) setBalanceVnd(data.balanceVnd);
        if (data.unlockedProfileIds) setUnlockedProfileIds(data.unlockedProfileIds);
      })
      .catch(console.error);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isModelUnlocked = useCallback((modelId: string) => {
    return unlockedProfileIds.includes(modelId);
  }, [unlockedProfileIds]);

  const unlockProfile = useCallback(async (modelId: string): Promise<boolean> => {
    if (isModelUnlocked(modelId)) return true;

    if (balanceVnd < 1000) {
      setIsTopUpModalOpen(true);
      return false;
    }

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', modelId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setIsTopUpModalOpen(true);
        }
        throw new Error(data.error || 'Mở khóa thất bại');
      }

      setBalanceVnd(data.balanceVnd);
      if (data.unlockedProfileIds) {
        setUnlockedProfileIds(data.unlockedProfileIds);
      } else {
        setUnlockedProfileIds(prev => [...prev, modelId]);
      }

      showToast('🎉 Đã mở khóa Profile In Chuyên Nghiệp (-1.000 đ)!');
      return true;
    } catch (err: any) {
      console.warn('Unlock error:', err.message);
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [balanceVnd, isModelUnlocked]);

  const lockProfile = useCallback(async (modelId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock', modelId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Khóa lại thất bại');

      if (data.balanceVnd !== undefined) setBalanceVnd(data.balanceVnd);
      if (data.unlockedProfileIds) {
        setUnlockedProfileIds(data.unlockedProfileIds);
      } else {
        setUnlockedProfileIds(prev => prev.filter(id => id !== modelId));
      }

      showToast('🔒 Đã hủy mở khóa Profile in mẫu (+1.000 đ hoàn lại)!');
      return true;
    } catch (err: any) {
      console.warn('Lock error:', err.message);
      return false;
    }
  }, []);

  const topUpBalance = useCallback(async (amountVnd: number) => {
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'topup', amount: amountVnd }),
      });

      const data = await res.json();
      if (data.success) {
        setBalanceVnd(data.newBalanceVnd);
        setIsTopUpModalOpen(false);
        showToast(`💳 Nạp thành công +${amountVnd.toLocaleString('vi-VN')} đ vào tài khoản!`);
      }
    } catch (err: any) {
      console.error('Topup error:', err);
    }
  }, []);

  const getProfile = useCallback((modelId: string): IExpertPrintProfile => {
    return EXPERT_PRINT_PROFILES[modelId] || EXPERT_PRINT_PROFILES.benchy;
  }, []);

  return {
    balanceVnd,
    unlockedProfileIds,
    isModelUnlocked,
    unlockProfile,
    lockProfile,
    topUpBalance,
    getProfile,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    isUnlocking,
    toastMessage,
  };
}
