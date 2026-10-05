/**
 * Real-time Live Price Service
 * Fetches accurate crypto prices directly from Binance public API
 * with instant fallback and periodic refresh
 */

export interface TokenPrices {
  [symbol: string]: number;
}

const DEFAULT_PRICES: TokenPrices = {
  USDT: 1.00,
  GRAM: 1.462,
  TON: 5.62,
  BTC: 94850.00,
  ETH: 3380.50,
  SOL: 198.40,
  NOT: 0.00785,
  DOGS: 0.00065,
  TRX: 0.2435,
  BNB: 642.80,
  STARS: 0.02,
  XRP: 2.42,
  SUI: 3.45,
  DOGE: 0.385
};

let cachedPrices: TokenPrices = { ...DEFAULT_PRICES };
const listeners = new Set<(prices: TokenPrices) => void>();
let fetchTimer: any = null;

export async function fetchLiveBinancePrices(): Promise<TokenPrices> {
  // 1. Try server proxy first for fast unblocked live rates
  try {
    const pRes = await fetch('/api/crypto/live-prices', { cache: 'no-cache' });
    if (pRes.ok) {
      const pJson = await pRes.json();
      if (pJson.success && pJson.data) {
        cachedPrices = { ...cachedPrices, ...pJson.data };
        listeners.forEach((fn) => fn(cachedPrices));
        return cachedPrices;
      }
    }
  } catch (e) {}

  // 2. Direct Binance fetch
  try {
    const symbols = [
      'BTCUSDT',
      'ETHUSDT',
      'SOLUSDT',
      'TONUSDT',
      'BNBUSDT',
      'TRXUSDT',
      'DOGEUSDT',
      'XRPUSDT',
      'NOTUSDT',
      'DOGSUSDT'
    ];

    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbolsParam}`, {
      cache: 'no-cache'
    });

    if (res.ok) {
      const data: Array<{ symbol: string; price: string }> = await res.json();
      const updated: TokenPrices = { ...cachedPrices };

      data.forEach((item) => {
        const p = parseFloat(item.price);
        if (!isNaN(p) && p > 0) {
          const coin = item.symbol.replace('USDT', '');
          updated[coin] = p;
        }
      });

      // GRAM price in TON ecosystem is ~0.255 TON
      if (updated.TON && updated.TON > 0) {
        updated.GRAM = parseFloat((updated.TON * 0.255).toFixed(4));
      }

      updated.USDT = 1.00;
      updated.STARS = 0.02;

      cachedPrices = updated;
      listeners.forEach((fn) => fn(cachedPrices));
      return cachedPrices;
    }
  } catch (err) {
    // Silently retain cached prices on transient network glitch
  }

  return cachedPrices;
}

export function subscribeLivePrices(callback: (prices: TokenPrices) => void): () => void {
  listeners.add(callback);
  callback(cachedPrices);

  if (!fetchTimer) {
    fetchLiveBinancePrices();
    fetchTimer = setInterval(fetchLiveBinancePrices, 6000);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && fetchTimer) {
      clearInterval(fetchTimer);
      fetchTimer = null;
    }
  };
}

export function getCachedPrices(): TokenPrices {
  return cachedPrices;
}
