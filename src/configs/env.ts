import "dotenv/config";
import { z } from "zod";

/**
 * Kiểm tra và chuẩn hóa các biến môi trường .env
 * Dùng thư viện Zod để validate kiểu dữ liệu.
 */
const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  DATABASE_NAME: z.string().default("Trip-database"),
  APP_HOST: z.string().default("http://localhost"),
  APP_PORT: z.coerce.number().default(5124),
  CLIENT_URL: z.string(),
  JWT_SECRET: z.string().min(8, "JWT_SECRET is required and must be at least 8 characters"),
  STRIPE_SECRET_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
