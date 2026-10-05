import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  runTransaction,
  query,
  where,
  limit
} from "firebase/firestore";
import { checkMultiChainDepositStatus, verifyDirectTxHash } from "./src/utils/scanners/index";
import { generateReceiptPngBuffer, generateRandomReceiptData, ReceiptData } from "./src/services/receiptImageGenerator";

// -----------------------------------------------------------------------------
// FIREBASE FIRESTORE INITIALIZATION (SERVER-SIDE PERSISTENCE)
// -----------------------------------------------------------------------------
// FIREBASE FIRESTORE INITIALIZATION (SERVER-SIDE PERSISTENCE)
// -----------------------------------------------------------------------------
let firebaseConfig: any = {
  projectId: "decent-container-vq6d2",
  appId: "1:686093232101:web:46e1aaac13e6328a7b310c",
  apiKey: "AIzaSyCnZBI9KmjE5LFxzGfifxZMD7Y6YDhhenk",
  authDomain: "decent-container-vq6d2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-cryptoarbitragem-ce3e0577-2aa1-45f1-b57e-e4882bc491cc",
  storageBucket: "decent-container-vq6d2.firebasestorage.app",
  messagingSenderId: "686093232101"
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn("🔥 [Server] Could not read firebase-applet-config.json, using fallback:", e);
}

const serverFirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId);

interface TelegramBotItem {
  id: string;
  botId: number;
  token: string;
  botUsername: string;
  botName: string;
  webhookUrl?: string;
  webhookStatus?: 'active' | 'error' | 'not_set' | 'polling';
  pollingActive?: boolean;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  isPrimary?: boolean;
  menuButtonSet?: boolean;
  commandsSet?: boolean;
}

interface PlanItem {
  id: string;
  name: string;
  minAmount: number;
  maxAmount?: number;
  durationDays: number;
  expectedReturnPct: number;
  dailyReturnPct?: number;
  badge?: string;
  description?: string;
  isActive: boolean;
}

interface DepositItem {
  id: string;
  orderId: string;
  userId: string;
  telegramUsername?: string | null;
  telegramId?: number | string | null;
  usdAmount: number;
  cryptoAmount: string;
  coin: string;
  coinName?: string;
  network: string;
  depositAddress: string;
  memoTag?: string | null;
  txid: string;
  senderAddress?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string;
  approvedAt?: number;
  isAutoVerified?: boolean;
  fromBot?: boolean;
  botName?: string | null;
  sourceBotUsername?: string | null;
  sourceBotId?: string | null;
  createdAt: number;
  timestamp: number;
}

interface UserItem {
  id: string;
  telegramId?: number | string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  balance: number;
  bonusBalance: number;
  cryptoBalances?: Record<string, number>;
  role: 'admin' | 'user';
  createdAt: number;
  lastLogin?: number;
  referredBy?: string | null;
  referralCode?: string;
  referralsCount?: number;
  referralEarnings?: number;
  sourceBotUsername?: string | null;
  sourceBotId?: string | null;
  isFrozen?: boolean;
  totalArbitrageInvested?: number;
  totalProfitEarned?: number;
  language?: string;
  preferredLanguage?: string;
  withdrawalLockUntil?: number;
  phoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: number;
  personalDataSubmitted?: boolean;
  lockedCollateralUsd?: number;
  totalBorrowedUsd?: number;
}

interface LoanItem {
  id: string;
  userId: string;
  telegramUsername?: string;
  telegramId?: number | string;
  borrowAmount: number;
  collateralAmount: number; // 130%
  collateralCoin: string;
  collateralRatio: number;
  interestRatePct: number;
  durationDays: number;
  status: 'active' | 'repaid' | 'liquidated';
  createdAt: number;
  dueAt: number;
  repaidAt?: number;
  txid?: string;
}

interface TransactionItem {
  id: string;
  userId: string;
  telegramUsername?: string;
  telegramId?: string | number;
  type: 'deposit' | 'withdrawal' | 'yield' | 'bonus' | 'transfer' | 'profit' | 'investment_payout';
  amount: number;
  cryptoAmount?: string;
  currency: string;
  network?: string;
  recipient?: string;
  txid?: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: number;
  note?: string;
}

// -----------------------------------------------------------------------------
// LOCAL DATA CACHE & BACKUP
// -----------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), '.server-data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

const BOTS_FILE = path.join(DATA_DIR, 'bots.json');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const LOANS_FILE = path.join(DATA_DIR, 'loans.json');

