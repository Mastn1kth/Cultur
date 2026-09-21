import React from "react";
import { Link } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader } from "@/components/ui";
import { api } from "@/lib/client";

type ConversationItem = {
  id: string;
  peer_id?: string | null;
  peer_name?: string | null;
  last_message_content?: string | null;
  last_message_created_at?: string | null;
  unread_count?: number;
};

type ConversationsResponse = {
  items: ConversationItem[];
};

export default function ChatListScreen() {
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadConversations = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ConversationsResponse>("/chat/conversations");
      setConversations(response.data.items);
    } catch {
      setError("Could not load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadConversations().catch(() => undefined);
  }, [loadConversations]);

  return (
    <Screen>
      <ScreenHeader title="Chats" subtitle="Recent matches and conversations." />
      {loading ? <EmptyState title="Loading chats..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadConversations}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && conversations.length === 0 ? <EmptyState title="No chats yet" /> : null}
      {conversations.map((conversation) => (
        <Link key={conversation.id} href={`/chat/${conversation.id}`} asChild>
          <Card>
            <Row>
              <Body strong>{conversation.peer_name ?? conversation.peer_id ?? conversation.id}</Body>
              {conversation.unread_count ? <Chip label={`${conversation.unread_count} unread`} tone="secondary" /> : <Chip label="open" tone="neutral" />}
            </Row>
            {conversation.last_message_content ? <Body muted>{conversation.last_message_content}</Body> : null}
          </Card>
        </Link>
      ))}
    </Screen>
  );
}
