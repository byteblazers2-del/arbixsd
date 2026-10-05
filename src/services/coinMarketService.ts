import { FALLBACK_RATES } from '../utils/cryptoRates';

export interface CoinMarketData {
  symbol: string;
  currentPrice: number;
  change24h: number;
  change24hStr: string;
  isPositive: boolean;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume24h: number;
  sparkline: number[];
  startLabel: string;
  endLabel: string;
  lastUpdated: number;
}

const BINANCE_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  TON: 'TONUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  DOGE: 'DOGEUSDT',
  TRX: 'TRXUSDT',
  NOT: 'NOTUSDT',
  SUI: 'SUIUSDT',
  XRP: 'XRPUSDT',
  BCH: 'BCHUSDT',
  MATIC: 'POLUSDT',
  USDC: 'USDCUSDT',
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  TON: 'the-open-network',
  SOL: 'solana',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  TRX: 'tron',
  NOT: 'notcoin',
  SUI: 'sui',
  XRP: 'ripple',
  BCH: 'bitcoin-cash',
  MATIC: 'polygon-ecosystem-token',
  USDC: 'usd-coin',
  USDT: 'tether',
  STARS: 'telegram-stars',
};

// Simple memory cache with 45s TTL to avoid rate limits
const cache: Record<string, { data: CoinMarketData; timestamp: number }> = {};
const CACHE_TTL_MS = 60000;

