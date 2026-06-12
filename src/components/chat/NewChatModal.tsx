"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast";
import type { ConversationDetail, UserListItem } from "@/lib/types";

export default function NewChatModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["users-for-chat"],
    queryFn: async () =>
      (await api<UserListItem[]>("/users?limit=100")).data.filter(
        (u) => u.id !== me?.id
      ),
    enabled: open,
  });

  function toggle(userId: string) {
    setSelected((prev) =>
      mode === "direct"
        ? [userId]
        : prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
    );
  }

  async function create() {
    setError(null);
    if (selected.length === 0) {
      setError("Chọn ít nhất một người");
      return;
    }
    if (mode === "group" && !groupName.trim()) {
      setError("Nhóm cần có tên");
      return;
    }
    setSubmitting(true);
    try {
      const body =
        mode === "direct"
          ? { type: "direct", memberIds: selected }
          : { type: "group", name: groupName.trim(), memberIds: selected };
      const result = await api<ConversationDetail>("/conversations", {
        method: "POST",
        body: JSON.stringify(body),
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã mở hội thoại");
      setSelected([]);
      setGroupName("");
      onCreated(result.data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Hội thoại mới" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            className={mode === "direct" ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setMode("direct");
              setSelected((s) => s.slice(0, 1));
            }}
          >
            Cá nhân
          </button>
          <button
            className={mode === "group" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("group")}
          >
            Nhóm
          </button>
        </div>
        {mode === "group" && (
          <div>
            <label>Tên nhóm *</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Project ABC"
            />
          </div>
        )}
        <div className="max-h-56 overflow-y-auto rounded-md border">
          {(users ?? []).map((u) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type={mode === "direct" ? "radio" : "checkbox"}
                name="chat-user"
                className="h-4 w-4"
                checked={selected.includes(u.id)}
                onChange={() => toggle(u.id)}
              />
              <span className="font-medium">{u.fullName}</span>
              <span className="text-xs text-gray-400">
                {u.department?.name ?? ""}
              </span>
            </label>
          ))}
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={create} disabled={submitting}>
            {submitting ? "Đang tạo…" : "Tạo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
