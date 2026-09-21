import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type AttendanceStatus = "going" | "maybe";

type EventDetail = {
  id: string;
  title: string;
  description?: string | null;
  city: string;
  starts_at?: string | null;
  ends_at?: string | null;
  languages?: string[] | null;
  cultures?: string[] | null;
  interests?: string[] | null;
  attendees_count?: number | null;
  max_attendees?: number | null;
  my_status?: AttendanceStatus | null;
};

function eventTags(event: EventDetail) {
  return [...(event.languages ?? []), ...(event.cultures ?? []), ...(event.interests ?? [])].slice(0, 6);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = String(id);
  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadEvent = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<EventDetail | null>(`/events/${eventId}`);
      setEvent(response.data);
    } catch {
      setError("Could not load event");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    loadEvent().catch(() => undefined);
  }, [loadEvent]);

  async function setAttendance(status: AttendanceStatus) {
    setSaving(true);
    setError("");
    try {
      await api.post(`/events/${eventId}/attendees`, { status });
      await loadEvent();
    } catch {
      setError("Could not update attendance");
    } finally {
      setSaving(false);
    }
  }

  const startsAt = formatDate(event?.starts_at);
  const endsAt = formatDate(event?.ends_at);
  const tags = event ? eventTags(event) : [];

  return (
    <Screen>
      {loading ? <EmptyState title="Loading event..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadEvent}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && !event ? <EmptyState title="Event is not available" /> : null}
      {event ? (
        <>
          <ScreenHeader title={event.title} subtitle={event.city} />
          <Card tone="accent">
            <Row>
              <Chip label={`${event.attendees_count ?? 0}${event.max_attendees ? `/${event.max_attendees}` : ""} going`} tone="success" />
              {event.my_status ? <Chip label={event.my_status} tone="warning" /> : <Chip label="not joined" tone="neutral" />}
            </Row>
            {event.description ? <Body>{event.description}</Body> : null}
            <Body muted>{startsAt ? startsAt : "Date TBD"}{endsAt ? ` to ${endsAt}` : ""}</Body>
            {tags.length ? <TagRow tags={tags} /> : null}
          </Card>
          <Button onPress={() => setAttendance("going")} disabled={saving}>I'm going</Button>
          <Button variant="ghost" onPress={() => setAttendance("maybe")} disabled={saving}>Maybe</Button>
        </>
      ) : null}
    </Screen>
  );
}
