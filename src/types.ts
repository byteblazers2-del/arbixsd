export interface UserData {
  id: string; // Firebase Auth UID or local key
  telegramId?: number | string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  balance: number; // Total USD balance valuation
  cryptoBalances?: Record<string, number>; // Exact holdings per coin e.g. { 'USDT': 100, 'TON': 15.5, 'BTC': 0.002, 'ETH': 0.05, 'SOL': 1.2 }
  bonusBalance?: number;
  role: 'user' | 'admin';
  isFrozen?: boolean;
  notes?: string;
  createdAt: number;
  lastLogin?: number;
  // Referral & Multi-Bot tracking
  referredBy?: string | null; // UID or Telegram ID of the inviter
  referralCode?: string;
  referralsCount?: number;
  referralEarnings?: number;
  sourceBotUsername?: string | null;
  sourceBotId?: string | null;
  totalArbitrageInvested?: number;
  totalProfitEarned?: number;
  withdrawalLockUntil?: number; // Timestamp until which withdrawals are locked (24h lock after plan activation)
  // Phone & KYC Verification
  phoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: number | string;
  personalDataSubmitted?: boolean;
  lockedCollateralUsd?: number;
  totalBorrowedUsd?: number;
  // User Preferences
  preferredCurrency?: string;
  preferredLanguage?: string;
  language?: string;
  hapticEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export interface LoanRecord {
  id: string;
  userId: string;
  telegramUsername?: string;
  telegramId?: number | string;
  borrowAmount: number; // e.g. 100
  collateralAmount: number; // e.g. 130 (130% collateral)
  collateralCoin: string; // 'USDT' | 'TON' | 'BTC' | 'ETH'
  collateralRatio: number; // 1.30 (130%)
  interestRatePct: number; // e.g. 0% or 1.5%
  durationDays: number; // e.g. 30
  status: 'active' | 'repaid' | 'liquidated';
  createdAt: number;
  dueAt: number;
  repaidAt?: number;
  txid?: string;
}

export interface Plan {
  id: string;
  name: string;
  minAmount: number;
  maxAmount?: number;
  expectedReturnPct: number;
  dailyReturnPct?: number;
  durationDays: number;
  badge?: string; // e.g. "HOT", "VIP", "AI MATRIX"
  description?: string;
  isActive: boolean;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  amount: number;
  status: 'active' | 'completed';
  createdAt: number;
  durationDays?: number;
  dailyYield?: number;
  returns: number;
}

export interface Transaction {
  id: string;
  userId: string;
  telegramUsername?: string;
  telegramId?: number | string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'bonus' | 'investment_payout' | 'yield' | 'profit';
  amount: number;
  cryptoAmount?: string;
  currency: string;
  network?: string;
  recipient?: string;
  address?: string;
  txid?: string;
  txHash?: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  createdAt: number;
  note?: string;
}

export interface DepositRecord {
  id: string;
  orderId: string;
  userId: string;
  telegramUsername?: string | null;
  telegramId?: number | string | null;
  usdAmount: number;
  cryptoAmount?: string;
  coin: string;
  coinName?: string;
  network: string;
  depositAddress: string;
  memoTag?: string | null;
  txid?: string;
  txHash?: string;
  senderAddress?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  fromBot?: boolean;
  botName?: string | null;
  sourceBotUsername?: string | null;
  createdAt?: any;
  timestamp?: number;
  approvedAt?: number;
  rejectedReason?: string;
}

export interface WalletConfig {
  id: string; // e.g. "usdt-trc20"
  coinId: string; // e.g. "usdt"
  coinSymbol: string; // e.g. "USDT"
  coinName?: string; // e.g. "Tether USD"
  iconUrl?: string; // Custom logo/icon image URL
  networkId: string; // e.g. "trc20"
  networkName: string; // e.g. "TRON (TRC20)"
  address: string;
  memo?: string;
  minDeposit?: string;
  isActive?: boolean;
}

export interface SystemSettings {
  announcement: string;
  isAnnouncementActive: boolean;
  announcementType?: 'info' | 'success' | 'warning';
  minDeposit: number;
  minWithdrawal: number;
  adminTelegramIds: (string | number)[];
  adminChannelId?: string;
  channelAlertBotId?: string; // Specific bot ID or username assigned to send channel alerts
  supportTelegramUsername?: string;
  primaryBotUsername?: string;
  primaryBotToken?: string;
  maintenanceMode: boolean;
  starsIconUrl?: string;
  customIconUrls?: Record<string, string>;
}

export interface CryptoTicker {
  symbol: string;
  price: number;
  change24h: number;
}

export interface TelegramBotConfig {
  id: string; // Firestore doc ID or bot ID
  token: string; // Bot Token e.g. 123456:ABC-DEF...
  botUsername: string; // e.g. "CryptoArbitrage_Bot"
  botName: string; // e.g. "Crypto Arbitrage Bot #1"
  botId: number | string;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
  supportsInlineQueries?: boolean;
  webhookUrl?: string;
  webhookStatus?: 'active' | 'not_set' | 'error' | 'pending';
  lastWebhookCheck?: number;
  lastWebhookError?: string;
  pendingUpdateCount?: number;
  menuButtonSet?: boolean;
  commandsSet?: boolean;
  assignedChannelId?: string; // Optional per-bot dedicated channel ID
  totalUsers?: number;
  totalDepositsUsd?: number;
  createdAt: number;
  updatedAt?: number;
  isActive: boolean;
  isPrimary?: boolean;
  notes?: string;
}