const DEFAULT_PLANS: PlanItem[] = [
  { 
    id: 'p1', 
    name: 'Flash Arbitrage (HFT Micro-Route)', 
    minAmount: 20, 
    maxAmount: 1000,
    durationDays: 7, 
    expectedReturnPct: 4.80, 
    dailyReturnPct: 0.68,
    badge: 'HFT FLASH',
    description: 'Sub-second spread execution on major CEX order books with automated cycle settlement',
    isActive: true
  },
  { 
    id: 'p2', 
    name: 'Triangular Multi-Route (Matrix Bot)', 
    minAmount: 50, 
    maxAmount: 5000,
    durationDays: 14, 
    expectedReturnPct: 10.50, 
    dailyReturnPct: 0.75,
    badge: 'TRIANGULAR AI',
    description: '3-way currency pair divergence capture (USDT-BTC-ETH) with sub-second hedging',
    isActive: true
  },
  { 
    id: 'p3', 
    name: 'Deep Liquidity Pool (Institutional)', 
    minAmount: 200, 
    maxAmount: 20000,
    durationDays: 30, 
    expectedReturnPct: 24.00, 
    dailyReturnPct: 0.80,
    badge: 'VOLUME TIER',
    description: 'Aggregated institutional order flow with VIP fee discounts and automated arbitrage rebalancing',
    isActive: true
  },
  { 
    id: 'p4', 
    name: 'VIP Dark-Pool Fund (Whale Tier)', 
    minAmount: 1000, 
    maxAmount: 100000,
    durationDays: 60, 
    expectedReturnPct: 54.00, 
    dailyReturnPct: 0.90,
    badge: 'VIP ULTRA',
    description: 'Direct OTC dark-pool liquidity routing with zero-maker fee rebates and cross-margin hedging',
    isActive: true
  },
];

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Error writing ${filePath}:`, e);
  }
}

// In-Memory state synchronized with Firestore
let registeredBots: Map<string, TelegramBotItem> = new Map();
let storedPlans: PlanItem[] = readJsonFile(PLANS_FILE, DEFAULT_PLANS);
let storedDeposits: DepositItem[] = readJsonFile(DEPOSITS_FILE, []);
let storedUsers: UserItem[] = readJsonFile(USERS_FILE, []);
let storedTransactions: TransactionItem[] = readJsonFile(TRANSACTIONS_FILE, []);
let storedLoans: LoanItem[] = readJsonFile(LOANS_FILE, []);
let storedSettings: any = null;
let botPollingOffsets: Map<string, number> = new Map();
let isPollingLoopActive = false;
let configuredBotsWithTelegram: Set<string> = new Set();

// -----------------------------------------------------------------------------
// FIRESTORE SYNC & PERSISTENCE ENGINE
// -----------------------------------------------------------------------------
async function initFirestoreData(getBaseUrl: () => string) {
  console.log("🔥 [Firestore] Initializing Server Firestore Data Sync...");
  
  // 1. Load Bots from Firestore
  try {
    const botsSnap = await getDocs(collection(db, 'telegram_bots'));
    if (!botsSnap.empty) {
      botsSnap.forEach(docSnap => {
        const botData = docSnap.data() as TelegramBotItem;
        if (botData.token) {
          registeredBots.set(botData.token, { ...botData, id: docSnap.id });
        }
      });
      console.log(`🔥 [Firestore] Loaded ${registeredBots.size} active bots from database.`);
    }

    // Check system_config settings if no bots found yet
    if (registeredBots.size === 0) {
      const settingsDoc = await getDoc(doc(db, 'system_config', 'settings'));
      if (settingsDoc.exists()) {
        const setts = settingsDoc.data();
        if (setts.primaryBotToken) {
          const token = String(setts.primaryBotToken).trim();
          if (token.includes(':')) {
            const botUserRes = await callTelegramApi(token, 'getMe');
            if (botUserRes.ok && botUserRes.result) {
              const u = botUserRes.result;
              const botItem: TelegramBotItem = {
                id: String(u.id),
                botId: u.id,
                token: token,
                botUsername: u.username || setts.primaryBotUsername || `bot_${u.id}`,
                botName: u.first_name || 'Crypto Arbitrage Bot',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isActive: true,
                isPrimary: true,
                pollingActive: true
              };
              registeredBots.set(token, botItem);
              await setDoc(doc(db, 'telegram_bots', botItem.id), botItem, { merge: true });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Bot sync note:", err);
  }

  // Subscribe to real-time Telegram Bot updates in Firestore
  try {
    onSnapshot(collection(db, 'telegram_bots'), (snap) => {
      snap.forEach(docSnap => {
        const botData = docSnap.data() as TelegramBotItem;
        if (botData.token) {
          registeredBots.set(botData.token, { ...botData, id: docSnap.id });
          if (!configuredBotsWithTelegram.has(botData.token)) {
            configureBotWithTelegramApi(botData.token, botData, getBaseUrl()).catch(() => {});
          }
        }
      });
      writeJsonFile(BOTS_FILE, Array.from(registeredBots.values()));
    });
  } catch (err) {
    console.warn("🔥 [Firestore] onSnapshot telegram_bots error:", err);
  }

  // 2. Load Plans from Firestore (and seed if empty)
  try {
    const plansSnap = await getDocs(collection(db, 'plans'));
    if (!plansSnap.empty) {
      storedPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlanItem));
      // Migrate plans to attractive institutional yields
      for (const p of storedPlans) {
        if (p.id === 'p1') {
          p.minAmount = 20;
          p.expectedReturnPct = 4.80;
          p.dailyReturnPct = 0.68;
          p.name = 'Flash Arbitrage (HFT Micro-Route)';
          p.badge = 'HFT FLASH';
          setDoc(doc(db, 'plans', p.id), p, { merge: true }).catch(() => {});
        } else if (p.id === 'p2') {
          p.minAmount = 50;
          p.expectedReturnPct = 10.50;
          p.dailyReturnPct = 0.75;
          p.name = 'Triangular Multi-Route (Matrix Bot)';
          p.badge = 'TRIANGULAR AI';
          setDoc(doc(db, 'plans', p.id), p, { merge: true }).catch(() => {});
        } else if (p.id === 'p3') {
          p.minAmount = 200;
          p.expectedReturnPct = 24.00;
          p.dailyReturnPct = 0.80;
          p.name = 'Deep Liquidity Pool (Institutional)';
          p.badge = 'VOLUME TIER';
          setDoc(doc(db, 'plans', p.id), p, { merge: true }).catch(() => {});
        } else if (p.id === 'p4') {
          p.minAmount = 1000;
          p.expectedReturnPct = 54.00;
          p.dailyReturnPct = 0.90;
          p.name = 'VIP Dark-Pool Fund (Whale Tier)';
          p.badge = 'VIP ULTRA';
          setDoc(doc(db, 'plans', p.id), p, { merge: true }).catch(() => {});
        }
      }
      storedPlans.sort((a, b) => a.minAmount - b.minAmount);
      writeJsonFile(PLANS_FILE, storedPlans);
      console.log(`🔥 [Firestore] Loaded ${storedPlans.length} investment plans.`);
    } else {
      // Seed default plans to Firestore so they persist forever
      console.log("🔥 [Firestore] Seeding default plans to Firestore database...");
      for (const p of DEFAULT_PLANS) {
        await setDoc(doc(db, 'plans', p.id), p, { merge: true });
      }
      storedPlans = DEFAULT_PLANS;
      writeJsonFile(PLANS_FILE, storedPlans);
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Plans sync note:", err);
  }

  try {
    onSnapshot(collection(db, 'plans'), (snap) => {
      if (!snap.empty) {
        storedPlans = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanItem));
        storedPlans.sort((a, b) => a.minAmount - b.minAmount);
        writeJsonFile(PLANS_FILE, storedPlans);
      }
    }, () => {});
  } catch {}

  // 3. Load Deposits from Firestore
  try {
    const depSnap = await getDocs(collection(db, 'deposits'));
    if (!depSnap.empty) {
      storedDeposits = depSnap.docs.map(d => ({ id: d.id, ...d.data() } as DepositItem));
      storedDeposits.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
      writeJsonFile(DEPOSITS_FILE, storedDeposits);
      console.log(`🔥 [Firestore] Loaded ${storedDeposits.length} deposit records.`);
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Deposits sync note:", err);
  }

  try {
    onSnapshot(collection(db, 'deposits'), (snap) => {
      if (!snap.empty) {
        storedDeposits = snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositItem));
        storedDeposits.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
        writeJsonFile(DEPOSITS_FILE, storedDeposits);
      }
    }, () => {});
  } catch {}

  // 4. Load Users from Firestore
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (!usersSnap.empty) {
      storedUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserItem));
      storedUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      writeJsonFile(USERS_FILE, storedUsers);
      console.log(`🔥 [Firestore] Loaded ${storedUsers.length} user accounts.`);
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Users sync note:", err);
  }

  try {
    onSnapshot(collection(db, 'users'), (snap) => {
      if (!snap.empty) {
        storedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserItem));
        storedUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        writeJsonFile(USERS_FILE, storedUsers);
      }
    }, () => {});
  } catch {}

  // 5. Load Transactions from Firestore
  try {
    const txSnap = await getDocs(collection(db, 'transactions'));
    if (!txSnap.empty) {
      storedTransactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionItem));
      storedTransactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      writeJsonFile(TRANSACTIONS_FILE, storedTransactions);
      console.log(`🔥 [Firestore] Loaded ${storedTransactions.length} transaction records.`);
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Transactions sync note:", err);
  }

  try {
    onSnapshot(collection(db, 'transactions'), (snap) => {
      if (!snap.empty) {
        storedTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionItem));
        storedTransactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        writeJsonFile(TRANSACTIONS_FILE, storedTransactions);
      }
    }, () => {});
  } catch {}

  // 6. Load System Settings from Firestore
  try {
    const settingsDoc = await getDoc(doc(db, 'system_config', 'settings'));
    if (settingsDoc.exists()) {
      storedSettings = settingsDoc.data();
    }
  } catch (err) {
    console.warn("🔥 [Firestore] Settings load note:", err);
  }

  try {
    onSnapshot(doc(db, 'system_config', 'settings'), (snap) => {
      if (snap.exists()) {
        storedSettings = snap.data();
      }
    }, () => {});
  } catch {}

  // Configure all active bots with Telegram API
  for (const [token, bot] of registeredBots.entries()) {
    configureBotWithTelegramApi(token, bot, getBaseUrl()).catch(() => {});
  }
}

function resolveTelegramBotForNotification(sourceBotUsername?: string | null): TelegramBotItem | null {
  const activeBots = Array.from(registeredBots.values()).filter(b => b.isActive);
  if (activeBots.length === 0) return null;

  // 1. Try to match sourceBotUsername if provided
  if (sourceBotUsername) {
    const clean = sourceBotUsername.replace('@', '').toLowerCase();
    const matched = activeBots.find(b => b.botUsername && b.botUsername.toLowerCase() === clean);
    if (matched) return matched;
  }

  // 2. Try to find channelAlertBotId if designated
  const sysSettings = storedSettings;
  if (sysSettings?.channelAlertBotId && sysSettings.channelAlertBotId !== 'primary' && sysSettings.channelAlertBotId !== 'user_origin') {
    const cleanTarget = sysSettings.channelAlertBotId.replace('@', '').toLowerCase();
    const matchedChannel = activeBots.find(b => 
      b.id === sysSettings.channelAlertBotId || 
      (b.botUsername && b.botUsername.toLowerCase() === cleanTarget) ||
      String(b.botId) === sysSettings.channelAlertBotId
    );
    if (matchedChannel) return matchedChannel;
  }

  // 3. Fallback to Primary bot or first active bot
  const primary = activeBots.find(b => b.isPrimary) || activeBots[0];
  return primary || null;
}

// -----------------------------------------------------------------------------
// MULTILINGUAL TELEGRAM BOT LOCALIZATION (English, Persian, Russian, Chinese)
// -----------------------------------------------------------------------------
type BotLang = 'en' | 'fa' | 'ru' | 'zh';

function resolveBotLang(code?: string | null): BotLang {
  if (!code) return 'en';
  const c = code.toLowerCase().trim();
  if (c.startsWith('fa') || c.startsWith('per') || c === 'farsi') return 'fa';
  if (c.startsWith('ru')) return 'ru';
  if (c.startsWith('zh') || c.startsWith('cn')) return 'zh';
  return 'en';
}

const BOT_I18N: Record<BotLang, {
  welcome: (name: string, bonus: string, refNote: string) => string;
  launchBtn: string;
  loansBtn: string;
  swapBtn: string;
  refBtn: string;
  supportBtn: string;
  helpBtn: string;
  langBtn: string;
  backBtn: string;
  langPromptText: string;
  langChangedText: string;
  loansText: string;
  swapText: string;
  refText: (link: string) => string;
  openRefDashboardBtn: string;
  shareRefLinkBtn: string;
  shareMsg: string;
  helpText: string;
  openMiniAppBtn: string;
  referrerJoinedAlert: (name: string, username: string, id: number | string, date: string) => string;
  depositApprovedMsg: (usd: number, crypto: string, coin: string) => string;
}> = {
  en: {
    welcome: (name, bonus, refNote) =>
      `🏛️ <b>Welcome to Arbix Crypto Lending & Swap, ${name}!</b>\n\n` +
      `Access instant overcollateralized crypto liquidity and zero-slippage decentralized token swaps.\n\n` +
      `⚡ <b>Instant Crypto Loans:</b> Pledge 120% collateral, receive instant USDT directly to wallet (30-Day Flexible Term, 1.8% Fee).\n` +
      `🔄 <b>Multi-Chain Swap:</b> Instant zero-slippage swaps across USDT, TON, BTC, ETH, SOL.\n` +
      `🎁 <b>$${bonus} Starter Credit</b> is active in your account.\n\n` +
      refNote +
      `Choose an option below to proceed:`,
    launchBtn: "🚀 Open Lending & Swap App",
    loansBtn: "🏛️ Instant Loans (120% Collateral)",
    swapBtn: "🔄 Multi-Chain Token Swap",
    refBtn: "👥 Affiliate & Referral (10%)",
    supportBtn: "💬 VIP Support (@ai_zke)",
    helpBtn: "ℹ️ Protocol Guide",
    langBtn: "🌐 Language / زبان",
    backBtn: "🔙 Back to Main Menu",
    langPromptText:
      `🌐 <b>SELECT LANGUAGE / انتخاب زبان / ВЫБЕРИТЕ ЯЗЫК:</b>\n\n` +
      `Please select your preferred language for the bot and app:`,
    langChangedText:
      `✅ <b>Language successfully updated to English!</b>\n\nAll subsequent bot messages, loan certificates, and app views are now configured in English.`,
    loansText:
      `🏛️ <b>INSTANT CRYPTO CREDIT FACILITY:</b>\n\n` +
      `Borrow instant USDT liquidity against crypto collateral with zero credit checks.\n\n` +
      `⚡ <b>Key Facility Parameters:</b>\n` +
      `• Collateral Ratio: <b>120%</b> (e.g. Pledge $120 to receive $100 USDT)\n` +
      `• Origination Fee: <b>1.8% Fixed</b> ($1.80 per $100)\n` +
      `• Settlement Period: <b>30 Days</b> (Renewable)\n` +
      `• Collateral: <b>100% Refundable</b> upon loan settlement.\n\n` +
      `<i>Tap below to calculate and claim your loan in the Mini App.</i>`,
    swapText:
      `🔄 <b>DECENTRALIZED MULTI-CHAIN SWAP:</b>\n\n` +
      `Execute zero-slippage instant swaps between USDT, TON, BTC, ETH, and SOL with MEV-protected routing and lowest on-chain fees.\n\n` +
      `<i>Tap below to open the swap terminal.</i>`,
    refText: (link) =>
      `👥 <b>AFFILIATE & REFERRAL PROGRAM:</b>\n\n` +
      `Earn <b>10% instant commission</b> on all loans, swaps, and deposits generated by your invited network.\n\n` +
      `🔗 <b>Your Referral Link:</b>\n<code>${link}</code>`,
    openRefDashboardBtn: "🚀 Open Affiliate Dashboard",
    shareRefLinkBtn: "📤 Share Link with Friends",
    shareMsg: "🚀 Claim your instant crypto loan & $5 bonus on Arbix!",
    helpText:
      `ℹ️ <b>QUICK START GUIDE:</b>\n\n` +
      `1. Open Mini App & verify your account.\n` +
      `2. Deposit 120% collateral (e.g. $120) to receive instant $100 USDT loan.\n` +
      `3. Use the Multi-Chain Swap to trade tokens at zero slippage.\n\n` +
      `👤 VIP Support: @ai_zke`,
    openMiniAppBtn: "🚀 Open Mini App",
    referrerJoinedAlert: (name, username, id, date) =>
      `🎉 <b>NEW PARTNER JOINED YOUR NETWORK!</b>\n\n` +
      `👤 <b>User:</b> ${name} (@${username || 'N/A'})\n` +
      `🆔 <b>ID:</b> <code>${id}</code>\n` +
      `🎁 <b>Bonus:</b> $5.00 Starter Credit\n` +
      `💰 <b>Commission:</b> 10% on all volume\n` +
      `📅 <b>Date:</b> ${date}`,
    depositApprovedMsg: (usd, crypto, coin) =>
      `✅ <b>Deposit Confirmed & Credited!</b>\n\nYour deposit of <b>$${usd} USD</b> (${crypto} ${coin}) has been settled and credited to your wallet.`
  },
  fa: {
    welcome: (name, bonus, refNote) =>
      `🏛️ <b>به پلتفرم وام‌دهی فوری و سواپ Arbix خوش آمدید، ${name}!</b>\n\n` +
      `دسترسی آنی به تسهیلات اعتباری رمزارز با وثیقه ۱۲۰٪ و سواپ سریع بدون اسلیپیج.\n\n` +
      `⚡ <b>وام فوری بدون ضامن:</b> با واریز ۱۲۰٪ وثیقه، ۱۰۰٪ مبلغ را فوراً تتر (USDT) دریافت کنید (تسویه ۳۰ روزه، کارمزد ۱.۸٪).\n` +
      `🔄 <b>سواپ مولتی‌چین:</b> تبدیل آنی بین USDT، TON، BTC، ETH و SOL.\n` +
      `🎁 <b>$${bonus} پاداش اولیه</b> در حساب شما فعال است.\n\n` +
      refNote +
      `یک گزینه را انتخاب کنید:`,
    launchBtn: "🚀 ورود به مینی‌اپ وام و سواپ",
    loansBtn: "🏛️ دریافت وام فوری (۱۲۰٪ وثیقه)",
    swapBtn: "🔄 سواپ آنی رمزارزها",
    refBtn: "👥 کسب درآمد و زیرمجموعه‌گیری (۱۰٪)",
    supportBtn: "💬 پشتیبانی رسمی (@ai_zke)",
    helpBtn: "ℹ️ راهنمای پلتفرم",
    langBtn: "🌐 تغییر زبان (Language)",
    backBtn: "🔙 بازگشت به منوی اصلی",
    langPromptText:
      `🌐 <b>انتخاب زبان / SELECT LANGUAGE:</b>\n\n` +
      `زبان مورد نظر خود را برای ربات و مینی‌اپ انتخاب کنید:`,
    langChangedText:
      `✅ <b>زبان ربات با موفقیت به فارسی تغییر کرد!</b>\n\nتمام پیام‌ها، اعلانات و منوهای مینی‌اپ اکنون به زبان فارسی نمایش داده می‌شوند.`,
    loansText:
      `🏛️ <b>تسهیلات اعتباری و وام فوری:</b>\n\n` +
      `دریافت فوری تتر با تودیع وثیقه بدون نیاز به چک، ضامن یا احراز هویت سنتی.\n\n` +
      `⚡ <b>شرایط وام:</b>\n` +
      `• نسبت وثیقه: <b>۱۲۰٪</b> (مثلاً واریز ۱۲۰ دلار وثیقه برای دریافت ۱۰۰ دلار وام)\n` +
      `• کارمزد ایجاد وام: <b>۱.۸٪ ثابت</b>\n` +
      `• دوره بازپرداخت: <b>۳۰ روز</b> (قابل تمدید)\n` +
      `• وثیقه: <b>۱۰۰٪ قابل بازگشت</b> بلافاصله پس از تسویه وام.\n\n` +
      `<i>برای محاسبه و دریافت وام روی دکمه زیر کلیک کنید.</i>`,
    swapText:
      `🔄 <b>سواپ غیرمتمرکز مولتی‌چین:</b>\n\n` +
      `تبدیل فوق‌سریع بین شبکه‌های TRC20، BEP20، TON، BTC و ETH بدون اسلیپیج با کمترین کارمزد شبکه.\n\n` +
      `<i>برای ورود به بخش سواپ روی دکمه زیر کلیک کنید.</i>`,
    refText: (link) =>
      `👥 <b>برنامه همکاری و رفرال:</b>\n\n` +
      `دریافت <b>۱۰٪ کمیسیون آنی</b> از تمامی وام‌ها، سواپ‌ها و واریزی‌های کاربران دعوت‌شده توسط شما.\n\n` +
      `🔗 <b>لینک اختصاصی دعوت شما:</b>\n<code>${link}</code>`,
    openRefDashboardBtn: "🚀 پنل نمایندگی و درآمد",
    shareRefLinkBtn: "📤 ارسال لینک برای دوستان",
    shareMsg: "🚀 وام فوری کریپتو بدون ضامن و ۵ دلار پاداش اولیه در Arbix!",
    helpText:
      `ℹ️ <b>راهنمای سریع:</b>\n\n` +
      `۱. مینی‌اپ را باز کرده و احراز هویت اولیه را انجام دهید.\n` +
      `۲. مبلغ وام را انتخاب و ۱۲۰٪ وثیقه واریز کنید تا وام فوراً واریز شود.\n` +
      `۳. از بخش سواپ برای تبدیل آسان رمزارزها استفاده نمایید.\n\n` +
      `👤 پشتیبانی VIP: @ai_zke`,
    openMiniAppBtn: "🚀 باز کردن مینی‌اپ",
    referrerJoinedAlert: (name, username, id, date) =>
      `🎉 <b>کاربر جدید به شبکه شما پیوست!</b>\n\n` +
      `👤 <b>کاربر:</b> ${name} (@${username || 'N/A'})\n` +
      `🆔 <b>شناسه:</b> <code>${id}</code>\n` +
      `🎁 <b>پاداش:</b> ۵ دلار هدیه اولیه\n` +
      `💰 <b>سطح پاداش:</b> ۱۰٪ از تمام تراکنش‌ها\n` +
      `📅 <b>تاریخ:</b> ${date}`,
    depositApprovedMsg: (usd, crypto, coin) =>
      `✅ <b>واریز تایید و به موجودی اضافه شد!</b>\n\nواریز شما به مبلغ <b>$${usd} USD</b> (${crypto} ${coin}) تایید و در والت شما شارژ گردید.`
  },
  ru: {
    welcome: (name, bonus, refNote) =>
      `🏛️ <b>Добро пожаловать в Arbix Lending & Swap, ${name}!</b>\n\n` +
      `Мгновенные крипто-займы под залог и децентрализованный обмен токенов без проскальзывания.\n\n` +
      `⚡ <b>Мгновенные займы:</b> Залог 120% ➔ получение 100% USDT сразу на кошелек (30 дней, фикс. комиссия 1.8%).\n` +
      `🔄 <b>Мультичейн Своп:</b> Быстрый обмен USDT, TON, BTC, ETH, SOL.\n` +
      `🎁 <b>$${bonus} Приветственный бонус</b> на вашем балансе.\n\n` +
      refNote +
      `Выберите действие:`,
    launchBtn: "🚀 Открыть Lending & Swap App",
    loansBtn: "🏛️ Мгновенный займ (Залог 120%)",
    swapBtn: "🔄 Мультичейн Своп токенов",
    refBtn: "👥 Партнерская программа (10%)",
    supportBtn: "💬 Поддержка (@ai_zke)",
    helpBtn: "ℹ️ Руководство",
    langBtn: "🌐 Сменить язык",
    backBtn: "🔙 В главное меню",
    langPromptText:
      `🌐 <b>ВЫБЕРИТЕ ЯЗЫК / SELECT LANGUAGE:</b>\n\n` +
      `Выберите предпочтительный язык интерфейса:`,
    langChangedText:
      `✅ <b>Язык успешно изменен на Русский!</b>\n\nВсе последующие уведомления и интерфейс приложения переведены на русский язык.`,
    loansText:
      `🏛️ <b>КРЕДИТНАЯ ЛИНИЯ И ЗАЙМЫ:</b>\n\n` +
      `Получайте мгновенную ликвидность в USDT под залог криптовалюты без проверок кредитной истории.\n\n` +
      `⚡ <b>Условия:</b>\n` +
      `• Коэффициент залога: <b>120%</b> (например, $120 залога за $100 займа)\n` +
      `• Фикс. комиссия: <b>1.8%</b>\n` +
      `• Срок: <b>30 дней</b> (с возможностью продления)\n` +
      `• Залог: <b>100% возвращается</b> после погашения займа.`,
    swapText:
      `🔄 <b>ДЕЦЕНТРАЛИЗОВАННЫЙ ОБМЕН:</b>\n\n` +
      `Моментальный обмен между USDT, TON, BTC, ETH и SOL по лучшим кросс-чейн маршрутам.`,
    refText: (link) =>
      `👥 <b>ПАРТНЕРСКАЯ ПРОГРАММА:</b>\n\n` +
      `Получайте <b>10% комиссии</b> от всех займов и обменов ваших рефералов.\n\n` +
      `🔗 <b>Ваша ссылка:</b>\n<code>${link}</code>`,
    openRefDashboardBtn: "🚀 Кабинет партнера",
    shareRefLinkBtn: "📤 Поделиться ссылкой",
    shareMsg: "🚀 Получи крипто-займ и бонус $5 в Arbix!",
    helpText:
      `ℹ️ <b>РУКОВОДСТВО:</b>\n\n` +
      `1. Откройте приложение и пройдите верификацию.\n` +
      `2. Внесите 120% залога и получите мгновенный займ в USDT.\n` +
      `3. Обменивайте активы в один клик через раздел Swap.\n\n` +
      `👤 Поддержка: @ai_zke`,
    openMiniAppBtn: "🚀 Открыть Mini App",
    referrerJoinedAlert: (name, username, id, date) =>
      `🎉 <b>НОВЫЙ ПАРТНЕР В ВАШЕЙ СЕТИ!</b>\n\n` +
      `👤 <b>Пользователь:</b> ${name} (@${username || 'N/A'})\n` +
      `🆔 <b>ID:</b> <code>${id}</code>\n` +
      `🎁 <b>Бонус:</b> $5.00 USDT\n` +
      `💰 <b>Комиссия:</b> 10%\n` +
      `📅 <b>Дата:</b> ${date}`,
    depositApprovedMsg: (usd, crypto, coin) =>
      `✅ <b>Депозит подтвержден!</b>\n\nВаш депозит на сумму <b>$${usd} USD</b> (${crypto} ${coin}) зачислен на баланс.`
  },
  zh: {
    welcome: (name, bonus, refNote) =>
      `🏛️ <b>欢迎使用 Arbix 加密借贷与闪兑平台，${name}！</b>\n\n` +
      `开启即时超额抵押加密借贷与零滑点跨链去中心化代币闪兑。\n\n` +
      `⚡ <b>即时加密借贷：</b> 质押 120% 抵押品，秒级放款 100% USDT 至钱包（30天灵活周期，1.8% 固定费率）。\n` +
      `🔄 <b>多链闪兑：</b> 支持 USDT, TON, BTC, ETH, SOL 极速零滑点兑换。\n` +
      `🎁 <b>$${bonus} 新手体验金</b> 已存入您的账户。\n\n` +
      refNote +
      `请选择下方操作：`,
    launchBtn: "🚀 打开借贷与闪兑 Mini App",
    loansBtn: "🏛️ 即时加密借贷 (120% 抵押)",
    swapBtn: "🔄 多链极速闪兑",
    refBtn: "👥 合伙人邀请分红 (10%)",
    supportBtn: "💬 专属客服 (@ai_zke)",
    helpBtn: "ℹ️ 协议指南",
    langBtn: "🌐 切换语言 (Language)",
    backBtn: "🔙 返回主菜单",
    langPromptText:
      `🌐 <b>请选择您的首选语言 / SELECT LANGUAGE:</b>\n\n` +
      `请选择您希望在机器人和 Mini App 中使用的语言：`,
    langChangedText:
      `✅ <b>语言已成功切换为 简体中文！</b>\n\n后续所有放款通知、充值确认以及交易界面均已为您同步为中文。`,
    loansText:
      `🏛️ <b>即时加密信用借贷：</b>\n\n` +
      `无需传统信用调查，一键质押数字资产即可获得 USDT 即时流动性。\n\n` +
      `⚡ <b>核心借贷参数：</b>\n` +
      `• 质押率：<b>120%</b>（如：质押 $120 抵押品获得 $100 USDT 借款）\n` +
      `• 固定费率：<b>1.8%</b>\n` +
      `• 还款周期：<b>30天</b>（可自由展期）\n` +
      `• 抵押品：结清借款后 <b>100% 原路返还</b>。\n\n` +
      `<i>点击下方按钮即可进入 Mini App 计算并申请借款。</i>`,
    swapText:
      `🔄 <b>去中心化多链闪兑：</b>\n\n` +
      `在 USDT、TON、BTC、ETH 和 SOL 之间进行零滑点闪兑，享受 MEV 防夹路由与超低链上手续费。`,
    refText: (link) =>
      `👥 <b>合伙人邀请分红计划：</b>\n\n` +
      `邀请好友加入，即可获得其借贷与交易手续费的 <b>10% 即时返佣</b>。\n\n` +
      `🔗 <b>您的专属邀请链接：</b>\n<code>${link}</code>`,
    openRefDashboardBtn: "🚀 查看合伙人后台",
    shareRefLinkBtn: "📤 转发邀请链接",
    shareMsg: "🚀 体验 Arbix 即时加密借贷，立领 $5 新手金！",
    helpText:
      `ℹ️ <b>快速指南：</b>\n\n` +
      `1. 打开 Mini App 并完成基本验证。\n` +
      `2. 质押 120% 抵押品即可秒级领取 USDT 借款。\n` +
      `3. 进入 Swap 页面享受极速跨链代币兑换。\n\n` +
      `👤 客服：@ai_zke`,
    openMiniAppBtn: "🚀 启动 Mini App",
    referrerJoinedAlert: (name, username, id, date) =>
      `🎉 <b>新合伙人已加入您的网络！</b>\n\n` +
      `👤 <b>用户：</b> ${name} (@${username || 'N/A'})\n` +
      `🆔 <b>ID：</b> <code>${id}</code>\n` +
      `🎁 <b>奖励：</b> $5.00 体验金\n` +
      `💰 <b>佣金等级：</b> 10% 分红\n` +
      `📅 <b>时间：</b> ${date}`,
    depositApprovedMsg: (usd, crypto, coin) =>
      `✅ <b>充值确认并已入账！</b>\n\n您充值的 <b>$${usd} USD</b> (${crypto} ${coin}) 已到账。`
  }
};

async function configureBotWithTelegramApi(token: string, bot: TelegramBotItem, baseUrl: string) {
  if (!token || !token.includes(':')) return;
  try {
    // 1. Set commands in English (default)
    await callTelegramApi(token, "setMyCommands", {
      commands: [
        { command: "start", description: "🚀 Open Lending & Swap App" },
        { command: "app", description: "⚡ Open Lending Terminal" },
        { command: "loans", description: "🏛️ Instant Crypto Loans (120% Collateral)" },
        { command: "swap", description: "🔄 Multi-Chain Token Swap" },
        { command: "referral", description: "👥 Referral Program & Link" },
        { command: "language", description: "🌐 Change Language / زبان / 语言" },
        { command: "support", description: "💬 VIP Support (@ai_zke)" }
      ]
    });

    // 1b. Set commands in Persian
    await callTelegramApi(token, "setMyCommands", {
      language_code: "fa",
      commands: [
        { command: "start", description: "🚀 باز کردن پلتفرم وام و سواپ" },
        { command: "loans", description: "🏛️ دریافت وام فوری (۱۲۰٪ وثیقه)" },
        { command: "swap", description: "🔄 سواپ سریع رمزارزها" },
        { command: "referral", description: "👥 لینک دعوت و کسب درآمد" },
        { command: "language", description: "🌐 تغییر زبان (Language)" },
        { command: "support", description: "💬 پشتیبانی رسمی (@ai_zke)" }
      ]
    });

    // 1c. Set commands in Russian
    await callTelegramApi(token, "setMyCommands", {
      language_code: "ru",
      commands: [
        { command: "start", description: "🚀 Открыть Lending & Swap App" },
        { command: "loans", description: "🏛️ Крипто-займы (120% залог)" },
        { command: "swap", description: "🔄 Мультичейн Своп" },
        { command: "referral", description: "👥 Реферальная ссылка" },
        { command: "language", description: "🌐 Сменить язык" },
        { command: "support", description: "💬 Поддержка (@ai_zke)" }
      ]
    });

    // 1d. Set commands in Chinese
    await callTelegramApi(token, "setMyCommands", {
      language_code: "zh",
      commands: [
        { command: "start", description: "🚀 启动借贷与闪兑 Mini App" },
        { command: "loans", description: "🏛️ 即时加密借贷 (120% 质押)" },
        { command: "swap", description: "🔄 多链极速闪兑" },
        { command: "referral", description: "👥 邀请好友计划" },
        { command: "language", description: "🌐 切换语言 (Language)" },
        { command: "support", description: "💬 官方客服 (@ai_zke)" }
      ]
    });

    // 2. Set descriptions in multiple languages
    await callTelegramApi(token, "setMyDescription", {
      description: `🏛️ Arbix Crypto Lending & Multi-Chain Swap Protocol.\n\n⚡ Instant 120% Overcollateralized Loans\n🔄 Zero-Slippage Cross-Chain Swaps\n🎁 $5.00 Starter Bonus\n\nTap Start to claim your instant liquidity.`
    });
    await callTelegramApi(token, "setMyDescription", {
      language_code: "fa",
      description: `🏛️ پلتفرم وام‌دهی فوری کریپتو و سواپ غیرمتمرکز Arbix.\n\n⚡ دریافت وام فوری با ۱۲۰٪ وثیقه\n🔄 سواپ بدون اسلیپیج بین شبکه‌ها\n🎁 ۵ دلار هدیه اولیه ورود\n\nبرای دریافت وام Start را بزنید.`
    });
    await callTelegramApi(token, "setMyDescription", {
      language_code: "ru",
      description: `🏛️ Протокол крипто-займов и мультичейн обмена Arbix.\n\n⚡ Мгновенные займы под 120% залога\n🔄 Обмен токенов без проскальзывания\n🎁 $5.00 USDT бонус\n\nНажмите Start для входа.`
    });
    await callTelegramApi(token, "setMyDescription", {
      language_code: "zh",
      description: `🏛️ Arbix 即时加密借贷与去中心化多链闪兑协议。\n\n⚡ 120% 超额抵押即时放款\n🔄 零滑点跨链代币闪兑\n🎁 $5.00 新手体验金\n\n点击 Start 立即获取借款流动性。`
    });

    await callTelegramApi(token, "setMyShortDescription", {
      short_description: `🏛️ Instant Crypto Loans (120% Collateral) & Multi-Chain Swap with $5 bonus.`
    });
    await callTelegramApi(token, "setMyShortDescription", {
      language_code: "fa",
      short_description: `🏛️ پلتفرم وام‌دهی فوری با ۱۲۰٪ وثیقه و سواپ سریع ارزها همراه ۵ دلار پاداش.`
    });
    await callTelegramApi(token, "setMyShortDescription", {
      language_code: "ru",
      short_description: `🏛️ Крипто-займы под залог 120% и мультичейн обмен с бонусом $5.`
    });
    await callTelegramApi(token, "setMyShortDescription", {
      language_code: "zh",
      short_description: `🏛️ 120% 抵押即时加密借贷与多链闪兑，送 $5 体验金。`
    });

    // 3. Automatically configure Webhook if baseUrl is a secure production HTTPS URL
    if (baseUrl && baseUrl.startsWith("https://")) {
      const webhookUrl = `${baseUrl}/api/telegram-webhook/${token}`;
      console.log(`🚀 [Telegram Webhook] Automatically configuring webhook for @${bot.botUsername} to: ${webhookUrl}`);
      
      const setHookRes = await callTelegramApi(token, "setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query", "inline_query"],
        drop_pending_updates: false
      });
      
      if (setHookRes.ok) {
        console.log(`✅ [Telegram Webhook] Webhook successfully set for @${bot.botUsername}`);
        bot.webhookUrl = webhookUrl;
        bot.webhookStatus = 'active';
      } else {
        console.warn(`❌ [Telegram Webhook] Failed to set webhook for @${bot.botUsername}:`, setHookRes.description);
        bot.webhookStatus = 'polling';
        await callTelegramApi(token, "deleteWebhook", { drop_pending_updates: false });
      }
    } else {
      console.log(`ℹ️ [Telegram Webhook] Localhost/HTTP environment detected. Removing webhooks & falling back to Polling.`);
      await callTelegramApi(token, "deleteWebhook", { drop_pending_updates: false });
      bot.webhookStatus = 'polling';
    }

    configuredBotsWithTelegram.add(token);
  } catch (e) {
    console.warn(`Error configuring bot @${bot.botUsername}:`, e);
  }
}

// -----------------------------------------------------------------------------
// TELEGRAM API CLIENT & BOT ENGINE (FLUENT ENGLISH)
// -----------------------------------------------------------------------------
async function callTelegramApi<T = any>(token: string, method: string, body?: any): Promise<{ ok: boolean; result?: T; description?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await response.json();
  } catch (err: any) {
    return { ok: false, description: err.message || 'Telegram connection error' };
  }
}

/**
 * 5% Instant Referral Deposit Commission Engine
 * Whenever a referred user deposits/charges their account, 5% of that deposit is instantly credited to the inviter
 */
async function creditReferralDepositCommission(
  depositUser: UserItem | undefined,
  depositAmountUsd: number,
  depositCoin: string = 'USDT'
) {
  try {
    if (!depositUser || !depositUser.referredBy || depositAmountUsd <= 0) return;

    const commission = parseFloat((depositAmountUsd * 0.05).toFixed(2));
    if (commission <= 0) return;

    const rawRef = String(depositUser.referredBy).trim();
    const cleanRef = rawRef.replace(/^ref_/, '').replace(/^tg_/, '').trim();

    // 1. Locate referrer in memory
    let referrer = storedUsers.find(u => 
      u.id === rawRef || 
      u.id === cleanRef || 
      u.id === `tg_${cleanRef}` ||
      String(u.telegramId) === cleanRef || 
      u.referralCode === rawRef ||
      u.referralCode === cleanRef ||
      (u.telegramUsername && u.telegramUsername.toLowerCase() === cleanRef.toLowerCase().replace('@', ''))
    );

    // 2. Query Firestore if not in memory
    if (!referrer) {
      try {
        const snap = await getDoc(doc(db, 'users', cleanRef));
        if (snap.exists()) {
          referrer = snap.data() as UserItem;
        } else {
          const qSnap = await getDocs(query(collection(db, 'users'), where('telegramId', '==', Number(cleanRef) || cleanRef)));
          if (!qSnap.empty) {
            referrer = qSnap.docs[0].data() as UserItem;
          }
        }
      } catch {}
    }

    if (!referrer) return;

    // 3. Credit referrer balance & referralEarnings
    referrer.balance = parseFloat(((referrer.balance || 0) + commission).toFixed(2));
    referrer.referralEarnings = parseFloat(((referrer.referralEarnings || 0) + commission).toFixed(2));

    const userIdx = storedUsers.findIndex(u => u.id === referrer!.id);
    if (userIdx !== -1) {
      storedUsers[userIdx] = referrer;
    } else {
      storedUsers.push(referrer);
    }
    writeJsonFile(USERS_FILE, storedUsers);

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'users', referrer.id), {
        balance: referrer.balance,
        referralEarnings: referrer.referralEarnings
      });
    } catch {}

    // 4. Create Transaction record for Referrer
    const partnerName = depositUser.telegramUsername 
      ? `@${depositUser.telegramUsername}` 
      : `Partner #${String(depositUser.telegramId || depositUser.id).slice(-4)}`;

    const refTx: TransactionItem = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: referrer.id,
      telegramUsername: referrer.telegramUsername || '',
      telegramId: referrer.telegramId || '',
      type: 'profit',
      amount: commission,
      cryptoAmount: String(commission),
      currency: 'USDT',
      network: 'Internal',
      status: 'completed',
      createdAt: Date.now(),
      note: `5% referral deposit commission from ${partnerName} deposit of $${depositAmountUsd.toFixed(2)} (${depositCoin})`
    };
    storedTransactions.unshift(refTx);
    writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

    try {
      await setDoc(doc(db, 'transactions', refTx.id), refTx, { merge: true });
    } catch {}

    // 5. Send Telegram notification to referrer in their language
    if (referrer.telegramId) {
      const targetBot = resolveTelegramBotForNotification(referrer.sourceBotUsername || depositUser.sourceBotUsername);
      if (targetBot) {
        const refLang = resolveBotLang(referrer.language);
        let msg = '';
        if (refLang === 'ru') {
          msg = 
            `🎉 <b>Реферальное вознаграждение начислено!</b>\n\n` +
            `Ваш приглашенный партнер <b>${partnerName}</b> совершил пополнение на <b>$${depositAmountUsd.toFixed(2)} USD</b> (${depositCoin}).\n\n` +
            `💰 <b>Ваша комиссия 5%: +$${commission.toFixed(2)} USD</b> мгновенно зачислена на ваш баланс!`;
        } else if (refLang === 'zh') {
          msg = 
            `🎉 <b>推荐充值佣金已到账！</b>\n\n` +
            `您邀请的好友 <b>${partnerName}</b> 已成功充值 <b>$${depositAmountUsd.toFixed(2)} USD</b> (${depositCoin})。\n\n` +
            `💰 <b>您的 5% 推荐佣金：+$${commission.toFixed(2)} USD</b> 已实时计入您的账户可用余额！`;
        } else {
          msg = 
            `🎉 <b>Referral Deposit Commission Credited!</b>\n\n` +
            `Your invited partner <b>${partnerName}</b> made a deposit of <b>$${depositAmountUsd.toFixed(2)} USD</b> (${depositCoin}).\n\n` +
            `💰 <b>Your 5% instant reward: +$${commission.toFixed(2)} USD</b> has been added to your balance!`;
        }

        callTelegramApi(targetBot.token, "sendMessage", {
          chat_id: referrer.telegramId,
          text: msg,
          parse_mode: "HTML"
        }).catch(() => {});
      }
    }
    console.log(`[Referral Commission] Credited $${commission} (5%) to referrer ${referrer.id} for $${depositAmountUsd} deposit by ${depositUser.id}`);
  } catch (e) {
    console.error('Error crediting referral commission:', e);
  }
}

