import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../src/browser/browser-pool.js';
import { ScreenshotService } from '../src/storage/screenshot.service.js';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('BrowserPool & Isolated Context Lifecycle (TASK-021)', () => {
  const browserPool = new BrowserPool();
  const testScreenshotsDir = path.join(process.cwd(), 'test-screenshots');
  const screenshotService = new ScreenshotService(testScreenshotsDir);

  afterAll(async () => {
    await browserPool.close();
    try {
      await fs.rm(testScreenshotsDir, { recursive: true, force: true });
    } catch {}
  });

  it('launches a headless Chromium browser instance', async () => {
    const browser = await browserPool.getBrowser();
    expect(browser).toBeDefined();
    expect(browser.isConnected()).toBe(true);
  });

  it('creates an ephemeral, incognito context with security firewall attached', async () => {
    const session = await browserPool.createIsolatedContext(10000);
    expect(session.context).toBeDefined();
    expect(session.page).toBeDefined();

    // Render local HTML content safely
    await session.page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Scholarship Application Test Page</title></head>
        <body>
          <h1>Oxford Clarendon Fund</h1>
          <form id="app-form">
            <input type="text" id="student_name" name="student_name" value="" />
            <input type="email" id="student_email" name="student_email" value="" />
            <button type="submit" id="submit-btn">Submit Application</button>
          </form>
        </body>
      </html>
    `);

    const title = await session.page.title();
    expect(title).toBe('Scholarship Application Test Page');

    // Attempt an SSRF fetch request to loopback inside the browser page
    await session.page.evaluate(() => {
      fetch('http://127.0.0.1:8080/secret').catch(() => {});
    });

    // Give network route a moment to intercept
    await session.page.waitForTimeout(100);

    // Verify firewall intercepted and blocked the loopback call
    expect(session.blockedRequests.length).toBeGreaterThan(0);
    expect(session.blockedRequests[0].url).toContain('127.0.0.1');

    // Clean up session
    await session.cleanup();
  });

  it('captures screenshots on milestone or error state via ScreenshotService', async () => {
    const session = await browserPool.createIsolatedContext(10000);

    await session.page.setContent(`
      <html>
        <body style="background: #e0f2fe; padding: 20px;">
          <h2>Milestone Screenshot Capture</h2>
        </body>
      </html>
    `);

    const screenshotBuffer = await session.page.screenshot({ fullPage: false });
    expect(screenshotBuffer).toBeInstanceOf(Buffer);
    expect(screenshotBuffer.length).toBeGreaterThan(100);

    const savedPath = await screenshotService.saveScreenshot(
      screenshotBuffer,
      'job-test-123',
      'progress'
    );

    expect(savedPath).toContain('job-test-123');

    // Verify file exists on disk
    const stat = await fs.stat(savedPath);
    expect(stat.size).toBeGreaterThan(0);

    await session.cleanup();
  });
});
