# Laymor3d.com — Project Agent Instructions

1. **Dual-Drive Mirror (`F:\` ↔ `D:\PJ\`)**:
   - Workspace chính: `F:\Project\Laymor3d.com` ↔ Bản dự phòng: `D:\PJ\Project\Laymor3d.com` *(không dùng nhầm `D:\PJ\Laymor3d.com` cũ)*.
   - Mọi thao tác đọc/ghi/chạy lệnh trên `F:\` phải chạy **tuần tự từng lệnh một** (không song song).
   - Khi làm việc trên `F:\`, ghi/đồng bộ song song file sửa đổi và git commit sang `D:\PJ\Project\Laymor3d.com` (giữ nguyên `3dsim/node_modules` junction trên `F:` bằng `/XJ /XD node_modules .next .vercel .turbo .git`).
   - Nếu `F:\` mất kết nối: làm tiếp trên `D:\PJ\Project\Laymor3d.com`; khi `F:\` kết nối lại, kiểm tra `git status`/`log` cả 2 bên trước rồi cập nhật `D:\PJ\Project\Laymor3d.com` → `F:\Project\Laymor3d.com`.
2. **Next.js Rule**: Tuân thủ `AGENTS.md` (giữ nguyên `nextjs-agent-rules`, đọc docs trong `node_modules/next/dist/docs/` khi cần).
3. **Chi tiết quy trình build/git & đồng bộ**: Xem `.agents/rules/dual-drive-sync.md` và rule global `C:\Users\nguye\.gemini\config\rules\dual-drive-sync.md`.
