import pLimit from "p-limit";
import robotsParser from "robots-parser";

/**
 * SIFT identifies itself honestly rather than spoofing a browser. A site that
 * wants to refuse us can, and the UI marks that source BLOCKED instead of
 * working around it.
 */
export const USER_AGENT = "SiftBot/1.0 (+https://github.com/KeaganCB-OW/SIFT)";

const REQUEST_TIMEOUT_MS = 10_000;
const ROBOTS_TIMEOUT_MS = 5_000;
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CONCURRENT_HOSTS = 4;
const MAX_CONCURRENT_PER_HOST = 1;

/** Thrown when robots.txt disallows the path. Surfaces as a BLOCKED source. */
export class BlockedByRobotsError extends Error {
  constructor(public readonly url: string) {
    super(`robots.txt disallows ${url}`);
    this.name = "BlockedByRobotsError";
  }
}

interface RobotsCacheEntry {
  robots: ReturnType<typeof robotsParser> | null;
  fetchedAt: number;
}

const robotsCache = new Map<string, RobotsCacheEntry>();

/** One in-flight request per host, a few hosts at a time. */
const globalLimit = pLimit(MAX_CONCURRENT_HOSTS);
const hostLimits = new Map<string, ReturnType<typeof pLimit>>();

function hostLimit(host: string): ReturnType<typeof pLimit> {
  let limit = hostLimits.get(host);
  if (!limit) {
    limit = pLimit(MAX_CONCURRENT_PER_HOST);
    hostLimits.set(host, limit);
  }
  return limit;
}

async function withTimeout(url: string, timeoutMs: number, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches and caches a host's robots.txt for an hour. A missing or unreachable
 * robots.txt is treated as permissive, which matches the standard: absence of
 * a policy is not a prohibition.
 */
async function loadRobots(origin: string): Promise<ReturnType<typeof robotsParser> | null> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) return cached.robots;

  const robotsUrl = `${origin}/robots.txt`;
  let robots: ReturnType<typeof robotsParser> | null = null;
  try {
    const response = await withTimeout(robotsUrl, ROBOTS_TIMEOUT_MS, { "User-Agent": USER_AGENT });
    if (response.ok) robots = robotsParser(robotsUrl, await response.text());
  } catch {
    robots = null;
  }

  robotsCache.set(origin, { robots, fetchedAt: Date.now() });
  return robots;
}

/** Drops every cached robots.txt. Used by tests and after a long cold period. */
export function clearRobotsCache(): void {
  robotsCache.clear();
}

/** True when robots.txt permits SiftBot to request `url`. */
export async function isAllowed(url: string): Promise<boolean> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  const robots = await loadRobots(origin);
  return robots ? robots.isAllowed(url, USER_AGENT) !== false : true;
}

export interface FetchResult {
  html: string | null;
  /** HTTP status, or null when the request never got a response. */
  status: number | null;
  /** True when the request never completed at the network level. */
  networkError: boolean;
  /**
   * Which kind of network failure. "Could not connect" and "timed out" send a
   * user in completely different directions, and a mistyped domain is a third
   * thing again, so they are not collapsed into one message.
   */
  failure?: "timeout" | "dns" | "refused" | "tls" | "unknown";
}

/**
 * Node wraps the real cause: `fetch` rejects with a generic TypeError whose
 * `cause` carries the errno code that actually says what went wrong.
 */
function classifyFetchError(error: unknown): NonNullable<FetchResult["failure"]> {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return "timeout";

  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const code = cause?.code ?? (error as { code?: string })?.code ?? "";

  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EAI_NODATA") return "dns";
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return "refused";
  }
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT") {
    return "timeout";
  }
  if (code.startsWith("ERR_TLS") || code.startsWith("CERT_") || code.startsWith("UNABLE_TO_")
      || code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "EPROTO") {
    return "tls";
  }
  return "unknown";
}

/**
 * The only outbound HTTP path in the scraper. Checks robots.txt, queues behind
 * the per-host limiter, applies a timeout, and reports what happened.
 * Throws BlockedByRobotsError when the site has explicitly refused, including
 * after a redirect to a host with a stricter policy.
 */
export async function fetchPageDetailed(url: string): Promise<FetchResult> {
  if (!(await isAllowed(url))) throw new BlockedByRobotsError(url);

  const host = new URL(url).host;

  return globalLimit(() =>
    hostLimit(host)(async () => {
      let response: Response;
      try {
        response = await withTimeout(url, REQUEST_TIMEOUT_MS, {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-ZA,en;q=0.9",
        });
      } catch (error) {
        return { html: null, status: null, networkError: true, failure: classifyFetchError(error) };
      }

      // A redirect can land on a different host whose robots.txt is stricter
      // (apex to www is the common case). The policy that matters is the one on
      // the origin actually serving the content, so it is rechecked here.
      if (response.url && response.url !== url && !(await isAllowed(response.url))) {
        throw new BlockedByRobotsError(response.url);
      }

      if (!response.ok) return { html: null, status: response.status, networkError: false };

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml|application\/json|text\/plain/.test(contentType)) {
        return { html: null, status: response.status, networkError: false };
      }

      return { html: await response.text(), status: response.status, networkError: false };
    }),
  );
}

/** The common case: the page HTML, or null if it could not be read. */
export async function fetchPage(url: string): Promise<string | null> {
  return (await fetchPageDetailed(url)).html;
}

/**
 * Turns a failed fetch into something worth showing a user. Retailers commonly
 * serve 403 or 429 to traffic from cloud IP ranges, which looks identical to
 * being down unless the status is reported.
 */
export function describeFetchFailure(result: FetchResult): string {
  if (result.networkError) {
    switch (result.failure) {
      case "dns":
        return "That domain does not resolve. Check the spelling";
      case "refused":
        return "The site refused the connection. Smaller hosts sometimes block foreign or datacentre traffic outright";
      case "tls":
        return "The site's security certificate could not be verified";
      case "timeout":
        return "The site did not respond in time";
      default:
        return "The connection to the site failed";
    }
  }
  if (result.status === 403 || result.status === 401) {
    return "The site refused the request (HTTP 403), usually a bot filter such as Cloudflare rejecting datacentre traffic";
  }
  if (result.status === 429) return "The site rate-limited the request (HTTP 429)";
  if (result.status === 404) return "The page was not found (HTTP 404)";
  if (result.status === 503) return "The site is unavailable or behind a bot check (HTTP 503)";
  if (result.status !== null) return `The site returned HTTP ${result.status}`;
  return "The site could not be reached";
}

/** Normalises user input ("https://Takealot.com/foo") down to a bare host. */
export function normaliseDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Builds the origin for a bare domain. Loopback has no TLS, so it stays http. */
export function originFor(domain: string): string {
  const host = normaliseDomain(domain);
  return `${LOOPBACK.test(host) ? "http" : "https"}://${host}`;
}

/**
 * The www form of a domain. Small hosts often serve only one of the two names
 * reliably, so it is worth having both to try. No attempt is made to guess
 * whether www exists: the caller only uses this after the bare name failed, and
 * a name that does not resolve simply fails too. Loopback has no www.
 *
 * Counting labels to detect a subdomain does not work here, since a .co.za
 * domain has three of them.
 */
export function wwwOriginFor(domain: string): string | null {
  const host = normaliseDomain(domain);
  return LOOPBACK.test(host) ? null : `https://www.${host}`;
}
