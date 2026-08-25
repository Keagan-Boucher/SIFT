import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser } from "playwright-core";
import pLimit from "p-limit";
import { logger } from "firebase-functions";
import { isAllowed, USER_AGENT } from "./fetchPage";

const NAV_TIMEOUT_MS = 25_000;
/**
 * How long to keep waiting for the page to produce what the caller is after.
 *
 * Two cheaper signals were tried first and both read the page too early,
 * which is worth recording so neither is attempted again.
 *
 * `networkidle` looks right but fires in the wrong gap. Measured against
 * evetech.co.za from a deployed function: its analytics (Google Ads, Twitter,
 * Bing, GTM) finish around 11.3s, the site's own search only fires at 12.6s,
 * and the results land at 13.0s. The network is therefore briefly quiet
 * *before* the request that matters has even started.
 *
 * Waiting for the DOM to stop growing fails the same way, because the markup
 * plateaus in that same gap: it returned in 3.7s with 0 candidates.
 *
 * So the render polls for the caller's own success condition instead, and
 * stops the moment it is met. That is both more reliable and usually faster,
 * since a page that renders quickly is not made to sit out a fixed budget.
 */
const CONTENT_TIMEOUT_MS = 30_000;
const CONTENT_POLL_MS = 2_000;
/**
 * Product grids are commonly virtualised or lazy-loaded on scroll, so cards
 * below the fold never render even once the page has settled. A bounded
 * scroll pass triggers that loading without needing to know the site's own
 * lazy-load mechanism.
 */
const SCROLL_STEP_PX = 900;
const MAX_SCROLL_PX = 6_000;
const SCROLL_TIMEOUT_MS = 5_000;
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
const HARD_DEADLINE_MS = 65_000;

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
 * A fresh browser per render, closed afterwards.
 *
 * This was a warm singleton reused across renders, on the usual reasoning that
 * launching Chromium is the expensive part. That is true and it still does not
 * work here, because `--single-process` is not optional in this environment:
 * with the browser and its renderer in one process, closing the first render's
 * context takes the process down with it, and every render after the first on
 * that instance fails. It failed quietly too, returning no HTML rather than
 * throwing, so the pipeline reported "found none" for a page that renders
 * perfectly well on its own.
 *
 * Measured: two sequential renders through a shared browser gave 8 candidates
 * then 0; the same two with a browser each give 8 and 8. Paying the launch
 * cost every time is the price of the sandbox, and headlessLimit already
 * serialises renders, so nothing is contending for it anyway.
 */
async function launchBrowser(): Promise<Browser> {
  const executablePath = await chromium.executablePath();
  return playwright.launch({ executablePath, args: chromium.args, headless: true });
}

export interface RenderResult {
  html: string | null;
  error?: string;
}

export interface RenderOptions {
  /**
   * The caller's success condition, polled against the page's current HTML.
   * The render returns as soon as it holds. Without it the render waits the
   * whole content budget, since it has no way to know what it is waiting for.
   *
   * This lives with the caller rather than here so that net/ stays ignorant of
   * extraction: what counts as "the page is ready" is an extraction question.
   */
  until?: (html: string) => boolean;
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
async function attemptRender(url: string, options: RenderOptions): Promise<RenderResult> {
  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1366, height: 1400 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    // A string body, not a closure: this runs in the page's own browser
    // context, which has no DOM lib available to this project's tsconfig.
    const scrollPass = `(async ({ step, max }) => {
      for (let scrolled = 0; scrolled < max && scrolled < document.body.scrollHeight; scrolled += step) {
        window.scrollBy(0, step);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    })(${JSON.stringify({ step: SCROLL_STEP_PX, max: MAX_SCROLL_PX })})`;

    // Wait for the page to produce what the caller wants, without touching it.
    // Scrolling during this window was tried and breaks the very sites it was
    // meant to help: repeatedly scrolling a virtualised grid while it is still
    // hydrating keeps it from ever settling, and evetech.co.za went from 8
    // candidates to 0 for the whole budget. Leave the page alone until it has
    // something to show.
    const deadline = Date.now() + CONTENT_TIMEOUT_MS;
    let html = await page.content();
    while (!options.until?.(html) && Date.now() < deadline) {
      await page.waitForTimeout(CONTENT_POLL_MS);
      html = await page.content();
    }

    // One scroll pass at the end, to pull in cards below the fold that are
    // lazily loaded. Only now is there a rendered grid for it to act on.
    //
    // Raced against a timer because `evaluate` has no timeout of its own: on a
    // page still busy with its own scripts it can sit there indefinitely, and
    // without this it runs until the whole render hits its hard deadline,
    // which then discards a browser that was never actually broken.
    await Promise.race([
      page.evaluate(scrollPass).catch(() => {}),
      page.waitForTimeout(SCROLL_TIMEOUT_MS),
    ]).catch(() => {});
    await page.waitForTimeout(CONTENT_POLL_MS);

    return { html: await page.content() };
  } catch (error) {
    logger.warn(`headless render of ${url} failed`, error);
    return { html: null, error: error instanceof Error ? error.message : "headless render failed" };
  } finally {
    // Closing the browser takes its context and page with it, and nothing here
    // outlives the render, so there is no cheaper teardown to do first.
    await browser?.close().catch(() => {});
  }
}

/**
 * Races the actual render against the hard deadline so the concurrency slot
 * this holds is always freed on time, no matter what the render itself is
 * doing. If the deadline wins, the render is abandoned rather than cancelled,
 * since there is no way to force that on an in-flight browser call. The
 * abandoned attempt still closes its own browser when it eventually unwinds,
 * and the next render launches its own regardless, so nothing here has to
 * clean up after it.
 */
async function renderWithDeadline(url: string, options: RenderOptions): Promise<RenderResult> {
  let timer: ReturnType<typeof setTimeout>;
  const timedOut = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => resolve("timed-out"), HARD_DEADLINE_MS);
  });

  const outcome = await Promise.race([attemptRender(url, options), timedOut]);
  clearTimeout(timer!);

  if (outcome === "timed-out") {
    logger.warn(`headless render of ${url} exceeded its ${HARD_DEADLINE_MS}ms deadline, abandoning it`);
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
export async function renderPage(url: string, options: RenderOptions = {}): Promise<RenderResult> {
  if (!(await isAllowed(url))) {
    return { html: null, error: "robots.txt disallows this page" };
  }

  return headlessLimit(() => renderWithDeadline(url, options));
}
