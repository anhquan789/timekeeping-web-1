# Company Status System — Web Frontend

Frontend Next.js cho hệ thống quản lý trạng thái nhân sự + chat nội bộ. Kết nối với backend Spring Boot tại [timekeeping](https://github.com/rare-base/timekeeping).

## Tech stack

Next.js 14 (App Router, standalone output), TypeScript, Tailwind CSS, TanStack Query v5, Zustand v4, @stomp/stompjs v7.

## Tính năng

- **Dashboard** — bảng trạng thái nhân viên toàn công ty, filter theo phòng ban/trạng thái/tìm kiếm/quá giờ, real-time qua WebSocket STOMP
- **My Status** — xem + cập nhật trạng thái cá nhân (8 nút: bắt đầu, nghỉ trưa, giải lao, họp, ra ngoài, làm remote, quay lại, kết thúc), timeline hôm nay
- **Chat** — chat cá nhân, nhóm, phòng ban; upload file; typing indicator; reaction; sửa/thu hồi tin nhắn; real-time STOMP
- **Outing Requests** — tạo yêu cầu ra ngoài, xem lịch sử, duyệt/từ chối/trả lại (phân quyền)
- **Notifications** — danh sách thông báo, lọc chưa đọc, đánh dấu đã đọc, deep link
- **Employees** — danh sách nhân viên, tìm kiếm, nhắn tin nhanh
- **Departments** — CRUD phòng ban, gán manager (phân quyền)
- **Reports** — báo cáo theo ngày / theo nhân viên / ra ngoài, export CSV + Excel (phân quyền)
- **Admin** — quản lý User, Role & quyền, Trạng thái custom, Cấu hình hệ thống, Audit log (phân quyền)

## Chạy local

```bash
cp .env.local.example .env.local   # đặt NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev
```

Truy cập http://localhost:3000. Backend phải đang chạy (xem README backend).

## Biến môi trường

| Biến | Mô tả | Mặc định |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend API | `http://localhost:8080` |

## Chạy bằng Docker

```bash
docker compose up -d --build
```

Web: http://localhost:3000. Yêu cầu backend đang chạy và `NEXT_PUBLIC_API_URL` trỏ đúng.

## Auth

- Access token lưu trong Zustand (in-memory), refresh token trong localStorage
- Tự động refresh khi nhận 401 (single-flight — không bắn nhiều request cùng lúc)
- Bootstrap auth khi load app: gọi `/auth/me` để lấy lại user sau khi refresh tab

## Phân quyền trên UI

| Tính năng | Quyền cần có |
|---|---|
| Duyệt outing | `outing.approve` |
| Departments CRUD | `department.manage` |
| Reports | `status.read.all` hoặc `status.read.department` |
| Admin > Users | `user.create` hoặc `user.update.any` |
| Admin > Roles | `role.manage` |
| Admin > Status configs | `settings.manage` |
| Admin > Cấu hình | `settings.manage` |
| Admin > Audit log | `audit.read` |

## WebSocket

Kết nối tới `WS_URL` (mặc định `ws://localhost:8080/ws`) với header `Authorization: Bearer <token>`:
- `/topic/status` — cập nhật trạng thái real-time trên Dashboard
- `/topic/conversations/{id}` — sự kiện chat (message, reaction, typing, read receipt)
