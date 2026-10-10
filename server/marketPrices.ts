export const MARKET_REFRESH_MS = 30_000;

/** One shared cache and one in-flight request per symbol across all consumers. */
export class MarketQuoteCache<T extends { price: number }> {
  private quotes = new Map<string, { quote: T; checkedAt: number }>();
  private pending = new Map<string, Promise<T | null>>();
  private tracked = new Set<string>();

  constructor(private fetchQuote: (symbol: string) => Promise<T | null>) {}

  async get(symbol: string, force = false): Promise<T | null> {
    symbol = symbol.toUpperCase();
    this.tracked.add(symbol);
    const cached = this.quotes.get(symbol);
    if (!force && cached && Date.now() - cached.checkedAt < MARKET_REFRESH_MS) return cached.quote;
    const pending = this.pending.get(symbol);
    if (pending) return pending;
    const request = (async () => {
      try {
        const quote = await this.fetchQuote(symbol);
        if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return null;
        this.quotes.set(symbol, { quote, checkedAt: Date.now() });
        return quote;
      } catch {
        return null;
      } finally {
        this.pending.delete(symbol);
      }
    })();
    this.pending.set(symbol, request);
    return request;
  }

  async refresh() {
    const symbols = Array.from(this.tracked);
    for (let i = 0; i < symbols.length; i += 20) {
      await Promise.all(symbols.slice(i, i + 20).map(symbol => this.get(symbol, true)));
    }
  }
}

export const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'LTC'];

export async function fetchCryptoQuote(symbol: string) {
  const response = await fetch(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = await response.json() as { data?: { amount?: string } };
  const price = Number(body.data?.amount);
  if (!Number.isFinite(price) || price <= 0) return null;
  return { symbol, price, source: 'Coinbase', checkedAt: new Date().toISOString() };
}
