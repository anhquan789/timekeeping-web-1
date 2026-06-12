"use client";

import { useEffect, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import ConversationList from "@/components/chat/ConversationList";
import { api } from "@/lib/api";
import type { Conversation, ConversationDetail } from "@/lib/types";

export default function ChatPage() {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Hỗ trợ /chat?user=<id> từ trang Employees: mở (hoặc tạo) direct chat.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("user");
    if (!userId) return;
    api<ConversationDetail>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "direct", memberIds: [userId] }),
    })
      .then((result) => setSelectedId(result.data.id))
      .catch(() => undefined);
    // Xóa query param khỏi URL cho gọn.
    window.history.replaceState(null, "", "/chat");
  }, []);

  return (
    <div className="-m-4 flex h-[calc(100vh-57px)] md:-m-6">
      <ConversationList
        selectedId={selectedId}
        onSelect={(id, conversation) => {
          setSelectedId(id);
          setSelected(conversation ?? null);
        }}
      />
      {selectedId ? (
        <ChatWindow conversationId={selectedId} meta={selected} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          Chọn một hội thoại để bắt đầu
        </div>
      )}
    </div>
  );
}
