import sharp from 'sharp';

export interface ReceiptData {
  loanAmount: number;        // USD amount (Strictly capped $25 - $300)
  cryptoAmount: string;      // e.g. "18.50 TON" or "450 TRX"
  coin: string;              // "TON", "TRX", "USDT", "SOL", "GRAM"
  pairLabel: string;         // "TON / USD", "TRX / USD", "USDT / TRC20"
  coinName: string;          // "Toncoin", "TRON", "Tether", "Solana", "Gram"
  collateralAmount: number;  // 120% USD
  collateralRatio: number;   // 120
  network: string;           // "TON Mainnet", "TRC20", "Solana"
  recipientAddress: string;  // e.g. "UQBx...9kL2" or "T9xK...3aP9"
  txHash: string;
  timestamp: number;
  orderId: string;
  bankRef: string;
  feeUsd: number;
  status: 'DISBURSED' | 'CONFIRMED' | 'SETTLED';
}

/**
 * Generates realistic micro loan disbursement amounts strictly capped between $25 and $300 USD
 * (e.g. 5 to 55 TON, 100 to 1250 TRX, 25 to 300 USDT, 0.1 to 1.5 SOL)
 * NEVER generates huge unrealistic whale amounts like 10 BTC or 10000 TON.
 */
/**
 * Generates realistic micro loan disbursement amounts strictly capped between $25 and $300 USD
 * using real-time live market prices (e.g. from Binance / CoinGecko)
 */
export function generateRandomReceiptData(livePrices?: Record<string, number>): ReceiptData {
  const strictRealisticUsdPool = [25, 30, 45, 50, 65, 75, 80, 100, 120, 140, 150, 180, 200, 240, 250, 280, 300];
  const loanUsd = strictRealisticUsdPool[Math.floor(Math.random() * strictRealisticUsdPool.length)];
  const collateralUsd = Math.round(loanUsd * 1.20);
  const fee = Number(((loanUsd * 1.8) / 100).toFixed(2));

  // Resolved dynamic market prices
  const tonPrice = (livePrices && livePrices.TON && livePrices.TON > 0) ? livePrices.TON : 5.65;
  const trxPrice = (livePrices && livePrices.TRX && livePrices.TRX > 0) ? livePrices.TRX : 0.245;
  const solPrice = (livePrices && livePrices.SOL && livePrices.SOL > 0) ? livePrices.SOL : 198.50;
  const gramPrice = (livePrices && livePrices.GRAM && livePrices.GRAM > 0) ? livePrices.GRAM : (tonPrice * 0.255);

  // Available real micro-crypto loan pools
  const cryptoOptions = [
    {
      coin: 'TON',
      coinName: 'Toncoin',
      pairLabel: 'TON / USD',
      network: 'TON Mainnet',
      prefix: 'UQ',
      chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
      calcAmount: (usd: number) => (usd / tonPrice).toFixed(2) + ' TON'
    },
    {
      coin: 'TRX',
      coinName: 'TRON',
      pairLabel: 'TRX / USD',
      network: 'TRC20 FastPath',
      prefix: 'T',
      chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      calcAmount: (usd: number) => Math.round(usd / trxPrice).toLocaleString() + ' TRX'
    },
    {
      coin: 'USDT',
      coinName: 'Tether USD',
      pairLabel: 'USDT / TRC20',
      network: 'TRC20',
      prefix: 'T',
      chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      calcAmount: (usd: number) => usd.toFixed(2) + ' USDT'
    },
    {
      coin: 'GRAM',
      coinName: 'Gram',
      pairLabel: 'GRAM / USD',
      network: 'TON Jetton',
      prefix: 'EQ',
      chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
      calcAmount: (usd: number) => (usd / gramPrice).toFixed(2) + ' GRAM'
    },
    {
      coin: 'SOL',
      coinName: 'Solana',
      pairLabel: 'SOL / USD',
      network: 'Solana SPL',
      prefix: 'So',
      chars: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      calcAmount: (usd: number) => (usd / solPrice).toFixed(3) + ' SOL'
    }
  ];

  const selectedCoin = cryptoOptions[Math.floor(Math.random() * cryptoOptions.length)];

  let randomMiddle = '';
  for (let i = 0; i < 28; i++) {
    randomMiddle += selectedCoin.chars.charAt(Math.floor(Math.random() * selectedCoin.chars.length));
  }
  const fullAddress = `${selectedCoin.prefix}${randomMiddle}`;
  const anonymized = `${fullAddress.slice(0, 6)}...${fullAddress.slice(-6)}`;

  let hashHex = selectedCoin.network.includes('TRC') ? '' : '0x';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    hashHex += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }

  const randomRefNum = Math.floor(10000000 + Math.random() * 90000000);

  return {
    loanAmount: loanUsd,
    cryptoAmount: selectedCoin.calcAmount(loanUsd),
    coin: selectedCoin.coin,
    pairLabel: selectedCoin.pairLabel,
    coinName: selectedCoin.coinName,
    collateralAmount: collateralUsd,
    collateralRatio: 120,
    network: selectedCoin.network,
    recipientAddress: anonymized,
    txHash: hashHex,
    timestamp: Date.now(),
    orderId: `LN-${Math.floor(100000 + Math.random() * 900000)}`,
    bankRef: `ARBIX-LN-${randomRefNum}`,
    feeUsd: fee,
    status: 'DISBURSED'
  };
}

