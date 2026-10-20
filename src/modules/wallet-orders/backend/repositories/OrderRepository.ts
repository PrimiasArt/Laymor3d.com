import {
  IOrder,
  IOrderItem,
  IPrinterDevice,
  INITIAL_ORDERS,
  WORKSHOP_PRINTERS,
  OrderFulfillmentStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
} from '@/backend/domain/order';

class OrderRepository {
  private orders: IOrder[] = [...INITIAL_ORDERS];
  private printers: IPrinterDevice[] = [...WORKSHOP_PRINTERS];

  getAllOrders(): IOrder[] {
    return this.orders;
  }

  getOrderById(id: string): IOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  getOrdersByUser(userId: string): IOrder[] {
    return this.orders.filter((o) => o.userId === userId);
  }

  createOrder(data: {
    userId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerEmail?: string;
    notes?: string;
    items: IOrderItem[];
    totalAmountVnd: number;
    paymentMethod: OrderPaymentMethod;
    paymentStatus?: OrderPaymentStatus;
    aiTier?: 'tripo_fast' | 'trellis_pro' | 'meshy_ultra' | 'none';
  }): IOrder {
    const newOrder: IOrder = {
      id: `DH3D-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerEmail: data.customerEmail,
      notes: data.notes,
      items: data.items,
      totalAmountVnd: data.totalAmountVnd,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus || (data.paymentMethod === 'cod' ? 'pending' : 'paid'),
      fulfillmentStatus: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }

  updateFulfillmentStatus(
    id: string,
    status: OrderFulfillmentStatus,
    printer?: string
  ): IOrder | undefined {
    const order = this.getOrderById(id);
    if (!order) return undefined;

    order.fulfillmentStatus = status;
    if (printer !== undefined) {
      order.assignedPrinter = printer;
    }
    order.updatedAt = new Date().toISOString();

    // Tự động đồng bộ trạng thái máy in tương ứng
    if (order.assignedPrinter) {
      const prt = this.printers.find((p) => p.name === order.assignedPrinter);
      if (prt) {
        if (status === 'printing') {
          prt.status = 'printing';
          prt.currentOrderId = order.id;
          prt.currentProgressPercent = prt.currentProgressPercent || 15;
        } else if (status === 'completed' || status === 'cancelled') {
          prt.status = 'idle';
          prt.currentOrderId = undefined;
          prt.currentProgressPercent = undefined;
        }
      }
    }

    return order;
  }

  assignPrinter(id: string, printerName: string): IOrder | undefined {
    const order = this.getOrderById(id);
    if (!order) return undefined;

    order.assignedPrinter = printerName;
    order.fulfillmentStatus = 'printing';
    order.updatedAt = new Date().toISOString();

    const prt = this.printers.find((p) => p.name === printerName);
    if (prt) {
      prt.status = 'printing';
      prt.currentOrderId = order.id;
      prt.currentProgressPercent = 10;
    }

    return order;
  }

  getPrinters(): IPrinterDevice[] {
    return this.printers;
  }

  updatePrinterProgress(printerId: string, progressPercent: number): boolean {
    const prt = this.printers.find((p) => p.id === printerId);
    if (!prt) return false;
    prt.currentProgressPercent = progressPercent;
    return true;
  }

  getWorkshopStats() {
    const totalOrders = this.orders.length;
    const completedOrders = this.orders.filter((o) => o.fulfillmentStatus === 'completed').length;
    const activePrintingJobs = this.orders.filter((o) => o.fulfillmentStatus === 'printing').length;
    const pendingReviewCount = this.orders.filter((o) => o.fulfillmentStatus === 'pending_review' || o.fulfillmentStatus === 'slicing').length;
    const totalRevenueVnd = this.orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.totalAmountVnd, 0);

    const activePrintersCount = this.printers.filter((p) => p.status === 'printing').length;
    const totalPrintersCount = this.printers.length;

    return {
      totalOrders,
      completedOrders,
      activePrintingJobs,
      pendingReviewCount,
      totalRevenueVnd,
      activePrintersCount,
      totalPrintersCount,
    };
  }

  // Giai đoạn 3: Hủy đơn hoàn tiền, Khiếu nại bảo hành 1 đổi 1, Đánh giá sản phẩm
  cancelOrder(id: string, reason?: string): { success: boolean; message: string; refundedAmount: number } {
    const order = this.getOrderById(id);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng', refundedAmount: 0 };

    if (order.fulfillmentStatus === 'delivering' || order.fulfillmentStatus === 'completed') {
      return {
        success: false,
        message: 'Đơn hàng đang giao hoặc đã hoàn tất. Bạn không thể hủy đơn, vui lòng sử dụng tính năng Bảo Hành 1 Đổi 1!',
        refundedAmount: 0,
      };
    }

    if (order.fulfillmentStatus === 'cancelled') {
      return { success: false, message: 'Đơn hàng này đã được hủy trước đó', refundedAmount: 0 };
    }

    order.fulfillmentStatus = 'cancelled';
    order.updatedAt = new Date().toISOString();
    if (reason) order.notes = (order.notes ? `${order.notes} | ` : '') + `Lý do hủy: ${reason}`;

    // Giải phóng máy in nếu đã gán
    if (order.assignedPrinter) {
      const prt = this.printers.find((p) => p.name === order.assignedPrinter);
      if (prt && prt.currentOrderId === order.id) {
        prt.status = 'idle';
        prt.currentOrderId = undefined;
        prt.currentProgressPercent = undefined;
      }
    }

    let refunded = 0;
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      refunded = order.totalAmountVnd;
    }

    return {
      success: true,
      message: refunded > 0
        ? `Đã hủy đơn hàng thành công và hoàn trả 100% (${refunded.toLocaleString('vi-VN')} đ) vào ví số dư của bạn!`
        : 'Đã hủy đơn hàng thành công!',
      refundedAmount: refunded,
    };
  }

  claimWarranty(id: string, reason: string, notes?: string): { success: boolean; message: string } {
    const order = this.getOrderById(id);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };

    order.fulfillmentStatus = 'warranty_claimed';
    order.warrantyStatus = 'pending';
    order.warrantyReason = reason;
    order.warrantyNotes = notes;
    order.updatedAt = new Date().toISOString();

    return {
      success: true,
      message: 'Đã tiếp nhận yêu cầu bảo hành 1 đổi 1. Kỹ thuật viên xưởng sẽ kiểm tra và in lại miễn phí trong 24h!',
    };
  }

  reviewOrder(id: string, rating: number, reviewText?: string): { success: boolean; message: string } {
    const order = this.getOrderById(id);
    if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };

    order.rating = Math.max(1, Math.min(5, rating));
    order.reviewText = reviewText;
    order.updatedAt = new Date().toISOString();

    return {
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá trải nghiệm sản phẩm!',
    };
  }
}

export const orderRepository = new OrderRepository();
