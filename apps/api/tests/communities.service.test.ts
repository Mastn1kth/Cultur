import { describe, expect, it, vi } from "vitest";
import { getCommunityDetail, leaveCommunity, listCommunityMessages } from "../src/modules/communities/communities.service.js";

function result<T>(rows: T[]) {
  return { rows, rowCount: rows.length };
}

describe("communities service", () => {
  it("loads community detail with member count and current membership", async () => {
    const query = vi.fn(async () => result([{ id: "community-1", members_count: 4, is_member: true, my_role: "member" }]));

    const community = await getCommunityDetail("community-1", "user-1", { query });

    expect(community?.is_member).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("members_count"), ["community-1", "user-1"]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("is_member"), ["community-1", "user-1"]);
  });

  it("removes the current user from a community", async () => {
    const query = vi.fn(async () => result([]));

    await leaveCommunity("community-1", "user-1", { query });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM community_members"), ["community-1", "user-1"]);
  });

  it("loads community messages with sender profile fields", async () => {
    const query = vi.fn(async () => result([{ id: "message-1", content: "hello", sender_name: "Sam" }]));

    const messages = await listCommunityMessages("community-1", undefined, 20, { query });

    expect(messages.rows[0]).toMatchObject({ sender_name: "Sam" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("sender_name"), ["community-1"]);
  });
});
