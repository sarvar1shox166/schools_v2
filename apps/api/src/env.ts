import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  CLICK_SECRET_KEY: z.string().default("dev-click-secret"),
  PAYME_SECRET_KEY: z.string().default("dev-payme-secret"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