export function getCachedMarketData(symbol: string): CoinMarketData | null {
  const sym = symbol.toUpperCase();
  const cached = cache[sym];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function getInstantMarketData(symbol: string, currentRate?: number): CoinMarketData {
  const sym = symbol.toUpperCase();
  const cached = getCachedMarketData(sym);
  if (cached) return cached;

  const price = currentRate || FALLBACK_RATES[sym] || 1;
  const isStable = sym === 'USDT' || sym === 'USDE' || sym === 'USDC';
  const openPrice = isStable ? 1.0 : price * 0.985;
  const highPrice = isStable ? 1.0005 : price * 1.015;
  const lowPrice = isStable ? 0.9995 : price * 0.98;

  const sparkline = generateSynthesizedSparkline(openPrice, price, highPrice, lowPrice);

  return {
    symbol: sym,
    currentPrice: price,
    change24h: isStable ? 0 : 1.5,
    change24hStr: isStable ? '0.00%' : '+1.50%',
    isPositive: true,
    openPrice,
    highPrice,
    lowPrice,
    volume24h: isStable ? 42000000000 : price * 1250000,
    sparkline,
    startLabel: '24h ago',
    endLabel: 'Today',
    lastUpdated: Date.now(),
  };
}

export function preloadTopCoinsMarketData(): void {
  const topSymbols = ['BTC', 'ETH', 'TON', 'SOL', 'BNB', 'TRX', 'DOGE', 'NOT', 'SUI', 'STARS'];
  topSymbols.forEach(sym => {
    fetchCoinMarketData(sym).catch(() => {});
  });
}

export async function fetchCoinMarketData(symbol: string): Promise<CoinMarketData> {
  const sym = symbol.toUpperCase();
  const cached = cache[sym];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Handle stablecoins
  if (sym === 'USDT' || sym === 'USDE' || sym === 'USDC') {
    const defaultData: CoinMarketData = {
      symbol: sym,
      currentPrice: 1.0,
      change24h: 0.0,
      change24hStr: '0.00%',
      isPositive: true,
      openPrice: 1.0,
      highPrice: 1.0005,
      lowPrice: 0.9995,
      volume24h: 42000000000,
      sparkline: Array(24).fill(1.0).map((v, i) => v + (Math.sin(i / 3) * 0.0004)),
      startLabel: 'Yesterday',
      endLabel: 'Today',
      lastUpdated: Date.now(),
    };
    cache[sym] = { data: defaultData, timestamp: Date.now() };
    return defaultData;
  }

  // Try Binance API first
  const pair = BINANCE_PAIRS[sym];
  if (pair) {
    try {
      const [tickerRes, klinesRes] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`),
        fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=24`)
      ]);

      if (tickerRes.ok && klinesRes.ok) {
        const ticker = await tickerRes.json();
        const klines = await klinesRes.json();

        const currentPrice = parseFloat(ticker.lastPrice) || FALLBACK_RATES[sym] || 1;
        const change24h = parseFloat(ticker.priceChangePercent) || 0;
        const openPrice = parseFloat(ticker.openPrice) || currentPrice;
        const highPrice = parseFloat(ticker.highPrice) || currentPrice;
        const lowPrice = parseFloat(ticker.lowPrice) || currentPrice;
        const volume24h = parseFloat(ticker.volume) || 0;

        let sparkline: number[] = [];
        if (Array.isArray(klines) && klines.length > 0) {
          sparkline = klines.map((k: any) => parseFloat(k[4]));
        }

        if (sparkline.length < 5) {
          sparkline = generateSynthesizedSparkline(openPrice, currentPrice, highPrice, lowPrice);
        }

        const isPositive = change24h >= 0;
        const change24hStr = `${isPositive ? '+' : ''}${change24h.toFixed(2)}%`;

        const data: CoinMarketData = {
          symbol: sym,
          currentPrice,
          change24h,
          change24hStr,
          isPositive,
          openPrice,
          highPrice,
          lowPrice,
          volume24h,
          sparkline,
          startLabel: '24h ago',
          endLabel: 'Today',
          lastUpdated: Date.now(),
        };

        cache[sym] = { data, timestamp: Date.now() };
        return data;
      }
    } catch {
      // Continue to CoinGecko fallback
    }
  }

  // Try CoinGecko fallback
  const cgId = COINGECKO_IDS[sym];
  if (cgId) {
    try {
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=1`
      );
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        if (cgData.prices && Array.isArray(cgData.prices) && cgData.prices.length > 0) {
          const rawPrices: number[] = cgData.prices.map((p: [number, number]) => p[1]);
          // Sample down to ~24 points
          const step = Math.max(1, Math.floor(rawPrices.length / 24));
          const sparkline: number[] = [];
          for (let i = 0; i < rawPrices.length; i += step) {
            sparkline.push(rawPrices[i]);
            if (sparkline.length >= 24) break;
          }
          if (rawPrices.length > 0 && sparkline[sparkline.length - 1] !== rawPrices[rawPrices.length - 1]) {
            sparkline.push(rawPrices[rawPrices.length - 1]);
          }

          const openPrice = sparkline[0] || FALLBACK_RATES[sym] || 1;
          const currentPrice = sparkline[sparkline.length - 1] || openPrice;
          const highPrice = Math.max(...sparkline);
          const lowPrice = Math.min(...sparkline);
          const change24h = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0;
          const isPositive = change24h >= 0;
          const change24hStr = `${isPositive ? '+' : ''}${change24h.toFixed(2)}%`;

          const data: CoinMarketData = {
            symbol: sym,
            currentPrice,
            change24h,
            change24hStr,
            isPositive,
            openPrice,
            highPrice,
            lowPrice,
            volume24h: 1500000,
            sparkline,
            startLabel: '24h ago',
            endLabel: 'Today',
            lastUpdated: Date.now(),
          };

          cache[sym] = { data, timestamp: Date.now() };
          return data;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // Graceful Fallback if APIs are unreachable
  const basePrice = FALLBACK_RATES[sym] || 1.0;
  const mockChange = sym === 'BTC' ? 2.14 : sym === 'ETH' ? 1.85 : sym === 'TON' ? 0.97 : sym === 'SOL' ? 3.42 : 1.2;
  const openPrice = basePrice * (1 - mockChange / 100);
  const sparkline = generateSynthesizedSparkline(openPrice, basePrice, basePrice * 1.02, basePrice * 0.98);

  const fallbackData: CoinMarketData = {
    symbol: sym,
    currentPrice: basePrice,
    change24h: mockChange,
    change24hStr: `+${mockChange.toFixed(2)}%`,
    isPositive: true,
    openPrice,
    highPrice: basePrice * 1.025,
    lowPrice: basePrice * 0.975,
    volume24h: 85000000,
    sparkline,
    startLabel: '24h ago',
    endLabel: 'Today',
    lastUpdated: Date.now(),
  };

  cache[sym] = { data: fallbackData, timestamp: Date.now() };
  return fallbackData;
}

// Generate smooth 24-point sparkline for fallback
function generateSynthesizedSparkline(open: number, close: number, high: number, low: number): number[] {
  const points: number[] = [];
  const range = high - low || open * 0.05;
  const trend = close - open;

  for (let i = 0; i < 24; i++) {
    const progress = i / 23;
    const base = open + trend * progress;
    const wave = Math.sin(progress * Math.PI * 3.5) * (range * 0.35);
    const noise = (Math.cos(i * 1.7) * 0.15) * range;
    let val = base + wave + noise;
    val = Math.max(low * 0.99, Math.min(high * 1.01, val));
    points.push(parseFloat(val.toFixed(4)));
  }
  // Ensure start and end match exactly
  points[0] = open;
  points[points.length - 1] = close;
  return points;
}
