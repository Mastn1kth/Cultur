import "dotenv/config";
import { z } from "zod";

const rawEnv = {
  ...process.env,
  FROM_EMAIL: process.env.FROM_EMAIL ?? process.env.EMAIL_FROM
};

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().default("postgres://culturematch:culturematch@localhost:5432/culturematch"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-me"),
  APP_DEEP_LINK: z.string().default("culturematch"),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default("no-reply@culturematch.local"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_AUDIENCE: z.string().default("com.culturematch.app"),
  S3_BUCKET: z.string().default("culturematch-media"),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional()
});

export const config = envSchema.parse(rawEnv);
