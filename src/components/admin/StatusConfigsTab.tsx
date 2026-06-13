"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import Skeleton from "@/components/Skeleton";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { StatusConfig } from "@/lib/types";

export default function StatusConfigsTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["status-configs"],
    queryFn: async () => (await api<StatusConfig[]>("/admin/status-configs")).data,
  });

  async function toggleActive(c: StatusConfig) {
    try {
      await api(`/admin/status-configs/${c.code}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      queryClient.invalidateQueries({ queryKey: ["status-configs"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không cập nhật được");
    }
  }

  async function create() {
    setError(null);
    if (!form.code || !form.label) {
      setError("Vui lòng nhập code (UPPER_SNAKE_CASE) và nhãn");
      return;
    }
    setSubmitting(true);
    try {
      await api("/admin/status-configs", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          label: form.label,
          color: form.color || undefined,
        }),
      });
      toast.success("Đã tạo trạng thái custom");
      setCreateOpen(false);
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["status-configs"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Trạng thái custom
        </button>
      </div>
      {isLoading ? (
        <Skeleton rows={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nhãn</th>
                <th className="px-4 py-3">Màu</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(configs ?? []).map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3">{c.label}</td>
                  <td className="px-4 py-3 text-xs">{c.color ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {c.isSystem ? "Hệ thống" : "Custom"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={c.isActive}
                      disabled={c.isSystem}
                      onChange={() => toggleActive(c)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Tạo trạng thái custom" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <div>
            <label>Code * (UPPER_SNAKE_CASE)</label>
            <input
              value={form.code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="BUSINESS_TRIP"
            />
          </div>
          <div>
            <label>Nhãn *</label>
            <input
              value={form.label ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Đi công tác"
            />
          </div>
          <div>
            <label>Màu</label>
            <input
              value={form.color ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="teal"
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button className="btn-primary" onClick={create} disabled={submitting}>
              Tạo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
