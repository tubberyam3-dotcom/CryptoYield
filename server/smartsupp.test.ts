import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const bootstrap = html.match(/<script id="smartsupp-analytics"[^>]*>([\s\S]*?)<\/script>/)?.[1];

function browserFixture() {
  const inserted: Record<string, unknown>[] = [];
  const browser: Record<string, any> = {
    location: { pathname: "/" },
    document: {
      createElement: (tag: string) => {
        assert.equal(tag, "script");
        return {};
      },
      getElementsByTagName: () => [{
        parentNode: {
          insertBefore: (script: Record<string, unknown>) => {
            // Hidden settings must exist before the asynchronous SDK can load.
            assert.equal(browser._smartsupp.hideWidget, true);
            assert.equal(browser._smartsupp.hideMobileWidget, true);
            inserted.push(script);
          },
        },
      }],
    },
  };
  browser.window = browser;
  return { browser, inserted };
}

test("Smartsupp loads site-wide with desktop and mobile chat hidden before initialization", () => {
  assert.ok(bootstrap, "Shared HTML must include the Smartsupp bootstrap");
  const { browser, inserted } = browserFixture();
  runInNewContext(bootstrap, browser);
  assert.equal(browser._smartsupp.key, "f2e7b6645ef63d79d763cb82473cab1507a128d1");
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].src, "https://www.smartsuppchat.com/loader.js?");
  assert.equal(inserted[0].async, true);
  assert.equal(typeof browser.smartsupp, "function");
  assert.deepEqual(Array.from(browser.smartsupp._[0]), ["chat:hide"]);
  assert.ok(html.indexOf('id="smartsupp-analytics"') < html.indexOf('src="/src/main.tsx"'));
});

test("Smartsupp chat has a persistent visual guard independent of provider settings", () => {
  const guard = html.match(/<style id="smartsupp-chat-hidden">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(guard);
  assert.match(guard, /#smartsupp-widget-container/);
  assert.match(guard, /iframe\[title="Smartsupp"\]\[id\$="-application-iframe"\]/);
  assert.match(guard, /visibility:\s*hidden\s*!important/);
  assert.match(guard, /opacity:\s*0\s*!important/);
  assert.match(guard, /pointer-events:\s*none\s*!important/);
  assert.ok(html.indexOf('id="smartsupp-chat-hidden"') < html.indexOf('id="smartsupp-analytics"'));
});

test("Smartsupp bootstrap does not duplicate the loader or clear queued SDK calls", () => {
  assert.ok(bootstrap);
  const { browser, inserted } = browserFixture();
  browser._smartsupp = { hideWidget: false, hideMobileWidget: false, cookieDomain: ".example.test" };
  runInNewContext(bootstrap, browser);
  browser.smartsupp("test:queued-call");
  const originalSdk = browser.smartsupp;
  runInNewContext(bootstrap, browser);
  assert.equal(inserted.length, 1);
  assert.equal(browser.smartsupp, originalSdk);
  assert.equal(browser.smartsupp._.length, 3);
  assert.deepEqual(Array.from(browser.smartsupp._[1]), ["test:queued-call"]);
  assert.deepEqual(Array.from(browser.smartsupp._[2]), ["chat:hide"]);
  assert.equal(browser._smartsupp.cookieDomain, ".example.test");
  assert.equal(browser._smartsupp.hideWidget, true);
  assert.equal(browser._smartsupp.hideMobileWidget, true);
});

test("Smartsupp does not load on password-reset links containing private credentials", () => {
  assert.ok(bootstrap);
  const { browser, inserted } = browserFixture();
  browser.location = { pathname: "/reset-password", search: "?token=test-only-reset-token" };
  runInNewContext(bootstrap, browser);
  assert.equal(inserted.length, 0);
  assert.equal(browser.smartsupp, undefined);
});

test("Smartsupp initializes on public, user and admin pages", () => {
  assert.ok(bootstrap);
  for (const pathname of ["/", "/dashboard", "/wallet", "/deposit", "/withdrawal", "/settings", "/admin"]) {
    const { browser, inserted } = browserFixture();
    browser.location.pathname = pathname;
    runInNewContext(bootstrap, browser);
    assert.equal(inserted.length, 1, `Analytics should initialize on ${pathname}`);
  }
});
