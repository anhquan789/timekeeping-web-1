"use client";

import { useState } from "react";
import { api, ApiError, authFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { Message } from "@/lib/types";

const QUICK_REACTIONS = ["👍", "❤️", "😂"];

export default function MessageBubble({
  message,
  isOwn,
  onPatched,
  onReload,
}: {
  message: Message;
  isOwn: boolean;
  onPatched: (m: Message) => void;
  onReload: () => void;
}) {
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  async function saveEdit() {
    try {
      const result = await api<Message>(`/messages/${message.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: editText }),
      });
      onPatched(result.data);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không sửa được tin nhắn");
    }
  }

  async function recall() {
    if (!window.confirm("Thu hồi tin nhắn này với mọi người?")) return;
    try {
      await api(`/messages/${message.id}?mode=recall`, { method: "DELETE" });
      onPatched({ ...message, isDeleted: true, body: null });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không thu hồi được");
    }
  }

  async function toggleReaction(emoji: string) {
    const mine = message.reactions.find(
      (r) => r.userId === me?.id && r.reaction === emoji
    );
    try {
      if (mine) {
        await api(`/messages/${message.id}/reactions/${mine.id}`, {
          method: "DELETE",
        });
      } else {
        await api(`/messages/${message.id}/reactions`, {
          method: "POST",
          body: JSON.stringify({ reaction: emoji }),
        });
      }
      onReload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lỗi reaction");
    }
  }

  async function downloadFile() {
    if (!message.file) return;
    try {
      const res = await authFetch(message.file.url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = message.file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không tải được tệp");
    }
  }

  // Gom reaction theo emoji.
  const reactionGroups = message.reactions.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.reaction] = (acc[r.reaction] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className={`group flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isOwn ? "text-right" : "text-left"}`}>
        {!isOwn && (
          <div className="mb-0.5 text-xs font-medium text-gray-500">
            {message.senderName}
          </div>
        )}
        <div
          className={`inline-block rounded-2xl px-3 py-2 text-sm ${
            message.isDeleted
              ? "border border-dashed border-gray-300 text-gray-400"
              : isOwn
                ? "bg-blue-600 text-white"
                : "bg-white shadow-sm"
          } ${message.isUrgent && !message.isDeleted ? "ring-2 ring-red-400" : ""}`}
        >
          {message.isDeleted ? (
            <em>Tin nhắn đã được thu hồi</em>
          ) : editing ? (
            <span className="flex items-center gap-2">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-w-48 text-gray-900"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <button onClick={saveEdit} className="text-xs underline">
                Lưu
              </button>
            </span>
          ) : message.messageType === "file" && message.file ? (
            <button onClick={downloadFile} className="underline">
              📎 {message.file.originalName} (
              {Math.ceil(message.file.fileSize / 1024)} KB)
            </button>
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.body}</span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
          <span>{formatTime(message.createdAt)}</span>
          {message.editedAt && !message.isDeleted && <span>(đã sửa)</span>}
          {message.isUrgent && <span className="text-red-500">khẩn</span>}
          {!message.isDeleted && (
            <span className="hidden gap-1 group-hover:inline-flex">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="hover:scale-110"
                  title="Reaction"
                >
                  {emoji}
                </button>
              ))}
              {isOwn && message.messageType === "text" && (
                <>
                  <button
                    className="underline"
                    onClick={() => {
                      setEditText(message.body ?? "");
                      setEditing(true);
                    }}
                  >
                    Sửa
                  </button>
                  <button className="underline" onClick={recall}>
                    Thu hồi
                  </button>
                </>
              )}
            </span>
          )}
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className={`mt-0.5 flex gap-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="rounded-full border border-gray-200 bg-white px-1.5 text-xs"
              >
                {emoji} {count > 1 ? count : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
