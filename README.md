# Company Status System — Web Frontend

Web app cho hệ thống quản lý trạng thái nhân sự. Repo riêng để CI/CD deploy độc lập với backend ([timekeeping](../timekeeping)).

- **Đợt 5:** Login + auth flow (refresh token tự động), layout sidebar/header, Dashboard trạng thái nhân viên (filter, summary, highlight quá giờ, real-time qua WebSocket), My Status (8 hành động nhanh + timeline hôm nay).
- **Đợt 6:** Chat (danh sách hội thoại + unread badge, gửi/sửa/thu hồi tin, reaction, gửi/tải file, typing indicator, mark read, cảnh báo người nhận bận, real-time), Outing Requests (tạo, duyệt/từ chối với lý do, xác nhận quay lại + lý do muộn), Notifications (filter unread, mark read, điều hướng), Employees (tìm kiếm + nhắn tin nhanh).

Còn lại: Departments, Reports, Admin pages.

## Tech stack

Next.js 14 (App Router, standalone output), TypeScript, Tailwind CSS, TanStack Query, Zustand, @stomp/stompjs (WebSocket real-time).

## Chạy local

Yêu cầu: backend đang chạy ở `http://localhost:8080` (xem repo `timekeeping`: `docker compose up -d --build`).

```bash
# Cách 1: Docker (không cần Node)
docker compose up -d --build

# Cách 2: Node 20+
npm install
npm run dev
```

Mở http://localhost:3000 — đăng nhập bằng account seed, ví dụ `admin@example.com` / `Password123!`.

## Cấu hình

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | URL backend nhìn từ **trình duyệt**. Được nhúng lúc build (Docker build arg). |

Backend phải cho phép CORS từ origin của web (env `WEB_URL` trong repo backend, mặc định `http://localhost:3000`).

## Cấu trúc

```
src/
  app/
    login/page.tsx          # trang đăng nhập
    (app)/layout.tsx        # protected shell (AuthGate + Sidebar + Header)
    (app)/page.tsx          # Dashboard
    (app)/my-status/        # My Status
    (app)/chat/             # Chat (2 cột: danh sách + cửa sổ chat)
    (app)/outing-requests/  # Tạo + duyệt yêu cầu ra ngoài
    (app)/notifications/    # Thông báo
    (app)/employees/        # Danh bạ nhân viên
    providers.tsx           # React Query + Toast
  lib/
    api.ts                  # fetch wrapper: tự refresh token khi 401 (single-flight) + authFetch cho file
    auth-store.ts           # Zustand: access token (memory) + refresh token (localStorage)
    ws.ts                   # STOMP: /topic/status + /topic/conversations/{id} + typing publish
    types.ts, format.ts, toast.ts
  components/               # StatusBadge, Modal, Sidebar, Header, StatusActions, chat/*
```

## Auth flow

Access token giữ trong memory (mất khi refresh trang), refresh token trong localStorage. Khi mở trang hoặc gặp 401: tự gọi `/auth/refresh-token` (rotation) rồi retry; thất bại → về `/login`.

## CI/CD

`.github/workflows/ci.yml`: type-check (`tsc --noEmit`) → `next build` → Docker build. Deploy: image Docker chạy `node server.js` (standalone), port 3000 — truyền `NEXT_PUBLIC_API_URL` làm build arg trỏ tới API production.

## Test thủ công nhanh

1. Login admin → Dashboard với 7 nhân viên seed, filter hoạt động.
2. My Status → "Bắt đầu làm việc" → badge header đổi; tab khác login user khác → dashboard tự cập nhật (WebSocket).
3. Chat → mở hội thoại seed (sales1 ↔ sales2), gửi tin ở 2 tab → tin hiện real-time, typing indicator, unread badge giảm sau khi đọc.
4. Gửi file trong chat (📎) → người nhận tải được; file .exe bị từ chối.
5. Outing Requests → employee tạo yêu cầu → manager.sales thấy tab "Chờ tôi duyệt" → duyệt/từ chối → employee nhận notification (badge sidebar).
