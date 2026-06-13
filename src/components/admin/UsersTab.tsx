"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Department, Role, UserListItem } from "@/lib/types";

export default function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      return (await api<UserListItem[]>(`/users?${params}`)).data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  }

  async function deactivate(u: UserListItem) {
    if (!window.confirm(`Vô hiệu hóa tài khoản "${u.fullName}"? Lịch sử vẫn được giữ.`))
      return;
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      toast.success("Đã vô hiệu hóa tài khoản");
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không vô hiệu hóa được");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="w-64">
          <label>Tìm kiếm</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, email, mã NV…"
          />
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Tạo nhân viên
        </button>
      </div>

      {isLoading ? (
        <Skeleton rows={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{u.employeeCode}</td>
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.department?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn-secondary mr-2 px-3 py-1 text-xs"
                      onClick={() => setEditing(u)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn-danger px-3 py-1 text-xs"
                      onClick={() => deactivate(u)}
                    >
                      Vô hiệu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        open={createOpen || editing !== null}
        user={editing}
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

function UserModal({
  open,
  user,
  onClose,
  onDone,
}: {
  open: boolean;
  user: UserListItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = user !== null;
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      (await api<Department[]>("/departments?limit=100&isActive=true")).data,
    enabled: open,
  });
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api<Role[]>("/roles")).data,
    enabled: open,
  });

  const formKey = user?.id ?? "new";
  if (open && initializedFor !== formKey) {
    setInitializedFor(formKey);
    setForm({
      fullName: user?.fullName ?? "",
      departmentId: user?.department?.id ?? "",
    });
    setError(null);
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null);
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api(`/users/${user!.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: form.fullName || undefined,
            phone: form.phone || undefined,
            position: form.position || undefined,
            departmentId: form.departmentId || undefined,
            roleId: form.roleId || undefined,
          }),
        });
        toast.success("Đã cập nhật nhân viên");
      } else {
        if (!form.employeeCode || !form.fullName || !form.email || !form.password) {
          setError("Vui lòng nhập mã NV, họ tên, email và mật khẩu");
          setSubmitting(false);
          return;
        }
        await api("/users", {
          method: "POST",
          body: JSON.stringify({
            employeeCode: form.employeeCode,
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            departmentId: form.departmentId || undefined,
            position: form.position || undefined,
            roleId: form.roleId || undefined,
          }),
        });
        toast.success("Đã tạo nhân viên (tự thêm vào chat phòng ban)");
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
      title={isEdit ? `Sửa: ${user?.fullName}` : "Tạo nhân viên"}
      open={open}
      onClose={onClose}
    >
      <div className="space-y-3">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label>Mã NV *</label>
              <input
                value={form.employeeCode ?? ""}
                onChange={(e) => set("employeeCode", e.target.value)}
                placeholder="EMP010"
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>
        )}
        <div>
          <label>Họ tên {isEdit ? "" : "*"}</label>
          <input
            value={form.fullName ?? ""}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </div>
        {!isEdit && (
          <div>
            <label>Mật khẩu ban đầu *</label>
            <input
              type="password"
              value={form.password ?? ""}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Ít nhất 8 ký tự"
            />
          </div>
        )}
        {isEdit && (
          <div>
            <label>Số điện thoại</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Phòng ban</label>
            <select
              value={form.departmentId ?? ""}
              onChange={(e) => set("departmentId", e.target.value)}
            >
              <option value="">— Không —</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Role</label>
            <select
              value={form.roleId ?? ""}
              onChange={(e) => set("roleId", e.target.value)}
            >
              <option value="">{isEdit ? "— Giữ nguyên —" : "EMPLOYEE (mặc định)"}</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Chức vụ</label>
          <input
            value={form.position ?? ""}
            onChange={(e) => set("position", e.target.value)}
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
