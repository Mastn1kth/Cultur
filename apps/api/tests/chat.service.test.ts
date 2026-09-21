import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/http/errors.js";
import { listConversations, sendConversationMessage } from "../src/modules/chat/chat.service.js";

function result<T>(rows: T[]) {
  return { rows, rowCount: rows.length };
}

describe("chat service", () => {
  it("loads conversations with peer profile, latest message, and unread count", async () => {
    const query = vi.fn(async () => result([{ id: "conversation-1", peer_name: "Amina", last_message_content: "hello", unread_count: 2 }]));

    const conversations = await listConversations("user-1", undefined, 10, { query });

    expect(conversations.rows).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LEFT JOIN LATERAL"), ["user-1"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("unread_count"), ["user-1"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("last_message_content"), ["user-1"]);
  });

  it("rejects sending a message when the sender is not in the matched conversation", async () => {
    const query = vi.fn(async () => result([]));

    await expect(sendConversationMessage({
      conversationId: "conversation-1",
      senderId: "outsider",
      content: "hello",
      type: "text"
    }, { query })).rejects.toMatchObject(new HttpError(403, "Conversation unavailable"));
  });

  it("rejects sending a message when either participant blocked the other", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM conversations")) {
        return result([{ user1_id: "sender", user2_id: "recipient" }]);
      }
      if (sql.includes("FROM blocks")) {
        return result([{ id: "block-1" }]);
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(sendConversationMessage({
      conversationId: "conversation-1",
      senderId: "sender",
      content: "hello",
      type: "text"
    }, { query })).rejects.toMatchObject(new HttpError(403, "Conversation blocked"));
  });
});
