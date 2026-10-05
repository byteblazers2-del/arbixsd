export type VerificationStatus = 
  | 'CONFIRMED'
  | 'PENDING_CONFIRMATION'
  | 'NOT_FOUND'
  | 'MISMATCH'
  | 'ALREADY_CLAIMED'
  | 'API_ERROR';

export interface VerificationResult {
  status: VerificationStatus;
  found: boolean;
  txHash?: string;
  amount?: number;           // Standard floating/decimal display amount
  amountRaw?: string;        // Exact raw BigInt value as string (e.g. Wei, Sun, Satoshis, Nano)
  cryptoAmountStr?: string;  // Formatted exact string representation (e.g. "15.000000")
  sender?: string;
  recipient?: string;
  timestamp?: number;        // On-chain block timestamp in ms
  network?: string;
  coinSymbol?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  error?: string;
  details?: string;
}

export interface DetectedBlockchainTx {
  found: boolean;
  txHash?: string;
  amount?: number;
  sender?: string;
  timestamp?: number;
  network?: string;
  confirmations?: number;
  status?: VerificationStatus;
  error?: string;
  details?: string;
}

export interface ScanOptions {
  coinSymbol: string;
  networkId: string;
  address: string;
  targetCryptoAmount?: number;
  expectedMemo?: string;
  sessionStartTime?: number;
  minConfirmations?: number;
}

export interface DirectVerifyOptions {
  txHash: string;
  targetAddress: string;
  networkId: string;
  coinSymbol: string;
  expectedAmount?: number;
  expectedMemo?: string;
  minConfirmations?: number;
}

export interface AssetContractInfo {
  mint: string; // 'NATIVE' or contract address
  decimals: number;
}

export const ASSET_CONFIG: Record<string, Record<string, AssetContractInfo>> = {
  'BEP20': {
    'USDT': { mint: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
    'BNB': { mint: 'NATIVE', decimals: 18 }
  },
  'BSC': {
    'BNB': { mint: 'NATIVE', decimals: 18 },
    'USDT': { mint: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 }
  },
  'ERC20': {
    'USDT': { mint: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    'ETH': { mint: 'NATIVE', decimals: 18 }
  },
  'ETH': {
    'ETH': { mint: 'NATIVE', decimals: 18 },
    'USDT': { mint: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 }
  },
  'POLYGON': {
    'MATIC': { mint: 'NATIVE', decimals: 18 },
    'POL': { mint: 'NATIVE', decimals: 18 },
    'USDT': { mint: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6 }
  },
  'TRC20': {
    'USDT': { mint: 'TR7NHqJEKQxGTCi8q8ZY4pL8OTszgjLj6t', decimals: 6 },
    'TRX': { mint: 'NATIVE', decimals: 6 }
  },
  'TRON': {
    'TRX': { mint: 'NATIVE', decimals: 6 },
    'USDT': { mint: 'TR7NHqJEKQxGTCi8q8ZY4pL8OTszgjLj6t', decimals: 6 }
  },
  'SOLANA': {
    'SOL': { mint: 'NATIVE', decimals: 9 },
    'USDC': { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    'USDT': { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 }
  },
  'TON': {
    'TON': { mint: 'NATIVE', decimals: 9 }
  },
  'BTC': {
    'BTC': { mint: 'NATIVE', decimals: 8 }
  }
};

/**
 * Converts float or string crypto amount to exact BigInt units without precision loss.
 */
export function parseCryptoAmountToBigInt(amount: number | string, decimals: number): bigint {
  const str = typeof amount === 'number' ? amount.toFixed(decimals) : String(amount).trim();
  const parts = str.split('.');
  let intPart = parts[0] || '0';
  let fracPart = parts[1] || '';
  
  // Remove negative signs
  intPart = intPart.replace('-', '');

  if (fracPart.length > decimals) {
    fracPart = fracPart.substring(0, decimals);
  } else {
    fracPart = fracPart.padEnd(decimals, '0');
  }

  // Remove leading zeroes unless single zero
  const combined = (intPart + fracPart).replace(/^0+/, '');
  return BigInt(combined || '0');
}

/**
 * Formats a BigInt raw unit value into standard string decimal representation.
 */
export function formatBigIntToCryptoString(amountBig: bigint, decimals: number): string {
  const str = amountBig.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, str.length - decimals);
  const fracPart = str.slice(str.length - decimals);
  const trimmedFrac = fracPart.replace(/0+$/, '');
  return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
}

/**
 * Normalizes addresses across chains
 */
export function normalizeAddress(addr?: string): string {
  if (!addr) return '';
  return addr.trim().toLowerCase();
}
