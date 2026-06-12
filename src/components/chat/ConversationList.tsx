"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import type { Conversation } from "@/lib/types";
import NewChatModal from "./NewChatModal";

const TYPE_LABELS: Record<string, string> = {
  direct: "Cá nhân",
  group: "Nhóm",
  department: "Phòng ban",
};

export default function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string, conversation?: Conversation) => void;
}) {
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      return (await api<Conversation[]>(`/conversations?${params}`)).data;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Chat</h2>
          <button
            className="btn-primary px-2 py-1 text-xs"
            onClick={() => setNewChatOpen(true)}
          >
            + Mới
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm hội thoại…"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-sm text-gray-400">Đang tải…</p>
        ) : (conversations ?? []).length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Chưa có hội thoại nào.</p>
        ) : (
          (conversations ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id, c)}
              className={`block w-full border-b border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50 ${
                selectedId === c.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {c.name ?? "Hội thoại"}
                </span>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {c.unreadCount > 99 ? "99+" : c.unreadCount}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-gray-500">
                  {c.lastMessage
                    ? c.lastMessage.messageType === "file"
                      ? "📎 Tệp đính kèm"
                      : (c.lastMessage.body ?? "")
                    : TYPE_LABELS[c.type]}
                </span>
                {c.lastMessage && (
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatTime(c.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {c.type === "direct" && c.memberStatus && (
                <div className="mt-1">
                  <StatusBadge
                    code={c.memberStatus.statusCode}
                    label={c.memberStatus.statusLabel}
                  />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(id) => {
          setNewChatOpen(false);
          onSelect(id);
        }}
      />
    </div>
  );
}
