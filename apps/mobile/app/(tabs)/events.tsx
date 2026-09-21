import React from "react";
import { Link } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type EventItem = {
  id: string;
  title: string;
  city: string;
  starts_at?: string | null;
  languages?: string[];
  cultures?: string[];
  interests?: string[];
  attendees_count?: number;
};

type EventsResponse = {
  items: EventItem[];
};

function eventTags(event: EventItem) {
  return [...(event.languages ?? []), ...(event.cultures ?? []), ...(event.interests ?? [])].slice(0, 5);
}

function formatEventDate(value?: string | null) {
  if (!value) return "Date TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function EventsListScreen() {
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<EventsResponse>("/events");
      setEvents(response.data.items);
    } catch {
      setError("Could not load events");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEvents().catch(() => undefined);
  }, [loadEvents]);

  return (
    <Screen>
      <ScreenHeader title="Events" subtitle="Local gatherings matched to profile signals." />
      {loading ? <EmptyState title="Loading events..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadEvents}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && events.length === 0 ? <EmptyState title="No events yet" /> : null}
      {events.map((event) => (
        <Link key={event.id} href={`/event/${event.id}`} asChild>
          <Card>
            <Row>
              <Body strong>{event.title}</Body>
              <Chip label={`${event.attendees_count ?? 0} going`} tone="success" />
            </Row>
            <Body muted>{event.city} - {formatEventDate(event.starts_at)}</Body>
            <TagRow tags={eventTags(event)} />
          </Card>
        </Link>
      ))}
    </Screen>
  );
}