/**
 * Builds a minimalist, borderless high-contrast white canvas with concise grey cards:
 * - Pure White Canvas (#FFFFFF)
 * - Borderless Smooth Grey Cards (#F1F4F9)
 * - Formal, official English typography (SF Pro / Inter)
 * - No logos, no blockchain txids, concise & high clarity
 */
export function buildReceiptSvg(data: ReceiptData): string {
  const dateStr = new Date(data.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  // Coin brand colors for accent dots/badges
  let coinAccent = '#0088CC'; // default TON blue
  if (data.coin === 'TRX') coinAccent = '#E51B24';
  if (data.coin === 'USDT') coinAccent = '#16A34A';
  if (data.coin === 'SOL') coinAccent = '#8B5CF6';
  if (data.coin === 'GRAM') coinAccent = '#0284C7';

  return `<svg width="1200" height="680" viewBox="0 0 1200 680" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 1. PURE WHITE CANVAS BACKGROUND -->
    <rect width="1200" height="680" fill="#FFFFFF"/>

    <!-- 2. TOP HEADER (CLEAN FORMAL ENGLISH, NO LOGO) -->
    <g transform="translate(70, 50)">
      <text x="0" y="22" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="-0.3">CREDIT DISBURSEMENT ADVICE</text>
      <text x="0" y="44" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="0.5">OFFICIAL PROOF OF LIQUIDITY TRANSFER</text>

      <!-- Status Badge (Top-Right, Borderless Soft Green) -->
      <g transform="translate(860, 2)">
        <rect x="0" y="0" width="200" height="40" rx="20" fill="#DCFCE7"/>
        <circle cx="20" cy="20" r="5" fill="#16A34A"/>
        <text x="34" y="25" fill="#15803D" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="13" font-weight="800" letter-spacing="0.5">DISBURSED &amp; SETTLED</text>
      </g>
    </g>

    <!-- 3. HERO CARD (LARGE BORDERLESS GREY SQUIRCLE) -->
    <g transform="translate(70, 120)">
      <rect x="0" y="0" width="1060" height="220" rx="28" fill="#F1F4F9"/>

      <g transform="translate(45, 42)">
        <text x="0" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="1">LOAN AMOUNT DISBURSED</text>

        <!-- Big Bold Crypto & USD Amount -->
        <text x="0" y="80" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', -apple-system, Roboto, sans-serif" font-size="62" font-weight="900" letter-spacing="-1.5">+${data.cryptoAmount}</text>
        <text x="0" y="122" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="20" font-weight="700">≈ $${data.loanAmount.toFixed(2)} USD • 1.80% Fixed Fee</text>
      </g>

      <!-- Coin Pill (Top-Right inside Hero Card) -->
      <g transform="translate(830, 40)">
        <rect x="0" y="0" width="185" height="56" rx="20" fill="#FFFFFF"/>
        <circle cx="28" cy="28" r="10" fill="${coinAccent}"/>
        <text x="48" y="35" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="19" font-weight="800">${data.coin}</text>
        <text x="110" y="34" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="14" font-weight="600">${data.pairLabel}</text>
      </g>
    </g>

    <!-- 4. CONCISE 2-CARD SECTION (BORDERLESS GREY) -->
    <!-- Card 1: Pledged Collateral (120%) -->
    <g transform="translate(70, 365)">
      <rect x="0" y="0" width="515" height="180" rx="26" fill="#F1F4F9"/>
      <g transform="translate(36, 36)">
        <text x="0" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">PLEDGED COLLATERAL (120%)</text>
        <text x="0" y="60" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, monospace" font-size="34" font-weight="900">$${data.collateralAmount.toFixed(2)} USD</text>
        <text x="0" y="96" fill="#16A34A" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="14" font-weight="700">✓ 100% Fully Refundable Upon Repayment</text>
      </g>
    </g>

    <!-- Card 2: Beneficiary Account & Network -->
    <g transform="translate(615, 365)">
      <rect x="0" y="0" width="515" height="180" rx="26" fill="#F1F4F9"/>
      <g transform="translate(36, 36)">
        <text x="0" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">BENEFICIARY RECIPIENT</text>
        <text x="0" y="60" fill="${coinAccent}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, monospace" font-size="25" font-weight="800">${data.recipientAddress}</text>
        <text x="0" y="96" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="14" font-weight="600">Network: ${data.network} • 30-Day Renewable</text>
      </g>
    </g>

    <!-- 5. ELEGANT FOOTER (DATE & ORDER ID) -->
    <g transform="translate(70, 595)">
      <text x="0" y="16" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="13" font-weight="600">Issued Date: ${dateStr}</text>
      <text x="1060" y="16" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, monospace" font-size="13" font-weight="700" text-anchor="end">Ref: ${data.orderId}</text>
    </g>
  </svg>`;
}


/**
 * Converts the SVG into high-resolution 4K/2K PNG buffer using Sharp
 */
export async function generateReceiptPngBuffer(data?: ReceiptData, livePrices?: Record<string, number>): Promise<{ buffer: Buffer; data: ReceiptData }> {
  const receiptData = data || generateRandomReceiptData(livePrices);
  const svgString = buildReceiptSvg(receiptData);

  const buffer = await sharp(Buffer.from(svgString), { density: 150 })
    .png({ quality: 95 })
    .toBuffer();

  return { buffer, data: receiptData };
}
