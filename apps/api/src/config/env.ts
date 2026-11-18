import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://scholaris:scholaris@localhost:5432/scholaris?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('scholaris-dev-jwt-secret-key-32-bytes-secure!!'),
  JWT_REFRESH_SECRET: z.string().default('scholaris-dev-refresh-secret-key-32-bytes!!'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('scholaris-documents'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean()).default(true),
  // AI Service Configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.3-70b-instruct'),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(20),
  AI_DAILY_TOKEN_LIMIT: z.coerce.number().default(100000),
});

export const env = envSchema.parse(process.env);
