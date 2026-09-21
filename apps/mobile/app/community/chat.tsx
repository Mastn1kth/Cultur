import { Body, Button, Card, Field, Row, Screen, ScreenHeader } from "@/components/ui";
import React from "react";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/client";

type CommunityMessage = {
  id: string;
  content: string;
  sender_id?: string | null;
  sender_name?: string | null;
  created_at?: string | null;
};

type MessagesResponse = {
  items: CommunityMessage[];
};

export default function CommunityChat() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const communityId = id ? String(id) : "";
  const [text, setText] = React.useState("");
  const [messages, setMessages] = React.useState<CommunityMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadMessages = React.useCallback(async () => {
    if (!communityId) {
      setLoading(false);
      setError("Community is missing");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get<MessagesResponse>(`/communities/${communityId}/messages`);
      setMessages(response.data.items);
    } catch {
      setError("Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    loadMessages().catch(() => undefined);
  }, [loadMessages]);

  async function sendMessage() {
    const content = text.trim();
    if (!content || !communityId) return;
    setText("");
    try {
      const response = await api.post<CommunityMessage>(`/communities/${communityId}/messages`, { content });
      setMessages((current) => [...current, response.data]);
    } catch {
      setError("Could not send message");
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Circle chat" subtitle="Messages from this small circle." />
      {loading ? <Card><Body muted>Loading messages...</Body></Card> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadMessages}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && messages.length === 0 ? <Card><Body muted>No messages yet</Body></Card> : null}
      {messages.map((message) => (
        <Card key={message.id} tone="soft">
          <Row>
            <Body muted>{message.sender_name ?? "Member"}</Body>
            {message.created_at ? <Body muted>{new Date(message.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Body> : null}
          </Row>
          <Body>{message.content}</Body>
        </Card>
      ))}
      <Field placeholder="Message" value={text} onChangeText={setText} />
      <Button onPress={sendMessage}>Send</Button>
    </Screen>
  );
}
