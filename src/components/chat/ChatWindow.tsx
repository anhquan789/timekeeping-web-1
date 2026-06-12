"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, authFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast";
import { createConversationSocket } from "@/lib/ws";
import type { Conversation, ConversationDetail, Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

const PAUSED_WARNING: Record<string, string> = {
  MEETING: "đang họp",
  BREAK: "đang nghỉ giải lao",
  LUNCH: "đang ăn trưa",
  OUTING: "đang ra ngoài",
};

export default function ChatWindow({
  conversationId,
  meta,
}: {
  conversationId: string;
  meta: Conversation | null;
}) {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<ReturnType<typeof createConversationSocket> | null>(null);
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: detail } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () =>
      (await api<ConversationDetail>(`/conversations/${conversationId}`)).data,
  });

  const sortAsc = (list: Message[]) =>
    [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api<Message[]>(
        `/conversations/${conversationId}/messages?limit=50`
      );
      setMessages(sortAsc(result.data));
      setHasMore(result.data.length >= 50);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Không tải được tin nhắn");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Reset + load when switching conversations.
  useEffect(() => {
    setMessages([]);
    setInput("");
    setTypingUsers({});
    loadInitial();
  }, [conversationId, loadInitial]);

  const markRead = useCallback(
    (list: Message[]) => {
      const newest = list[list.length - 1];
      if (!newest) return;
      api(`/messages/${newest.id}/read`, { method: "POST" })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ["conversations"] })
        )
        .catch(() => undefined);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markRead(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversationId]);

  // WebSocket: chat events for this conversation.
  useEffect(() => {
    if (!accessToken) return;
    const socket = createConversationSocket(accessToken, conversationId, (event) => {
      const kind = event["event"] as string;
      if (kind === "chat.message.created") {
        const payload = event["message"] as Record<string, unknown>;
        const incoming: Message = {
          id: String(payload["id"]),
          conversationId,
          senderId: String(payload["senderId"]),
          senderName: String(payload["senderName"] ?? ""),
          messageType: String(payload["messageType"] ?? "text"),
          body: (payload["body"] as string | null) ?? null,
          replyToMessageId: null,
          file: null,
          isUrgent: Boolean(payload["isUrgent"]),
          isDeleted: false,
          editedAt: null,
          reactions: [],
          createdAt: String(payload["createdAt"]),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const next = sortAsc([...prev, incoming]);
          if (incoming.senderId !== me?.id) markRead(next);
          return next;
        });
        // file message payload không đủ chi tiết -> đồng bộ lại
        if (payload["fileId"]) loadInitial();
      } else if (kind === "chat.message.updated") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event["messageId"]
              ? { ...m, body: String(event["body"] ?? ""), editedAt: new Date().toISOString() }
              : m
          )
        );
      } else if (kind === "chat.message.deleted") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event["messageId"] ? { ...m, isDeleted: true, body: null } : m
          )
        );
      } else if (kind === "chat.reaction.added") {
        loadInitial();
      } else if (kind === "chat.typing.started" || kind === "chat.typing.stopped") {
        const userId = String(event["userId"]);
        if (userId === me?.id) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (kind === "chat.typing.started") next[userId] = Date.now();
          else delete next[userId];
          return next;
        });
      }
    });
    socketRef.current = socket;
    return () => {
      socketRef.current = null;
      socket.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, conversationId]);

  // Auto-scroll xuống cuối khi có tin mới.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  // Dọn typing indicator cũ.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const cutoff = Date.now() - 5000;
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, ts]) => ts > cutoff)
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  function handleInputChange(value: string) {
    setInput(value);
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      socketRef.current?.sendTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      socketRef.current?.sendTyping(false);
    }, 2000);
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    try {
      const result = await api<Message[]>(
        `/conversations/${conversationId}/messages?limit=50&before=${oldest.id}`
      );
      setMessages((prev) => sortAsc([...result.data, ...prev]));
      setHasMore(result.data.length >= 50);
    } catch {
      toast.error("Không tải được tin cũ hơn");
    }
  }

  async function send() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const result = await api<Message>(
        `/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ messageType: "text", body, isUrgent: urgent }),
        }
      );
      setMessages((prev) =>
        prev.some((m) => m.id === result.data.id)
          ? prev
          : sortAsc([...prev, result.data])
      );
      setInput("");
      setUrgent(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi tin thất bại");
    } finally {
      setSending(false);
    }
  }

  async function attachFile(file: File) {
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await authFetch("/files/upload", {
        method: "POST",
        body: form,
      });
      const uploadBody = await uploadRes.json();
      if (!uploadRes.ok || uploadBody?.success === false) {
        throw new ApiError(
          uploadBody?.error?.code ?? "ERROR",
          uploadBody?.error?.message ?? "Upload thất bại",
          uploadRes.status
        );
      }
      const result = await api<Message>(
        `/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            messageType: "file",
            body: file.name,
            fileId: uploadBody.data.id,
          }),
        }
      );
      setMessages((prev) => sortAsc([...prev, result.data]));
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã gửi tệp");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi tệp thất bại");
    } finally {
      setSending(false);
    }
  }

  function patchMessage(updated: Message) {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  const title =
    detail?.type === "direct"
      ? (meta?.name ?? detail?.name ?? "Hội thoại")
      : (detail?.name ?? meta?.name ?? "Hội thoại");

  const directWarning =
    meta?.type === "direct" && meta.memberStatus
      ? PAUSED_WARNING[meta.memberStatus.statusCode] ??
        (meta.memberStatus.contactAvailability === "UNAVAILABLE"
          ? "không liên hệ được"
          : null)
      : null;

  const typingNames = Object.keys(typingUsers)
    .map(
      (id) => detail?.members.find((m) => m.userId === id)?.fullName ?? "Ai đó"
    )
    .join(", ");

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-gray-500">
              {detail ? `${detail.members.length} thành viên` : ""}
            </p>
          </div>
        </div>
        {directWarning && (
          <p className="mt-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
            Người nhận {directWarning} — tin nhắn vẫn được gửi nhưng có thể chưa xem ngay.
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải…</p>
        ) : loadError ? (
          <p className="py-8 text-center text-sm text-red-600">
            {loadError}{" "}
            <button className="underline" onClick={loadInitial}>
              Thử lại
            </button>
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Chưa có tin nhắn — hãy gửi lời chào đầu tiên!
          </p>
        ) : (
          <div className="space-y-2">
            {hasMore && (
              <button
                onClick={loadOlder}
                className="mx-auto block text-xs text-blue-600 underline"
              >
                Tải tin cũ hơn
              </button>
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.senderId === me?.id}
                onPatched={patchMessage}
                onReload={loadInitial}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      <div className="h-5 px-4 text-xs italic text-gray-400">
        {typingNames && `${typingNames} đang nhập…`}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-3">
        <div className="flex items-end gap-2">
          <button
            className="btn-secondary px-3"
            title="Đính kèm tệp"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) attachFile(f);
              e.target.value = "";
            }}
          />
          <textarea
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nhập tin nhắn… (Enter để gửi)"
            className="flex-1 resize-none"
          />
          <label className="flex items-center gap-1 pb-2 text-xs text-gray-500">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Khẩn
          </label>
          <button className="btn-primary" onClick={send} disabled={sending || !input.trim()}>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
