'use client';

import { useState, useEffect, useCallback } from 'react';
import { IFilamentItem, IAccessoryItem } from '@/backend/domain/shop';

export interface IInventoryStats {
  totalSKU: number;
  totalFilaments: number;
  totalAccessories: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValueVnd: number;
}

export function useShopManagement() {
  const [filaments, setFilaments] = useState<IFilamentItem[]>([]);
  const [accessories, setAccessories] = useState<IAccessoryItem[]>([]);
  const [stats, setStats] = useState<IInventoryStats>({
    totalSKU: 0,
    totalFilaments: 0,
    totalAccessories: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValueVnd: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();
      if (res.ok) {
        if (data.filaments) setFilaments(data.filaments);
        if (data.accessories) setAccessories(data.accessories);
        if (data.inventoryStats) setStats(data.inventoryStats);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu kho hàng:', err);
      showToast(`Lỗi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Tạo sản phẩm mới
  const createProduct = async (productType: 'filament' | 'accessory', productData: any): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_product',
          productType,
          productData,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Thêm sản phẩm mới thành công!');
        await fetchInventory();
        return true;
      } else {
        showToast(`Lỗi: ${data.error || 'Không thể tạo sản phẩm'}`);
        return false;
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối: ${err.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Cập nhật thông tin sản phẩm
  const updateProduct = async (
    id: string,
    productType: 'filament' | 'accessory',
    productData: any
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_product',
          id,
          productType,
          productData,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Cập nhật sản phẩm thành công!');
        await fetchInventory();
        return true;
      } else {
        showToast(`Lỗi: ${data.error || 'Không thể cập nhật sản phẩm'}`);
        return false;
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối: ${err.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Xóa sản phẩm
  const deleteProduct = async (id: string, productType: 'filament' | 'accessory'): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_product',
          id,
          productType,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã xóa sản phẩm khỏi kho hàng!');
        await fetchInventory();
        return true;
      } else {
        showToast(`Lỗi: ${data.error || 'Không thể xóa sản phẩm'}`);
        return false;
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối: ${err.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Điều chỉnh tồn kho nhanh (+1, -1, +5, set số lượng, toggle inStock)
  const adjustStock = async (
    id: string,
    productType: 'filament' | 'accessory',
    params: { delta?: number; exact?: number; inStock?: boolean }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_stock',
          id,
          productType,
          ...params,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã cập nhật số lượng tồn kho!');
        // Cập nhật optimistic local state để UI siêu nhạy
        if (productType === 'filament') {
          setFilaments((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...data.item } : f))
          );
        } else {
          setAccessories((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...data.item } : a))
          );
        }
        if (data.stats) setStats(data.stats);
        return true;
      } else {
        showToast(`Lỗi: ${data.error || 'Không thể cập nhật tồn kho'}`);
        return false;
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối: ${err.message}`);
      return false;
    }
  };

  return {
    filaments,
    accessories,
    stats,
    isLoading,
    isProcessing,
    toastMessage,
    showToast,
    refreshInventory: fetchInventory,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  };
}
