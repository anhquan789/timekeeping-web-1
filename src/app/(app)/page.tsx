"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "@/components/Skeleton";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatTime, timeSince } from "@/lib/format";
import { subscribeStatusEvents } from "@/lib/ws";
import {
  CONTACT_LABELS,
  type DashboardItem,
  type Department,
  STATUS_COLORS,
} from "@/lib/types";

const STATUS_OPTIONS = Object.keys(STATUS_COLORS);

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await api<Department[]>("/departments?limit=100&isActive=true")).data,
  });

  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard", { search, departmentId, statusCode, overdueOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (departmentId) params.set("departmentId", departmentId);
      if (statusCode) params.set("statusCode", statusCode);
      if (overdueOnly) params.set("isOverdue", "true");
      return (await api<DashboardItem[]>(`/statuses/dashboard?${params}`)).data;
    },
  });

  // Real-time: invalidate dashboard (debounced) on status events.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!accessToken) return;
    const cleanup = subscribeStatusEvents(accessToken, () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["my-status"] });
      }, 500);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      cleanup();
    };
  }, [accessToken, queryClient]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let overdue = 0;
    for (const item of items ?? []) {
      counts[item.statusCode] = (counts[item.statusCode] ?? 0) + 1;
      if (item.isOverdue) overdue++;
    }
    return { counts, overdue, total: items?.length ?? 0 };
  }, [items]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard trạng thái nhân viên</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Tổng" value={summary.total} />
        <SummaryCard label="Đang làm việc" value={summary.counts["WORKING"] ?? 0} />
        <SummaryCard label="Ra ngoài" value={summary.counts["OUTING"] ?? 0} />
        <SummaryCard label="Họp" value={summary.counts["MEETING"] ?? 0} />
        <SummaryCard label="Quá giờ" value={summary.overdue} danger />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label htmlFor="f-search">Tìm kiếm</label>
          <input
            id="f-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên nhân viên…"
          />
        </div>
        <div className="w-44">
          <label htmlFor="f-dept">Phòng ban</label>
          <select
            id="f-dept"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Tất cả</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="f-status">Trạng thái</label>
          <select
            id="f-status"
            value={statusCode}
            onChange={(e) => setStatusCode(e.target.value)}
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-normal">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Chỉ quá giờ
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton rows={6} />
      ) : isError ? (
        <div className="card text-sm text-red-700">
          Không tải được dữ liệu: {(error as Error)?.message}{" "}
          <button className="underline" onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500">
          Không có nhân viên nào khớp bộ lọc.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nhân viên</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Từ lúc</th>
                <th className="px-4 py-3">Dự kiến về</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(items ?? []).map((item) => (
                <tr
                  key={item.userId}
                  className={item.isOverdue ? "bg-red-50" : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.fullName}</div>
                    <div className="text-xs text-gray-500">{item.position}</div>
                  </td>
                  <td className="px-4 py-3">{item.departmentName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      code={item.statusCode}
                      label={item.statusLabel}
                      overdue={item.isOverdue}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {formatTime(item.startedAt)}
                    <span className="ml-1 text-xs text-gray-400">
                      ({timeSince(item.startedAt)})
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatTime(item.expectedReturnAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {CONTACT_LABELS[item.contactAvailability] ??
                      item.contactAvailability}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-xs text-gray-500">
                    {item.publicNote ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-2xl font-bold ${danger && value > 0 ? "text-red-600" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
