"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast";
import type { DepartmentDetail, UserListItem } from "@/lib/types";

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const canManage = me?.permissions.includes("department.manage") ?? false;

  const [editing, setEditing] = useState<DepartmentDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments-full"],
    queryFn: async () =>
      (await api<DepartmentDetail[]>("/departments?limit=100")).data,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["departments-full"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  }

  async function disable(d: DepartmentDetail) {
    if (!window.confirm(`Vô hiệu hóa phòng ban "${d.name}"?`)) return;
    try {
      await api(`/departments/${d.id}`, { method: "DELETE" });
      toast.success("Đã vô hiệu hóa phòng ban");
      invalidate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không vô hiệu hóa được"
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Phòng ban</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            + Tạo phòng ban
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton rows={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Quản lý</th>
                <th className="px-4 py-3">Số NV</th>
                <th className="px-4 py-3">Trạng thái</th>
                {canManage && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(departments ?? []).map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">{d.manager?.fullName ?? "—"}</td>
                  <td className="px-4 py-3">{d.memberCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        d.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {d.isActive ? "Hoạt động" : "Đã tắt"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-secondary mr-2 px-3 py-1 text-xs"
                        onClick={() => setEditing(d)}
                      >
                        Sửa
                      </button>
                      {d.isActive && (
                        <button
                          className="btn-danger px-3 py-1 text-xs"
                          onClick={() => disable(d)}
                        >
                          Vô hiệu
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DepartmentModal
        open={createOpen || editing !== null}
        department={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onDone={() => {
          setCreateOpen(false);
          setEditing(null);
          invalidate();
        }}
      />
    </div>
  );
}

function DepartmentModal({
  open,
  department,
  onClose,
  onDone,
}: {
  open: boolean;
  department: DepartmentDetail | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = department !== null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["users-for-manager"],
    queryFn: async () => (await api<UserListItem[]>("/users?limit=100")).data,
    enabled: open,
  });

  // Đồng bộ form khi mở modal sửa.
  const formKey = department?.id ?? "new";
  if (open && initializedFor !== formKey) {
    setInitializedFor(formKey);
    setCode(department?.code ?? "");
    setName(department?.name ?? "");
    setManagerId(department?.manager?.id ?? "");
    setDescription(department?.description ?? "");
    setError(null);
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null);
  }

  async function submit() {
    setError(null);
    if (!name.trim() || (!isEdit && !code.trim())) {
      setError("Vui lòng nhập mã và tên phòng ban");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await api(`/departments/${department!.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            managerId: managerId || undefined,
            description: description || undefined,
          }),
        });
        toast.success("Đã cập nhật phòng ban");
      } else {
        await api("/departments", {
          method: "POST",
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            managerId: managerId || undefined,
            description: description || undefined,
          }),
        });
        toast.success("Đã tạo phòng ban (kèm chat phòng ban)");
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Sửa: ${department?.name}` : "Tạo phòng ban"}
      open={open}
      onClose={onClose}
    >
      <div className="space-y-3">
        {!isEdit && (
          <div>
            <label>Mã phòng ban *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SALES"
            />
          </div>
        )}
        <div>
          <label>Tên *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Quản lý</label>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">— Chưa chọn —</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Mô tả</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
