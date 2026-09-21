import { describe, expect, it } from "vitest";
import { buildDiscoveryCandidateQuery } from "../src/modules/discovery/discovery.service.js";

const baseArgs = {
  userId: "user-1",
  latitude: 41.8781,
  longitude: -87.6298,
  radiusKm: 50,
  limit: 10
};

describe("discovery query builder", () => {
  it("excludes blocked users in either direction", () => {
    const query = buildDiscoveryCandidateQuery(baseArgs);

    expect(query.sql).toContain("FROM blocks");
    expect(query.sql).toContain("b.blocker_id=$1 AND b.blocked_id=p.user_id");
    expect(query.sql).toContain("b.blocker_id=p.user_id AND b.blocked_id=$1");
  });

  it("excludes hidden profiles", () => {
    const query = buildDiscoveryCandidateQuery(baseArgs);

    expect(query.sql).toContain("p.is_hidden=false");
  });

  it("excludes profiles the current user already swiped", () => {
    const query = buildDiscoveryCandidateQuery(baseArgs);

    expect(query.sql).toContain("FROM swipes");
    expect(query.sql).toContain("s.swiper_id=$1 AND s.swiped_id=p.user_id");
  });

  it("enforces radius filtering and caps it at 700 km", () => {
    const query = buildDiscoveryCandidateQuery({ ...baseArgs, radiusKm: 999 });

    expect(query.sql).toContain("ST_DWithin");
    expect(query.params).toContain(700);
  });
});
