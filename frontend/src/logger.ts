import { pino } from "pino";

export const logger = pino({
  level: import.meta.env.VITE_LOG_LEVEL || "silent",
});
