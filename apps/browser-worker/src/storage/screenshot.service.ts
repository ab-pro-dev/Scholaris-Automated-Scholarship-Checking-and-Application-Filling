import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export class ScreenshotService {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || env.SCREENSHOTS_DIR;
  }

  /**
   * Initializes the storage directory.
   */
  async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err: any) {
      console.warn(`Could not create screenshots directory '${this.baseDir}': ${err.message}`);
    }
  }

  /**
   * Saves a screenshot buffer to disk.
   */
  async saveScreenshot(
    buffer: Buffer,
    jobId: string,
    prefix: string = 'error'
  ): Promise<string> {
    await this.ensureDirectory();
    const timestamp = Date.now();
    const filename = `${prefix}_${jobId}_${timestamp}.png`;
    const filepath = path.join(this.baseDir, filename);

    await fs.writeFile(filepath, buffer);
    return filepath;
  }

  /**
   * Cleans up screenshots for a completed or deleted session.
   */
  async deleteScreenshot(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch {
      // Ignored if file does not exist
    }
  }
}
