import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser } from "playwright-core";
import pLimit from "p-limit";
import { logger } from "firebase-functions";
import { isAllowed, USER_AGENT } from "./fetchPage";

const NAV_TIMEOUT_MS = 20_000;
/**
 * A client-rendered page's own network calls are unpredictable in count and
 * name, so a fixed settle window after "loaded" is simpler and more
 * predictable than trying to guess which request carries the price.
 */
const SETTLE_TIMEOUT_MS = 2_000;

/**
 * A real browser costs far more memory and time than a plain fetch, so only
 * one runs at a time regardless of how many sources are being scraped
 * concurrently. This is a last resort, not a parallel fetch path.
 */
const headlessLimit = pLimit(1);

/**
 * One Chromium process is kept alive for the lifetime of the function
 * instance and reused across invocations, since launching it is the
 * expensive part. A warm instance therefore renders subsequent pages much
 * faster than the first.
 */
let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  const executablePath = await chromium.executablePath();
  return playwright.launch({ executablePath, args: chromium.args, headless: true });
}

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

export interface RenderResult {
  html: string | null;
  error?: string;
}

/**
 * Tier 5's only job: load `url` in a real browser so client-side JavaScript
 * runs, then hand back the HTML it produced. Robots.txt is checked first,
 * same as every other outbound request the scraper makes. Never throws: a
 * browser failure is reported the same way a blocked or unreachable page is,
 * as "no HTML", since the caller is already the last resort in the cascade.
 */
export async function renderPage(url: string): Promise<RenderResult> {
  if (!(await isAllowed(url))) {
    return { html: null, error: "robots.txt disallows this page" };
  }

  return headlessLimit(async () => {
    let context;
    try {
      const browser = await getBrowser();
      context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1366, height: 900 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_TIMEOUT_MS);
      return { html: await page.content() };
    } catch (error) {
      logger.warn(`headless render of ${url} failed`, error);
      return { html: null, error: error instanceof Error ? error.message : "headless render failed" };
    } finally {
      await context?.close().catch(() => {});
    }
  });
}
