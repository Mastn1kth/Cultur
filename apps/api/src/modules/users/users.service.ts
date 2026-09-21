import { query as defaultQuery } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type UsersServiceDeps = {
  query?: DbQuery;
};

export const onboardingStepValues = ["welcome", "city", "languages", "culture", "interests", "photo", "complete"] as const;
export type OnboardingStep = typeof onboardingStepValues[number];

export type ProfilePatch = {
  name?: string;
  age?: number;
  bio?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  goal?: "friends" | "dating" | "events" | "community" | "all";
  languages?: string[];
  cultures?: string[];
  interests?: string[];
  religion?: string;
  religion_visibility?: "public" | "matches" | "private" | "matching_only";
  sexuality?: string;
  sexuality_visibility?: "public" | "matches" | "private" | "matching_only";
  ethnicity?: string;
  ethnicity_visibility?: "public" | "matches" | "private" | "matching_only";
  politics?: string;
  politics_visibility?: "public" | "matches" | "private" | "matching_only";
  family_values?: string;
  i_can_teach?: string;
  i_miss_from_home?: string;
  favorite_tradition?: string;
  looking_for?: string;
  university?: string;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  onboarding_step: OnboardingStep;
} & Record<string, unknown>;

type CompleteProfilePatch = ProfilePatch & {
  name: string;
  age: number;
  city: string;
  goal: "friends" | "dating" | "events" | "community" | "all";
  languages: string[];
};

function db(deps?: UsersServiceDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

export async function getCurrentUser(userId: string, deps?: UsersServiceDeps) {
  const result = await db(deps)(
    `SELECT
       u.id,
       u.email,
       u.onboarding_step,
       p.user_id,
       p.name,
       p.age,
       p.bio,
       p.city,
       p.country,
       p.latitude,
       p.longitude,
       p.goal,
       p.languages,
       p.cultures,
       p.interests,
       p.religion,
       p.religion_visibility,
       p.sexuality,
       p.sexuality_visibility,
       p.ethnicity,
       p.ethnicity_visibility,
       p.politics,
       p.politics_visibility,
       p.family_values,
       p.i_can_teach,
       p.i_miss_from_home,
       p.favorite_tradition,
       p.looking_for,
       p.university,
       p.is_hidden,
       p.profile_complete_pct,
       p.created_at,
       p.updated_at,
       ph.url AS photo_url,
       ph.thumbnail_url
     FROM users u
     LEFT JOIN profiles p ON p.user_id=u.id
     LEFT JOIN photos ph ON ph.user_id=u.id AND ph.is_primary=true
     WHERE u.id=$1`,
    [userId]
  ) as DbResult<CurrentUser>;
  return result.rows[0] ?? null;
}

export async function updateCurrentUser(userId: string, input: { onboarding_step?: OnboardingStep }, deps?: UsersServiceDeps) {
  if (input.onboarding_step) {
    await db(deps)("UPDATE users SET onboarding_step=$1 WHERE id=$2", [input.onboarding_step, userId]);
  }
  return getCurrentUser(userId, deps);
}

export function mergeProfilePatch(body: ProfilePatch, current: ProfilePatch): CompleteProfilePatch {
  const next = { ...current, ...body };
  const missing: string[] = [];

  if (!next.name) missing.push("name");
  if (typeof next.age !== "number") missing.push("age");
  if (!next.city) missing.push("city");
  if (!next.goal) missing.push("goal");
  if (!Array.isArray(next.languages) || next.languages.length === 0) missing.push("languages");

  if (missing.length) {
    throw new HttpError(400, `Profile requires ${missing.join(", ")}`);
  }

  return next as CompleteProfilePatch;
}
