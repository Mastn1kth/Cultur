import { describe, expect, it, vi } from "vitest";
import { getEventDetail, setEventAttendance } from "../src/modules/events/events.service.js";

function result<T>(rows: T[]) {
  return { rows, rowCount: rows.length };
}

describe("events service", () => {
  it("loads event detail with attendees count and the current user's status", async () => {
    const query = vi.fn(async () => result([{ id: "event-1", attendees_count: 3, my_status: "going" }]));

    const event = await getEventDetail("event-1", "user-1", { query });

    expect(event?.my_status).toBe("going");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("attendees_count"), ["event-1", "user-1"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("my_status"), ["event-1", "user-1"]);
  });

  it("upserts the current user's event attendance status", async () => {
    const query = vi.fn(async () => result([]));

    await setEventAttendance("event-1", "user-1", "maybe", { query });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(event_id,user_id)"), ["event-1", "user-1", "maybe"]);
  });
});
