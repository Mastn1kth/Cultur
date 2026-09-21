import { cacheGet, cacheSet, CachePrefix, CacheTTL } from "../../lib/cache.js";
import { createModuleLogger } from "../../lib/logger.js";

const logger = createModuleLogger("compatibility");

export type CompatibilityProfile = {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  goal?: string | null;
  languages?: string[] | null;
  cultures?: string[] | null;
  interests?: string[] | null;
  religion?: string | null;
  religion_visibility?: "public" | "matches" | "private" | "matching_only" | null;
  family_values?: string | null;
  university?: string | null;
};

export type CompatibilityResult = {
  score: number;
  reasons: string[];
  breakdown: Record<string, number>;
};

function normalizedSet(values: string[] | null | undefined) {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function firstOverlap(a: string[] | null | undefined, b: string[] | null | undefined) {
  const left = normalizedSet(a);
  return (b ?? []).find((value) => left.has(value.trim().toLowerCase()));
}

function allOverlaps(a: string[] | null | undefined, b: string[] | null | undefined) {
  const left = normalizedSet(a);
  return (b ?? []).filter((value) => left.has(value.trim().toLowerCase()));
}

function distanceKm(a: CompatibilityProfile, b: CompatibilityProfile) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return 250;
  const radius = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function distancePoints(km: number) {
  if (km <= 1) return 15;
  if (km <= 50) return 10;
  if (km <= 100) return 5;
  return 0;
}

export function calculateCompatibility(a: CompatibilityProfile, b: CompatibilityProfile): CompatibilityResult {
  const reasons: string[] = [];
  const sharedLanguage = firstOverlap(a.languages, b.languages);
  const sharedCulture = firstOverlap(a.cultures, b.cultures);
  const sharedInterests = allOverlaps(a.interests, b.interests);
  const sameGoal = a.goal && b.goal && a.goal === b.goal && a.goal !== "all";
  const sameUniversity = a.university && b.university && a.university.toLowerCase() === b.university.toLowerCase();
  const sameCity = a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase();
  const canCompareReligion = a.religion_visibility === "public" && b.religion_visibility === "public";
  const sameReligion = canCompareReligion && a.religion && b.religion && a.religion.toLowerCase() === b.religion.toLowerCase();
  const sameValues = a.family_values && b.family_values && a.family_values.toLowerCase() === b.family_values.toLowerCase();

  const breakdown = {
    languages: sharedLanguage ? 25 : 0,
    interests: Math.min(sharedInterests.length * 2, 20),
    goal: sameGoal ? 15 : 0,
    distance: distancePoints(distanceKm(a, b)),
    culture: sharedCulture ? 15 : 0,
    values: sameReligion || sameValues ? 10 : 0,
    university: sameUniversity ? 5 : 0,
    city: sameCity ? 5 : 0
  };

  if (sharedLanguage) reasons.push(`You both speak ${sharedLanguage}`);
  if (sameGoal) reasons.push(`Both looking for ${a.goal}`);
  if (sameUniversity) reasons.push("Same university");
  for (const interest of sharedInterests.slice(0, 2)) reasons.push(`Both interested in ${interest}`);
  if (sharedCulture) reasons.push("Similar cultural background");

  return {
    score: Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)),
    reasons,
    breakdown
  };
}

/**
 * Получить совместимость с кэшированием
 */
export async function getCompatibilityWithCache(
  userId1: string,
  userId2: string,
  profile1: CompatibilityProfile,
  profile2: CompatibilityProfile
): Promise<CompatibilityResult> {
  // Создаем стабильный ключ (сортируем ID для консистентности)
  const [id1, id2] = [userId1, userId2].sort();
  const cacheKey = `${id1}:${id2}`;

  try {
    // Пытаемся получить из кэша
    const cached = await cacheGet<CompatibilityResult>(cacheKey, {
      prefix: CachePrefix.COMPATIBILITY,
    });

    if (cached) {
      logger.debug({ userId1, userId2 }, "Compatibility cache hit");
      return cached;
    }

    // Вычисляем совместимость
    const result = calculateCompatibility(profile1, profile2);

    // Сохраняем в кэш на 15 минут
    await cacheSet(cacheKey, result, {
      prefix: CachePrefix.COMPATIBILITY,
      ttl: CacheTTL.FIFTEEN_MINUTES,
    });

    logger.debug({ userId1, userId2, score: result.score }, "Compatibility calculated and cached");
    return result;
  } catch (error) {
    logger.error({ error, userId1, userId2 }, "Error in compatibility caching");
    // Fallback к прямому вычислению
    return calculateCompatibility(profile1, profile2);
  }
}
