'use client';

import { useState, useEffect, useCallback } from 'react';
import { IOrder, IPrinterDevice, OrderFulfillmentStatus } from '@/backend/domain/order';

export function useOrders(options?: { myOrdersOnly?: boolean }) {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [printers, setPrinters] = useState<IPrinterDevice[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    activePrintingJobs: 0,
    pendingReviewCount: 0,
    totalRevenueVnd: 0,
    activePrintersCount: 0,
    totalPrintersCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const url = options?.myOrdersOnly ? '/api/orders?myOrders=true' : '/api/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
        setPrinters(data.printers || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.myOrdersOnly]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderFulfillmentStatus, printerName?: string) => {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_status',
            orderId,
            status,
            printerName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'Cập nhật thành công!');
          setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
          if (data.printers) setPrinters(data.printers);
          if (data.stats) setStats(data.stats);
          return true;
        } else {
          showToast(`Lỗi: ${data.error || 'Cập nhật thất bại'}`);
        }
      } catch (err: any) {
        showToast(`Lỗi: ${err.message}`);
      }
      return false;
    },
    [showToast]
  );

  const assignPrinter = useCallback(
    async (orderId: string, printerName: string) => {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign_printer',
            orderId,
            printerName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'Đã phân bổ máy in!');
          setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
          if (data.printers) setPrinters(data.printers);
          if (data.stats) setStats(data.stats);
          return true;
        } else {
          showToast(`Lỗi: ${data.error || 'Phân bổ thất bại'}`);
        }
      } catch (err: any) {
        showToast(`Lỗi: ${err.message}`);
      }
      return false;
    },
    [showToast]
  );

  const updatePrinterProgress = useCallback(
    async (printerId: string, progressPercent: number) => {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_printer_progress',
            printerId,
            progressPercent,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.printers) {
          setPrinters(data.printers);
        }
      } catch (err) {
        console.error('Update printer error:', err);
      }
    },
    []
  );

  return {
    orders,
    printers,
    stats,
    isLoading,
    toastMessage,
    refreshOrders: fetchOrders,
    updateOrderStatus,
    assignPrinter,
    updatePrinterProgress,
  };
}
