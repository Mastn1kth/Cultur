import { redis } from "./redis.js";
import { logger } from "./logger.js";

const cacheLogger = logger.child({ module: "cache" });

export interface CacheOptions {
  /** TTL в секундах */
  ttl?: number;
  /** Префикс для ключа */
  prefix?: string;
}

/**
 * Получить значение из кэша
 */
export async function cacheGet<T>(key: string, options?: CacheOptions): Promise<T | null> {
  try {
    if (!redis.isOpen) return null;

    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    const value = await redis.get(fullKey);

    if (!value) {
      cacheLogger.debug({ key: fullKey }, "Cache miss");
      return null;
    }

    cacheLogger.debug({ key: fullKey }, "Cache hit");
    return JSON.parse(value) as T;
  } catch (error) {
    cacheLogger.error({ error, key }, "Cache get error");
    return null;
  }
}

/**
 * Сохранить значение в кэш
 */
export async function cacheSet<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
  try {
    if (!redis.isOpen) return;

    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    const serialized = JSON.stringify(value);

    if (options?.ttl) {
      await redis.setEx(fullKey, options.ttl, serialized);
    } else {
      await redis.set(fullKey, serialized);
    }

    cacheLogger.debug({ key: fullKey, ttl: options?.ttl }, "Cache set");
  } catch (error) {
    cacheLogger.error({ error, key }, "Cache set error");
  }
}

/**
 * Удалить значение из кэша
 */
export async function cacheDel(key: string, options?: CacheOptions): Promise<void> {
  try {
    if (!redis.isOpen) return;

    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    await redis.del(fullKey);

    cacheLogger.debug({ key: fullKey }, "Cache deleted");
  } catch (error) {
    cacheLogger.error({ error, key }, "Cache delete error");
  }
}

/**
 * Удалить все ключи по паттерну
 */
export async function cacheDelPattern(pattern: string, options?: CacheOptions): Promise<void> {
  try {
    if (!redis.isOpen) return;

    const fullPattern = options?.prefix ? `${options.prefix}:${pattern}` : pattern;
    const keys = await redis.keys(fullPattern);

    if (keys.length > 0) {
      await redis.del(keys);
      cacheLogger.debug({ pattern: fullPattern, count: keys.length }, "Cache pattern deleted");
    }
  } catch (error) {
    cacheLogger.error({ error, pattern }, "Cache delete pattern error");
  }
}

/**
 * Получить или вычислить значение (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    return cached;
  }

  const value = await factory();
  await cacheSet(key, value, options);
  return value;
}

/**
 * Константы для TTL
 */
export const CacheTTL = {
  /** 1 минута */
  ONE_MINUTE: 60,
  /** 5 минут */
  FIVE_MINUTES: 300,
  /** 15 минут */
  FIFTEEN_MINUTES: 900,
  /** 1 час */
  ONE_HOUR: 3600,
  /** 1 день */
  ONE_DAY: 86400,
  /** 1 неделя */
  ONE_WEEK: 604800,
} as const;

/**
 * Префиксы для разных типов кэша
 */
export const CachePrefix = {
  COMPATIBILITY: "compat",
  DISCOVERY: "discovery",
  PROFILE: "profile",
  USER: "user",
  EVENT: "event",
  COMMUNITY: "community",
} as const;
