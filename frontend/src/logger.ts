import { pino } from "pino";
export { type Level } from "pino";
export const logger = pino({
  level: import.meta.env.VITE_LOG_LEVEL || "silent",
});
