import { describe, expect, it } from "vitest";
import { calculateCompatibility } from "../src/modules/discovery/compatibility.js";

describe("calculateCompatibility", () => {
  it("scores shared cultural signals and returns readable reasons", () => {
    const result = calculateCompatibility(
      {
        city: "Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
        goal: "friends",
        languages: ["Russian", "English"],
        cultures: ["Uzbek"],
        interests: ["martial arts", "cooking", "music"],
        religion: "Muslim",
        religion_visibility: "public",
        university: "UIUC"
      },
      {
        city: "Chicago",
        latitude: 41.88,
        longitude: -87.63,
        goal: "friends",
        languages: ["Russian", "Turkish"],
        cultures: ["Uzbek", "Tatar"],
        interests: ["martial arts", "books"],
        religion: "Muslim",
        religion_visibility: "public",
        university: "UIUC"
      }
    );

    expect(result.score).toBe(92);
    expect(result.reasons).toContain("You both speak Russian");
    expect(result.reasons).toContain("Both looking for friends");
    expect(result.reasons).toContain("Same university");
    expect(result.reasons).toContain("Both interested in martial arts");
    expect(result.reasons).toContain("Similar cultural background");
  });

  it("does not award private-value points unless both users provided matching values", () => {
    const result = calculateCompatibility(
      {
        city: "New York",
        latitude: 40.7128,
        longitude: -74.006,
        goal: "dating",
        languages: ["Spanish"],
        cultures: [],
        interests: [],
        religion: "Catholic"
      },
      {
        city: "Boston",
        latitude: 42.3601,
        longitude: -71.0589,
        goal: "friends",
        languages: ["Arabic"],
        cultures: [],
        interests: []
      }
    );

    expect(result.breakdown.values).toBe(0);
    expect(result.score).toBeLessThan(20);
  });

  it("awards at least 25 points for one shared language", () => {
    const result = calculateCompatibility({ languages: ["Spanish"] }, { languages: ["Spanish"] });

    expect(result.breakdown.languages).toBe(25);
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it("adds 15 points for the same non-all goal", () => {
    const result = calculateCompatibility({ goal: "events" }, { goal: "events" });

    expect(result.breakdown.goal).toBe(15);
  });

  it("adds 15 points for zero distance", () => {
    const result = calculateCompatibility(
      { latitude: 41.8781, longitude: -87.6298 },
      { latitude: 41.8781, longitude: -87.6298 }
    );

    expect(result.breakdown.distance).toBe(15);
  });

  it("adds zero distance points for roughly 700 km apart", () => {
    const result = calculateCompatibility(
      { latitude: 41.8781, longitude: -87.6298 },
      { latitude: 35.4676, longitude: -97.5164 }
    );

    expect(result.breakdown.distance).toBe(0);
  });

  it("adds 10 points for matching public religion", () => {
    const result = calculateCompatibility(
      { religion: "Muslim", religion_visibility: "public" },
      { religion: "muslim", religion_visibility: "public" }
    );

    expect(result.breakdown.values).toBe(10);
  });

  it("does not count matching religion when either side keeps it private", () => {
    const result = calculateCompatibility(
      { religion: "Muslim", religion_visibility: "private" },
      { religion: "muslim", religion_visibility: "public" }
    );

    expect(result.breakdown.values).toBe(0);
  });
});
