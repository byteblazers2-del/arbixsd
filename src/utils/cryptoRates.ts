export interface LiveRate {
  symbol: string;
  usdPrice: number;
  lastUpdated: number;
}

export const FALLBACK_RATES: Record<string, number> = {
  STARS: 0.02,
  USDT: 1.00,
  TON: 5.65,
  GRAM: 1.42,
  USDE: 1.00,
  STAKED: 1.55,
  NOT: 0.00785,
  DOGS: 0.00065,
  BTC: 94850.00,
  ETH: 3380.50,
  TRX: 0.245,
  SOL: 198.50,
  BNB: 645.20,
  XRP: 2.42,
  DOGE: 0.38,
  BCH: 485.00,
  USDC: 1.00,
  SUI: 3.45,
  MATIC: 0.54,
};

const SYMBOL_MAPPING: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  TRX: 'TRXUSDT',
  TON: 'TONUSDT',
  NOT: 'NOTUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT',
  BCH: 'BCHUSDT',
  USDC: 'USDCUSDT',
  SUI: 'SUIUSDT',
  MATIC: 'POLUSDT',
};

// Fetch real-time live prices and 24h changes from server proxy / Binance API / CoinGecko
export async function fetchLiveCryptoRatesAndChanges(): Promise<{ rates: Record<string, number>; changes: Record<string, string> }> {
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  const changes: Record<string, string> = {
    STARS: '0.00%',
    USDT: '0.00%',
    USDE: '0.00%',
    USDC: '0.00%',
    BTC: '+1.50%',
    ETH: '+1.20%',
    TON: '+2.40%',
    GRAM: '+3.10%',
    SOL: '+3.80%',
    BNB: '+1.10%',
    TRX: '+0.95%',
    DOGE: '+0.50%',
    NOT: '-0.80%',
    DOGS: '+0.20%',
    SUI: '+4.50%',
    XRP: '+1.90%',
    BCH: '+0.80%',
    MATIC: '+1.20%',
  };

  // 1. First attempt: Dedicated Server Proxy (Fast, unblocked, accurate)
  try {
    const proxyRes = await fetch('/api/crypto/live-prices', { cache: 'no-cache' });
    if (proxyRes.ok) {
      const pJson = await proxyRes.json();
      if (pJson.success && pJson.data) {
        Object.keys(pJson.data).forEach(sym => {
          if (typeof pJson.data[sym] === 'number' && pJson.data[sym] > 0) {
            rates[sym] = pJson.data[sym];
          }
        });
        if (pJson.changes) {
          Object.keys(pJson.changes).forEach(sym => {
            changes[sym] = pJson.changes[sym];
          });
        }
        return { rates, changes };
      }
    }
  } catch (e) {
    // Continue to direct Binance fetch
  }

  // 2. Direct Binance API
  try {
    const symbols = Object.values(SYMBOL_MAPPING);
    const symbolsParam = JSON.stringify(symbols);
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`);
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
          const matchedSymbol = Object.keys(SYMBOL_MAPPING).find(
            k => SYMBOL_MAPPING[k] === item.symbol
          );
          if (matchedSymbol) {
            const parsedPrice = parseFloat(item.lastPrice);
            if (!isNaN(parsedPrice) && parsedPrice > 0) {
              rates[matchedSymbol] = parsedPrice;
            }
            const pct = parseFloat(item.priceChangePercent);
            if (!isNaN(pct)) {
              changes[matchedSymbol] = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            }
          }
        });
        if (rates.TON) {
          rates.GRAM = parseFloat((rates.TON * 0.255).toFixed(4));
        }
        return { rates, changes };
      }
    }
  } catch (e) {
    // Fall through to secondary API
  }

  // 3. Fallback to CoinGecko simple price API
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gram,bitcoin,ethereum,toncoin,solana,binancecoin,ripple,dogecoin,tron,notcoin,sui,polygon,tether,usd-coin&vs_currencies=usd&include_24hr_change=true');
    if (cgRes.ok) {
      const cgData = await cgRes.json();
      const mapCg: Record<string, string> = {
        bitcoin: 'BTC',
        ethereum: 'ETH',
        toncoin: 'TON',
        gram: 'GRAM',
        solana: 'SOL',
        binancecoin: 'BNB',
        ripple: 'XRP',
        dogecoin: 'DOGE',
        tron: 'TRX',
        notcoin: 'NOT',
        sui: 'SUI',
        polygon: 'MATIC',
        tether: 'USDT',
        'usd-coin': 'USDC'
      };

      Object.entries(mapCg).forEach(([cgId, sym]) => {
        if (cgData[cgId]?.usd) {
          rates[sym] = parseFloat(cgData[cgId].usd);
          const chg = cgData[cgId].usd_24h_change;
          if (typeof chg === 'number') {
            changes[sym] = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
          }
        }
      });
      return { rates, changes };
    }
  } catch (err) {}

  return { rates, changes };
}

// Fetch real-time live prices from public Binance API with fallback to CoinGecko
export async function fetchLiveCryptoRates(): Promise<Record<string, number>> {
  const { rates } = await fetchLiveCryptoRatesAndChanges();
  return rates;
}

export function formatCryptoAmount(usdAmount: number, symbol: string, rate: number): string {
  if (usdAmount <= 0 || !rate || rate <= 0) return '0.00';

  const rawAmount = usdAmount / rate;

  switch (symbol.toUpperCase()) {
    case 'BTC':
      return rawAmount < 0.0001 ? rawAmount.toFixed(8) : rawAmount < 0.01 ? rawAmount.toFixed(7) : rawAmount.toFixed(6);
    case 'ETH':
    case 'BCH':
      return rawAmount < 0.001 ? rawAmount.toFixed(7) : rawAmount < 0.01 ? rawAmount.toFixed(6) : rawAmount.toFixed(5);
    case 'SOL':
    case 'BNB':
    case 'SUI':
      return rawAmount < 0.01 ? rawAmount.toFixed(6) : rawAmount.toFixed(4);
    case 'TON':
    case 'TRX':
    case 'XRP':
    case 'DOGE':
    case 'MATIC':
      return rawAmount < 0.0001 ? rawAmount.toFixed(7) : rawAmount < 0.01 ? rawAmount.toFixed(5) : rawAmount < 1 ? rawAmount.toFixed(4) : rawAmount.toFixed(3);
    case 'USDT':
    case 'USDC':
    default:
      return rawAmount < 0.01 ? rawAmount.toFixed(5) : rawAmount.toFixed(2);
  }
}
