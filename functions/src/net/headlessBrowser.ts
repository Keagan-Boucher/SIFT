import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser } from "playwright-core";
import pLimit from "p-limit";
import { logger } from "firebase-functions";
import { isAllowed, USER_AGENT } from "./fetchPage";

const NAV_TIMEOUT_MS = 25_000;
/**
 * How long to give the page's own network calls a chance to go quiet before
 * reading it. A results grid built from an XHR/GraphQL call after the shell
 * loads is common, and there is no reliable way to name which request that
 * is up front, so this waits for the network to settle instead of guessing.
 * Sites that never go fully idle (polling, analytics beacons) just use the
 * whole budget rather than failing, since the wait is not required to succeed.
 */
const SETTLE_TIMEOUT_MS = 5_000;
/**
 * Product grids are commonly virtualised or lazy-loaded on scroll, so cards
 * below the fold never render even once the network is idle. A bounded
 * scroll pass triggers that loading without needing to know the site's own
 * lazy-load mechanism.
 */
const SCROLL_STEP_PX = 900;
const MAX_SCROLL_PX = 6_000;

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
      context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1366, height: 1400 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      // Not required to succeed: a page whose network never quiets down still
      // gets read once the budget runs out, rather than failing the render.
      await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});
      // A string body, not a closure: this runs in the page's own browser
      // context, which has no DOM lib available to this project's tsconfig.
      await page.evaluate(
        `(async ({ step, max }) => {
          for (let scrolled = 0; scrolled < max && scrolled < document.body.scrollHeight; scrolled += step) {
            window.scrollBy(0, step);
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        })(${JSON.stringify({ step: SCROLL_STEP_PX, max: MAX_SCROLL_PX })})`,
      );
      return { html: await page.content() };
    } catch (error) {
      logger.warn(`headless render of ${url} failed`, error);
      return { html: null, error: error instanceof Error ? error.message : "headless render failed" };
    } finally {
      await context?.close().catch(() => {});
    }
  });
}
