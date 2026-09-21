import { createClient } from "redis";
import { config } from "../config.js";
import { logger } from "./logger.js";

const redisLogger = logger.child({ module: "redis" });

export const redis = config.NODE_ENV === "test"
  ? { isOpen: false, connect: async () => {}, quit: async () => {}, ping: async () => "", on: () => {}, sendCommand: async () => null, keys: async () => [], get: async () => null, set: async () => "", setEx: async () => "", del: async () => 0 } as any
  : createClient({
    url: config.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          redisLogger.error("Redis reconnection failed after 10 attempts");
          return new Error("Redis reconnection limit exceeded");
        }
        const delay = Math.min(retries * 100, 3000);
        redisLogger.warn({ retries, delay }, "Redis reconnecting");
        return delay;
      },
    },
  });

redis.on("error", (err) => {
  redisLogger.error({ err }, "Redis client error");
});

redis.on("connect", () => {
  redisLogger.info("Redis client connected");
});

redis.on("ready", () => {
  redisLogger.info("Redis client ready");
});

redis.on("reconnecting", () => {
  redisLogger.warn("Redis client reconnecting");
});

redis.on("end", () => {
  redisLogger.info("Redis client connection closed");
});

/**
 * Подключение к Redis при старте приложения
 */
export async function connectRedis() {
  try {
    await redis.connect();
    redisLogger.info("Redis connected successfully");
  } catch (error) {
    redisLogger.error({ error }, "Failed to connect to Redis");
    // Не падаем, если Redis недоступен - приложение может работать без кэша
  }
}

/**
 * Отключение от Redis при остановке приложения
 */
export async function disconnectRedis() {
  try {
    await redis.quit();
    redisLogger.info("Redis disconnected successfully");
  } catch (error) {
    redisLogger.error({ error }, "Error disconnecting from Redis");
  }
}

/**
 * Проверка доступности Redis
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (!redis.isOpen) return false;
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
