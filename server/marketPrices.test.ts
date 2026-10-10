import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MarketQuoteCache } from './marketPrices';

test('shares the same market price across callers and refreshes changed prices', async () => {
  let price = 100;
  let calls = 0;
  const cache = new MarketQuoteCache(async () => {
    calls++;
    return { price };
  });
  assert.equal((await cache.get('aapl'))?.price, 100);
  assert.equal((await cache.get('AAPL'))?.price, 100);
  assert.equal(calls, 1);
  price = 105;
  await cache.refresh();
  assert.equal((await cache.get('AAPL'))?.price, 105);
  assert.equal(calls, 2);
});

test('deduplicates concurrent requests for one symbol', async () => {
  let calls = 0;
  const cache = new MarketQuoteCache(async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { price: 50 };
  });
  const quotes = await Promise.all(Array.from({ length: 10 }, () => cache.get('MSFT')));
  assert.equal(calls, 1);
  assert.ok(quotes.every(quote => quote?.price === 50));
});

test('rejects missing, invalid, and failed market data instead of inventing prices', async () => {
  for (const price of [0, -1, NaN, Infinity]) {
    const cache = new MarketQuoteCache(async () => ({ price }));
    assert.equal(await cache.get('INVALID'), null);
  }
  const cache = new MarketQuoteCache(async () => { throw new Error('Provider unavailable'); });
  assert.equal(await cache.get('BTC'), null);
});

test('expired quotes are not silently returned during an outage', async () => {
  let available = true;
  const cache = new MarketQuoteCache(async () => available ? { price: 100 } : null);
  await cache.get('AAPL');
  available = false;
  const originalNow = Date.now;
  const now = originalNow();
  Date.now = () => now + 31_000;
  try {
    assert.equal(await cache.get('AAPL'), null);
  } finally {
    Date.now = originalNow;
  }
});
