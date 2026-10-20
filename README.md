# 🔮 3D Hub - Nền Tảng Dịch Vụ In 3D & AI Spatial Intelligence

> **Apple VisionOS Spatial Glassmorphism Aesthetic** • Trải nghiệm kính mờ không gian sang trọng, tối ưu hiệu năng cao với Next.js 16 (Turbopack), Three.js WebGL và Tailwind CSS.

---

## 🌟 Tính Năng Nổi Bật

1. **3D AI Generation (3 Cấp Độ)**:
   - **Cấp 1 - In Thường**: Tripo H3.1 Watertight siêu tốc (~5 - 10s).
   - **Cấp 2 - In Nâng Cao**: Microsoft Trellis 2 tạo hình khối sắc nét (~15 - 25s).
   - **Cấp 3 - In Chất Lượng Cao 4K**: Meshy 6 Master Quad Retopology & PBR Texture 4K.
2. **3D Studio & Slicer Intelligence**:
   - WebGL 3D Viewer trực quan (Xoay, Lưới bàn in, Thước đo mm, Wireframe, Chế độ đường in Slicer).
   - Preset khổ máy: Bambu Lab X1-Carbon, Prusa MK4, Creality K1 Max, Anycubic Mono M5s.
   - Tính toán và mô phỏng Tree Support / Normal Support thời gian thực.
   - Bóc tách chi phí giá vốn (nhựa, điện, khấu hao máy) và xuất file preset `.3MF` chuẩn OrcaSlicer.
3. **Cửa Hàng 3D Hub (`/shop`)**:
   - Cuộn nhựa FDM (PLA, PETG, PETG-CF, ABS) & Phụ kiện máy in.
   - Chợ mô hình 3D bản quyền.
   - Dịch vụ in gia công giao hàng toàn quốc & Báo giá tự động.
4. **Phân Tích Xu Hướng In 3D (`/trends`)**:
   - Theo dõi tốc độ tăng trưởng (Velocity) từ các nền tảng MakerWorld, Printables, Thingiverse, GitHub 3D.
   - Tích hợp Google Gemini AI phân tích chuyên sâu thị trường FDM.
5. **MakerWorld & 3D Repositories Crawler (`/crawler`)**:
   - Trình quét dữ liệu thời gian thực đa nền tảng với Live Terminal Session.
   - Nạp trực tiếp mô hình cào được vào 3D Studio với 1 click.
6. **Hệ Thống Quản Trị & Điều Phối Xưởng (`/admin`)**:
   - Quản lý farm máy in và telemetry nhiệt độ đầu phun/bàn in thời gian thực.
   - Phân luồng đơn hàng: Cắt lớp -> Đang in -> Hậu kỳ -> Giao hàng -> Hoàn tất.
   - Phân quyền RBAC 4 cấp: Admin, Mod, Staff, User.
   - Cấu hình động: Khóa API (Gemini, Fal.ai, Meshy), đơn giá nhựa, chi phí vận hành.

---

## 🚀 Triển Khai Miễn Phí Lên Vercel (Free Hosting)

Dự án được xây dựng chuẩn Next.js App Router, tương thích 100% với **Vercel Free Tier**:

1. Đăng nhập [Vercel](https://vercel.com/) bằng tài khoản GitHub của bạn.
2. Chọn **"Add New..."** -> **"Project"**.
3. Chọn kho lưu trữ **`PrimiasArt/3dHubv2`** và bấm **"Import"**.
4. (Tùy chọn) Thêm các biến môi trường tại phần **Environment Variables**:
   - `GEMINI_API_KEY`: Key từ Google AI Studio (miễn phí)
   - `FAL_KEY`: Key từ Fal.ai
   - `MESHY_API_KEY`: Key từ Meshy.ai
5. Bấm **"Deploy"** -> Web sẽ tự động build và cấp domain miễn phí dạng `*.vercel.app` với chứng chỉ SSL HTTPS tự động!

---

## 💻 Chạy Local Trên Máy

```bash
# Cài đặt dependencies
npm install

# Khởi chạy môi trường phát triển
npm run dev

# Mở trình duyệt tại http://localhost:3000
```
