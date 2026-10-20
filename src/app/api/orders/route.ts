import { NextRequest, NextResponse } from 'next/server';
import { orderRepository } from '@/backend/repositories/OrderRepository';
import { userRepository } from '@/backend/repositories/UserRepository';
import { userWalletService } from '@/backend/services/wallet/UserWalletService';
import { OrderFulfillmentStatus } from '@/backend/domain/order';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const myOrdersOnly = searchParams.get('myOrders') === 'true';

    const activeUser = userRepository.getActiveUser();

    if (id) {
      const order = orderRepository.getOrderById(id);
      if (!order) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
      }
      return NextResponse.json({ order });
    }

    // Nếu người dùng thông thường hoặc truyền myOrders=true thì chỉ lấy đơn của user đó
    const isStaffOrAdmin = activeUser.role === 'admin' || activeUser.role === 'staff' || activeUser.role === 'mod';
    
    let orders = orderRepository.getAllOrders();
    if (myOrdersOnly || !isStaffOrAdmin) {
      orders = orderRepository.getOrdersByUser(activeUser.id);
    }

    const printers = orderRepository.getPrinters();
    const stats = orderRepository.getWorkshopStats();

    return NextResponse.json({
      success: true,
      orders,
      printers,
      stats,
      currentUserRole: activeUser.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi lấy thông tin đơn hàng' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, status, printerName, printerId, progressPercent } = body;
    const activeUser = userRepository.getActiveUser();

    // ==========================================
    // CÁC HÀNH ĐỘNG DÀNH CHO KHÁCH HÀNG (HỦY ĐƠN, BẢO HÀNH, REVIEW)
    // ==========================================
    if (action === 'cancel_order') {
      if (!orderId) {
        return NextResponse.json({ error: 'Thiếu mã đơn hàng' }, { status: 400 });
      }
      const order = orderRepository.getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
      }

      const isOwner = order.userId === activeUser.id;
      const isStaffOrAdmin = activeUser.role === 'admin' || activeUser.role === 'staff' || activeUser.role === 'mod';
      if (!isOwner && !isStaffOrAdmin) {
        return NextResponse.json({ error: 'Bạn không có quyền hủy đơn hàng của người khác' }, { status: 403 });
      }

      const cancelRes = orderRepository.cancelOrder(orderId, body.reason);
      if (!cancelRes.success) {
        return NextResponse.json({ error: cancelRes.message }, { status: 400 });
      }

      if (cancelRes.refundedAmount > 0) {
        userWalletService.deposit(cancelRes.refundedAmount, `Hoàn 100% tiền hủy đơn hàng #${orderId}`);
      }

      return NextResponse.json({
        success: true,
        message: cancelRes.message,
        refundedAmount: cancelRes.refundedAmount,
        newBalanceVnd: userWalletService.getBalance(),
      });
    }

    if (action === 'claim_warranty') {
      if (!orderId || !body.reason) {
        return NextResponse.json({ error: 'Thiếu thông tin đơn hàng hoặc lý do yêu cầu bảo hành' }, { status: 400 });
      }

      const order = orderRepository.getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
      }

      const isOwner = order.userId === activeUser.id;
      const isStaffOrAdmin = activeUser.role === 'admin' || activeUser.role === 'staff' || activeUser.role === 'mod';
      if (!isOwner && !isStaffOrAdmin) {
        return NextResponse.json({ error: 'Bạn không có quyền thao tác trên đơn hàng này' }, { status: 403 });
      }

      const claimRes = orderRepository.claimWarranty(orderId, body.reason, body.notes);
      if (!claimRes.success) {
        return NextResponse.json({ error: claimRes.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: claimRes.message,
      });
    }

    if (action === 'review_order') {
      if (!orderId || body.rating === undefined) {
        return NextResponse.json({ error: 'Thiếu mã đơn hàng hoặc số sao đánh giá' }, { status: 400 });
      }

      const revRes = orderRepository.reviewOrder(orderId, Number(body.rating), body.reviewText);
      return NextResponse.json(revRes);
    }

    // ==========================================
    // CÁC HÀNH ĐỘNG DÀNH CHO XƯỞNG & ADMIN (STAFF / MOD / ADMIN)
    // ==========================================
    const canManageOrders = activeUser.role === 'admin' || activeUser.role === 'staff' || activeUser.role === 'mod';
    if (!canManageOrders) {
      return NextResponse.json(
        { error: 'Bạn không có quyền quản lý đơn hàng. Vui lòng chuyển sang tài khoản Admin hoặc Staff!' },
        { status: 403 }
      );
    }

    // 1. Cập nhật tiến độ xưởng in (Fulfillment status)
    if (action === 'update_status') {
      if (!orderId || !status) {
        return NextResponse.json({ error: 'Thiếu orderId hoặc status' }, { status: 400 });
      }

      const updated = orderRepository.updateFulfillmentStatus(
        orderId,
        status as OrderFulfillmentStatus,
        printerName
      );

      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order: updated,
        message: `Đã cập nhật đơn #${orderId} sang trạng thái: ${status}`,
        stats: orderRepository.getWorkshopStats(),
        printers: orderRepository.getPrinters(),
      });
    }

    // 2. Phân bổ máy in (Assign printer)
    if (action === 'assign_printer') {
      if (!orderId || !printerName) {
        return NextResponse.json({ error: 'Thiếu orderId hoặc printerName' }, { status: 400 });
      }

      const updated = orderRepository.assignPrinter(orderId, printerName);
      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order: updated,
        message: `Đã phân bổ đơn #${orderId} tới máy in: ${printerName}`,
        stats: orderRepository.getWorkshopStats(),
        printers: orderRepository.getPrinters(),
      });
    }

    // 3. Cập nhật % tiến độ máy in
    if (action === 'update_printer_progress') {
      if (!printerId || progressPercent === undefined) {
        return NextResponse.json({ error: 'Thiếu printerId hoặc progressPercent' }, { status: 400 });
      }

      const ok = orderRepository.updatePrinterProgress(printerId, Number(progressPercent));
      return NextResponse.json({
        success: ok,
        printers: orderRepository.getPrinters(),
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