const processedUpdateIds = new Set<number>();

async function processTelegramUpdate(token: string, update: any, baseUrl: string) {
  if (!update) return;

  if (update.update_id) {
    if (processedUpdateIds.has(update.update_id)) {
      console.log(`⚠️ [Telegram Bot] Skipping already processed update_id: ${update.update_id}`);
      return;
    }
    processedUpdateIds.add(update.update_id);
    // Keep size of processedUpdateIds Set from growing too large
    if (processedUpdateIds.size > 2000) {
      const firstVal = processedUpdateIds.values().next().value;
      if (firstVal !== undefined) {
        processedUpdateIds.delete(firstVal);
      }
    }
  }

  try {
    // 0: Contact / Phone Number Sharing from Telegram (Identity Verification)
    if (update.message && update.message.contact) {
      const contact = update.message.contact;
      const fromUser = update.message.from;
      const senderId = fromUser?.id || update.message.chat.id;
      const phoneNumber = contact.phone_number;

      console.log(`📱 [Telegram Bot] Received shared contact from ID ${senderId}: ${phoneNumber}`);

      const user = storedUsers.find(u => 
        String(u.telegramId) === String(senderId) || 
        u.id === `tg_${senderId}` || 
        u.id === String(senderId)
      );

      if (user) {
        user.phoneNumber = phoneNumber;
        user.phoneVerified = true;
        user.phoneVerifiedAt = Date.now();
        writeJsonFile(USERS_FILE, storedUsers);
      }

      // Update in Firestore for both tg_${senderId} and user.id with merge: true
      const targetIds = new Set<string>();
      targetIds.add(`tg_${senderId}`);
      if (user?.id) targetIds.add(user.id);

      for (const uid of targetIds) {
        try {
          await setDoc(doc(db, 'users', uid), {
            phoneNumber: phoneNumber,
            phoneVerified: true,
            phoneVerifiedAt: Date.now()
          }, { merge: true });
        } catch (e) {
          console.warn(`Firestore update phone error for ${uid}:`, e);
        }
      }

      const botObj = registeredBots.get(token);
      const botUsername = botObj?.botUsername || "arbixsbot";
      const userLang = user?.preferredLanguage || user?.language || 'en';
      let launchUrl = baseUrl;
      if (botUsername) {
        launchUrl += (launchUrl.includes("?") ? "&" : "?") + `bot=${encodeURIComponent(botUsername)}`;
      }
      launchUrl += (launchUrl.includes("?") ? "&" : "?") + `route=loans&tg_id=${senderId}&verified=1&lang=${userLang}`;

      await callTelegramApi(token, 'sendMessage', {
        chat_id: update.message.chat.id,
        text: `✅ <b>Phone Number Verified!</b>\n\nYour phone number <code>${phoneNumber}</code> has been verified successfully.\n\nYour account is now eligible for the <b>130% Overcollateralized Loan Marketplace</b> ($130 collateral per $100 loan).\n\nTap below to return to the app and claim your loan:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏛️ Open Loan Marketplace", web_app: { url: launchUrl } }]
          ]
        }
      });
      return;
    }

    // A: Incoming Telegram Message
    if (update.message && update.message.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text.trim();
      const fromUser = msg.from;
      const firstName = fromUser?.first_name || "Trader";
      const userId = fromUser?.id || chatId;
      const username = fromUser?.username || `user_${userId}`;

      // Check existing user to retain user's chosen preferred language
      let existingUser = storedUsers.find(u => String(u.telegramId) === String(userId) || u.id === `tg_${userId}`);
      const userLang = (existingUser?.preferredLanguage as BotLang) || (existingUser?.language as BotLang) || resolveBotLang(fromUser?.language_code);
      const strings = BOT_I18N[userLang] || BOT_I18N.en;
      
      const botObj = registeredBots.get(token);
      const botUsername = botObj?.botUsername || "arbixsbot";
      const botId = botObj?.botId ? String(botObj.botId) : null;

      const isNewUser = !existingUser;
      if (!existingUser) {
        const newUser: UserItem = {
          id: `tg_${userId}`,
          telegramId: userId,
          telegramUsername: username,
          firstName: firstName,
          lastName: fromUser?.last_name,
          balance: 0.00,
          bonusBalance: 5.00,
          role: (String(userId) === '5951882585' || username.toLowerCase() === 'ai_zke') ? 'admin' : 'user',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          referralCode: `ref_${userId}`,
          sourceBotUsername: botUsername,
          sourceBotId: botId,
          language: userLang,
          preferredLanguage: userLang
        };
        storedUsers.unshift(newUser);
        existingUser = newUser;
        writeJsonFile(USERS_FILE, storedUsers);

        // Persist new user in Firestore
        try {
          await setDoc(doc(db, 'users', newUser.id), newUser, { merge: true });
        } catch (e) {
          console.warn('Firestore user save note:', e);
        }
      }

      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase();
      const startPayload = parts[1] || "";

      if (startPayload === 'verify_phone' || command === '/verify_phone' || command === '/kyc') {
        const verifyMsg = 
          `📱 <b>Identity Verification for Loan Marketplace</b>\n\n` +
          `Hello <b>${firstName}</b>!\n` +
          `To unlock the <b>120% Overcollateralized Loan Marketplace</b> (pledge $120 collateral to borrow $100 instant USDT), please tap the button below to share your phone number securely:`;

        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: verifyMsg,
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: "📱 Share Phone Number", request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
        return;
      }

      if (command.startsWith("/start") || command === "/app" || command === "/launch" || command === "/trade") {
        // Check if user came via referral link and notify the inviter
        if (startPayload && (isNewUser || !existingUser.referredBy)) {
          const cleanRefId = startPayload.replace(/^ref_/, '').trim();
          existingUser.referredBy = startPayload;
          writeJsonFile(USERS_FILE, storedUsers);
          try {
            await updateDoc(doc(db, 'users', existingUser.id), { referredBy: startPayload });
          } catch {}

          if (cleanRefId && String(cleanRefId) !== String(userId)) {
            const referrer = storedUsers.find(u => 
              String(u.telegramId) === cleanRefId || 
              u.id === cleanRefId || 
              u.id === `tg_${cleanRefId}` || 
              u.referralCode === startPayload || 
              u.referralCode === `ref_${cleanRefId}`
            );

            const referrerTgId = referrer?.telegramId || (!isNaN(Number(cleanRefId)) ? Number(cleanRefId) : null);

            if (referrerTgId && String(referrerTgId) !== String(userId)) {
              const referrerLang = resolveBotLang(referrer?.preferredLanguage || referrer?.language);
              const alertReferrerText = (BOT_I18N[referrerLang] || BOT_I18N.en).referrerJoinedAlert(
                firstName,
                username,
                userId,
                new Date().toUTCString()
              );

              callTelegramApi(token, 'sendMessage', {
                chat_id: referrerTgId,
                text: alertReferrerText,
                parse_mode: 'HTML'
              }).catch(err => console.warn('Referrer alert error:', err));

              if (referrer) {
                referrer.referralsCount = (referrer.referralsCount || 0) + 1;
                writeJsonFile(USERS_FILE, storedUsers);
                try {
                  await updateDoc(doc(db, 'users', referrer.id), { referralsCount: referrer.referralsCount });
                } catch {}
              }
            }
          }
        }

        let launchUrl = baseUrl;
        const params: string[] = [];
        if (startPayload) {
          params.push(`startapp=${encodeURIComponent(startPayload)}`);
          params.push(`tgWebAppStartParam=${encodeURIComponent(startPayload)}`);
        }
        if (botUsername) {
          params.push(`bot=${encodeURIComponent(botUsername)}`);
        }
        if (userLang) {
          params.push(`lang=${encodeURIComponent(userLang)}`);
        }
        if (params.length > 0) {
          launchUrl += (launchUrl.includes("?") ? "&" : "?") + params.join("&");
        }

        const refNote = startPayload ? `👥 <i>${userLang === 'fa' ? 'کد معرف:' : userLang === 'ru' ? 'Реферальный код:' : userLang === 'zh' ? '邀请人代码：' : 'Invited via Referral Code:'} <code>${startPayload}</code></i>\n\n` : '';
        const welcomeText = strings.welcome(firstName, "5.00", refNote);

        const keyboard = {
          inline_keyboard: [
            [
              { 
                text: strings.launchBtn, 
                web_app: { url: launchUrl } 
              }
            ],
            [
              { text: strings.loansBtn, callback_data: "cmd_loans" },
              { text: strings.swapBtn, callback_data: "cmd_swap" }
            ],
            [
              { text: strings.refBtn, callback_data: `cmd_ref_${userId}` },
              { text: strings.langBtn, callback_data: "cmd_lang" }
            ],
            [
              { text: strings.helpBtn, callback_data: "cmd_help" },
              { text: strings.supportBtn, url: "https://t.me/ai_zke" }
            ]
          ]
        };

        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });

      } else if (command === "/loans" || command === "/credit") {
        const loansUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `route=loans&lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: strings.loansText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: strings.loansBtn, web_app: { url: loansUrl } }],
              [{ text: strings.supportBtn, url: "https://t.me/ai_zke" }]
            ]
          }
        });

      } else if (command === "/swap" || command === "/exchange") {
        const swapUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `route=earn&lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: strings.swapText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: strings.swapBtn, web_app: { url: swapUrl } }],
              [{ text: strings.supportBtn, url: "https://t.me/ai_zke" }]
            ]
          }
        });

      } else if (command === "/language" || command === "/lang") {
        const langUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: strings.langPromptText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: userLang === 'en' ? "✅ 🇬🇧 English" : "🇬🇧 English", callback_data: "setlang_en" },
                { text: userLang === 'fa' ? "✅ 🇮🇷 فارسی" : "🇮🇷 فارسی", callback_data: "setlang_fa" }
              ],
              [
                { text: userLang === 'ru' ? "✅ 🇷🇺 Русский" : "🇷🇺 Русский", callback_data: "setlang_ru" },
                { text: userLang === 'zh' ? "✅ 🇨🇳 简体中文" : "🇨🇳 简体中文", callback_data: "setlang_zh" }
              ],
              [
                { text: strings.launchBtn, web_app: { url: langUrl } }
              ]
            ]
          }
        });

      } else if (command === "/referral" || command === "/invite") {
        const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        const refUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: strings.refText(inviteLink),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: strings.openRefDashboardBtn, web_app: { url: refUrl } }],
              [{ text: strings.shareRefLinkBtn, url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(strings.shareMsg)}` }]
            ]
          }
        });

      } else if (command === "/support" || command === "/help") {
        const helpUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: strings.helpText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: strings.supportBtn, url: "https://t.me/ai_zke" }],
              [{ text: strings.openMiniAppBtn, web_app: { url: helpUrl } }]
            ]
          }
        });
      } else {
        const genericUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + `lang=${userLang}`;
        await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text: `👋 Hello <b>${firstName}</b>!\n\n${strings.helpBtn}`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: strings.launchBtn, web_app: { url: genericUrl } }],
              [{ text: strings.loansBtn, callback_data: "cmd_loans" }],
              [{ text: strings.swapBtn, callback_data: "cmd_swap" }]
            ]
          }
        });
      }
    }
    
    // C: Pre Checkout Query (Telegram Stars)
    if (update.pre_checkout_query) {
      const pq = update.pre_checkout_query;
      await callTelegramApi(token, 'answerPreCheckoutQuery', {
        pre_checkout_query_id: pq.id,
        ok: true
      });
      return;
    }
    
    // D: Successful Payment (Telegram Stars)
    if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
      const payloadStr = sp.invoice_payload;
      try {
        const data = JSON.parse(payloadStr);
        if (data.type === 'stars_deposit' && data.userId) {
          const existingDep = storedDeposits.find(d => d.txid === sp.telegram_payment_charge_id);
          if (!existingDep) {
            const usdAmount = Number(data.usdAmount) || 0;
            const newDep: DepositItem = {
               id: `dep_stars_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
               orderId: `ORD-${Date.now()}`,
               userId: data.userId,
               telegramUsername: update.message.from?.username,
               telegramId: update.message.from?.id,
               usdAmount: usdAmount,
               cryptoAmount: String(sp.total_amount),
               coin: 'STARS',
               network: 'Telegram',
               depositAddress: 'Telegram Stars',
               txid: sp.telegram_payment_charge_id,
               status: 'approved',
               approvedAt: Date.now(),
               createdAt: Date.now(),
               timestamp: Date.now()
            };
            storedDeposits.unshift(newDep);
            writeJsonFile(DEPOSITS_FILE, storedDeposits);

            try {
              await setDoc(doc(db, 'deposits', newDep.id), newDep, { merge: true });
            } catch {}

            // Update user balance
            let user = storedUsers.find(u => String(u.telegramId) === String(data.userId) || u.id === data.userId);
            if (!user && data.userId) {
              try {
                const uSnap = await getDoc(doc(db, 'users', data.userId));
                if (uSnap.exists()) user = uSnap.data() as UserItem;
              } catch {}
            }
            if (user) {
               user.balance = parseFloat(((user.balance || 0) + usdAmount).toFixed(2));
               writeJsonFile(USERS_FILE, storedUsers);

               try {
                 await updateDoc(doc(db, 'users', user.id), { balance: user.balance });
               } catch {}
  
               // 10% Instant Referral Deposit Commission
               await creditReferralDepositCommission(user, usdAmount, 'STARS');

               // Transaction record
               const txObj: TransactionItem = {
                  id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  userId: user.id,
                  type: 'deposit',
                  amount: usdAmount,
                  cryptoAmount: String(sp.total_amount),
                  currency: 'STARS',
                  status: 'completed',
                  createdAt: Date.now(),
                  note: `Auto-approved Telegram Stars deposit ($${usdAmount})`
               };
               storedTransactions.unshift(txObj);
               writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

               try {
                 await setDoc(doc(db, 'transactions', txObj.id), txObj, { merge: true });
               } catch {}
               
               // Notify user
               await callTelegramApi(token, 'sendMessage', {
                  chat_id: update.message.chat.id,
                  text: `✅ <b>Payment Successful!</b>\n\nYour deposit of <b>$${usdAmount.toFixed(2)} USD</b> via Telegram Stars has been instantly credited to your account.`,
                  parse_mode: 'HTML'
               });
               
               // Notify admin
               const adminId = "5951882585";
               const alertText = 
                `🌟 <b>NEW STARS DEPOSIT!</b>\n\n` +
                `💵 <b>Amount:</b> $${usdAmount.toFixed(2)} USD (${sp.total_amount} Stars)\n` +
                `👤 <b>User:</b> @${update.message.from?.username || 'Anonymous'} (ID: <code>${update.message.from?.id}</code>)\n` +
                `🔗 <b>TxID:</b> <code>${sp.telegram_payment_charge_id}</code>\n\n` +
                `<i>This deposit was auto-approved and credited via Telegram Stars.</i>`;
                
               callTelegramApi(token, "sendMessage", {
                 chat_id: adminId,
                 text: alertText,
                 parse_mode: "HTML"
               }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Error processing successful_payment", err);
      }
    }

    // B: Callback Query Button Click (IN-PLACE MESSAGE EDITING TO PREVENT CHAT SPAM)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id || cq.from?.id;
      const messageId = cq.message?.message_id;
      const data = cq.data || "";
      const userId = cq.from?.id;
      const firstName = cq.from?.first_name || "Trader";
      const botObj = registeredBots.get(token);
      const botUsername = botObj?.botUsername || "arbixsbot";

      let existingCqUser = storedUsers.find(u => String(u.telegramId) === String(userId) || u.id === `tg_${userId}`);
      let cqLang: BotLang = (existingCqUser?.preferredLanguage as BotLang) || (existingCqUser?.language as BotLang) || resolveBotLang(cq.from?.language_code);

      // Helper for in-place edit with fallback
      const renderView = async (text: string, reply_markup: any) => {
        if (messageId) {
          const editRes = await callTelegramApi(token, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            reply_markup
          });
          if (editRes.ok) return editRes;
        }
        return await callTelegramApi(token, 'sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup
        });
      };

      if (data.startsWith("setlang_")) {
        const newSelectedLang = data.replace("setlang_", "") as BotLang;
        if (['en', 'fa', 'ru', 'zh'].includes(newSelectedLang)) {
          cqLang = newSelectedLang;
          if (existingCqUser) {
            existingCqUser.language = newSelectedLang;
            existingCqUser.preferredLanguage = newSelectedLang;
          } else {
            existingCqUser = {
              id: `tg_${userId}`,
              telegramId: Number(userId),
              telegramUsername: cq.from?.username || '',
              firstName: cq.from?.first_name || '',
              lastName: cq.from?.last_name || '',
              balance: 0,
              bonusBalance: 5,
              cryptoBalances: { USDT: 0, TON: 0, BTC: 0, ETH: 0 },
              role: 'user',
              language: newSelectedLang,
              preferredLanguage: newSelectedLang,
              createdAt: Date.now()
            };
            storedUsers.unshift(existingCqUser);
          }
          writeJsonFile(USERS_FILE, storedUsers);

          try {
            await setDoc(doc(db, 'users', `tg_${userId}`), {
              language: newSelectedLang,
              preferredLanguage: newSelectedLang,
              telegramId: Number(userId)
            }, { merge: true });
          } catch {}

          const updatedStrings = BOT_I18N[newSelectedLang] || BOT_I18N.en;
          let newLaunchUrl = baseUrl;
          newLaunchUrl += (newLaunchUrl.includes("?") ? "&" : "?") + `lang=${newSelectedLang}&tg_id=${userId}`;
          if (botUsername) {
            newLaunchUrl += `&bot=${encodeURIComponent(botUsername)}`;
          }

          await callTelegramApi(token, 'answerCallbackQuery', {
            callback_query_id: cq.id,
            text: newSelectedLang === 'fa' ? "✅ زبان با موفقیت تغییر کرد" : newSelectedLang === 'ru' ? "✅ Язык изменен на Русский" : newSelectedLang === 'zh' ? "✅ 语言已切换为简体中文" : "✅ Language set to English"
          });

          await renderView(updatedStrings.langChangedText, {
            inline_keyboard: [
              [{ text: updatedStrings.launchBtn, web_app: { url: newLaunchUrl } }],
              [{ text: updatedStrings.backBtn, callback_data: "cmd_main_menu" }]
            ]
          });
          return;
        }
      }

      const cqStrings = BOT_I18N[cqLang] || BOT_I18N.en;
      await callTelegramApi(token, 'answerCallbackQuery', { callback_query_id: cq.id });

      let cqLaunchUrl = baseUrl;
      cqLaunchUrl += (cqLaunchUrl.includes("?") ? "&" : "?") + `lang=${cqLang}`;
      if (botUsername) {
        cqLaunchUrl += `&bot=${encodeURIComponent(botUsername)}`;
      }

      // 1. Return to Main Menu
      if (data === "cmd_main_menu" || data === "cmd_start") {
        const welcomeText = cqStrings.welcome(firstName, "5.00", "");
        await renderView(welcomeText, {
          inline_keyboard: [
            [
              { text: cqStrings.launchBtn, web_app: { url: cqLaunchUrl } }
            ],
            [
              { text: cqStrings.loansBtn, callback_data: "cmd_loans" },
              { text: cqStrings.swapBtn, callback_data: "cmd_swap" }
            ],
            [
              { text: cqStrings.refBtn, callback_data: `cmd_ref_${userId}` },
              { text: cqStrings.langBtn, callback_data: "cmd_lang" }
            ],
            [
              { text: cqStrings.helpBtn, callback_data: "cmd_help" },
              { text: cqStrings.supportBtn, url: "https://t.me/ai_zke" }
            ]
          ]
        });
      } 
      // 2. Loans Sub-Menu
      else if (data === "cmd_loans" || data === "cmd_plans") {
        const loansUrl = cqLaunchUrl + (cqLaunchUrl.includes("?") ? "&" : "?") + "route=loans";
        await renderView(cqStrings.loansText, {
          inline_keyboard: [
            [{ text: cqStrings.loansBtn, web_app: { url: loansUrl } }],
            [{ text: cqStrings.backBtn, callback_data: "cmd_main_menu" }]
          ]
        });
      } 
      // 3. Swap Sub-Menu
      else if (data === "cmd_swap") {
        const swapUrl = cqLaunchUrl + (cqLaunchUrl.includes("?") ? "&" : "?") + "route=earn";
        await renderView(cqStrings.swapText, {
          inline_keyboard: [
            [{ text: cqStrings.swapBtn, web_app: { url: swapUrl } }],
            [{ text: cqStrings.backBtn, callback_data: "cmd_main_menu" }]
          ]
        });
      }
      // 4. Language Selection Sub-Menu
      else if (data === "cmd_lang") {
        await renderView(cqStrings.langPromptText, {
          inline_keyboard: [
            [
              { text: cqLang === 'en' ? "✅ 🇬🇧 English" : "🇬🇧 English", callback_data: "setlang_en" },
              { text: cqLang === 'fa' ? "✅ 🇮🇷 فارسی" : "🇮🇷 فارسی", callback_data: "setlang_fa" }
            ],
            [
              { text: cqLang === 'ru' ? "✅ 🇷🇺 Русский" : "🇷🇺 Русский", callback_data: "setlang_ru" },
              { text: cqLang === 'zh' ? "✅ 🇨🇳 简体中文" : "🇨🇳 简体中文", callback_data: "setlang_zh" }
            ],
            [
              { text: cqStrings.backBtn, callback_data: "cmd_main_menu" }
            ]
          ]
        });
      } 
      // 5. Referral Sub-Menu
      else if (data.startsWith("cmd_ref")) {
        const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
        await renderView(cqStrings.refText(inviteLink), {
          inline_keyboard: [
            [{ text: cqStrings.openRefDashboardBtn, web_app: { url: cqLaunchUrl } }],
            [{ text: cqStrings.shareRefLinkBtn, url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(cqStrings.shareMsg)}` }],
            [{ text: cqStrings.backBtn, callback_data: "cmd_main_menu" }]
          ]
        });
      } 
      // 6. Help & Support Sub-Menu
      else if (data === "cmd_help") {
        await renderView(cqStrings.helpText, {
          inline_keyboard: [
            [{ text: cqStrings.supportBtn, url: "https://t.me/ai_zke" }],
            [{ text: cqStrings.openMiniAppBtn, web_app: { url: cqLaunchUrl } }],
            [{ text: cqStrings.backBtn, callback_data: "cmd_main_menu" }]
          ]
        });
      }
    }
  } catch (err) {
    console.error("[Telegram Bot Server] processTelegramUpdate error:", err);
  }
}

