import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/http/errors.js";
import { getCurrentUser, mergeProfilePatch, updateCurrentUser } from "../src/modules/users/users.service.js";

function result<T>(rows: T[]) {
  return { rows, rowCount: rows.length };
}

describe("users service", () => {
  it("returns onboarding_step with the current user profile", async () => {
    const query = vi.fn(async () => result([{ id: "user-1", email: "user@example.com", onboarding_step: "languages" }]));

    const user = await getCurrentUser("user-1", { query });

    expect(user?.onboarding_step).toBe("languages");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("u.onboarding_step"), ["user-1"]);
  });

  it("updates onboarding_step on the user record", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(result([{ id: "user-1", onboarding_step: "photo" }]))
      .mockResolvedValueOnce(result([{ id: "user-1", email: "user@example.com", onboarding_step: "photo" }]));

    const user = await updateCurrentUser("user-1", { onboarding_step: "photo" }, { query });

    expect(user?.onboarding_step).toBe("photo");
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("UPDATE users"), ["photo", "user-1"]);
  });

  it("does not invent static profile values when patching a missing profile", () => {
    expect(() => mergeProfilePatch({ name: "Sam" }, {})).toThrow(HttpError);
    expect(() => mergeProfilePatch({ name: "Sam" }, {})).toThrow("Profile requires age, city, goal, languages");
  });

  it("merges a profile patch with existing values without replacing them with defaults", () => {
    const merged = mergeProfilePatch(
      { bio: "Updated" },
      { name: "Sam", age: 28, city: "Berlin", goal: "friends", languages: ["English"], interests: ["music"] }
    );

    expect(merged).toMatchObject({
      name: "Sam",
      age: 28,
      city: "Berlin",
      goal: "friends",
      languages: ["English"],
      bio: "Updated"
    });
  });
});
