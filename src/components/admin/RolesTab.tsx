"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Permission, Role } from "@/lib/types";

export default function RolesTab() {
  const [editing, setEditing] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api<Role[]>("/roles")).data,
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton rows={4} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Quyền</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(roles ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-3">
                    {r.name}
                    {r.isSystem && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">
                        hệ thống
                      </span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-gray-500">
                    {r.permissionCodes.length === 0
                      ? "—"
                      : r.permissionCodes.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={() => setEditing(r)}
                    >
                      Sửa quyền
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PermissionsModal role={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function PermissionsModal({
  role,
  onClose,
}: {
  role: Role | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api<Permission[]>("/permissions")).data,
    enabled: role !== null,
  });

  if (role && initializedFor !== role.id) {
    setInitializedFor(role.id);
    setSelected(role.permissionCodes);
  }
  if (!role && initializedFor !== null) {
    setInitializedFor(null);
  }

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function save() {
    if (!role) return;
    if (selected.length === 0) {
      toast.error("Role cần ít nhất một quyền (backend yêu cầu danh sách không rỗng)");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/roles/${role.id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissionCodes: selected }),
      });
      toast.success("Đã cập nhật quyền — user nhận quyền mới sau khi đăng nhập lại");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={role ? `Quyền của ${role.code}` : ""}
      open={role !== null}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {(permissions ?? []).map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-start gap-2 border-b border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={selected.includes(p.code)}
                onChange={() => toggle(p.code)}
              />
              <span>
                <span className="font-mono text-xs">{p.code}</span>
                <span className="block text-xs text-gray-500">{p.name}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={save} disabled={submitting}>
            {submitting ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
