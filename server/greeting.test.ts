import assert from "node:assert/strict";
import test from "node:test";
import { getGreeting } from "../shared/greeting";
import { createIpTimezoneResolver, publicIp } from "./ipTimezone";

test("greeting uses the local timezone and first name", () => {
  const now = new Date("2026-10-10T13:00:00Z");
  assert.equal(getGreeting(" Ada ", "Africa/Lagos", now), "Good afternoon, Ada");
  assert.equal(getGreeting("Ada", "America/New_York", now), "Good morning, Ada");
  assert.equal(getGreeting("Ada", "Asia/Tokyo", now), "Good Evening, Ada");
  assert.equal(getGreeting("", "Africa/Lagos", now), "Good afternoon");
  assert.equal(getGreeting(null, "invalid/timezone", now), "Hello");
});

test("greeting changes at morning, noon and evening boundaries", () => {
  for (const [hour, expected] of [[0, "Good Evening"], [4, "Good Evening"], [5, "Good morning"],
    [11, "Good morning"], [12, "Good afternoon"], [17, "Good afternoon"], [18, "Good Evening"]] as const) {
    assert.equal(getGreeting("Ada", "UTC", new Date(`2026-10-10T${String(hour).padStart(2, "0")}:00:00Z`)), `${expected}, Ada`);
  }
  assert.equal(getGreeting("Ada", "America/New_York", new Date("2026-01-10T16:30:00Z")), "Good morning, Ada");
  assert.equal(getGreeting("Ada", "America/New_York", new Date("2026-07-10T16:30:00Z")), "Good afternoon, Ada");
});

test("only validated public client IPs can be looked up", () => {
  for (const ip of ["", "unknown", "127.0.0.1", "::1", "10.1.2.3", "172.16.0.1", "192.168.1.1",
    "169.254.1.1", "100.64.0.1", "::ffff:192.168.1.1", "fe80::1", "fc00::1", "ff02::1",
    "2001:db8::1", "203.0.113.8", "8.8.8.8/../../", "8.8.8.8, 1.1.1.1"]) {
    assert.equal(publicIp(ip), null, ip);
  }
  assert.equal(publicIp("::ffff:8.8.8.8"), "8.8.8.8");
  assert.equal(publicIp("2606:4700:4700::1111"), "2606:4700:4700::1111");
});

test("IP lookup requests only timezone, shares pending work and caches results", async () => {
  let calls = 0;
  let time = 0;
  const resolver = createIpTimezoneResolver(async (url, options) => {
    calls++;
    assert.equal(String(url), "https://ipwho.is/8.8.8.8?fields=success,timezone.id");
    assert(options?.signal);
    return Response.json({ success: true, timezone: { id: "Africa/Lagos" } });
  }, () => time);
  assert.deepEqual(await Promise.all([resolver("8.8.8.8"), resolver("8.8.8.8")]), ["Africa/Lagos", "Africa/Lagos"]);
  assert.equal(calls, 1);
  assert.equal(await resolver("8.8.8.8"), "Africa/Lagos");
  assert.equal(calls, 1);
  time = 24 * 60 * 60 * 1000 + 1;
  assert.equal(await resolver("8.8.8.8"), "Africa/Lagos");
  assert.equal(calls, 2);
});

test("provider errors and bad timezones stay unavailable rather than fabricate a location", async () => {
  for (const fetcher of [
    async () => { throw new Error("request timed out"); },
    async () => new Response("", { status: 503 }),
    async () => Response.json({ success: false }),
    async () => Response.json({ success: true, timezone: { id: "not-a-timezone" } }),
  ]) {
    let calls = 0;
    const resolver = createIpTimezoneResolver(async () => { calls++; return fetcher(); });
    assert.equal(await resolver("8.8.8.8"), null);
    assert.equal(await resolver("8.8.8.8"), null);
    assert.equal(calls, 1);
    assert.equal(await resolver("127.0.0.1"), null);
    assert.equal(calls, 1);
  }
});

test("provider rate limits pause further lookups without blocking the dashboard", async () => {
  let calls = 0;
  let time = 0;
  const resolver = createIpTimezoneResolver(async () => {
    calls++;
    return new Response("", { status: 429, headers: { "Retry-After": "3600" } });
  }, () => time);
  assert.equal(await resolver("8.8.8.8"), null);
  assert.equal(await resolver("1.1.1.1"), null);
  assert.equal(calls, 1);
  time = 3600 * 1000 + 1;
  assert.equal(await resolver("1.1.1.1"), null);
  assert.equal(calls, 2);
});
