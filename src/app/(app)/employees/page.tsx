"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Skeleton from "@/components/Skeleton";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Department, UserListItem } from "@/lib/types";

export default function EmployeesPage() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await api<Department[]>("/departments?limit=100&isActive=true")).data,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["employees", { search, departmentId }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (departmentId) params.set("departmentId", departmentId);
      return (await api<UserListItem[]>(`/users?${params}`)).data;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nhân viên</h1>

      <div className="card flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label htmlFor="e-search">Tìm kiếm</label>
          <input
            id="e-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, email, mã NV…"
          />
        </div>
        <div className="w-44">
          <label htmlFor="e-dept">Phòng ban</label>
          <select
            id="e-dept"
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
      </div>

      {isLoading ? (
        <Skeleton rows={6} />
      ) : (users ?? []).length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500">
          Không tìm thấy nhân viên nào.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3">Chức vụ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.employeeCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">{u.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">{u.position ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      code={u.currentStatus.statusCode}
                      label={u.currentStatus.statusLabel}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me?.id && (
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={() => router.push(`/chat?user=${u.id}`)}
                      >
                        💬 Nhắn tin
                      </button>
                    )}
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
