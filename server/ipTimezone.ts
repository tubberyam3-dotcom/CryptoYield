import { isIP } from "node:net";

const DAY = 24 * 60 * 60 * 1000;
const FAILURE_TTL = 5 * 60 * 1000;

export function publicIp(raw: string | undefined): string | null {
  if (!raw) return null;
  const ip = raw.trim().replace(/^::ffff:/i, "");
  const version = isIP(ip);
  if (version === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)) return null;
    return ip;
  }
  // Public IPv6 unicast addresses use 2000::/3. Exclude documentation space.
  if (version === 6 && /^[23]/i.test(ip) && !/^2001:db8:/i.test(ip)) return ip;
  return null;
}

export function createIpTimezoneResolver(
  fetcher: typeof fetch = fetch,
  clock: () => number = Date.now,
) {
  const cache = new Map<string, { timeZone: string | null; expiresAt: number }>();
  const pending = new Map<string, Promise<string | null>>();
  let quotaBlockedUntil = 0;

  function remember(ip: string, timeZone: string | null) {
    if (cache.size >= 1000 && !cache.has(ip)) cache.delete(cache.keys().next().value!);
    cache.set(ip, { timeZone, expiresAt: clock() + (timeZone ? DAY : FAILURE_TTL) });
    return timeZone;
  }

  async function lookup(ip: string): Promise<string | null> {
    try {
      // Send only the visitor IP, never their name, email, account or balance.
      const response = await fetcher(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,timezone.id`,
        { signal: AbortSignal.timeout(1500) },
      );
      if (response.status === 429) {
        const retrySeconds = Number(response.headers.get("retry-after"));
        quotaBlockedUntil = clock() + (Number.isFinite(retrySeconds) && retrySeconds > 0
          ? Math.min(DAY, retrySeconds * 1000) : DAY);
        return remember(ip, null);
      }
      if (!response.ok) return remember(ip, null);
      const body = await response.json();
      const timeZone = body?.timezone?.id;
      if (body?.success !== true || typeof timeZone !== "string") return remember(ip, null);
      new Intl.DateTimeFormat("en-US", { timeZone }).format();
      return remember(ip, timeZone);
    } catch {
      return remember(ip, null);
    }
  }

  return async (raw: string | undefined): Promise<string | null> => {
    const ip = publicIp(raw);
    if (!ip) return null;
    const cached = cache.get(ip);
    if (cached && cached.expiresAt > clock()) return cached.timeZone;
    if (quotaBlockedUntil > clock()) return null;
    const existing = pending.get(ip);
    if (existing) return existing;
    const request = lookup(ip);
    pending.set(ip, request);
    try {
      return await request;
    } finally {
      pending.delete(ip);
    }
  };
}

export const resolveIpTimezone = createIpTimezoneResolver();
