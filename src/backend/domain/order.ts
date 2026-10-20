import { ICartItem } from './shop';

export type OrderPaymentMethod = 'wallet' | 'vietqr' | 'momo' | 'cod';
export type OrderPaymentStatus = 'pending' | 'paid' | 'refunded';

export type OrderFulfillmentStatus =
  | 'pending_review'   // Chờ duyệt file 3D & thông số in
  | 'slicing'          // Đang cắt lớp (OrcaSlicer / Bambu Studio)
  | 'queued'           // Đã xếp hàng chờ máy in
  | 'printing'         // Đang in trực tiếp trên máy
  | 'post_processing'  // Hậu kỳ (gỡ support, sấy UV, xử lý bề mặt)
  | 'packaging'        // Đóng gói chống sốc
  | 'delivering'       // Đang giao hàng (Viettel Post/GHN)
  | 'completed'        // Đã giao thành công
  | 'cancelled'        // Đã hủy
  | 'warranty_claimed' // Khiếu nại bảo hành 1 đổi 1
  | 'warranty_reprinting'; // Xưởng đang in lại bảo hành

export interface IOrderItem extends ICartItem {
  technology?: string;
  material?: string;
  color?: string;
  infillPercent?: number;
  weightGrams?: number;
  estimatedPrintHours?: number;
  aiTier?: 'tripo_fast' | 'trellis_pro' | 'meshy_ultra' | 'none';
}

export interface IOrder {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail?: string;
  notes?: string;
  items: IOrderItem[];
  totalAmountVnd: number;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  assignedPrinter?: string;
  trackingCode?: string;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
  // Giai đoạn 3: Bảo hành 1 đổi 1 & Đánh giá
  warrantyReason?: string;
  warrantyNotes?: string;
  warrantyStatus?: 'pending' | 'approved' | 'rejected' | 'reprinting';
  rating?: number; // 1 - 5
  reviewText?: string;
}

export interface IPrinterDevice {
  id: string;
  name: string;
  type: 'FDM' | 'SLA';
  status: 'idle' | 'printing' | 'maintenance' | 'offline';
  currentOrderId?: string;
  currentProgressPercent?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  chamberTemp?: number;
  materialLoaded?: string;
}

export const WORKSHOP_PRINTERS: IPrinterDevice[] = [
  {
    id: 'prt-bambu-x1c-01',
    name: 'Bambu Lab X1-Carbon #01 (AMS 4 Màu)',
    type: 'FDM',
    status: 'printing',
    currentOrderId: 'DH3D-778921',
    currentProgressPercent: 78,
    nozzleTemp: 220,
    bedTemp: 55,
    chamberTemp: 38,
    materialLoaded: 'PLA Matte Đen / Trắng / Đỏ / Xám',
  },
  {
    id: 'prt-bambu-x1c-02',
    name: 'Bambu Lab X1-Carbon #02 (High Temp)',
    type: 'FDM',
    status: 'printing',
    currentOrderId: 'DH3D-882104',
    currentProgressPercent: 42,
    nozzleTemp: 270,
    bedTemp: 90,
    chamberTemp: 45,
    materialLoaded: 'PETG-CF Carbon Fiber Đen',
  },
  {
    id: 'prt-bambu-p1s-01',
    name: 'Bambu Lab P1S #01 (High-Speed)',
    type: 'FDM',
    status: 'idle',
    nozzleTemp: 25,
    bedTemp: 25,
    materialLoaded: 'PLA Basic Trắng',
  },
  {
    id: 'prt-anycubic-sla-01',
    name: 'Anycubic Photon Mono M5s (12K SLA)',
    type: 'SLA',
    status: 'idle',
    materialLoaded: 'High Precision Standard Grey Resin 8K',
  },
];

