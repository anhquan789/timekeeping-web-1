"use client";

import { Client } from "@stomp/stompjs";
import { API_URL } from "./api";

/**
 * Connects to a conversation topic for chat events and exposes typing publish.
 */
export function createConversationSocket(
  accessToken: string,
  conversationId: string,
  onEvent: (event: Record<string, unknown>) => void
): { cleanup: () => void; sendTyping: (typing: boolean) => void } {
  const brokerURL = API_URL.replace(/^http/, "ws") + "/ws";
  const client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 5000,
  });
  client.onConnect = () => {
    client.subscribe(`/topic/conversations/${conversationId}`, (message) => {
      try {
        onEvent(JSON.parse(message.body));
      } catch {
        // ignore malformed payloads
      }
    });
  };
  client.activate();
  return {
    cleanup: () => {
      void client.deactivate();
    },
    sendTyping: (typing: boolean) => {
      if (client.connected) {
        client.publish({
          destination: "/app/chat.typing",
          body: JSON.stringify({ conversationId, typing }),
        });
      }
    },
  };
}

/**
 * Subscribes to /topic/status (user.status.updated, user.status.overdue).
 * Returns a cleanup function.
 */
export function subscribeStatusEvents(
  accessToken: string,
  onEvent: (event: Record<string, unknown>) => void
): () => void {
  const brokerURL = API_URL.replace(/^http/, "ws") + "/ws";
  const client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 5000,
  });
  client.onConnect = () => {
    client.subscribe("/topic/status", (message) => {
      try {
        onEvent(JSON.parse(message.body));
      } catch {
        // ignore malformed payloads
      }
    });
  };
  client.activate();
  return () => {
    void client.deactivate();
  };
}
