import { PrismaClient } from '@scholaris/database';
import { BrowserPool } from './browser/browser-pool.js';
import { ScreenshotService } from './storage/screenshot.service.js';
import { createBrowserWorker } from './queue/automation.worker.js';

export * from './config/env.js';
export * from './security/network-firewall.js';
export * from './security/submission-guard.js';
export * from './security/challenge-detector.js';
export * from './security/handoff-protocol.service.js';
export * from './storage/screenshot.service.js';
export * from './browser/browser-pool.js';
export * from './detector/dom-extractor.js';
export * from './detector/form-detector.service.js';
export * from './automation/file-uploader.js';
export * from './automation/form-filler.js';
export * from './queue/automation.queue.js';
export * from './queue/automation.worker.js';

async function bootstrap() {
  console.log('Starting Scholaris Browser Worker Service...');

  const prisma = new PrismaClient();
  const browserPool = new BrowserPool();
  const screenshotService = new ScreenshotService();

  await screenshotService.ensureDirectory();

  const worker = createBrowserWorker(prisma, browserPool, screenshotService);

  console.log('Scholaris Browser Automation Worker initialized and listening for jobs.');

  const shutdown = async () => {
    console.log('Shutting down Browser Worker...');
    await worker.close();
    await browserPool.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.endsWith('index.ts')) {
  bootstrap().catch((err) => {
    console.error('Browser worker fatal startup error:', err);
    process.exit(1);
  });
}
