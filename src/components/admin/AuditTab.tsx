"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditLogItem, UserListItem } from "@/lib/types";

export default function AuditTab() {
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data: users } = useQuery({
    queryKey: ["users-for-audit"],
    queryFn: async () => (await api<UserListItem[]>("/users?limit=200")).data,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", { actorId, action, from, to, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (actorId) params.set("actorId", actorId);
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return await api<AuditLogItem[]>(`/admin/audit-logs?${params}`);
    },
  });

  const logs = data?.data ?? [];
  const total = (data?.meta as { total?: number })?.total ?? logs.length;

  function reset() {
    setActorId("");
    setAction("");
    setFrom("");
    setTo("");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label>Người thực hiện</label>
          <select value={actorId} onChange={(e) => { setActorId(e.target.value); setPage(0); }}>
            <option value="">Tất cả</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="w-52">
          <label>Action (prefix)</label>
          <input
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
            placeholder="vd: user., status., export"
          />
        </div>
        <div>
          <label>Từ</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label>Đến</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
        <button className="btn-secondary" onClick={reset}>
          Xoá lọc
        </button>
      </div>

      {isLoading ? (
        <Skeleton rows={6} />
      ) : isError ? (
        <div className="card text-sm text-red-700">
          {(error as ApiError)?.message ?? "Lỗi tải audit log"}
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.actorName ?? "—"}</span>
                        {log.actorEmail && (
                          <span className="block text-xs text-gray-400">{log.actorEmail}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.targetType ? (
                          <span>
                            <span className="font-medium">{log.targetType}</span>
                            {log.targetId && (
                              <span className="ml-1 font-mono text-gray-400">
                                {log.targetId.slice(0, 8)}…
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {logs.length > 0
                ? `Hiển thị ${page * limit + 1}–${page * limit + logs.length}${total > logs.length ? ` / ${total}` : ""}`
                : "Không có kết quả"}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={logs.length < limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function actionColor(action: string): string {
  if (action.includes("delete") || action.includes("deactivate")) {
    return "bg-red-50 text-red-700";
  }
  if (action.includes("create") || action.includes("register")) {
    return "bg-green-50 text-green-700";
  }
  if (action.includes("export") || action.includes("report")) {
    return "bg-purple-50 text-purple-700";
  }
  if (action.includes("login") || action.includes("logout")) {
    return "bg-yellow-50 text-yellow-700";
  }
  return "bg-gray-100 text-gray-600";
}
