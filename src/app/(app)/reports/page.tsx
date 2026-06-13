"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Skeleton from "@/components/Skeleton";
import StatusBadge from "@/components/StatusBadge";
import { api, ApiError, authFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatDuration } from "@/lib/format";
import { toast } from "@/lib/toast";
import type {
  DailyReport,
  Department,
  OutingReport,
  UserListItem,
  UserReport,
} from "@/lib/types";

export default function ReportsPage() {
  const me = useAuthStore((s) => s.user);
  const canRead =
    me?.permissions.some((p) => p.startsWith("status.read")) ?? false;

  const [tab, setTab] = useState<"daily" | "user" | "outing">("daily");

  if (!canRead) {
    return (
      <div className="card py-10 text-center text-sm text-gray-500">
        Bạn không có quyền xem báo cáo. Liên hệ quản trị viên nếu cần.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Báo cáo</h1>
      <div className="flex gap-2">
        <button
          className={tab === "daily" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("daily")}
        >
          Theo ngày
        </button>
        <button
          className={tab === "user" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("user")}
        >
          Theo nhân viên
        </button>
        <button
          className={tab === "outing" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("outing")}
        >
          Ra ngoài
        </button>
      </div>
      {tab === "daily" && <DailyTab />}
      {tab === "user" && <UserTab />}
      {tab === "outing" && <OutingTab />}
    </div>
  );
}

function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await api<Department[]>("/departments?limit=100&isActive=true")).data,
  });
}

async function downloadExport(type: string, format: string, departmentId: string) {
  try {
    const params = new URLSearchParams({ type, format });
    if (departmentId) params.set("departmentId", departmentId);
    const res = await authFetch(`/reports/export?${params}`);
    if (!res.ok) {
      toast.error("Không export được (kiểm tra quyền)");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải file export");
  } catch {
    toast.error("Export thất bại");
  }
}

function DailyTab() {
  const { data: departments } = useDepartments();
  const [date, setDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["report-daily", { date, departmentId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (departmentId) params.set("departmentId", departmentId);
      return (await api<DailyReport>(`/reports/status/daily?${params}`)).data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label>Ngày</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="w-44">
          <label>Phòng ban</label>
          <select
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
        <div className="ml-auto flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => downloadExport("status_history", "csv", departmentId)}
          >
            ⬇ CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadExport("status_history", "xlsx", departmentId)}
          >
            ⬇ Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton rows={3} />
      ) : isError ? (
        <div className="card text-sm text-red-700">
          {(error as ApiError)?.message ?? "Lỗi tải báo cáo"}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tổng nhân viên" value={data.totalEmployees} />
            <Stat label="Đã bắt đầu" value={data.started} />
            <Stat label="Chưa bắt đầu" value={data.notStarted} />
            <Stat label="Quá giờ" value={data.overdue} danger />
          </div>
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Phân bố trạng thái ({data.date})
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.statusCounts).map(([code, count]) => (
                <div key={code} className="flex items-center gap-2">
                  <StatusBadge code={code} label={code} />
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(data.statusCounts).length === 0 && (
                <p className="text-sm text-gray-400">Không có dữ liệu.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function UserTab() {
  const [userId, setUserId] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users-for-report"],
    queryFn: async () => (await api<UserListItem[]>("/users?limit=100")).data,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["report-user", userId],
    queryFn: async () =>
      (await api<UserReport>(`/reports/status/user/${userId}`)).data,
    enabled: !!userId,
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label>Nhân viên</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">— Chọn nhân viên —</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!userId ? (
        <div className="card py-8 text-center text-sm text-gray-400">
          Chọn nhân viên để xem báo cáo.
        </div>
      ) : isLoading ? (
        <Skeleton rows={3} />
      ) : isError ? (
        <div className="card text-sm text-red-700">
          {(error as ApiError)?.message ?? "Không xem được (kiểm tra quyền)"}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Làm việc" text={formatDuration(data.totalWorkingMinutes)} />
            <Stat label="Nghỉ" text={formatDuration(data.totalBreakMinutes)} />
            <Stat label="Họp" text={formatDuration(data.totalMeetingMinutes)} />
            <Stat label="Ra ngoài" text={formatDuration(data.totalOutingMinutes)} />
            <Stat label="Số lần ra ngoài" value={data.outingCount} />
            <Stat label="Về muộn" value={data.lateReturnCount} danger />
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-4 py-2">Thời lượng</th>
                  <th className="px-4 py-2">Ghi chú</th>
                  <th className="px-4 py-2">Lý do muộn</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.entries.slice(-30).map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <StatusBadge code={e.statusCode} label={e.statusCode} />
                    </td>
                    <td className="px-4 py-2">{formatDuration(e.durationMinutes)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{e.note ?? ""}</td>
                    <td className="px-4 py-2 text-xs text-red-500">
                      {e.lateReason ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function OutingTab() {
  const { data: departments } = useDepartments();
  const [departmentId, setDepartmentId] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["report-outing", departmentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentId) params.set("departmentId", departmentId);
      return (await api<OutingReport>(`/reports/outing?${params}`)).data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label>Phòng ban</label>
          <select
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
        <div className="ml-auto flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => downloadExport("outing", "csv", departmentId)}
          >
            ⬇ CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadExport("outing", "xlsx", departmentId)}
          >
            ⬇ Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton rows={2} />
      ) : isError ? (
        <div className="card text-sm text-red-700">
          {(error as ApiError)?.message ?? "Lỗi tải báo cáo"}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tổng yêu cầu" value={data.total} />
          <Stat label="Chờ duyệt" value={data.byStatus["PENDING"] ?? 0} />
          <Stat label="Đã duyệt" value={data.byStatus["APPROVED"] ?? 0} />
          <Stat label="Về muộn" value={data.lateReturns} danger />
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  text,
  danger = false,
}: {
  label: string;
  value?: number;
  text?: string;
  danger?: boolean;
}) {
  const display = text ?? String(value ?? 0);
  return (
    <div className="card">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-bold ${danger && (value ?? 0) > 0 ? "text-red-600" : ""}`}
      >
        {display}
      </div>
    </div>
  );
}
