import { query as defaultQuery } from "../../db/pool.js";

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type EventsServiceDeps = {
  query?: DbQuery;
};

export type AttendanceStatus = "going" | "maybe";
export type EventDetail = {
  id: string;
  attendees_count: number;
  my_status: AttendanceStatus | null;
} & Record<string, unknown>;

function db(deps?: EventsServiceDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

export async function getEventDetail(eventId: string, userId: string, deps?: EventsServiceDeps) {
  const result = await db(deps)(
    `SELECT
       e.*,
       COUNT(a.id)::int AS attendees_count,
       mine.status AS my_status
     FROM events e
     LEFT JOIN event_attendees a ON a.event_id=e.id AND a.status='going'
     LEFT JOIN event_attendees mine ON mine.event_id=e.id AND mine.user_id=$2
     WHERE e.id=$1
     GROUP BY e.id, mine.status
     LIMIT 1`,
    [eventId, userId]
  ) as DbResult<EventDetail>;
  return result.rows[0] ?? null;
}

export async function setEventAttendance(eventId: string, userId: string, status: AttendanceStatus, deps?: EventsServiceDeps) {
  await db(deps)(
    "INSERT INTO event_attendees(event_id,user_id,status) VALUES($1,$2,$3) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status, joined_at=now()",
    [eventId, userId, status]
  );
}