export const INITIAL_ORDERS: IOrder[] = [
  {
    id: 'DH3D-778921',
    userId: 'usr-customer-1',
    customerName: 'Phạm Minh Maker',
    customerPhone: '0933445566',
    customerAddress: '123 Đường Điện Biên Phủ, TP. Đà Nẵng',
    customerEmail: 'maker@gmail.com',
    notes: 'In gấp mô hình Benchy High Speed để kịp triển lãm',
    items: [
      {
        id: 'svc-benchy-demo',
        title: 'Dịch vụ in: #3DBenchy Tốc Độ Cao (Bambu X1C)',
        priceVnd: 68000,
        quantity: 1,
        type: 'service',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80',
        subText: 'FDM | PLA Basic | 15% Infill | 45g',
        technology: 'FDM High-Speed',
        material: 'PLA Basic',
        color: 'Xám Titan',
        infillPercent: 15,
        weightGrams: 45,
        estimatedPrintHours: 1.5,
        aiTier: 'tripo_fast',
      },
    ],
    totalAmountVnd: 68000,
    paymentMethod: 'vietqr',
    paymentStatus: 'paid',
    fulfillmentStatus: 'printing',
    assignedPrinter: 'Bambu Lab X1-Carbon #01 (AMS 4 Màu)',
    trackingCode: 'VTP-88992211',
    estimatedCompletion: '2026-10-06T18:00:00.000Z',
    createdAt: '2026-10-05T08:30:00.000Z',
    updatedAt: '2026-10-05T09:15:00.000Z',
  },
  {
    id: 'DH3D-882104',
    userId: 'usr-admin-1',
    customerName: 'Nguyễn Văn Admin',
    customerPhone: '0901234567',
    customerAddress: 'Trụ sở 3D Hub, Quận 1, TP. Hồ Chí Minh',
    customerEmail: 'admin@3dhub.vn',
    notes: 'Yêu cầu gỡ support cẩn thận và kiểm tra độ bền chi tiết',
    items: [
      {
        id: 'flm-sunlu-petg-cf',
        title: 'Nhựa Sunlu PETG Carbon Fiber (1kg) Chịu Lực Cao',
        priceVnd: 490000,
        quantity: 2,
        type: 'filament',
        imageUrl: 'https://images.unsplash.com/photo-1615996001375-c7ef13294436?w=300&auto=format&fit=crop&q=80',
        subText: 'Carbon Black - 1.75mm',
      },
      {
        id: 'svc-cyber-robot',
        title: 'In 3D AI Chất Lượng 4K (Meshy v6)',
        priceVnd: 280000,
        quantity: 1,
        type: 'service',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
        subText: 'FDM Chịu Lực | PETG-CF | 40.000đ AI Fee',
        technology: 'FDM Engineering',
        material: 'PETG-CF Carbon',
        weightGrams: 160,
        aiTier: 'meshy_ultra',
      },
    ],
    totalAmountVnd: 1260000,
    paymentMethod: 'wallet',
    paymentStatus: 'paid',
    fulfillmentStatus: 'printing',
    assignedPrinter: 'Bambu Lab X1-Carbon #02 (High Temp)',
    trackingCode: 'GHN-33441199',
    estimatedCompletion: '2026-10-07T12:00:00.000Z',
    createdAt: '2026-10-05T09:00:00.000Z',
    updatedAt: '2026-10-05T09:45:00.000Z',
  },
  {
    id: 'DH3D-319982',
    userId: 'usr-customer-1',
    customerName: 'Hoàng Anh Khôi',
    customerPhone: '0977889900',
    customerAddress: 'Tòa Landmark 81, Bình Thạnh, TP. HCM',
    notes: 'Đơn mới từ web chờ staff duyệt file và phân bổ máy in',
    items: [
      {
        id: 'acc-textured-pei-bambu',
        title: 'Tấm Bàn In PEI Textured Bambu Lab X1/P1 Chính Hãng',
        priceVnd: 380000,
        quantity: 1,
        type: 'accessory',
        imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=300&auto=format&fit=crop&q=80',
      },
    ],
    totalAmountVnd: 380000,
    paymentMethod: 'momo',
    paymentStatus: 'paid',
    fulfillmentStatus: 'pending_review',
    createdAt: '2026-10-05T10:15:00.000Z',
    updatedAt: '2026-10-05T10:15:00.000Z',
  },
];