// Background Telegram Polling Loop
async function startTelegramPollingWorker(getBaseUrl: () => string) {
  if (isPollingLoopActive) return;
  isPollingLoopActive = true;

  console.log("[Telegram Server] Starting Background Polling Worker...");

  const pollInterval = async () => {
    try {
      const bots = Array.from(registeredBots.values()).filter(b => b.isActive);
      const baseUrl = getBaseUrl();

      for (const bot of bots) {
        if (bot.webhookStatus === 'active') {
          continue;
        }
        const offset = botPollingOffsets.get(bot.token) || 0;
        try {
          const res = await fetch(`https://api.telegram.org/bot${bot.token}/getUpdates?offset=${offset}&timeout=1&limit=20`);
          if (!res.ok) continue;

          const data = await res.json();
          if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
            let maxUpdateId = offset;
            for (const update of data.result) {
              if (update.update_id >= maxUpdateId) {
                maxUpdateId = update.update_id + 1;
              }
              await processTelegramUpdate(bot.token, update, baseUrl);
            }
            botPollingOffsets.set(bot.token, maxUpdateId);
            bot.pollingActive = true;
          }
        } catch {
          // Timeout
        }
      }
    } catch {
      // Loop Error
    } finally {
      setTimeout(pollInterval, 1200);
    }
  };

  pollInterval();
}

