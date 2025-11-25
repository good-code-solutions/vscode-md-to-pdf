/**
 * Browser detection and management for PDF generation
 * Uses puppeteer-core with system Chrome/Chromium
 */

import * as fs from 'fs';
import { execSync } from 'child_process';
import type { Browser } from 'puppeteer-core';

let puppeteer: typeof import('puppeteer-core') | null = null;
let browserInstance: Browser | null = null;

/** Chrome/Chromium executable paths by platform */
const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
};

/**
 * Find Chrome/Chromium executable on the system
 */
export function findChrome(): string | undefined {
  const platform = process.platform;
  const paths = CHROME_PATHS[platform] || CHROME_PATHS.linux;

  // Check known paths
  for (const chromePath of paths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try `which` command on Unix systems
  if (platform !== 'win32') {
    try {
      const result = execSync('which google-chrome chromium chrome 2>/dev/null | head -1', {
        encoding: 'utf-8',
      }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch {
      // Ignore errors
    }
  }

  return undefined;
}

/**
 * Get or create a browser instance
 * Reuses existing connection for performance
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // Lazy load puppeteer
  if (!puppeteer) {
    puppeteer = await import('puppeteer-core');
  }

  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error(
      'Chrome, Chromium, or Edge not found. Please install one of these browsers to use this extension.'
    );
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  return browserInstance;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Ignore errors during cleanup
    }
    browserInstance = null;
  }
}

