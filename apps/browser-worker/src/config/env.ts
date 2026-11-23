import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CHROME_PATH: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  BROWSER_HEADLESS: process.env.BROWSER_HEADLESS !== 'false',
  BROWSER_WORKER_CONCURRENCY: parseInt(process.env.BROWSER_WORKER_CONCURRENCY || '2', 10),
  BROWSER_TIMEOUT_MS: parseInt(process.env.BROWSER_TIMEOUT_MS || '30000', 10),
  SCREENSHOTS_DIR:
    process.env.SCREENSHOTS_DIR ||
    path.join(process.cwd(), 'screenshots'),
};