// -----------------------------------------------------------------------------
// FAKE LIVE LOAN DISBURSEMENT CHANNEL BROADCASTER (4K SHARP RECEIPT CERTIFICATES)
// -----------------------------------------------------------------------------
let serverPriceCache: { prices: Record<string, number>; changes: Record<string, string>; lastFetched: number } = {
  prices: {
    USDT: 1.00,
    TON: 5.48,
    TRX: 0.245,
    GRAM: 1.42,
    BTC: 94850.00,
    ETH: 3380.50,
    SOL: 198.50,
    NOT: 0.00785,
    DOGS: 0.00065,
    BNB: 645.00,
    XRP: 2.45,
    DOGE: 0.385,
    SUI: 3.45,
    STARS: 0.02
  },
  changes: {
    TON: '+2.40%',
    TRX: '+1.15%',
    GRAM: '+3.20%',
    BTC: '+1.80%',
    ETH: '+1.45%',
    SOL: '+4.10%',
    NOT: '-0.85%',
    DOGS: '+0.50%',
    BNB: '+1.20%',
    XRP: '+2.10%',
    DOGE: '-1.10%',
    SUI: '+5.40%',
    STARS: '0.00%',
    USDT: '0.00%'
  },
  lastFetched: 0
};

async function broadcastFakeLoanProofToChannel(
  appUrl: string,
  customChannelId?: string,
  customBotToken?: string
): Promise<{ success: boolean; error?: string; messageId?: number; data?: ReceiptData }> {
  try {
    const channelId = (customChannelId || storedSettings?.loanProofChannelId || storedSettings?.adminChannelId || '').trim();
    if (!channelId) {
      return { success: false, error: 'No Telegram Channel ID configured. Please set the Loan Proof Channel in Admin Bot Hub.' };
    }

    let botToken = customBotToken;
    if (!botToken) {
      const targetBot = resolveTelegramBotForNotification(storedSettings?.loanProofBotId);
      if (targetBot && targetBot.token) {
        botToken = targetBot.token;
      } else {
        const primary = Array.from(registeredBots.values()).find(b => b.isPrimary && b.isActive) || Array.from(registeredBots.values())[0];
        if (primary && primary.token) {
          botToken = primary.token;
        }
      }
    }

    if (!botToken) {
      return { success: false, error: 'No active Telegram bot token found to broadcast to channel.' };
    }

    // Generate high-resolution crisp 4K vector receipt buffer with live market prices
    const { buffer, data } = await generateReceiptPngBuffer(undefined, serverPriceCache?.prices);

    const cleanAppUrl = appUrl.replace(/\/+$/, '');
    
    // Resolve Bot username for deep link if available
    let botUsername = storedSettings?.primaryBotUsername || '';
    const matchedBot = Array.from(registeredBots.values()).find(b => b.token === botToken);
    if (matchedBot?.botUsername) {
      botUsername = matchedBot.botUsername;
    }
    const cleanBotName = botUsername.replace('@', '');

    const botDeepLink = cleanBotName 
      ? `https://t.me/${cleanBotName}?start=loan_${data.orderId}`
      : `${cleanAppUrl}?route=loans&startapp=proof_${data.orderId}`;

    const caption = 
      `🏛 <b>سند تسویه و واریز وام | Official Credit Disbursement</b>\n\n` +
      `💳 <b>مبلغ وام واریز‌شده:</b> <b>+${data.cryptoAmount} ($${data.loanAmount.toFixed(2)} USD)</b>\n` +
      `🔒 <b>وثیقه تودیع‌شده (۱۲۰٪):</b> <b>$${data.collateralAmount.toFixed(2)} USD</b>\n` +
      `🌐 <b>ارز و شبکه تسویه:</b> <code>${data.coinName} (${data.network})</code>\n` +
      `🏷 <b>شناسه وام:</b> <code>${data.orderId}</code>\n` +
      `🧾 <b>کد پیگیری سیستمی:</b> <code>${data.bankRef}</code>\n` +
      `👤 <b>کیف پول دریافت‌کننده:</b> <code>${data.recipientAddress}</code>\n` +
      `🔗 <b>هش تراکنش (TxHash):</b>\n<code>${data.txHash}</code>\n\n` +
      `⏱ <b>شرایط:</b> کارمزد ثابت ۱.۸٪ • تسویه ۳۰ روزه با بازگشت ۱۰۰٪ وثیقه\n` +
      `✅ <i>تراکنش با موفقیت در شبکه بلاکچین تایید و به حساب کاربر منتقل گردید.</i>`;

    const form = new FormData();
    form.append('chat_id', channelId);
    form.append('photo', new Blob([buffer], { type: 'image/png' }), `advice_${data.orderId}.png`);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: [
        [
          { text: "🚀 دریافت فوری وام در ربات | Open Bot & Claim Loan", url: botDeepLink }
        ]
      ]
    }));

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const resJson: any = await response.json();
    if (resJson.ok && resJson.result) {
      console.log(`✅ [Proof Broadcast] Successfully broadcast fake loan receipt certificate to channel ${channelId}`);
      return { success: true, messageId: resJson.result.message_id, data };
    } else {
      console.warn(`❌ [Proof Broadcast] Telegram error sending to channel ${channelId}:`, resJson.description);
      return { success: false, error: resJson.description || 'Telegram rejected photo message' };
    }
  } catch (err: any) {
    console.error(`❌ [Proof Broadcast] Error:`, err);
    return { success: false, error: err.message || 'Network error broadcasting proof' };
  }
}

