"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Skeleton from "@/components/Skeleton";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { NotificationItem } from "@/lib/types";

function targetPath(n: NotificationItem): string | null {
  if (n.type.startsWith("CHAT_MESSAGE")) return "/chat";
  if (n.type.startsWith("OUTING")) return "/outing-requests";
  if (n.type === "STATUS_OVERDUE") return "/my-status";
  if (n.type === "MEMBER_OVERDUE") return "/";
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async () =>
      (
        await api<NotificationItem[]>(
          `/notifications?limit=50&unreadOnly=${unreadOnly}`
        )
      ).data,
    refetchInterval: 30_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  }

  async function open(n: NotificationItem) {
    if (!n.readAt) {
      api(`/notifications/${n.id}/read`, { method: "PATCH" })
        .then(invalidate)
        .catch(() => undefined);
    }
    const path = targetPath(n);
    if (path) router.push(path);
  }

  async function markAllRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Thông báo</h1>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Chỉ chưa đọc
          </label>
          <button className="btn-secondary" onClick={markAllRead}>
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton rows={5} />
      ) : (notifications ?? []).length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500">
          {unreadOnly ? "Không có thông báo chưa đọc." : "Chưa có thông báo nào."}
        </div>
      ) : (
        <div className="card divide-y p-0">
          {(notifications ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${
                n.readAt ? "" : "bg-blue-50/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm ${n.readAt ? "" : "font-semibold"}`}
                >
                  {n.title}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              {n.body && (
                <p className="mt-0.5 truncate text-sm text-gray-500">{n.body}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
