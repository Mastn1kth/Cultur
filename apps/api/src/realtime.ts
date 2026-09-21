import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { query } from "./db/pool.js";
import { sendConversationMessage, type MessageType } from "./modules/chat/chat.service.js";
import { sendPushToUser } from "./modules/notifications/notifications.service.js";

const onlineUsers = new Map<string, number>();

export function isUserOnline(userId: string) {
  return (onlineUsers.get(userId) ?? 0) > 0;
}

function markOnline(userId: string) {
  onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
}

function markOffline(userId: string) {
  const next = (onlineUsers.get(userId) ?? 1) - 1;
  if (next <= 0) onlineUsers.delete(userId);
  else onlineUsers.set(userId, next);
}

export function attachRealtime(server: HttpServer) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET);
      socket.data.userId = String(payload.sub);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    markOnline(socket.data.userId);

    const joinConversation = (payload: string | { conversationId: string }) => {
      const conversationId = typeof payload === "string" ? payload : payload.conversationId;
      socket.join(`conversation:${conversationId}`);
    };
    socket.on("conversation:join", joinConversation);
    socket.on("join_conversation", joinConversation);

    socket.on("typing", (payload: string | { conversationId: string }) => {
      const conversationId = typeof payload === "string" ? payload : payload.conversationId;
      socket.to(`conversation:${conversationId}`).emit("typing", { conversationId, userId: socket.data.userId });
    });

    const sendMessage = async (
      payload: { conversationId: string; content: string; type?: MessageType },
      ack?: (response: { ok: boolean; message?: unknown; error?: string }) => void
    ) => {
      try {
        const result = await sendConversationMessage({
          conversationId: payload.conversationId,
          senderId: socket.data.userId,
          content: payload.content,
          type: payload.type
        });
        io.to(`conversation:${payload.conversationId}`).emit("message:new", result.message);
        io.to(`conversation:${payload.conversationId}`).emit("new_message", result.message);
        ack?.({ ok: true, message: result.message });
        if (!isUserOnline(result.recipientId)) {
          const sender = await query<{ name: string }>("SELECT name FROM profiles WHERE user_id=$1", [socket.data.userId]);
          await sendPushToUser(result.recipientId, "Новое сообщение", `${sender.rows[0]?.name ?? "CultureMatch"} написал(а) вам`, {
            type: "new_message",
            conversationId: payload.conversationId
          });
        }
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Message failed" });
      }
    };
    socket.on("message:send", sendMessage);
    socket.on("send_message", sendMessage);

    socket.on("disconnect", () => {
      markOffline(socket.data.userId);
    });
  });

  return io;
}
