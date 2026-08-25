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
 * A hard ceiling on one render attempt, independent of every timeout inside
 * it. Those inner timeouts (goto, networkidle) only bound the *page*; they do
 * nothing if the *browser* itself has gone unresponsive; for example the
 * shared process surviving a lost network connection in a half-dead state
 * without erroring. Without this, a single wedged render would hold a
 * concurrency slot forever, and since the browser is a warm-instance
 * singleton, every future render on that instance would queue behind it and
 * hang too, silently, until the whole function is killed by its own timeout.
 */
const HARD_DEADLINE_MS = 40_000;

/**
 * One render at a time. This was briefly 2, on the theory that a context is
 * cheap next to the shared process — true in general, but not here: Chromium
 * runs `--single-process` in this environment (required, not optional, given
 * the sandboxing this is deployed under), which gives concurrent contexts no
 * isolation from each other. Confirmed live: raising this to 2 crashed the
 * shared browser outright under two contexts at once, which then failed
 * every render on the rest of that search, and every later search on that
 * warm instance, until something happened to poison it. scrapeSource's own
 * retries across candidate URLs are what actually need the loop, not
 * parallelism inside this file.
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

/**
 * Discards the shared browser so the next render launches a fresh one,
 * rather than queueing behind a process that has stopped responding. The old
 * handle is closed in the background: it may itself hang given it is the
 * thing suspected of being wedged, so nothing here waits on it.
 */
function poisonBrowser(): void {
  const stale = browserPromise;
  browserPromise = null;
  stale?.then((browser) => browser.close()).catch(() => {});
}

export interface RenderResult {
  html: string | null;
  error?: string;
}

/**
 * The actual render. Any error here is reported as "no HTML" rather than
 * thrown, since the caller is already the last resort in the cascade, but a
 * browser that has genuinely died is a different problem than a page that
 * merely failed to load: reusing a dead browser for the next candidate URL
 * would just fail again immediately, and for every source after it on this
 * warm instance, so isConnected() is checked on the way out and the browser
 * is discarded if it has gone.
 */
async function attemptRender(url: string): Promise<RenderResult> {
  let context;
  let browser: Browser | undefined;
  try {
    browser = await getBrowser();
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
    if (browser && !browser.isConnected()) poisonBrowser();
    return { html: null, error: error instanceof Error ? error.message : "headless render failed" };
  } finally {
    await context?.close().catch(() => {});
  }
}

/**
 * Races the actual render against the hard deadline so the concurrency slot
 * this holds is always freed on time, no matter what the render itself is
 * doing. If the deadline wins, the render is abandoned (not cancelled: there
 * is no way to force that on an in-flight browser call) and the browser is
 * presumed wedged and discarded, so the next attempt gets a clean one.
 */
async function renderWithDeadline(url: string): Promise<RenderResult> {
  let timer: ReturnType<typeof setTimeout>;
  const timedOut = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => resolve("timed-out"), HARD_DEADLINE_MS);
  });

  const outcome = await Promise.race([attemptRender(url), timedOut]);
  clearTimeout(timer!);

  if (outcome === "timed-out") {
    logger.warn(`headless render of ${url} exceeded its ${HARD_DEADLINE_MS}ms deadline, discarding the browser`);
    poisonBrowser();
    return { html: null, error: "headless render exceeded its time budget" };
  }
  return outcome;
}

/**
 * Tier 5's only job: load `url` in a real browser so client-side JavaScript
 * runs, then hand back the HTML it produced. Robots.txt is checked first,
 * same as every other outbound request the scraper makes. Never throws and
 * never hangs past its deadline: a browser failure is reported the same way
 * a blocked or unreachable page is, as "no HTML", since the caller is
 * already the last resort in the cascade.
 */
export async function renderPage(url: string): Promise<RenderResult> {
  if (!(await isAllowed(url))) {
    return { html: null, error: "robots.txt disallows this page" };
  }

  return headlessLimit(() => renderWithDeadline(url));
}