let isLoanProofBroadcastLoopStarted = false;
function startLoanProofBroadcastWorker(getBaseUrl: () => string) {
  if (isLoanProofBroadcastLoopStarted) return;
  isLoanProofBroadcastLoopStarted = true;

  console.log("⚡ [Server] Starting Automated Loan Proof Channel Broadcast Worker with Organic Jitter...");

  const runBroadcastLoop = async () => {
    try {
      if (storedSettings?.fakeLoanBroadcastEnabled && storedSettings?.loanProofChannelId) {
        const baseIntervalMins = Number(storedSettings.fakeLoanBroadcastIntervalMinutes) || 30;
        // Anti-Detection Organic Strategy: Introduce ±30% natural random human variance
        const jitterMultiplier = 0.75 + Math.random() * 0.50; // between 0.75x to 1.25x
        const randomizedIntervalMins = baseIntervalMins * jitterMultiplier;

        const now = Date.now();
        const lastSent = Number(storedSettings.lastFakeLoanBroadcastAt) || 0;
        const diffMins = (now - lastSent) / (1000 * 60);

        if (diffMins >= randomizedIntervalMins) {
          const res = await broadcastFakeLoanProofToChannel(getBaseUrl());
          if (res.success) {
            storedSettings.lastFakeLoanBroadcastAt = now;
            try {
              await setDoc(doc(db, 'system_config', 'settings'), {
                lastFakeLoanBroadcastAt: now
              }, { merge: true });
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn("Loan proof broadcast worker tick note:", e);
    } finally {
      // Check interval every 60 seconds
      setTimeout(runBroadcastLoop, 60 * 1000);
    }
  };

  runBroadcastLoop();
}

// -----------------------------------------------------------------------------
// MAIN EXPRESS SERVER
// -----------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  let cachedBaseUrl = "";
  const getAppBaseUrl = (req?: express.Request): string => {
    if (req) {
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
      const proto = (req.headers["x-forwarded-proto"] as string) || "https";
      cachedBaseUrl = `${proto}://${host}`.replace(/\/+$/, "");
    }
    return cachedBaseUrl || process.env.APP_URL || "https://ais-dev-ou763yy2cr7ct6gse3jhe6-139800767319.europe-west2.run.app";
  };

  // Connect & sync with Firestore immediately
  initFirestoreData(() => getAppBaseUrl()).catch(e => console.warn("Init Firestore error:", e));

  // ---------------------------------------------------------------------------
  // 1. HEALTH CHECK & LIVE CRYPTO PRICES
  // ---------------------------------------------------------------------------
  app.get("/api/crypto/live-prices", async (req, res) => {
    const now = Date.now();
    // Cache for 4 seconds to avoid hitting rate limits while keeping prices ultra-fresh
    if (now - serverPriceCache.lastFetched < 4000) {
      return res.json({ success: true, data: serverPriceCache.prices, changes: serverPriceCache.changes, timestamp: serverPriceCache.lastFetched });
    }

    try {
      const symbols = [
        'BTCUSDT', 'ETHUSDT', 'TONUSDT', 'SOLUSDT', 'BNBUSDT',
        'TRXUSDT', 'DOGEUSDT', 'XRPUSDT', 'NOTUSDT', 'DOGSUSDT', 'SUIUSDT'
      ];
      const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (binanceRes.ok) {
        const data: any = await binanceRes.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const sym = item.symbol.replace('USDT', '');
            const p = parseFloat(item.lastPrice);
            const pct = parseFloat(item.priceChangePercent);
            if (!isNaN(p) && p > 0) {
              serverPriceCache.prices[sym] = p;
            }
            if (!isNaN(pct)) {
              serverPriceCache.changes[sym] = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            }
          });
        }
      }
    } catch (e) {
      console.warn("Binance server price fetch error:", e);
    }

    // Try CoinGecko for GRAM / fallback
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gram,toncoin,tron,solana&vs_currencies=usd&include_24hr_change=true');
      if (cgRes.ok) {
        const cgData: any = await cgRes.json();
        if (cgData.gram?.usd) {
          serverPriceCache.prices.GRAM = parseFloat(cgData.gram.usd);
          if (cgData.gram.usd_24h_change) {
            serverPriceCache.changes.GRAM = `${cgData.gram.usd_24h_change >= 0 ? '+' : ''}${cgData.gram.usd_24h_change.toFixed(2)}%`;
          }
        }
      }
    } catch {}

    // Calibrate TON to real market price if sandbox returns anomalous 1.5-1.6
    if (serverPriceCache.prices.TON && serverPriceCache.prices.TON < 3.0) {
      serverPriceCache.prices.TON = 5.48;
    }

    // Calibrate GRAM to real market price (~$1.42 USD)
    if (!serverPriceCache.prices.GRAM || serverPriceCache.prices.GRAM < 0.5) {
      serverPriceCache.prices.GRAM = 1.42;
    }

    serverPriceCache.prices.USDT = 1.00;
    serverPriceCache.prices.STARS = 0.02;
    serverPriceCache.lastFetched = now;

    res.json({ success: true, data: serverPriceCache.prices, changes: serverPriceCache.changes, timestamp: serverPriceCache.lastFetched });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      activeBotsCount: registeredBots.size,
      totalUsers: storedUsers.length,
      totalDeposits: storedDeposits.length,
      timestamp: Date.now()
    });
  });

  // ---------------------------------------------------------------------------
  // 2. BOTS API
  // ---------------------------------------------------------------------------
  app.get("/api/bots", (req, res) => {
    getAppBaseUrl(req);
    res.json({ success: true, bots: Array.from(registeredBots.values()) });
  });

  app.post("/api/bots", async (req, res) => {
    try {
      const baseUrl = getAppBaseUrl(req);
      const { token, autoWebhook = true } = req.body;
      const cleanToken = (token || "").trim();

      if (!cleanToken || !cleanToken.includes(":")) {
        return res.status(400).json({ success: false, error: "Invalid bot token format." });
      }

      const meRes = await callTelegramApi(cleanToken, "getMe");
      if (!meRes.ok || !meRes.result) {
        return res.status(400).json({ success: false, error: meRes.description || "Failed to verify bot token with Telegram." });
      }

      const botUser = meRes.result;
      const botUsername = botUser.username || `bot_${botUser.id}`;

      // Clean up previous bots to ensure strictly Single Dedicated Bot
      for (const [oldToken] of registeredBots.entries()) {
        if (oldToken !== cleanToken) {
          try {
            await callTelegramApi(oldToken, "deleteWebhook", { drop_pending_updates: false });
          } catch {}
          registeredBots.delete(oldToken);
          botPollingOffsets.delete(oldToken);
        }
      }

      let webhookUrl = "";
      let webhookStatus: 'active' | 'not_set' | 'polling' = 'polling';

      if (autoWebhook && baseUrl.startsWith("https://")) {
        webhookUrl = `${baseUrl}/api/telegram-webhook/${cleanToken}`;
        const setHookRes = await callTelegramApi(cleanToken, "setWebhook", {
          url: webhookUrl,
          allowed_updates: ["message", "callback_query", "inline_query"],
          drop_pending_updates: false
        });
        if (setHookRes.ok) {
          webhookStatus = 'active';
        } else {
          await callTelegramApi(cleanToken, "deleteWebhook", { drop_pending_updates: false });
          webhookStatus = 'polling';
        }
      } else {
        await callTelegramApi(cleanToken, "deleteWebhook", { drop_pending_updates: false });
        webhookStatus = 'polling';
      }

      const botItem: TelegramBotItem = {
        id: String(botUser.id),
        botId: botUser.id,
        token: cleanToken,
        botUsername: botUsername,
        botName: botUser.first_name || "Crypto Arbitrage Bot",
        webhookUrl,
        webhookStatus,
        pollingActive: true,
        menuButtonSet: true,
        commandsSet: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        isPrimary: true
      };

      // Configure commands and descriptions across 4 languages (EN, RU, ZH, FA)
      await configureBotWithTelegramApi(cleanToken, botItem, baseUrl);

      registeredBots.set(cleanToken, botItem);
      writeJsonFile(BOTS_FILE, Array.from(registeredBots.values()));
      botPollingOffsets.set(cleanToken, 0);

      // Save to Firestore permanently
      try {
        await setDoc(doc(db, 'telegram_bots', botItem.id), botItem, { merge: true });
        await setDoc(doc(db, 'system_config', 'settings'), {
          primaryBotUsername: botUsername.replace('@', ''),
          primaryBotToken: cleanToken,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore bot save note:', e);
      }

      res.json({
        success: true,
        message: `Bot @${botUsername} successfully registered, configured, and activated!`,
        bot: botItem
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/bots/:botId", async (req, res) => {
    try {
      const { botId } = req.params;
      let foundToken = "";
      for (const [t, b] of registeredBots.entries()) {
        if (String(b.botId) === botId || b.id === botId) {
          foundToken = t;
          break;
        }
      }
      if (foundToken) {
        await callTelegramApi(foundToken, "deleteWebhook", { drop_pending_updates: false });
        registeredBots.delete(foundToken);
        botPollingOffsets.delete(foundToken);
        writeJsonFile(BOTS_FILE, Array.from(registeredBots.values()));
      }

      // Delete from Firestore
      try {
        await deleteDoc(doc(db, 'telegram_bots', botId));
      } catch {}

      res.json({ success: true, message: "Bot removed." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // HOT-SWAP / FAILOVER BOT REPLACEMENT ENDPOINT
  app.post("/api/bots/replace", async (req, res) => {
    try {
      const { newToken, baseUrl = getAppBaseUrl(req) } = req.body;
      const cleanToken = (newToken || "").trim();
      if (!cleanToken || !cleanToken.includes(":")) {
        return res.status(400).json({ success: false, error: "Invalid bot token format." });
      }

      // Verify token
      const meRes = await callTelegramApi(cleanToken, "getMe");
      if (!meRes.ok || !meRes.result) {
        return res.status(400).json({ success: false, error: meRes.description || "Failed to verify new bot token with Telegram." });
      }

      const botUser = meRes.result;
      const botUsername = botUser.username || `bot_${botUser.id}`;

      // 1. Terminate all old bot connections & webhooks
      for (const [oldToken] of registeredBots.entries()) {
        try {
          await callTelegramApi(oldToken, "deleteWebhook", { drop_pending_updates: false });
        } catch {}
      }
      registeredBots.clear();
      botPollingOffsets.clear();

      // 2. Setup webhook or fallback polling
      let webhookUrl = "";
      let webhookStatus: 'active' | 'not_set' | 'polling' = 'polling';

      if (baseUrl.startsWith("https://")) {
        webhookUrl = `${baseUrl}/api/telegram-webhook/${cleanToken}`;
        const setHookRes = await callTelegramApi(cleanToken, "setWebhook", {
          url: webhookUrl,
          allowed_updates: ["message", "callback_query", "inline_query"],
          drop_pending_updates: false
        });
        if (setHookRes.ok) {
          webhookStatus = 'active';
        } else {
          await callTelegramApi(cleanToken, "deleteWebhook", { drop_pending_updates: false });
          webhookStatus = 'polling';
        }
      } else {
        await callTelegramApi(cleanToken, "deleteWebhook", { drop_pending_updates: false });
        webhookStatus = 'polling';
      }

      const botItem: TelegramBotItem = {
        id: String(botUser.id),
        botId: botUser.id,
        token: cleanToken,
        botUsername: botUsername,
        botName: botUser.first_name || "Crypto Arbitrage Bot",
        webhookUrl,
        webhookStatus,
        pollingActive: true,
        menuButtonSet: true,
        commandsSet: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        isPrimary: true
      };

      // 3. Setup multilingual commands, menu buttons, descriptions (EN, RU, ZH, FA)
      await configureBotWithTelegramApi(cleanToken, botItem, baseUrl);

      registeredBots.set(cleanToken, botItem);
      writeJsonFile(BOTS_FILE, [botItem]);
      botPollingOffsets.set(cleanToken, 0);

      // 4. Update permanent Firestore settings
      try {
        await setDoc(doc(db, 'telegram_bots', botItem.id), botItem, { merge: true });
        await setDoc(doc(db, 'system_config', 'settings'), {
          primaryBotUsername: botUsername.replace('@', ''),
          primaryBotToken: cleanToken,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore failover save note:', e);
      }

      res.json({
        success: true,
        message: `Failover successful! System has seamlessly migrated to new bot @${botUsername}.`,
        bot: botItem
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. DEPOSITS API (SUBMIT, LIST, SCAN, VERIFY, APPROVE, REJECT)
  // ---------------------------------------------------------------------------
  app.get("/api/deposits", (req, res) => {
    res.json({ success: true, deposits: storedDeposits });
  });

  // SERVER-SIDE MULTI-CHAIN SCANNER
  app.post("/api/deposits/scan", async (req, res) => {
    try {
      const { coinSymbol, networkId, address, targetCryptoAmount, expectedMemo, sessionStartTime } = req.body;
      if (!address) {
        return res.status(400).json({ success: false, error: "Missing address parameter" });
      }

      const scanResult = await checkMultiChainDepositStatus({
        coinSymbol,
        networkId,
        address,
        targetCryptoAmount,
        expectedMemo,
        sessionStartTime
      });

      if (scanResult.found && scanResult.txHash) {
        const hash = scanResult.txHash.trim().toLowerCase();
        const claimDoc = await getDoc(doc(db, 'claimed_txs', hash));
        const existingTx = storedDeposits.find(d => d.txid && d.txid.toLowerCase() === hash && d.status !== 'rejected');
        if (claimDoc.exists() || existingTx) {
          return res.json({
            success: true,
            verification: {
              status: 'ALREADY_CLAIMED',
              found: false,
              txHash: scanResult.txHash,
              error: 'This transaction has already been claimed.'
            }
          });
        }
      }

      res.json({ success: true, verification: scanResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SERVER-SIDE DIRECT ON-CHAIN TRANSACTION VERIFIER & ATOMIC CLAIM
  app.post("/api/deposits/verify", async (req, res) => {
    try {
      const { 
        txHash, 
        targetAddress, 
        networkId, 
        coinSymbol, 
        expectedAmount, 
        expectedMemo, 
        orderId, 
        userId, 
        telegramUsername, 
        telegramId,
        coinName,
        networkName,
        usdAmount,
        isFromBot,
        botPlanName
      } = req.body;

      if (!txHash || !targetAddress) {
        return res.status(400).json({ success: false, error: "Missing txHash or targetAddress parameter" });
      }

      const cleanTx = String(txHash).trim();
      const normHash = cleanTx.toLowerCase();

      // Check existing claim in Firestore & memory
      const claimDoc = await getDoc(doc(db, 'claimed_txs', normHash));
      const existingTx = storedDeposits.find(d => d.txid && d.txid.toLowerCase() === normHash && d.status !== 'rejected');
      if (claimDoc.exists() || existingTx) {
        return res.status(400).json({
          success: false,
          error: `Transaction hash ${cleanTx} has already been claimed or processed.`
        });
      }

      // Perform strict server-side on-chain verification
      const verification = await verifyDirectTxHash({
        txHash: cleanTx,
        targetAddress,
        networkId: networkId || 'TRC20',
        coinSymbol: coinSymbol || 'USDT',
        expectedAmount,
        expectedMemo
      });

      if (verification.status !== 'CONFIRMED' || !verification.found) {
        return res.json({
          success: false,
          verified: false,
          verification,
          error: verification.error || `Verification failed with status: ${verification.status}`
        });
      }

      // Perform atomic lock transaction on claimed_txs
      const lockRef = doc(db, 'claimed_txs', normHash);
      let claimed = false;
      try {
        await runTransaction(db, async (t) => {
          const snap = await t.get(lockRef);
          if (snap.exists()) {
            throw new Error("ALREADY_CLAIMED");
          }
          t.set(lockRef, {
            claimedAt: Date.now(),
            orderId: orderId || 'N/A',
            userId: userId || 'N/A',
            txHash: cleanTx
          });
          claimed = true;
        });
      } catch (e) {
        claimed = false;
      }

      if (!claimed) {
        return res.status(400).json({
          success: false,
          error: `Race condition detected: Transaction hash ${cleanTx} was just claimed by another order.`
        });
      }

      const verifiedCryptoAmt = Number(verification.amount || expectedAmount || 0);
      let verifiedUsdVal = Number(usdAmount) || verifiedCryptoAmt;
      const coinUpper = (coinSymbol || 'USDT').toUpperCase();
      if (coinUpper === 'USDT') {
        verifiedUsdVal = verifiedCryptoAmt;
      } else if (Number(expectedAmount) > 0 && Number(usdAmount) > 0) {
        const rate = Number(usdAmount) / Number(expectedAmount);
        verifiedUsdVal = parseFloat((verifiedCryptoAmt * rate).toFixed(2));
      }

      const newDeposit: DepositItem = {
        id: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: orderId || `ORD-${Date.now()}`,
        userId: userId || 'guest_user',
        telegramUsername: telegramUsername || null,
        telegramId: telegramId || null,
        usdAmount: verifiedUsdVal,
        cryptoAmount: String(verifiedCryptoAmt),
        coin: (coinSymbol || 'USDT').toUpperCase(),
        coinName: coinName || coinSymbol || 'Crypto',
        network: (networkId || 'TRC20').toUpperCase(),
        depositAddress: targetAddress,
        memoTag: expectedMemo || null,
        txid: cleanTx,
        senderAddress: verification.sender || null,
        status: 'approved',
        approvedAt: Date.now(),
        isAutoVerified: true,
        fromBot: isFromBot || false,
        botName: botPlanName || null,
        createdAt: verification.timestamp || Date.now(),
        timestamp: verification.timestamp || Date.now()
      };

      storedDeposits.unshift(newDeposit);
      writeJsonFile(DEPOSITS_FILE, storedDeposits);

      try {
        await setDoc(doc(db, 'deposits', newDeposit.id), newDeposit, { merge: true });
      } catch {}

      // Credit User Balance
      if (newDeposit.userId) {
        let user = storedUsers.find(u => u.id === newDeposit.userId || String(u.telegramId) === String(newDeposit.telegramId));
        if (!user && newDeposit.userId) {
          try {
            const uSnap = await getDoc(doc(db, 'users', newDeposit.userId));
            if (uSnap.exists()) user = uSnap.data() as UserItem;
          } catch {}
        }
        if (user) {
          user.balance = parseFloat(((user.balance || 0) + newDeposit.usdAmount).toFixed(2));
          user.cryptoBalances = user.cryptoBalances || {};
          const curCrypto = Number(user.cryptoBalances[newDeposit.coin] || 0);
          user.cryptoBalances[newDeposit.coin] = parseFloat((curCrypto + (parseFloat(newDeposit.cryptoAmount) || newDeposit.usdAmount)).toFixed(8));
          writeJsonFile(USERS_FILE, storedUsers);

          try {
            await updateDoc(doc(db, 'users', user.id), {
              balance: user.balance,
              cryptoBalances: user.cryptoBalances
            });
          } catch {}

          // 10% Instant Referral Deposit Commission
          await creditReferralDepositCommission(user, newDeposit.usdAmount, newDeposit.coin);
        }

        const newTx: TransactionItem = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: newDeposit.userId,
          telegramUsername: newDeposit.telegramUsername || '',
          telegramId: newDeposit.telegramId || '',
          type: 'deposit',
          amount: newDeposit.usdAmount,
          cryptoAmount: newDeposit.cryptoAmount,
          currency: newDeposit.coin,
          network: newDeposit.network,
          txid: newDeposit.txid,
          status: 'completed',
          createdAt: Date.now(),
          note: `On-chain verified deposit: ${newDeposit.cryptoAmount} ${newDeposit.coin} ($${newDeposit.usdAmount})`
        };
        storedTransactions.unshift(newTx);
        writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

        try {
          await setDoc(doc(db, 'transactions', newTx.id), newTx, { merge: true });
        } catch {}
      }

      res.json({
        success: true,
        verified: true,
        verification,
        deposit: newDeposit
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/deposits", async (req, res) => {
    try {
      const depData: Partial<DepositItem> = req.body;
      if (!depData.txid || !depData.usdAmount) {
        return res.status(400).json({ success: false, error: "Missing txid or usdAmount" });
      }

      if (Number(depData.usdAmount || 0) < 5) {
        return res.status(400).json({ success: false, error: "Minimum deposit amount is $5.00 USD for all assets." });
      }

      const cleanTx = String(depData.txid).trim();
      const normHash = cleanTx.toLowerCase();

      // Anti-Fraud Check 1: Prevent reused / duplicated TxID
      const claimDoc = await getDoc(doc(db, 'claimed_txs', normHash));
      const existingTx = storedDeposits.find(d => 
        d.txid && 
        d.txid.toLowerCase() === cleanTx.toLowerCase() && 
        d.status !== 'rejected'
      );

      if (claimDoc.exists() || existingTx) {
        return res.status(400).json({ 
          success: false, 
          error: `This TxID has already been claimed or registered. Duplicate transaction submissions are prohibited.` 
        });
      }

      let isAutoApprove = depData.status === 'approved';

      // If client requests auto-approval, perform server-side on-chain verification FIRST!
      if (isAutoApprove && depData.depositAddress) {
        const verifyCheck = await verifyDirectTxHash({
          txHash: cleanTx,
          targetAddress: depData.depositAddress,
          networkId: depData.network || 'TRC20',
          coinSymbol: depData.coin || 'USDT',
          expectedAmount: parseFloat(depData.cryptoAmount || '0') || undefined,
          expectedMemo: depData.memoTag || undefined
        });

        if (verifyCheck.status !== 'CONFIRMED' || !verifyCheck.found) {
          // Fallback to pending if direct on-chain verification fails or is pending
          isAutoApprove = false;
        } else {
          // Register atomic claim
          const lockRef = doc(db, 'claimed_txs', normHash);
          try {
            await runTransaction(db, async (t) => {
              const snap = await t.get(lockRef);
              if (snap.exists()) throw new Error("ALREADY_CLAIMED");
              t.set(lockRef, {
                claimedAt: Date.now(),
                orderId: depData.orderId || 'N/A',
                userId: depData.userId || 'N/A',
                txHash: cleanTx
              });
            });
          } catch (e) {
            return res.status(400).json({
              success: false,
              error: `Transaction hash ${cleanTx} was claimed by another order.`
            });
          }
        }
      }

      const newDeposit: DepositItem = {
        id: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: depData.orderId || `ORD-${Date.now()}`,
        userId: depData.userId || 'guest_user',
        telegramUsername: depData.telegramUsername || null,
        telegramId: depData.telegramId || null,
        usdAmount: Number(depData.usdAmount) || 0,
        cryptoAmount: String(depData.cryptoAmount || depData.usdAmount),
        coin: depData.coin || 'USDT',
        coinName: depData.coinName || 'Tether USD',
        network: depData.network || 'TRC20',
        depositAddress: depData.depositAddress || '',
        memoTag: depData.memoTag || null,
        txid: cleanTx,
        senderAddress: depData.senderAddress || null,
        status: isAutoApprove ? 'approved' : 'pending',
        approvedAt: isAutoApprove ? Date.now() : undefined,
        isAutoVerified: isAutoApprove,
        fromBot: depData.fromBot || false,
        botName: depData.botName || null,
        createdAt: Date.now(),
        timestamp: Date.now()
      };

      // Add to beginning of stored deposits
      storedDeposits.unshift(newDeposit);
      writeJsonFile(DEPOSITS_FILE, storedDeposits);

      // Save to Firestore
      try {
        await setDoc(doc(db, 'deposits', newDeposit.id), newDeposit, { merge: true });
      } catch (e) {
        console.warn('Firestore deposit write note:', e);
      }

      // If auto-approved from TON monitor, credit balance immediately
      if (isAutoApprove && newDeposit.userId) {
        let user = storedUsers.find(u => u.id === newDeposit.userId || String(u.telegramId) === String(newDeposit.telegramId));
        if (user) {
          user.balance = parseFloat(((user.balance || 0) + newDeposit.usdAmount).toFixed(2));
          user.cryptoBalances = user.cryptoBalances || {};
          const curCrypto = Number(user.cryptoBalances[newDeposit.coin] || 0);
          user.cryptoBalances[newDeposit.coin] = parseFloat((curCrypto + (parseFloat(newDeposit.cryptoAmount) || newDeposit.usdAmount)).toFixed(8));
          writeJsonFile(USERS_FILE, storedUsers);

          try {
            await updateDoc(doc(db, 'users', user.id), {
              balance: user.balance,
              cryptoBalances: user.cryptoBalances
            });
          } catch {}
        }

        const newTx: TransactionItem = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: newDeposit.userId,
          telegramUsername: newDeposit.telegramUsername || '',
          telegramId: newDeposit.telegramId || '',
          type: 'deposit',
          amount: newDeposit.usdAmount,
          cryptoAmount: newDeposit.cryptoAmount,
          currency: newDeposit.coin,
          network: newDeposit.network,
          txid: newDeposit.txid,
          status: 'completed',
          createdAt: Date.now(),
          note: `Auto-verified on-chain deposit: ${newDeposit.cryptoAmount} ${newDeposit.coin} ($${newDeposit.usdAmount})`
        };
        storedTransactions.unshift(newTx);
        writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

        try {
          await setDoc(doc(db, 'transactions', newTx.id), newTx, { merge: true });
        } catch {}
      }

      // Send instant Telegram notification to Admin (@ai_zke / 5951882585) and Channel
      const dispatchBot = resolveTelegramBotForNotification(newDeposit.sourceBotUsername);
      if (dispatchBot) {
        const adminId = "5951882585";
        const botNameTag = newDeposit.sourceBotUsername ? `@${newDeposit.sourceBotUsername.replace('@', '')}` : (dispatchBot.botUsername ? `@${dispatchBot.botUsername}` : 'Main Mini App');
        const alertText = 
          `🚨 <b>NEW DEPOSIT SUBMITTED!</b>\n\n` +
          `🤖 <b>Origin Bot:</b> ${botNameTag}\n` +
          `💵 <b>Amount:</b> $${newDeposit.usdAmount} USD (${newDeposit.cryptoAmount} ${newDeposit.coin})\n` +
          `🌐 <b>Network:</b> ${newDeposit.network}\n` +
          (newDeposit.memoTag ? `🏷️ <b>Assigned Memo/Tag:</b> <code>${newDeposit.memoTag}</code>\n` : '') +
          `👤 <b>User:</b> @${newDeposit.telegramUsername || 'Anonymous'} (ID: <code>${newDeposit.telegramId || newDeposit.userId}</code>)\n` +
          `🔗 <b>TxID:</b> <code>${newDeposit.txid}</code>\n` +
          `📦 <b>Order ID:</b> <code>${newDeposit.orderId}</code>\n\n` +
          `<i>Open Control Center to Approve or Reject this transaction.</i>`;

        // 1. Direct to Admin
        callTelegramApi(dispatchBot.token, "sendMessage", {
          chat_id: adminId,
          text: alertText,
          parse_mode: "HTML"
        }).catch(err => console.warn("Admin deposit alert telegram error:", err));

        // 2. To Channel if configured
        if (storedSettings?.adminChannelId) {
          callTelegramApi(dispatchBot.token, "sendMessage", {
            chat_id: storedSettings.adminChannelId,
            text: alertText,
            parse_mode: "HTML"
          }).catch(err => console.warn("Channel deposit alert telegram error:", err));
        }
      }

      res.json({ success: true, deposit: newDeposit });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/deposits/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const index = storedDeposits.findIndex(d => d.id === id || d.orderId === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Deposit record not found" });
      }

      const dep = storedDeposits[index];
      dep.status = 'approved';
      dep.approvedAt = Date.now();
      writeJsonFile(DEPOSITS_FILE, storedDeposits);

      // Update Firestore deposit
      try {
        await updateDoc(doc(db, 'deposits', dep.id), {
          status: 'approved',
          approvedAt: dep.approvedAt
        });
      } catch {}

      // Credit User Balance
      if (dep.userId) {
        let user = storedUsers.find(u => u.id === dep.userId || String(u.telegramId) === String(dep.telegramId));
        if (!user && dep.userId) {
          try {
            const uSnap = await getDoc(doc(db, 'users', dep.userId));
            if (uSnap.exists()) user = uSnap.data() as UserItem;
          } catch {}
        }
        if (user) {
          user.balance = parseFloat(((user.balance || 0) + dep.usdAmount).toFixed(2));
          user.cryptoBalances = user.cryptoBalances || {};
          const curCrypto = Number(user.cryptoBalances[dep.coin] || 0);
          user.cryptoBalances[dep.coin] = parseFloat((curCrypto + (parseFloat(dep.cryptoAmount) || dep.usdAmount)).toFixed(8));
          writeJsonFile(USERS_FILE, storedUsers);

          try {
            await updateDoc(doc(db, 'users', user.id), {
              balance: user.balance,
              cryptoBalances: user.cryptoBalances
            });
          } catch {}

          // 10% Instant Referral Deposit Commission
          await creditReferralDepositCommission(user, dep.usdAmount, dep.coin);
        }

        // Add Transaction record
        const newTx: TransactionItem = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: dep.userId,
          telegramUsername: dep.telegramUsername || '',
          telegramId: dep.telegramId || '',
          type: 'deposit',
          amount: dep.usdAmount,
          cryptoAmount: dep.cryptoAmount,
          currency: dep.coin,
          network: dep.network,
          txid: dep.txid,
          status: 'completed',
          createdAt: Date.now(),
          note: `Approved deposit: ${dep.cryptoAmount} ${dep.coin} ($${dep.usdAmount})`
        };
        storedTransactions.unshift(newTx);
        writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

        try {
          await setDoc(doc(db, 'transactions', newTx.id), newTx, { merge: true });
        } catch {}

        // Notify user via Telegram in their preferred language
        if (dep.telegramId) {
          const userBot = resolveTelegramBotForNotification(dep.sourceBotUsername);
          if (userBot) {
            const userLang = resolveBotLang(user?.language);
            const approvalMsg = BOT_I18N[userLang].depositApprovedMsg(dep.usdAmount, dep.cryptoAmount, dep.coin);
            callTelegramApi(userBot.token, "sendMessage", {
              chat_id: dep.telegramId,
              text: approvalMsg,
              parse_mode: "HTML"
            }).catch(() => {});
          }
        }
      }

      res.json({ success: true, message: `Deposit approved and $${dep.usdAmount} credited!`, deposit: dep });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/deposits/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const index = storedDeposits.findIndex(d => d.id === id || d.orderId === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Deposit record not found" });
      }

      const dep = storedDeposits[index];
      dep.status = 'rejected';
      dep.rejectedReason = reason || 'Invalid TxID or unconfirmed on-chain';
      writeJsonFile(DEPOSITS_FILE, storedDeposits);

      try {
        await updateDoc(doc(db, 'deposits', dep.id), {
          status: 'rejected',
          rejectedReason: dep.rejectedReason
        });
      } catch {}

      res.json({ success: true, message: "Deposit rejected.", deposit: dep });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 3.5 WITHDRAWALS API (SUBMIT, APPROVE, REJECT)
  // ---------------------------------------------------------------------------
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const { userId, telegramUsername, telegramId, amount, currency, network, recipient } = req.body;
      const numAmount = Number(amount) || 0;

      if (!userId || numAmount <= 0 || !recipient) {
        return res.status(400).json({ success: false, error: "Missing required withdrawal fields (userId, amount, recipient address)." });
      }

      // Locate user
      let user = storedUsers.find(u => u.id === userId || String(u.telegramId) === String(telegramId));
      if (!user && userId) {
        try {
          const uSnap = await getDoc(doc(db, 'users', userId));
          if (uSnap.exists()) user = uSnap.data() as UserItem;
        } catch {}
      }

      if (!user) {
        return res.status(404).json({ success: false, error: "User account not found." });
      }

      // Check 24-hour withdrawal lock
      if (user.withdrawalLockUntil && Date.now() < user.withdrawalLockUntil) {
        const remainingMs = user.withdrawalLockUntil - Date.now();
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return res.status(400).json({
          success: false,
          error: `Withdrawal is locked for 24 hours after strategy activation. Lock remaining: ${hours}h ${mins}m.`
        });
      }

      // Check balance
      if (user.balance < numAmount) {
        return res.status(400).json({ success: false, error: `Insufficient account balance ($${user.balance.toFixed(2)} USD available).` });
      }

      // Deduct balance
      user.balance = parseFloat(Math.max(0, user.balance - numAmount).toFixed(2));
      writeJsonFile(USERS_FILE, storedUsers);
      try {
        await updateDoc(doc(db, 'users', user.id), { balance: user.balance });
      } catch {}

      // Create transaction
      const newTx: TransactionItem = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        telegramUsername: telegramUsername || user.telegramUsername || '',
        telegramId: telegramId || user.telegramId || '',
        type: 'withdrawal',
        amount: numAmount,
        cryptoAmount: String(numAmount),
        currency: currency || 'USDT',
        network: network || 'TRC20',
        recipient: recipient,
        status: 'pending',
        createdAt: Date.now(),
        note: `Withdrawal request to ${recipient}`
      };

      storedTransactions.unshift(newTx);
      writeJsonFile(TRANSACTIONS_FILE, storedTransactions);
      try {
        await setDoc(doc(db, 'transactions', newTx.id), newTx, { merge: true });
      } catch {}

      // Dispatch Telegram Alert to Admin (5951882585 / @ai_zke)
      const dispatchBot = resolveTelegramBotForNotification(user.sourceBotUsername);
      if (dispatchBot) {
        const adminId = "5951882585";
        const botNameTag = user.sourceBotUsername ? `@${user.sourceBotUsername.replace('@', '')}` : `@${dispatchBot.botUsername || 'Main App'}`;
        const adminAlert = 
          `💸 <b>NEW WITHDRAWAL REQUEST!</b>\n\n` +
          `🤖 <b>Origin Bot:</b> ${botNameTag}\n` +
          `💰 <b>Amount:</b> $${numAmount.toFixed(2)} ${currency || 'USDT'}\n` +
          `🌐 <b>Network:</b> ${network || 'TRC20'}\n` +
          `👤 <b>User:</b> @${newTx.telegramUsername || 'Anonymous'} (ID: <code>${newTx.telegramId || user.id}</code>)\n` +
          `📥 <b>Wallet Address:</b> <code>${recipient}</code>\n` +
          `🆔 <b>TxID:</b> <code>${newTx.id}</code>\n\n` +
          `<i>Open Security Desk to Approve or Reject this request.</i>`;

        callTelegramApi(dispatchBot.token, "sendMessage", {
          chat_id: adminId,
          text: adminAlert,
          parse_mode: "HTML"
        }).catch(() => {});

        // User confirmation message in their language
        if (newTx.telegramId) {
          const userLang = resolveBotLang(user.language);
          let userMsg = '';
          if (userLang === 'ru') {
            userMsg = `⏳ <b>Заявка на вывод отправлена!</b>\n\nСумма: <b>$${numAmount.toFixed(2)} ${currency || 'USDT'}</b>\nАдрес: <code>${recipient}</code>\nЗаявка ожидает подтверждения администратора.`;
          } else if (userLang === 'zh') {
            userMsg = `⏳ <b>提现申请已提交！</b>\n\n金额：<b>$${numAmount.toFixed(2)} ${currency || 'USDT'}</b>\n地址：<code>${recipient}</code>\n申请正在等待管理员审核。`;
          } else {
            userMsg = `⏳ <b>Withdrawal Request Submitted!</b>\n\nAmount: <b>$${numAmount.toFixed(2)} ${currency || 'USDT'}</b>\nAddress: <code>${recipient}</code>\nYour request is pending admin approval.`;
          }

          callTelegramApi(dispatchBot.token, "sendMessage", {
            chat_id: newTx.telegramId,
            text: userMsg,
            parse_mode: "HTML"
          }).catch(() => {});
        }
      }

      res.json({ success: true, tx: newTx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/withdrawals/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const index = storedTransactions.findIndex(t => t.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Withdrawal transaction not found." });
      }

      const tx = storedTransactions[index];
      tx.status = 'completed';
      tx.note = 'Approved & sent on-chain';
      writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

      try {
        await updateDoc(doc(db, 'transactions', tx.id), {
          status: 'completed',
          note: tx.note
        });
      } catch {}

      // Notify User via Telegram
      if (tx.telegramId) {
        let user = storedUsers.find(u => u.id === tx.userId || String(u.telegramId) === String(tx.telegramId));
        const dispatchBot = resolveTelegramBotForNotification(user?.sourceBotUsername);
        if (dispatchBot) {
          const userLang = resolveBotLang(user?.language);
          let userMsg = '';
          if (userLang === 'ru') {
            userMsg = `✅ <b>Вывод средств успешно обработан!</b>\n\nСумма <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> переведена на ваш адрес:\n<code>${tx.recipient || 'N/A'}</code>`;
          } else if (userLang === 'zh') {
            userMsg = `✅ <b>提现申请已到账！</b>\n\n金额 <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> 已成功转入您的地址：\n<code>${tx.recipient || 'N/A'}</code>`;
          } else {
            userMsg = `✅ <b>Withdrawal Processed Successfully!</b>\n\nAmount of <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> has been sent to your address:\n<code>${tx.recipient || 'N/A'}</code>`;
          }

          callTelegramApi(dispatchBot.token, "sendMessage", {
            chat_id: tx.telegramId,
            text: userMsg,
            parse_mode: "HTML"
          }).catch(() => {});
        }
      }

      res.json({ success: true, tx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/withdrawals/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const index = storedTransactions.findIndex(t => t.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Withdrawal transaction not found." });
      }

      const tx = storedTransactions[index];
      tx.status = 'rejected';
      tx.note = reason || 'Withdrawal rejected - funds refunded';
      writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

      try {
        await updateDoc(doc(db, 'transactions', tx.id), {
          status: 'rejected',
          note: tx.note
        });
      } catch {}

      // Refund user balance
      let user = storedUsers.find(u => u.id === tx.userId || String(u.telegramId) === String(tx.telegramId));
      if (!user && tx.userId) {
        try {
          const uSnap = await getDoc(doc(db, 'users', tx.userId));
          if (uSnap.exists()) user = uSnap.data() as UserItem;
        } catch {}
      }

      if (user) {
        user.balance = parseFloat((user.balance + tx.amount).toFixed(2));
        writeJsonFile(USERS_FILE, storedUsers);
        try {
          await updateDoc(doc(db, 'users', user.id), { balance: user.balance });
        } catch {}
      }

      // Notify User via Telegram
      if (tx.telegramId) {
        const dispatchBot = resolveTelegramBotForNotification(user?.sourceBotUsername);
        if (dispatchBot) {
          const userLang = resolveBotLang(user?.language);
          let userMsg = '';
          if (userLang === 'ru') {
            userMsg = `❌ <b>Заявка на вывод отклонена.</b>\n\nСумма <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> была возвращена на ваш баланс.\nПричина: ${reason || 'Ошибка в адресе или проверка безопасности.'}`;
          } else if (userLang === 'zh') {
            userMsg = `❌ <b>提现申请已被拒绝。</b>\n\n金额 <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> 已退还至您的账户余额。\n原因：${reason || '地址错误或安全审核未通过。'}`;
          } else {
            userMsg = `❌ <b>Withdrawal Request Rejected.</b>\n\nAmount of <b>$${tx.amount.toFixed(2)} ${tx.currency || 'USDT'}</b> has been refunded to your account balance.\nReason: ${reason || 'Invalid address or security review.'}`;
          }

          callTelegramApi(dispatchBot.token, "sendMessage", {
            chat_id: tx.telegramId,
            text: userMsg,
            parse_mode: "HTML"
          }).catch(() => {});
        }
      }

      res.json({ success: true, tx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. PLANS CRUD API
  // ---------------------------------------------------------------------------
  app.get("/api/plans", (req, res) => {
    res.json({ success: true, plans: storedPlans });
  });

  app.post("/api/plans", async (req, res) => {
    try {
      const planData: Partial<PlanItem> = req.body;
      const newPlan: PlanItem = {
        id: `plan_${Date.now()}`,
        name: planData.name || 'New Arbitrage Strategy',
        minAmount: Number(planData.minAmount) || 10,
        maxAmount: Number(planData.maxAmount) || 10000,
        durationDays: Number(planData.durationDays) || 7,
        expectedReturnPct: Number(planData.expectedReturnPct) || 30,
        dailyReturnPct: Number(planData.dailyReturnPct) || 4.2,
        badge: planData.badge || 'PRO',
        description: planData.description || 'Algorithmic spread execution',
        isActive: planData.isActive ?? true
      };

      storedPlans.push(newPlan);
      writeJsonFile(PLANS_FILE, storedPlans);

      try {
        await setDoc(doc(db, 'plans', newPlan.id), newPlan, { merge: true });
      } catch {}

      res.json({ success: true, plan: newPlan });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const index = storedPlans.findIndex(p => p.id === id);
      if (index === -1) {
        const newP: PlanItem = { id, ...req.body };
        storedPlans.push(newP);
      } else {
        storedPlans[index] = { ...storedPlans[index], ...req.body };
      }
      writeJsonFile(PLANS_FILE, storedPlans);

      try {
        await setDoc(doc(db, 'plans', id), req.body, { merge: true });
      } catch {}

      res.json({ success: true, message: "Plan updated successfully!" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      storedPlans = storedPlans.filter(p => p.id !== id);
      writeJsonFile(PLANS_FILE, storedPlans);

      try {
        await deleteDoc(doc(db, 'plans', id));
      } catch {}

      res.json({ success: true, message: "Plan deleted." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. USERS & TRANSACTIONS API
  // ---------------------------------------------------------------------------
  app.get("/api/users/profile", async (req, res) => {
    try {
      const id = String(req.query.id || '').trim();
      const tgId = String(req.query.tg_id || req.query.telegramId || '').trim();

      let found = storedUsers.find(u => 
        (id && (u.id === id || u.id === `tg_${id}`)) || 
        (tgId && (String(u.telegramId) === tgId || u.id === `tg_${tgId}` || u.id === tgId))
      );

      // Check Firestore if not found or if checking for updated phone verification
      const candidateIds = Array.from(new Set([id, `tg_${tgId}`, tgId, `tg_${id}`].filter(Boolean)));
      for (const cid of candidateIds) {
        try {
          const snap = await getDoc(doc(db, 'users', cid));
          if (snap.exists()) {
            const data = snap.data() as UserItem;
            if (!found) {
              found = { id: snap.id, ...data };
              storedUsers.unshift(found);
              writeJsonFile(USERS_FILE, storedUsers);
            } else {
              // Merge any newly verified phone or balances from Firestore
              if (data.phoneVerified && !found.phoneVerified) {
                found.phoneVerified = true;
                found.phoneNumber = data.phoneNumber || found.phoneNumber;
                found.phoneVerifiedAt = data.phoneVerifiedAt || found.phoneVerifiedAt;
                writeJsonFile(USERS_FILE, storedUsers);
              }
            }
            break;
          }
        } catch {}
      }

      if (!found) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({ success: true, user: found });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/users", (req, res) => {
    res.json({ success: true, users: storedUsers });
  });

  app.post("/api/users/sync", async (req, res) => {
    try {
      const userData: UserItem = req.body;
      if (!userData || !userData.id) {
        return res.status(400).json({ success: false, error: "Invalid user data" });
      }

      const index = storedUsers.findIndex(u => u.id === userData.id || (userData.telegramId && String(u.telegramId) === String(userData.telegramId)));
      if (index === -1) {
        storedUsers.unshift(userData);
      } else {
        storedUsers[index] = { ...storedUsers[index], ...userData };
      }
      writeJsonFile(USERS_FILE, storedUsers);

      try {
        await setDoc(doc(db, 'users', userData.id), userData, { merge: true });
      } catch {}

      res.json({ success: true, user: userData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/users/sync-language", async (req, res) => {
    try {
      const { userId, telegramId, language } = req.body;
      const targetLang = resolveBotLang(language);
      
      const index = storedUsers.findIndex(u => (userId && u.id === userId) || (telegramId && String(u.telegramId) === String(telegramId)));
      if (index !== -1) {
        storedUsers[index].language = targetLang;
        storedUsers[index].preferredLanguage = targetLang;
        writeJsonFile(USERS_FILE, storedUsers);

        try {
          await updateDoc(doc(db, 'users', storedUsers[index].id), {
            language: targetLang,
            preferredLanguage: targetLang
          });
        } catch {}

        return res.json({ success: true, language: targetLang, user: storedUsers[index] });
      }

      res.json({ success: true, language: targetLang });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/users/verify-phone", async (req, res) => {
    try {
      const { userId, telegramId, phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "Phone number is required." });
      }

      const index = storedUsers.findIndex(u => (userId && u.id === userId) || (telegramId && String(u.telegramId) === String(telegramId)));
      if (index !== -1) {
        storedUsers[index].phoneNumber = phoneNumber;
        storedUsers[index].phoneVerified = true;
        storedUsers[index].phoneVerifiedAt = Date.now();
        writeJsonFile(USERS_FILE, storedUsers);

        try {
          await updateDoc(doc(db, 'users', storedUsers[index].id), {
            phoneNumber,
            phoneVerified: true,
            phoneVerifiedAt: Date.now()
          });
        } catch {}

        return res.json({ success: true, message: "Phone number verified!", user: storedUsers[index] });
      }

      res.json({ success: true, message: "Phone number verified." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. LOAN MARKETPLACE API (130% Overcollateralized)
  // ---------------------------------------------------------------------------
  app.get("/api/loans", (req, res) => {
    res.json({ success: true, loans: storedLoans });
  });

  app.get("/api/loans/user/:userId", (req, res) => {
    const { userId } = req.params;
    const userLoans = storedLoans.filter(l => l.userId === userId || String(l.telegramId) === String(userId));
    res.json({ success: true, loans: userLoans });
  });

  app.post("/api/loans/apply", async (req, res) => {
    try {
      const loanData: LoanItem = req.body;
      if (!loanData || !loanData.userId || !loanData.borrowAmount) {
        return res.status(400).json({ success: false, error: "Invalid loan application data." });
      }

      const userIndex = storedUsers.findIndex(u => u.id === loanData.userId || (loanData.telegramId && String(u.telegramId) === String(loanData.telegramId)));
      const user = userIndex !== -1 ? storedUsers[userIndex] : null;

      const borrowAmount = Number(loanData.borrowAmount);
      // Strict 130% collateral requirement (e.g. $100 borrow => $130 collateral)
      const requiredCollateral = parseFloat((borrowAmount * 1.30).toFixed(2));

      if (user && user.balance < requiredCollateral) {
        return res.status(400).json({
          success: false,
          error: `Insufficient collateral. Minimum $${requiredCollateral} USD required (130%) to borrow $${borrowAmount} USD.`
        });
      }

      const newLoan: LoanItem = {
        id: loanData.id || `loan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: loanData.userId,
        telegramUsername: loanData.telegramUsername || user?.telegramUsername,
        telegramId: loanData.telegramId || user?.telegramId,
        borrowAmount,
        collateralAmount: requiredCollateral,
        collateralCoin: loanData.collateralCoin || 'USDT',
        collateralRatio: 1.30,
        interestRatePct: 0.0,
        durationDays: 30,
        status: 'active',
        createdAt: Date.now(),
        dueAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        txid: loanData.txid || `LN-${Math.floor(100000 + Math.random() * 900000)}`
      };

      storedLoans.unshift(newLoan);
      writeJsonFile(LOANS_FILE, storedLoans);

      try {
        await setDoc(doc(db, 'loans', newLoan.id), newLoan, { merge: true });
      } catch {}

      // Update user balances in memory and Firestore
      if (user) {
        user.balance = parseFloat((user.balance + borrowAmount).toFixed(2));
        user.lockedCollateralUsd = parseFloat(((user.lockedCollateralUsd || 0) + requiredCollateral).toFixed(2));
        user.totalBorrowedUsd = parseFloat(((user.totalBorrowedUsd || 0) + borrowAmount).toFixed(2));
        writeJsonFile(USERS_FILE, storedUsers);

        try {
          await updateDoc(doc(db, 'users', user.id), {
            balance: user.balance,
            lockedCollateralUsd: user.lockedCollateralUsd,
            totalBorrowedUsd: user.totalBorrowedUsd
          });
        } catch {}
      }

      res.json({ success: true, message: "Loan approved and funds credited!", loan: newLoan });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/loans/:id/repay", async (req, res) => {
    try {
      const { id } = req.params;
      const index = storedLoans.findIndex(l => l.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Loan record not found." });
      }

      const loan = storedLoans[index];
      loan.status = 'repaid';
      loan.repaidAt = Date.now();
      writeJsonFile(LOANS_FILE, storedLoans);

      try {
        await updateDoc(doc(db, 'loans', loan.id), {
          status: 'repaid',
          repaidAt: Date.now()
        });
      } catch {}

      // Unlock collateral and deduct repayment
      const userIndex = storedUsers.findIndex(u => u.id === loan.userId || (loan.telegramId && String(u.telegramId) === String(loan.telegramId)));
      if (userIndex !== -1) {
        const user = storedUsers[userIndex];
        user.balance = Math.max(0, parseFloat((user.balance - loan.borrowAmount).toFixed(2)));
        user.lockedCollateralUsd = Math.max(0, parseFloat(((user.lockedCollateralUsd || 0) - loan.collateralAmount).toFixed(2)));
        writeJsonFile(USERS_FILE, storedUsers);

        try {
          await updateDoc(doc(db, 'users', user.id), {
            balance: user.balance,
            lockedCollateralUsd: user.lockedCollateralUsd
          });
        } catch {}
      }

      res.json({ success: true, message: "Loan repaid and collateral unlocked!", loan });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/users/:id/balance", async (req, res) => {
    try {
      const { id } = req.params;
      const { amountChange, type = 'balance', reason, coin, cryptoAmountChange } = req.body;
      const index = storedUsers.findIndex(u => u.id === id || String(u.telegramId) === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const user = storedUsers[index];
      const delta = Number(amountChange) || 0;

      if (type === 'balance') {
        user.balance = Math.max(0, parseFloat(((user.balance || 0) + delta).toFixed(2)));
        if (coin) {
          const coinSym = String(coin).toUpperCase();
          const cDelta = Number(cryptoAmountChange) || delta;
          user.cryptoBalances = user.cryptoBalances || {};
          const curCoin = Number(user.cryptoBalances[coinSym] || (coinSym === 'USDT' ? Math.max(0, user.balance - delta) : 0));
          user.cryptoBalances[coinSym] = Math.max(0, parseFloat((curCoin + cDelta).toFixed(8)));
        }
      } else {
        user.bonusBalance = Math.max(0, parseFloat(((user.bonusBalance || 0) + delta).toFixed(2)));
      }
      writeJsonFile(USERS_FILE, storedUsers);

      try {
        await updateDoc(doc(db, 'users', user.id), {
          balance: user.balance,
          bonusBalance: user.bonusBalance,
          cryptoBalances: user.cryptoBalances || {}
        });
      } catch {}

      // Log transaction
      const newTx: TransactionItem = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        telegramUsername: user.telegramUsername || '',
        telegramId: user.telegramId || '',
        type: delta >= 0 ? 'bonus' : 'withdrawal',
        amount: Math.abs(delta),
        currency: coin || 'USDT',
        cryptoAmount: cryptoAmountChange ? String(Math.abs(cryptoAmountChange)) : String(Math.abs(delta)),
        status: 'completed',
        createdAt: Date.now(),
        note: reason || `Admin balance adjustment (${delta >= 0 ? '+' : ''}${delta} USDT for ${coin || 'USDT'})`
      };
      storedTransactions.unshift(newTx);
      writeJsonFile(TRANSACTIONS_FILE, storedTransactions);

      try {
        await setDoc(doc(db, 'transactions', newTx.id), newTx, { merge: true });
      } catch {}

      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/transactions", (req, res) => {
    res.json({ success: true, transactions: storedTransactions });
  });

  // ---------------------------------------------------------------------------
  // 5.1 REFERRAL PROGRAM API & TELEGRAM NOTIFIER
  // ---------------------------------------------------------------------------
  app.post("/api/referrals/notify", async (req, res) => {
    try {
      const { referrerRef, newUser } = req.body;
      if (!referrerRef || !newUser) {
        return res.status(400).json({ success: false, error: "Missing referrerRef or newUser" });
      }

      const cleanRefId = String(referrerRef).replace(/^ref_/, '').replace(/^tg_/, '').trim();
      const dispatchBot = resolveTelegramBotForNotification(newUser.sourceBotUsername);
      if (!dispatchBot) {
        return res.json({ success: false, error: "No active bot configured." });
      }

      const referrer = storedUsers.find(u => 
        String(u.telegramId) === cleanRefId || 
        u.id === cleanRefId || 
        u.id === `tg_${cleanRefId}` || 
        u.referralCode === referrerRef || 
        u.referralCode === `ref_${cleanRefId}`
      );

      const referrerTgId = referrer?.telegramId || (!isNaN(Number(cleanRefId)) ? Number(cleanRefId) : null);

      if (referrerTgId && String(referrerTgId) !== String(newUser.telegramId || newUser.id)) {
        const alertReferrerText = 
          `🎉 <b>NEW REFERRAL JOINED YOUR NETWORK!</b>\n\n` +
          `👤 <b>Trader:</b> ${newUser.firstName || 'Trader'} (@${newUser.telegramUsername || 'N/A'})\n` +
          `🆔 <b>Telegram ID:</b> <code>${newUser.telegramId || newUser.id}</code>\n` +
          `🎁 <b>Bonus Activated:</b> $5.00 Welcome Starter\n` +
          `💰 <b>Commission Tier:</b> 10% Yield Share on all investments\n` +
          `📅 <b>Date:</b> ${new Date().toUTCString()}\n\n` +
          `<i>Your affiliate network is growing! Open the Mini App to view details.</i>`;

        await callTelegramApi(dispatchBot.token, 'sendMessage', {
          chat_id: referrerTgId,
          text: alertReferrerText,
          parse_mode: 'HTML'
        });

        if (referrer) {
          referrer.referralsCount = (referrer.referralsCount || 0) + 1;
          writeJsonFile(USERS_FILE, storedUsers);

          try {
            await updateDoc(doc(db, 'users', referrer.id), { referralsCount: referrer.referralsCount });
          } catch {}
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/referrals/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const cleanId = String(userId).replace(/^ref_/, '').replace(/^tg_/, '');
      const referrals = storedUsers.filter(u => {
        if (!u.referredBy) return false;
        const ref = String(u.referredBy).replace(/^ref_/, '').replace(/^tg_/, '');
        return ref === cleanId || u.referredBy === userId || u.referredBy === `ref_${cleanId}` || u.referredBy === `tg_${cleanId}`;
      });
      res.json({ success: true, count: referrals.length, referrals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. WEBHOOKS & NOTIFY ADMIN & STARS INVOICE
  // ---------------------------------------------------------------------------
  app.post("/api/stars-invoice", async (req, res) => {
    try {
      const { userId, usdAmount, starsAmount: customStars } = req.body;
      const numUsd = Number(usdAmount) || 10;
      const activeBots = Array.from(registeredBots.values()).filter(b => b.isActive);
      
      let botToken = "";
      if (activeBots.length > 0) {
        let targetBot = activeBots[0];
        const user = storedUsers.find(u => u.id === `tg_${userId}` || String(u.telegramId) === String(userId));
        if (user && user.sourceBotId) {
          const found = activeBots.find(b => String(b.botId) === String(user.sourceBotId));
          if (found) targetBot = found;
        } else if (user && user.sourceBotUsername) {
          const found = activeBots.find(b => b.botUsername?.toLowerCase() === user.sourceBotUsername?.toLowerCase());
          if (found) targetBot = found;
        }
        botToken = targetBot.token;
      }

      if (!botToken) {
        try {
          const sysDoc = await getDoc(doc(db, 'system_config', 'settings'));
          if (sysDoc.exists()) {
            botToken = sysDoc.data().primaryBotToken || "";
          }
        } catch {}
      }

      if (!botToken) {
        return res.status(400).json({ success: false, error: "No active Telegram Bot found. Please configure a bot token in Admin Desk." });
      }

      const starsAmount = customStars ? Number(customStars) : Math.ceil(numUsd * (100 / 1.5));
      const payload = JSON.stringify({ type: 'stars_deposit', userId, usdAmount: numUsd });

      const invRes = await callTelegramApi(botToken, 'createInvoiceLink', {
        title: 'Add Funds to Balance',
        description: `Deposit $${numUsd.toFixed(2)} USD using Telegram Stars.`,
        payload: payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: "USD Deposit", amount: starsAmount }]
      });

      if (invRes.ok && invRes.result) {
        res.json({ success: true, invoiceUrl: invRes.result });
      } else {
        res.status(400).json({ success: false, error: invRes.description || "Failed to generate invoice." });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const webhookHandler = async (req: express.Request, res: express.Response) => {
    res.status(200).json({ ok: true });
    try {
      const token = (req.params.botToken || req.query.token as string || "").trim();
      const baseUrl = getAppBaseUrl(req);
      if (token) {
        await processTelegramUpdate(token, req.body, baseUrl);
      }
    } catch (err) {
      console.error("[Telegram Server] Webhook error:", err);
    }
  };

  app.post("/api/telegram-webhook", webhookHandler);
  app.post("/api/telegram-webhook/:botToken", webhookHandler);

  app.post("/api/notify-admin", async (req, res) => {
    try {
      const { message, adminId = "5951882585" } = req.body;
      const text = message || "⚡ Admin Notification Alert";

      const activeBots = Array.from(registeredBots.values()).filter(b => b.isActive);
      if (activeBots.length === 0) {
        return res.json({ success: false, error: "No active bot configured." });
      }

      const sendRes = await callTelegramApi(activeBots[0].token, "sendMessage", {
        chat_id: adminId,
        text,
        parse_mode: "HTML"
      });

      res.json({ success: sendRes.ok });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // FAKE LIVE LOAN DISBURSEMENT CHANNEL BROADCAST API
  // ---------------------------------------------------------------------------
  // 1. Manual Trigger: Send simulated 4K loan receipt to Telegram Channel
  app.post("/api/channel/broadcast-fake-loan", async (req, res) => {
    try {
      const baseUrl = getAppBaseUrl(req);
      const { channelId, botToken } = req.body || {};
      const result = await broadcastFakeLoanProofToChannel(baseUrl, channelId, botToken);
      if (result.success) {
        res.json({
          success: true,
          message: "🎉 Live loan disbursement certificate successfully published to Telegram channel!",
          data: result.data,
          messageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || "Failed to publish loan certificate to channel"
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Receipt Preview: Generate crisp PNG on the fly for admin preview
  app.get("/api/channel/preview-receipt", async (req, res) => {
    try {
      const { buffer, data } = await generateReceiptPngBuffer(undefined, serverPriceCache?.prices);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Channel Settings: Get channel broadcast settings
  app.get("/api/channel/settings", (req, res) => {
    res.json({
      success: true,
      settings: {
        loanProofChannelId: storedSettings?.loanProofChannelId || "",
        loanProofBotId: storedSettings?.loanProofBotId || "primary",
        fakeLoanBroadcastEnabled: storedSettings?.fakeLoanBroadcastEnabled ?? false,
        fakeLoanBroadcastIntervalMinutes: storedSettings?.fakeLoanBroadcastIntervalMinutes || 30,
        lastFakeLoanBroadcastAt: storedSettings?.lastFakeLoanBroadcastAt || 0
      }
    });
  });

  // 4. Channel Settings: Save channel broadcast settings
  app.post("/api/channel/settings", async (req, res) => {
    try {
      const { 
        loanProofChannelId, 
        loanProofBotId, 
        fakeLoanBroadcastEnabled, 
        fakeLoanBroadcastIntervalMinutes 
      } = req.body;

      storedSettings = {
        ...storedSettings,
        loanProofChannelId: (loanProofChannelId || '').trim(),
        loanProofBotId: (loanProofBotId || 'primary').trim(),
        fakeLoanBroadcastEnabled: Boolean(fakeLoanBroadcastEnabled),
        fakeLoanBroadcastIntervalMinutes: Number(fakeLoanBroadcastIntervalMinutes) || 30,
        updatedAt: Date.now()
      };

      try {
        await setDoc(doc(db, 'system_config', 'settings'), storedSettings, { merge: true });
      } catch (e) {
        console.warn("Error persisting channel settings to Firestore:", e);
      }

      res.json({
        success: true,
        message: "Channel broadcast settings updated successfully!",
        settings: storedSettings
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start polling worker & automated loan proof channel broadcaster
  startTelegramPollingWorker(() => getAppBaseUrl());
  startLoanProofBroadcastWorker(() => getAppBaseUrl());

  // ---------------------------------------------------------------------------
  // 7. VITE DEV / PRODUCTION STATIC SERVER
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Arbitrage Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
