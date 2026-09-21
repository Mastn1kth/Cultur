import React from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { io, type Socket } from "socket.io-client";
import { Body, Button, Card, Field, H1, Screen } from "@/components/ui";
import { colors, radii } from "@/theme";
import { API_URL, api, getAccessToken } from "@/lib/client";

type ChatMessage = {
  id: string;
  content: string;
  sender_id?: string;
  status?: "pending" | "sending" | "sent" | "failed";
};

type QueueItem = {
  conversationId: string;
  content: string;
  tempId: string;
};

const queueKey = "message_queue";

async function readQueue() {
  const raw = await AsyncStorage.getItem(queueKey);
  return raw ? JSON.parse(raw) as QueueItem[] : [];
}

async function writeQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(queueKey, JSON.stringify(items));
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id);
  const [text, setText] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [icebreakers, setIcebreakers] = React.useState<string[]>([]);
  const [typing, setTyping] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const applyServerMessage = React.useCallback((message: ChatMessage) => {
    setMessages((current) => current.some((item) => item.id === message.id) ? current : [{ ...message, status: "sent" }, ...current]);
  }, []);

  const sendQueuedItem = React.useCallback((socket: Socket, item: QueueItem) => {
    socket.emit("send_message", { conversationId: item.conversationId, content: item.content }, async (ack: { ok: boolean; message?: ChatMessage; error?: string }) => {
      if (ack.ok && ack.message) {
        setMessages((current) => current.map((message) => message.id === item.tempId ? { ...ack.message!, status: "sent" } : message));
        const queue = await readQueue();
        await writeQueue(queue.filter((queued) => queued.tempId !== item.tempId));
      } else {
        setMessages((current) => current.map((message) => message.id === item.tempId ? { ...message, status: "failed" } : message));
      }
    });
  }, []);

  const flushQueue = React.useCallback(async (socket: Socket) => {
    const queue = await readQueue();
    for (const item of queue.filter((queued) => queued.conversationId === conversationId)) {
      sendQueuedItem(socket, item);
    }
  }, [conversationId, sendQueuedItem]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const history = await api.get<{ items: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`);
      const icebreakerResponse = await api.get<{ items: Array<{ question: string }> }>("/chat/icebreakers", { params: { conversationId } });
      if (!mounted) return;
      setMessages([...history.data.items].reverse().map((message) => ({ ...message, status: "sent" })));
      setIcebreakers(icebreakerResponse.data.items.map((item) => item.question));
    })().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const accessToken = await getAccessToken();
      if (!accessToken || !active) return;
      const socket = io(API_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
        reconnection: true
      });
      socketRef.current = socket;
      socket.on("connect", () => {
        socket.emit("join_conversation", { conversationId });
        flushQueue(socket).catch(() => undefined);
      });
      socket.on("new_message", applyServerMessage);
      socket.on("message:new", applyServerMessage);
      socket.on("typing", ({ userId }: { userId: string }) => {
        setTyping(userId);
        setTimeout(() => setTyping(null), 2500);
      });
    })();
    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [applyServerMessage, conversationId, flushQueue]);

  async function sendMessage() {
    const content = text.trim();
    if (!content) return;
    setText("");
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((current) => [{ id: tempId, content, status: socketRef.current?.connected ? "sending" : "pending" }, ...current]);

    const socket = socketRef.current;
    if (!socket?.connected) {
      const queue = await readQueue();
      await writeQueue([...queue, { conversationId, content, tempId }]);
      return;
    }
    sendQueuedItem(socket, { conversationId, content, tempId });
  }

  return (
    <Screen>
      <H1>Chat</H1>
      <Card>
        <Body muted>Cultural Icebreakers</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {icebreakers.map((question) => (
            <Pressable key={question} onPress={() => setText(question)} style={{ borderRadius: radii.chip, backgroundColor: "#EEF0F6", paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{question}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {typing ? <Body muted>Typing...</Body> : null}
      {messages.map((message) => (
        <View key={message.id} style={{ alignItems: message.sender_id ? "flex-start" : "flex-end" }}>
          <View style={{ maxWidth: "82%" }}>
            <Card>
              <Body>{message.content}</Body>
              {message.status ? <Body muted>{message.status === "pending" ? "pending" : message.status === "failed" ? "failed" : "sent"}</Body> : null}
            </Card>
          </View>
        </View>
      ))}
      <Field placeholder="Message" value={text} onChangeText={setText} />
      <Button onPress={sendMessage}>Send</Button>
      <Button variant="ghost">Report / Block</Button>
    </Screen>
  );
}
