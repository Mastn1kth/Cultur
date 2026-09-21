import pino from "pino";
import { config } from "../config.js";

const isDevelopment = config.NODE_ENV === "development";

export const logger = pino({
  level: config.LOG_LEVEL || "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: config.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Request ID generator
export const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
