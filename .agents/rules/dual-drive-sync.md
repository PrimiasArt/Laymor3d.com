---
trigger: always_on
---

# Laymor3d.com — Dual-Drive (`F:\Project\Laymor3d.com` ↔ `D:\PJ\Project\Laymor3d.com`) & Workstation Rules

## 1. Dual-Drive Sync & Failover
- **Primary**: `F:\Project\Laymor3d.com` ↔ **Mirror**: `D:\PJ\Project\Laymor3d.com` *(không nhầm với bản archive cũ `D:\PJ\Laymor3d.com` tại `2b0ae64`)*.
- **Sequential I/O on `F:\`**: Luôn gọi **1 tool/command tại một thời điểm** khi chạm tới ổ `F:\` (không chạy song song để tránh ngắt kết nối ổ `F:`).
- **Dual-Write (`F:` online)**: Sau khi chỉnh sửa, tạo, xóa file hoặc `git commit` trên `F:\Project\Laymor3d.com`, đồng bộ bản tương ứng sang `D:\PJ\Project\Laymor3d.com` (kể cả `.env.local`, `GEMINI.md`, `.agents/rules/`, `public/3dsim/`). Tránh `/MIR` — luôn dùng `robocopy ... /E /XJ /XO /XD node_modules .next .vercel .turbo .git` và `git pull --ff-only` cho git commit.
- **Failover (`F:` offline / `no such directory`)**: Chuyển ngay sang đọc/sửa trên `D:\PJ\Project\Laymor3d.com` để không gián đoạn tiến độ; nếu `run_command` báo `no such directory`, nhắc người dùng mở workspace tại `D:\PJ\Project\Laymor3d.com` để chạy build/git.
- **Reconcile (`D:\PJ\` → `F:\` khi `F:` kết nối lại)**:
  1. Chạy `git -c safe.directory=* status --short` & `git log -n 5 --oneline` ở **cả 2 bên** + kiểm tra file sửa chưa commit / `.env.local`.
  2. Nếu chỉ `D:\PJ\` mới hơn -> đồng bộ git (`git -C "F:\Project\Laymor3d.com" pull "D:\PJ\Project\Laymor3d.com" main --ff-only`) + đồng bộ file sửa/untracked (`robocopy "D:\PJ\Project\Laymor3d.com" "F:\Project\Laymor3d.com" /E /XJ /XO /XD node_modules .next .vercel .turbo .git`).
  3. Nếu cả 2 bên có thay đổi phân kỳ/mâu thuẫn -> dừng lại hỏi người dùng trước khi ghi đè.

## 2. Project Environment Notes (`Laymor3d.com`)
- **Node/PATH**: Prefix lệnh terminal với `$env:PATH = "C:\Users\nguye\.conda\envs\nkspace;" + $env:PATH;`.
- **`3dsim/node_modules` Junction**: Trên `F:\`, `3dsim\node_modules` là Junction trỏ tới `C:\Users\nguye\.gemini\antigravity\brain\e756a479-007c-4c8b-942f-b432bf0f99b7\scratch\3dsim_deps` — **tuyệt đối không xóa `scratch\3dsim_deps` và luôn dùng `/XJ` khi `robocopy`**.
- **Git & Remotes**: Luôn dùng `git -c safe.directory=*` với `$env:GCM_INTERACTIVE="never"; $env:GIT_TERMINAL_PROMPT="0"`. Push tuần tự `origin main` trước rồi mới `hlcai main`, sau đó xác minh hash qua `git ls-remote`.
- **Next.js Rule**: Tôn trọng [AGENTS.md](./AGENTS.md) — không xóa block `nextjs-agent-rules`.
