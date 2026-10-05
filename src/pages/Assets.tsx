import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Transaction, Investment, UserData, DepositRecord } from '../types';
import { subscribeTransactions, subscribeDeposits, submitWithdrawal } from '../services/systemService';
import { SUPPORTED_COINS, CryptoCoin } from '../data/cryptoAssets';
import { CryptoIcon } from '../components/CryptoIcon';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { CoinDetailView } from '../components/CoinDetailView';
import { fetchLiveCryptoRatesAndChanges, FALLBACK_RATES } from '../utils/cryptoRates';
import { preloadTopCoinsMarketData } from '../services/coinMarketService';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  Clock,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ArrowLeftRight,
  Sparkles,
  ChevronDown,
  Info,
  TrendingUp,
  TrendingDown,
  Wallet,
  Check,
  AlertCircle,
  AlertTriangle,
  ScanLine,
  Gift,
  Coins,
  Lock,
  KeyRound
} from 'lucide-react';
import { FaGiftIcon, FaDollarIcon } from '../components/CustomIcons';

import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { DepositModal } from '../components/DepositModal';
import { SwipeToConfirm } from '../components/SwipeToConfirm';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { WalletPinLock } from '../components/WalletPinLock';
import { AssetsBannerSlider } from '../components/AssetsBannerSlider';
import { TransactionDetailScreen } from '../components/TransactionDetailScreen';
import { 
  isWalletPinSet, 
  isWalletUnlockedInSession, 
  setWalletSessionUnlocked, 
  removeWalletPin 
} from '../utils/walletSecurity';

const DEFAULT_PREVIEW_USER: UserData = {
  id: 'guest_user',
  telegramId: 84920412,
  telegramUsername: 'guest_trader',
  balance: 0.00,
  bonusBalance: 5.00,
  cryptoBalances: {
    USDT: 0.00,
    TON: 0.00,
    BTC: 0.00,
    ETH: 0.00
  },
  role: 'user',
  createdAt: Date.now(),
};

type AssetFilter = 'all' | 'holdings' | 'l1' | 'stable';

interface CoinRowProps {
  coin: CryptoCoin;
  amount: number;
  rate: number;
  usdVal: number;
  pct: string;
  isPos: boolean;
  showBalance: boolean;
  isFa: boolean;
  hasApprovedDeposit?: boolean;
  onSelect: () => void;
}

const CoinRow: React.FC<CoinRowProps> = ({
  coin,
  amount,
  rate,
  usdVal,
  pct,
  isPos,
  showBalance,
  isFa,
  hasApprovedDeposit,
  onSelect,
}) => {
  return (
    <div
      key={coin.id}
      className="relative flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors select-none group cursor-pointer outline-none ring-0 border-0"
      onClick={onSelect}
    >
      {/* Left: Coin Icon & Name/Network */}
      <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
        <div className="relative shrink-0">
          <CryptoIcon symbol={coin.symbol} network={coin.subBadge} className="w-10 h-10 rounded-full" />
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <span className="text-[15px] font-bold text-white tracking-tight leading-snug truncate max-w-[130px] sm:max-w-[180px]">
              {coin.name}
            </span>
            {/* Official Telegram Verified Blue Tick Badge */}
            <VerifiedBadge className="w-3.5 h-3.5" />
            <span className="text-[11.5px] font-semibold text-[#8295A8] tracking-tight">
              {coin.symbol}
            </span>
            {coin.subBadge && (
              <span className="px-1.5 py-0.5 bg-[#2C2C2E] text-[#8295A8] text-[10px] font-semibold rounded-md leading-none">
                {coin.subBadge}
              </span>
            )}
            {hasApprovedDeposit && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md leading-none flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Deposited</span>
              </span>
            )}
            {coin.tag && (
              <span className="px-1.5 py-0.5 bg-[#0D382A] text-[#10B981] text-[10px] font-bold rounded-md leading-none">
                {coin.tag}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse mt-0.5">
            <span className="text-[12.5px] text-[#8295A8] font-medium leading-none">
              ${rate >= 1 ? (rate === 1 ? '1' : rate < 10 ? rate.toFixed(2) : rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })) : rate.toFixed(4)}
            </span>
            <span className={`text-[12px] font-semibold leading-none ${isPos ? 'text-emerald-400' : pct === '0.00%' ? 'text-[#8295A8]' : 'text-rose-400'}`}>
              {pct}
            </span>
          </div>
        </div>
      </div>

      {/* Right: USD Amount (Top) & Crypto Amount (Bottom) */}
      <div className="flex items-center space-x-2.5 rtl:space-x-reverse shrink-0">
        <div className={`flex flex-col items-end justify-center transition-all duration-300 ${
          showBalance ? 'blur-0 opacity-100' : 'blur-[7px] opacity-35 select-none pointer-events-none'
        }`}>
          <span className="text-[15px] font-bold text-white tracking-tight leading-snug">
            ${usdVal >= 1000 ? usdVal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : usdVal.toFixed(usdVal < 1 ? 2 : 2)}
          </span>
          <span className="text-[12.5px] text-[#8295A8] font-semibold leading-tight mt-0.5">
            {amount > 0 ? (amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : amount.toFixed(amount < 1 ? 4 : 2)) : '0'}
          </span>
        </div>
      </div>
    </div>
  );
};

export function Assets() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeUser = user || DEFAULT_PREVIEW_USER;

  // Session-based wallet passcode lock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => isWalletUnlockedInSession());
  const [isPinActive, setIsPinActive] = useState<boolean>(() => isWalletPinSet());
  const [isSetupPinOpen, setIsSetupPinOpen] = useState<boolean>(false);
  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState<boolean>(false);

  // Live Exchange Rates
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  // UI States
  const [showBalance, setShowBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('cryptoapp_show_balance');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cryptoapp_show_balance', String(showBalance));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [showBalance]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AssetFilter>('all');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedCoinForDetail, setSelectedCoinForDetail] = useState<CryptoCoin | null>(null);

  // Action Modals: 'withdraw' | 'swap' | 'transfer'
  const [modalType, setModalType] = useState<'withdraw' | 'swap' | 'transfer' | null>(null);
  const [withdrawCoin, setWithdrawCoin] = useState<string>('USDT');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedWithdrawal, setConfirmedWithdrawal] = useState<{ amount: number; coin: string; address: string } | null>(null);
  const [withdrawWarning, setWithdrawWarning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConfirmWithdrawWithPinOpen, setIsConfirmWithdrawWithPinOpen] = useState(false);
  const [pendingWithdrawData, setPendingWithdrawData] = useState<{ amt: number; usdVal: number } | null>(null);

  // Swap State
  const [swapFromCoin, setSwapFromCoin] = useState('USDT');
  const [swapToCoin, setSwapToCoin] = useState('TON');
  const [swapAmount, setSwapAmount] = useState('');

  // Tab State - dynamically read from query params or location state
  const initialTab = (searchParams.get('tab') as 'crypto' | 'history') || 
                     (location.state as any)?.activeTab || 
                     'crypto';
  const [activeTab, setActiveTab] = useState<'crypto' | 'history'>(initialTab);

  // Sync tab if URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'history' || tabParam === 'crypto') {
      setActiveTab(tabParam);
    } else if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [searchParams, location.state]);

  // Measure Carousel Viewport for 1:1 Physical Touch & Mouse Dragging
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        setCarouselWidth(carouselRef.current.offsetWidth);
      } else if (typeof window !== 'undefined') {
        setCarouselWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Firestore Live Transactions & Investments
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [historyTab, setHistoryTab] = useState<'all' | 'deposit' | 'withdrawal' | 'bonus'>('all');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live 24h market price change percentages from Binance API
  const [liveChanges24h, setLiveChanges24h] = useState<Record<string, string>>({
    STARS: '+1.40%',
    USDT: '0.00%',
    USDE: '0.00%',
    USDC: '0.00%',
    BTC: '+0.00%',
    ETH: '+0.00%',
    TON: '+0.00%',
    SOL: '+0.00%',
    BNB: '+0.00%',
    TRX: '+0.00%',
    DOGE: '+0.00%',
    NOT: '+0.00%',
    SUI: '+0.00%',
    XRP: '+0.00%',
    BCH: '+0.00%',
    MATIC: '+0.00%',
  });

  // Fetch Live Real Crypto Prices and 24h Percentages from API for All Coins
  const loadRates = async () => {
    setIsRefreshingRates(true);
    try {
      const { rates: live, changes } = await fetchLiveCryptoRatesAndChanges();
      setRates(live);
      if (changes && Object.keys(changes).length > 0) {
        setLiveChanges24h(prev => ({ ...prev, ...changes }));
      }
    } catch {
      // Keep fallback
    } finally {
      setIsRefreshingRates(false);
    }
  };

  useEffect(() => {
    loadRates();
    preloadTopCoinsMarketData();
    const interval = setInterval(loadRates, 20000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Real-Time Transactions, Deposits & Investments across API & Firestore
  useEffect(() => {
    const currentUserId = user?.id;
    const currentTgId = user?.telegramId;
    const currentTgUser = user?.telegramUsername;

    let serverTxs: Transaction[] = [];
    let serverDeps: DepositRecord[] = [];

    const isMatch = (itemUserId?: string, itemTgId?: string | number, itemTgUsername?: string) => {
      if (!currentUserId) return false;
      if (currentUserId === 'guest_user') {
        return itemUserId === 'guest_user';
      }
      if (itemUserId && String(itemUserId) === String(currentUserId)) return true;
      if (currentTgId && itemTgId && String(itemTgId) === String(currentTgId)) return true;
      if (currentTgUser && itemTgUsername && String(itemTgUsername).toLowerCase() === String(currentTgUser).toLowerCase()) return true;
      return false;
    };

    const updateCombined = () => {
      const mergedList: Transaction[] = [...serverTxs];
      const existingTxIds = new Set(serverTxs.map(t => t.id));
      const existingTxHashes = new Set(serverTxs.map(t => t.txid).filter(Boolean));

      // Merge deposits as transactions if not already in list
      serverDeps.forEach(dep => {
        if (!existingTxIds.has(dep.id) && (!dep.txid || !existingTxHashes.has(dep.txid))) {
          mergedList.push({
            id: dep.id,
            userId: dep.userId,
            telegramUsername: dep.telegramUsername,
            telegramId: dep.telegramId,
            type: 'deposit',
            amount: Number(dep.usdAmount || 0),
            cryptoAmount: String(dep.cryptoAmount || dep.usdAmount || '0'),
            currency: (dep.coin || 'USDT').toUpperCase(),
            network: dep.network || 'Mainnet',
            txid: dep.txid,
            status: dep.status === 'approved' ? 'completed' : dep.status === 'rejected' ? 'rejected' : 'pending',
            createdAt: dep.timestamp || dep.createdAt || Date.now(),
            note: dep.fromBot ? `Deposit for ${dep.botName || 'Arbitrage Bot'}` : `Crypto deposit (${dep.coin || 'USDT'})`
          });
        }
      });

      const userOnly = mergedList.filter(t => isMatch(t.userId, t.telegramId, t.telegramUsername));
      userOnly.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTransactions(userOnly);
    };

    const unsubTxs = subscribeTransactions((txList) => {
      serverTxs = txList;
      updateCombined();
    });

    const unsubDeps = subscribeDeposits((depList) => {
      serverDeps = depList;
      updateCombined();
    });

    let unsubInv = () => {};
    if (user && user.id !== 'guest_user') {
      try {
        const qInv = query(collection(db, 'investments'), where('userId', '==', user.id));
        unsubInv = onSnapshot(qInv, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment));
          setInvestments(data.sort((a, b) => b.createdAt - a.createdAt));
        }, (err) => console.warn("Inv listener:", err));
      } catch (e) {
        console.warn("Investments listener fallback:", e);
      }
    }

    return () => {
      unsubTxs();
      unsubDeps();
      unsubInv();
    };
  }, [user]);

  // Compute exact balances per coin
  const userCryptoBalances = useMemo(() => {
    const raw = activeUser.cryptoBalances || {};
    const res: Record<string, number> = { ...raw };

    // Default USDT allocation if only general balance exists
    if (res['USDT'] === undefined && (activeUser.balance || 0) > 0) {
      res['USDT'] = activeUser.balance;
    }
    return res;
  }, [activeUser.cryptoBalances, activeUser.balance]);

  // Compute Crypto Portfolio Value in USD
  const totalCryptoUsd = useMemo(() => {
    let total = 0;
    SUPPORTED_COINS.forEach(c => {
      const amount = userCryptoBalances[c.symbol] || 0;
      const rate = rates[c.symbol] || FALLBACK_RATES[c.symbol] || (c.symbol === 'USDT' ? 1 : 0);
      total += amount * rate;
    });
    return total;
  }, [userCryptoBalances, rates]);

  // Selected Tab Balance in USD
  const activeTabBalanceUsd = useMemo(() => {
    return totalCryptoUsd;
  }, [totalCryptoUsd]);

  // Splitting balance for display
  const balanceInt = Math.floor(activeTabBalanceUsd);
  const balanceDec = (activeTabBalanceUsd % 1).toFixed(2).substring(2) || '00';

  // Compute Deposit Info Map per currency
  const coinDepositInfo = useMemo(() => {
    const map: Record<string, { hasApprovedDeposit: boolean; latestApprovedTime: number; totalDepositedUsd: number }> = {};
    
    transactions.forEach(t => {
      if (t.type === 'deposit' && (t.status === 'completed' || t.status === 'approved')) {
        const coin = (t.currency || 'USDT').toUpperCase();
        if (!map[coin]) {
          map[coin] = { hasApprovedDeposit: true, latestApprovedTime: t.createdAt || 0, totalDepositedUsd: t.amount || 0 };
        } else {
          map[coin].hasApprovedDeposit = true;
          map[coin].latestApprovedTime = Math.max(map[coin].latestApprovedTime, t.createdAt || 0);
          map[coin].totalDepositedUsd += t.amount || 0;
        }
      }
    });

    return map;
  }, [transactions]);

  // Allowed coins for withdrawal (only deposited coins or coins with active positive balance)
  const allowedWithdrawCoins = useMemo(() => {
    const deposited = Object.keys(coinDepositInfo).filter(c => coinDepositInfo[c]?.hasApprovedDeposit);
    const positiveBal = SUPPORTED_COINS.filter(c => (userCryptoBalances[c.symbol] || 0) > 0.000001).map(c => c.symbol);
    const combined = Array.from(new Set([...deposited, ...positiveBal]));
    return combined.length > 0 ? combined : ['USDT'];
  }, [coinDepositInfo, userCryptoBalances]);

  // Auto-detected network from deposit record (Not random, matched to deposit)
  const userDepositNetwork = useMemo(() => {
    const dep = transactions.find(t => 
      t.type === 'deposit' && 
      (t.status === 'completed' || t.status === 'approved') && 
      (t.currency || 'USDT').toUpperCase() === withdrawCoin.toUpperCase()
    );
    if (dep?.network) return dep.network;
    if (withdrawCoin === 'TON') return 'TON';
    if (withdrawCoin === 'BTC') return 'BTC';
    if (withdrawCoin === 'ETH') return 'ERC20';
    if (withdrawCoin === 'SOL') return 'Solana';
    return 'TRC20';
  }, [transactions, withdrawCoin]);

  // Coins with positive available balance
  const userCoinsWithBalance = useMemo(() => {
    return SUPPORTED_COINS.filter(c => (userCryptoBalances[c.symbol] || 0) > 0.000001);
  }, [userCryptoBalances]);

  // Filtered & Deposit-Sorted Coins
  const filteredCoins = useMemo(() => {
    let list = [...SUPPORTED_COINS];

    if (filterType === 'holdings') {
      list = list.filter(c => (userCryptoBalances[c.symbol] || 0) > 0.000001);
    } else if (filterType === 'l1') {
      list = list.filter(c => ['BTC', 'ETH', 'SOL', 'TON', 'BNB', 'TRX', 'DOGE', 'SUI', 'MATIC'].includes(c.symbol));
    } else if (filterType === 'stable') {
      list = list.filter(c => ['USDT', 'USDC'].includes(c.symbol));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.symbol.toLowerCase().includes(q)
      );
    }

    // Sort coins: Most recently deposited coins ALWAYS float straight to the top (#1)!
    list.sort((a, b) => {
      const depA = coinDepositInfo[a.symbol];
      const depB = coinDepositInfo[b.symbol];
      const timeA = depA?.latestApprovedTime || 0;
      const timeB = depB?.latestApprovedTime || 0;

      if (timeA > 0 || timeB > 0) {
        return timeB - timeA;
      }

      const balA = userCryptoBalances[a.symbol] || 0;
      const balB = userCryptoBalances[b.symbol] || 0;
      if (balA > 0 || balB > 0) {
        const valA = balA * (rates[a.symbol] || FALLBACK_RATES[a.symbol] || 1);
        const valB = balB * (rates[b.symbol] || FALLBACK_RATES[b.symbol] || 1);
        return valB - valA;
      }

      return 0;
    });

    return list;
  }, [filterType, searchQuery, userCryptoBalances, coinDepositInfo, rates]);

  const orderedCoins = filteredCoins;

  // Number of positive holdings
  const nonZeroHoldingsCount = useMemo(() => {
    return SUPPORTED_COINS.filter(c => (userCryptoBalances[c.symbol] || 0) > 0.000001).length;
  }, [userCryptoBalances]);

  // Handle Withdrawal Submission with Strict Balance Verification
  const handleWithdrawSubmit = (): boolean => {
    setWithdrawWarning(null);

    // Check 24h withdrawal lock
    if (activeUser.withdrawalLockUntil && Date.now() < activeUser.withdrawalLockUntil) {
      const remainingMs = activeUser.withdrawalLockUntil - Date.now();
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const lockMsg = t('withdraw.lockActiveMsg', '24h withdrawal lock is active ({{hours}}h {{mins}}m remaining).', { hours, mins });
      setWithdrawWarning(lockMsg);
      return false;
    }

    const availableAmt = userCryptoBalances[withdrawCoin] || 0;
    const amt = parseFloat(withdrawAmount);

    // 1. Strict Balance Check: If no balance or entered amount exceeds balance -> Yellow Warning & Fast Kick Out!
    if (availableAmt <= 0 || isNaN(amt) || amt <= 0 || amt > availableAmt) {
      const msg = availableAmt <= 0
        ? t('withdraw.noBalanceMsg', 'No balance available for {{coin}} withdrawal.', { coin: withdrawCoin })
        : t('withdraw.insufficientBalanceMsg', 'Insufficient balance! Available: {{avail}} {{coin}}', { avail: availableAmt.toFixed(4), coin: withdrawCoin });
      
      setWithdrawWarning(msg);
      triggerToast(msg);

      // Fast eject from modal after 1.2s yellow alert feedback
      setTimeout(() => {
        setModalType(null);
        setWithdrawWarning(null);
      }, 1200);

      return false; // Prevents SwipeToConfirm from displaying green success
    }

    if (!recipientAddress.trim() || recipientAddress.trim().length < 8) {
      const msg = t('withdraw.enterValidAddress', 'Please enter a valid wallet address.');
      setWithdrawWarning(msg);
      return false;
    }

    const coinRate = rates[withdrawCoin] || FALLBACK_RATES[withdrawCoin] || 1;
    const usdVal = parseFloat((amt * coinRate).toFixed(2));

    // If PIN protection is active, require 4-digit PIN verification before sending
    if (isPinActive) {
      setPendingWithdrawData({ amt, usdVal });
      setIsConfirmWithdrawWithPinOpen(true);
      return true;
    }

    // Otherwise submit directly
    doExecuteWithdrawal(amt, usdVal);
    return true;
  };

  const doExecuteWithdrawal = (amt: number, usdVal: number) => {
    setIsProcessing(true);
    submitWithdrawal({
      userId: activeUser.id,
      telegramUsername: activeUser.telegramUsername || '',
      telegramId: activeUser.telegramId || '',
      amount: usdVal,
      currency: withdrawCoin,
      network: userDepositNetwork,
      recipient: recipientAddress.trim()
    }).then(res => {
      setIsProcessing(false);
      if (res.success) {
        setConfirmedWithdrawal({
          amount: amt,
          coin: withdrawCoin,
          address: recipientAddress.trim()
        });
        setWithdrawAmount('');
        setRecipientAddress('');
      } else {
        setWithdrawWarning(res.message || t('withdraw.submitFailed', 'Failed to submit withdrawal request.'));
      }
    }).catch((e: any) => {
      setIsProcessing(false);
      setWithdrawWarning(e.message || t('withdraw.networkError', 'Network connection error.'));
    });
  };

  // Filtered Transaction History
  const filteredTransactions = useMemo(() => {
    if (historyTab === 'all') return transactions;
    return transactions.filter(t => t.type === historyTab);
  }, [transactions, historyTab]);

  // -------------------------------------------------------------------------
  // PASSCODE LOCK SCREEN GUARD
  // If the wallet is protected by PIN and not unlocked in this session,
  // render ONLY the Passcode screen directly.
  // This guarantees ZERO flash of underlying content (balance, tokens, transactions)!
  // -------------------------------------------------------------------------
  if (!isUnlocked && isPinActive) {
    return (
      <WalletPinLock
        mode="unlock"
        onUnlocked={() => {
          setIsUnlocked(true);
          setIsPinActive(isWalletPinSet());
        }}
      />
    );
  }

  // Coin Detail Market & Statistics View (Matches uploaded screenshot)
  if (selectedCoinForDetail) {
    return (
      <CoinDetailView
        coin={selectedCoinForDetail}
        balance={userCryptoBalances[selectedCoinForDetail.symbol] || 0}
        rate={rates[selectedCoinForDetail.symbol] || FALLBACK_RATES[selectedCoinForDetail.symbol] || 1}
        transactions={transactions}
        onBack={() => setSelectedCoinForDetail(null)}
        onReceive={() => {
          setSelectedCoinForDetail(null);
          setIsDepositModalOpen(true);
        }}
        onSend={(c) => {
          setSelectedCoinForDetail(null);
          setWithdrawCoin(c.symbol);
          setModalType('withdraw');
        }}
        onSelectTxDetail={(tx) => setSelectedTxForDetail(tx)}
      />
    );
  }

  const isRtl = i18n.language?.startsWith('fa');
  const isFa = isRtl;
  const width = carouselWidth || (typeof window !== 'undefined' ? window.innerWidth : 390);

  return (
    <div className="min-h-screen bg-[#1C1C1E] text-white pb-28 pt-2 select-none">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 inset-x-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-[#1C1C1E]/95 backdrop-blur-xl px-4 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#2EA5FF]" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar & Passcode Security Status */}
      <div className="px-4 flex items-center justify-end mb-2 pt-2">
        {/* Wallet Security PIN Lock Status Button */}
        <button
          type="button"
          onClick={() => {
            if (isPinActive) {
              setIsSecuritySettingsOpen(true);
            } else {
              setIsSetupPinOpen(true);
            }
          }}
          title={isPinActive ? 'Wallet Security: Active' : 'Set Wallet Passcode'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
            isPinActive
              ? 'bg-[#1C1C1E] border-[#2EA5FF]/40 text-[#2EA5FF]'
              : 'bg-[#1C1C1E] border-[#233242] text-[#8295A8] hover:text-white'
          }`}
        >
          {isPinActive ? (
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-[#2EA5FF]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          ) : (
            <Lock className="w-3.5 h-3.5 text-[#8295A8]" />
          )}
        </button>
      </div>

      {/* Main Net Worth Top Header Section */}
      <div className="px-4 mb-4">
        <div className="relative flex flex-col items-center justify-center w-full">

          {/* Large High-Contrast Balance with Smooth Custom Blur Effect & Eye Icon */}
          <div className="flex items-center justify-center space-x-2.5 rtl:space-x-reverse pt-2 pb-6">
            <div className={`flex items-center justify-center tracking-tight transition-all duration-300 ${
              showBalance ? 'blur-0 opacity-100' : 'blur-[10px] opacity-30 select-none pointer-events-none'
            }`}>
              <FaDollarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#2EA5FF] shrink-0 mr-2 rtl:ml-2 rtl:mr-0 self-center" />
              <div className="flex items-baseline">
                <span className="text-[44px] sm:text-[48px] font-bold text-white tracking-tight leading-none">
                  {balanceInt.toLocaleString()}
                </span>
                <span className="text-[28px] sm:text-[32px] font-bold text-white/80 leading-none ml-0.5 rtl:mr-0.5 rtl:ml-0">
                  .{balanceDec}
                </span>
              </div>
            </div>

            {/* Eye Icon Toggle Button - Pure floating icon without card background */}
            <button
              onClick={() => setShowBalance(!showBalance)}
              title={showBalance ? t('assets.hideBalance', 'Hide Balance') : t('assets.showBalance', 'Show Balance')}
              className="p-1.5 text-[#8295A8] hover:text-[#2EA5FF] active:scale-90 transition-all cursor-pointer shrink-0"
            >
              {showBalance ? (
                <Eye className="w-5 h-5 text-[#2EA5FF]" />
              ) : (
                <EyeOff className="w-5 h-5 text-rose-400" />
              )}
            </button>
          </div>

          {/* 2 Ergonomic Compact Blue Action Buttons (Deposit & Withdraw) - Clean Blue Gradient without Neon */}
          <div className="flex items-center justify-center space-x-20 sm:space-x-24 rtl:space-x-reverse w-full max-w-[320px] mx-auto pt-1 pb-2">
            {/* Deposit Button */}
            <button 
              onClick={() => setIsDepositModalOpen(true)}
              className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#38B6FF] via-[#2EA5FF] to-[#007AFF] group-hover:brightness-110 active:brightness-95 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[12.5px] font-bold text-white tracking-wide">{t('assets.deposit', 'Deposit')}</span>
            </button>

            {/* Withdraw Button */}
            <button 
              onClick={() => {
                setWithdrawCoin('USDT');
                setModalType('withdraw');
              }}
              className="flex flex-col items-center justify-center space-y-1.5 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#38B6FF] via-[#2EA5FF] to-[#007AFF] group-hover:brightness-110 active:brightness-95 flex items-center justify-center transition-all">
                <ArrowUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[12.5px] font-bold text-white tracking-wide">{t('assets.withdraw', 'Withdraw')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Precision Centered Telegram Native Tab Bar */}
      <div className="flex justify-center items-center px-4 mt-2 mb-3">
        <div className="flex items-center justify-center space-x-8 rtl:space-x-reverse border-b border-white/[0.06] pb-0">
          {/* Crypto Tab */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('crypto');
            }}
            className={`relative pb-2.5 px-3 text-[14.5px] font-bold transition-colors cursor-pointer select-none ${
              activeTab === 'crypto' ? 'text-white' : 'text-[#8295A8] hover:text-slate-300'
            }`}
          >
            <span>{t('assets.tabCrypto', 'Crypto')}</span>
            {activeTab === 'crypto' && (
              <motion.div
                layoutId="walletTabIndicator"
                className="absolute bottom-0 inset-x-2 h-[2.5px] bg-[#2EA5FF] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </button>

          {/* History Tab */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('history');
            }}
            className={`relative pb-2.5 px-3 text-[14.5px] font-bold transition-colors cursor-pointer select-none flex items-center space-x-1.5 rtl:space-x-reverse ${
              activeTab === 'history' ? 'text-white' : 'text-[#8295A8] hover:text-slate-300'
            }`}
          >
            <span>{t('assets.tabHistory', 'History')}</span>
            {filteredTransactions.length > 0 && (
              <span className="text-[10px] font-bold text-slate-300 bg-white/[0.12] px-1.5 py-0.5 rounded-full leading-none">
                {filteredTransactions.length}
              </span>
            )}
            {activeTab === 'history' && (
              <motion.div
                layoutId="walletTabIndicator"
                className="absolute bottom-0 inset-x-2 h-[2.5px] bg-[#2EA5FF] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* 2-Page Smooth Native Interactive Carousel */}
      <div 
        ref={carouselRef} 
        className="w-full overflow-hidden select-none"
        dir="ltr"
        onTouchStart={(e) => {
          (window as any)._walletTouchStartX = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const startX = (window as any)._walletTouchStartX;
          if (typeof startX === 'number') {
            const diff = e.changedTouches[0].clientX - startX;
            const threshold = 45;
            if (diff < -threshold && activeTab === 'crypto') {
              triggerHaptic('selection');
              setActiveTab('history');
            } else if (diff > threshold && activeTab === 'history') {
              triggerHaptic('selection');
              setActiveTab('crypto');
            }
          }
          (window as any)._walletTouchStartX = null;
        }}
      >
        <div
          className="flex w-[200%] items-start transition-transform duration-300 ease-out"
          style={{ transform: activeTab === 'crypto' ? 'translateX(0%)' : 'translateX(-50%)' }}
        >
          {/* Slide 0: Crypto Assets List */}
          <div className="w-1/2 shrink-0 px-4 mb-5" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-white/[0.06] shadow-lg w-full">
              {orderedCoins.length > 0 ? (
                <div className="divide-y divide-white/[0.06] w-full list-none p-0 m-0">
                  {orderedCoins.map((coin) => {
                    const amount = userCryptoBalances[coin.symbol] || 0;
                    const rate = rates[coin.symbol] || FALLBACK_RATES[coin.symbol] || (coin.symbol === 'USDT' || coin.symbol === 'USDE' ? 1 : 0);
                    const usdVal = amount * rate;
                    const pct = liveChanges24h[coin.symbol] || '+0.00%';
                    const isPos = pct.startsWith('+');

                    return (
                      <CoinRow
                        key={coin.id}
                        coin={coin}
                        amount={amount}
                        rate={rate}
                        usdVal={usdVal}
                        pct={pct}
                        isPos={isPos}
                        showBalance={showBalance}
                        isFa={isFa}
                        hasApprovedDeposit={coinDepositInfo[coin.symbol]?.hasApprovedDeposit}
                        onSelect={() => {
                          triggerHaptic('selection');
                          setSelectedCoinForDetail(coin);
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[#708499] text-xs">
                  <Info className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                  <span>{t('assets.noMatchingCrypto', 'No cryptocurrencies match your search.')}</span>
                </div>
              )}

              {/* Starter Bonus Asset item */}
              <div 
                onClick={() => navigate('/loans')}
                className="p-3.5 flex items-center justify-between hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/25 to-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Gift className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left rtl:text-right">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <span className="text-[15px] font-bold text-white leading-snug">
                        {'Starter Bonus'}
                      </span>
                      <VerifiedBadge className="w-3.5 h-3.5" />
                      <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-400 text-[11px] font-semibold rounded-md leading-none">
                        USDT
                      </span>
                    </div>
                    <span className="text-[12px] text-[#8295A8] font-medium block mt-0.5 leading-none">
                      {'Bot Activation Discount'}
                    </span>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <span className="text-[15px] font-bold font-mono text-amber-400 block leading-snug">
                    +${(activeUser.bonusBalance ?? 5.00).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium block leading-none">
                    {'Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 1: History Transactions List (Individual Card Design Matching Screenshot) */}
          <div className="w-1/2 shrink-0 px-4 mb-5" dir={isRtl ? 'rtl' : 'ltr'}>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-2.5 w-full">
                {filteredTransactions.slice(0, 30).map((tx) => {
                  const isDeposit = tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'yield' || tx.type === 'bonus';
                  const sym = (tx.currency || 'USDT').toUpperCase();
                  const address = tx.recipient || (tx as any).txHash || (tx as any).senderAddress || (tx as any).depositAddress || '';
                  const shortAddress = address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address || (isDeposit ? 'Deposit' : 'Withdrawal');
                  const memo = (tx as any).memo || (tx as any).tag || (tx as any).note || (tx as any).txid?.slice(0, 5);

                  let cryptoStr = '';
                  if (tx.cryptoAmount) {
                    cryptoStr = `${isDeposit ? '+' : '-'} ${tx.cryptoAmount} ${sym}`;
                  } else {
                    const rate = rates[sym] || FALLBACK_RATES[sym] || 1;
                    const qty = rate > 0 ? (tx.amount / rate).toFixed(sym === 'TON' || sym === 'SOL' ? 2 : 2) : tx.amount.toFixed(2);
                    cryptoStr = `${isDeposit ? '+' : '-'} ${qty} ${sym}`;
                  }

                  const timeStr = new Date(tx.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });

                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="bg-[#1C1C1E] rounded-[22px] p-3.5 flex items-center justify-between hover:bg-[#242426] active:scale-[0.99] transition-all cursor-pointer group select-none shadow-sm"
                    >
                      {/* Left: Round icon with arrow + title and address */}
                      <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                        {sym === 'STARS' ? (
                          <div className="w-11 h-11 flex items-center justify-center shrink-0">
                            <CryptoIcon symbol="STARS" className="w-11 h-11 scale-125 object-contain" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0">
                            {isDeposit ? (
                              <ArrowDown className="w-5 h-5 text-white/80" strokeWidth={2.2} />
                            ) : (
                              <ArrowUp className="w-5 h-5 text-white/80" strokeWidth={2.2} />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="text-[15px] font-bold text-white tracking-tight leading-tight">
                            {isDeposit ? 'Deposit' : 'Withdrawal'}
                          </span>
                          <span className="text-[12px] text-[#7E8F9E] font-mono leading-none mt-1">
                            {shortAddress}
                          </span>
                          {memo && (
                            <div className="mt-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10.5px] font-mono text-slate-300 leading-none inline-block">
                                {memo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Crypto amount (+0.08 TON in green or -0.14 TON in white) & Time */}
                      <div className="flex flex-col items-end shrink-0 justify-center">
                        <span className={`text-[15px] font-bold tracking-tight leading-tight ${
                          isDeposit ? 'text-[#10B981]' : 'text-white'
                        }`}>
                          {cryptoStr}
                        </span>
                        <span className="text-[12px] text-[#7E8F9E] font-medium leading-none mt-1">
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#1C1C1E] rounded-[24px] p-8 text-center text-[#708499] text-xs">
                <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                <span>{t('assets.noTransactions', 'No transactions recorded yet.')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INSTANT CRYPTO SWAP SHEET                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {modalType === 'swap' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-telegram">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => setModalType(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-[6px] transform-gpu"
            />

            <motion.div 
              initial={{ y: "100%", opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 350) {
                  setModalType(null);
                }
              }}
              className="relative w-full max-w-md bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto transform-gpu will-change-transform touch-pan-y font-telegram border-t sm:border border-white/[0.06]"
            >
              {/* Top Handle bar (Mobile) */}
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="w-4 h-4 text-[#2EA5FF]" />
                  <h3 className="text-sm font-bold text-white">{t('swap.title', 'Instant Crypto Swap')}</h3>
                </div>
                <button 
                  onClick={() => setModalType(null)}
                  className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8295A8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* From Coin Input */}
              <div className="bg-[#1C1C1E] p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78899B]">
                  <span>{t('swap.youPay', 'You Pay')}</span>
                  <span>{t('swap.available', 'Available: {{amount}} {{coin}}', { amount: (userCryptoBalances[swapFromCoin] || 0).toFixed(4), coin: swapFromCoin })}</span>
                </div>
                <div className="flex items-center justify-between space-x-3">
                  <input 
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                  />
                  <select 
                    value={swapFromCoin}
                    onChange={(e) => setSwapFromCoin(e.target.value)}
                    className="bg-[#2C2C2E] text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {['USDT', 'TON', 'STARS', 'BTC', 'ETH', 'SOL', 'BNB', 'TRX', 'DOGE', 'USDE', 'NOT'].map(sym => (
                      <option key={sym} value={sym} className="bg-[#1C1C1E] text-white">{sym}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Switch Button */}
              <div className="flex items-center justify-center -my-2">
                <button 
                  onClick={() => {
                    const temp = swapFromCoin;
                    setSwapFromCoin(swapToCoin);
                    setSwapToCoin(temp);
                  }}
                  className="w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#38383A] text-[#2EA5FF] flex items-center justify-center shadow-lg border border-[#0F1721] cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* To Coin Output */}
              <div className="bg-[#1C1C1E] p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78899B]">
                  <span>{t('swap.youReceive', 'You Receive')}</span>
                  <span>{t('swap.rate', 'Rate: 1 {{from}} ≈ {{rate}} {{to}}', { from: swapFromCoin, rate: ((rates[swapFromCoin] || FALLBACK_RATES[swapFromCoin] || 1) / (rates[swapToCoin] || FALLBACK_RATES[swapToCoin] || 1)).toFixed(4), to: swapToCoin })}</span>
                </div>
                <div className="flex items-center justify-between space-x-3">
                  <div className="text-xl font-bold font-mono text-white">
                    {swapAmount && !isNaN(parseFloat(swapAmount)) 
                      ? ((parseFloat(swapAmount) * (rates[swapFromCoin] || FALLBACK_RATES[swapFromCoin] || 1)) / (rates[swapToCoin] || FALLBACK_RATES[swapToCoin] || 1)).toFixed(6)
                      : '0.00'}
                  </div>
                  <select 
                    value={swapToCoin}
                    onChange={(e) => setSwapToCoin(e.target.value)}
                    className="bg-[#2C2C2E] text-white text-xs font-bold px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {['TON', 'USDT', 'STARS', 'BTC', 'ETH', 'SOL', 'BNB', 'TRX', 'DOGE', 'USDE', 'NOT'].map(sym => (
                      <option key={sym} value={sym} className="bg-[#1C1C1E] text-white">{sym}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Confirm Swap Button */}
              <button 
                onClick={() => {
                  const amt = parseFloat(swapAmount);
                  if (isNaN(amt) || amt <= 0) {
                    triggerToast(t('swap.enterAmount', 'Please enter an amount to swap.'));
                    return;
                  }
                  const bal = userCryptoBalances[swapFromCoin] || 0;
                  if (amt > bal && bal > 0) {
                    triggerToast(t('swap.insufficientBalance', 'Insufficient {{coin}} balance.', { coin: swapFromCoin }));
                    return;
                  }
                  setIsProcessing(true);
                  setTimeout(() => {
                    setIsProcessing(false);
                    setModalType(null);
                    setSwapAmount('');
                    triggerToast(t('swap.successMsg', 'Swapped {{amount}} {{from}} to {{to}} successfully', { amount: amt, from: swapFromCoin, to: swapToCoin }));
                  }, 600);
                }}
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#2481CC] hover:bg-[#1D74BD] active:scale-95 text-white font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <ArrowUpDown className="w-4 h-4 text-white" />
                    <span>{t('swap.swapButton', 'Swap {{from}} to {{to}}', { from: swapFromCoin, to: swapToCoin })}</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: WITHDRAWAL SHEET                                                 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {modalType === 'withdraw' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-telegram">
            {/* Telegram UI Backdrop with smooth blur fade */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => {
                setConfirmedWithdrawal(null);
                setModalType(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-[6px] transform-gpu"
            />

            {/* Telegram UI Bottom-Sheet Modal (Spring & Swipe Down) */}
            <motion.div 
              initial={{ y: "100%", opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 350) {
                  setConfirmedWithdrawal(null);
                  setModalType(null);
                }
              }}
              className="relative w-full max-w-md bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-5 z-10 space-y-3.5 max-h-[92vh] overflow-y-auto transform-gpu will-change-transform font-telegram border-t sm:border border-white/[0.06] select-none touch-pan-y"
            >
              {/* Top Handle bar (Mobile) */}
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-0.5 sm:hidden shrink-0" />

              {/* Minimal Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${confirmedWithdrawal ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#2EA5FF]/15 text-[#2EA5FF]'}`}>
                    {confirmedWithdrawal ? <CheckCircle2 className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-base font-bold text-white tracking-tight font-telegram">
                      {confirmedWithdrawal ? t('withdraw.submittedTitle', 'Withdrawal Submitted') : `${t('withdraw.title', 'Withdraw')} ${withdrawCoin}`}
                    </h3>
                    {!confirmedWithdrawal && <VerifiedBadge className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setConfirmedWithdrawal(null);
                    setModalType(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#242426] hover:bg-[#2C2C2E] text-[#7D8B9B] hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer border-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SUCCESS VIEW IF WITHDRAWAL CONFIRMED */}
              {confirmedWithdrawal ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="relative flex items-center justify-center pt-2">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-white tracking-tight font-sans">
                      {t('withdraw.submittedTitle', 'Withdrawal Submitted')}
                    </h3>
                    <p className="text-xs text-[#7D8B9B] font-medium font-sans max-w-[280px] mx-auto leading-relaxed">
                      {t('withdraw.submittedDesc', 'Your withdrawal request was sent to the network processor and is under review.')}
                    </p>
                  </div>

                  <div className="bg-[#242426] rounded-2xl p-4 space-y-3 font-sans border-0 text-left rtl:text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#7D8B9B] font-medium">{t('withdraw.requestedAmount', 'Requested Amount:')}</span>
                      <span className="text-sm font-bold text-white font-sans">
                        {confirmedWithdrawal.amount} {confirmedWithdrawal.coin}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#7D8B9B] font-medium">{t('withdraw.destinationAddressLabel', 'Destination Address:')}</span>
                      <span className="text-xs font-bold text-white max-w-[150px] truncate font-sans" title={confirmedWithdrawal.address}>
                        {confirmedWithdrawal.address}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-[#7D8B9B] font-medium">{t('withdraw.statusLabel', 'Status:')}</span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-amber-500/15 text-amber-400 font-bold text-[11px] rounded-lg">
                        <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        <span>{t('withdraw.pendingVerification', 'Pending Verification')}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedWithdrawal(null);
                      setModalType(null);
                    }}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm rounded-2xl transition-all cursor-pointer font-sans shadow-lg shadow-emerald-500/25 border-0"
                  >
                    {t('deposit.done', 'Done')}
                  </button>
                </div>
              ) : (
                /* NORMAL WITHDRAWAL FORM */
                <>
                  {/* Yellow Warning Alert Banner (Insufficient Balance or Validation Error) */}
                  {withdrawWarning && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-2xl flex items-start space-x-2.5 rtl:space-x-reverse text-amber-400 text-xs font-bold font-sans animate-pulse"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <span className="leading-relaxed">{withdrawWarning}</span>
                    </motion.div>
                  )}

                  {/* 24-Hour Lock Warning Banner (If active) */}
                  {activeUser.withdrawalLockUntil && Date.now() < activeUser.withdrawalLockUntil && (
                    <div className="bg-amber-500/10 p-3 rounded-2xl flex items-start space-x-2.5 rtl:space-x-reverse text-amber-400 text-xs border-0">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <span className="font-bold block mb-0.5 font-sans">{t('withdraw.lockActiveTitle', '24h Lock Active')}</span>
                        <span className="text-amber-300/80 text-[11px] leading-relaxed block font-sans">
                          {t('withdraw.lockActiveDesc', 'Withdrawals unlock 24 hours after strategy activation.')}
                        </span>
                        <span className="font-bold text-[11px] text-amber-400 block mt-1 font-sans">
                          {t('withdraw.timeRemaining', 'Time remaining: {{hours}}h {{mins}}m', {
                            hours: Math.floor((activeUser.withdrawalLockUntil - Date.now()) / (1000 * 60 * 60)),
                            mins: Math.ceil(((activeUser.withdrawalLockUntil - Date.now()) % (1000 * 60 * 60)) / (1000 * 60))
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Multi-Asset Selector Card: If user has multiple coins with balance */}
                  {userCoinsWithBalance.length > 1 && (
                    <div className="space-y-1.5 font-sans">
                      <label className="text-[11px] font-bold text-[#7D8B9B] uppercase tracking-wider block">
                        {t('withdraw.yourAssetsTitle', 'Your Assets Available for Withdrawal:')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {userCoinsWithBalance.map(c => {
                          const bal = userCryptoBalances[c.symbol] || 0;
                          const isSel = withdrawCoin === c.symbol;
                          return (
                            <button
                              key={c.symbol}
                              type="button"
                              onClick={() => {
                                setWithdrawCoin(c.symbol);
                                setWithdrawWarning(null);
                              }}
                              className={`p-2.5 rounded-2xl border-0 text-left rtl:text-right transition-all cursor-pointer flex items-center space-x-2.5 rtl:space-x-reverse ${
                                isSel 
                                  ? 'bg-[#1E2E3D] ring-2 ring-[#2EA5FF] text-white shadow-md' 
                                  : 'bg-[#242426] hover:bg-[#182635] text-[#7D8B9B]'
                              }`}
                            >
                              <CryptoIcon symbol={c.symbol} className="w-7 h-7 rounded-full shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs font-bold text-white leading-tight">{c.symbol}</span>
                                  <VerifiedBadge className="w-3 h-3" />
                                </div>
                                <div className="text-[10px] font-bold text-[#2EA5FF] truncate mt-0.5">
                                  {bal.toFixed(bal < 1 ? 4 : 2)}
                                </div>
                              </div>
                              {isSel && <Check className="w-3.5 h-3.5 text-[#2EA5FF] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 1. Selected Asset & Profile-Style Balance Card (No borders, minimal) */}
                  {(() => {
                    const selectedRate = rates[withdrawCoin] || FALLBACK_RATES[withdrawCoin] || (withdrawCoin === 'USDT' || withdrawCoin === 'USDE' ? 1 : 0);
                    const availBal = userCryptoBalances[withdrawCoin] || 0;
                    const availUsd = availBal * selectedRate;

                    return (
                      <div className="bg-[#242426] rounded-2xl p-3.5 space-y-2.5 border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                            <CryptoIcon symbol={withdrawCoin} className="w-9 h-9 rounded-full shrink-0" />
                            <div>
                              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                                <span className="text-[15px] font-bold text-white tracking-tight font-sans">{withdrawCoin}</span>
                                <VerifiedBadge className="w-3.5 h-3.5" />
                                <span className="px-1.5 py-0.5 bg-[#2C2C2E] text-[#2EA5FF] text-[10px] font-bold rounded border-0 font-sans">
                                  {userDepositNetwork}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7D8B9B] block font-sans">
                                {t('withdraw.apiRate', 'API Rate:')} ${selectedRate >= 1 ? selectedRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : selectedRate.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          {/* Dropdown if multiple allowed coins */}
                          {allowedWithdrawCoins.length > 1 && userCoinsWithBalance.length <= 1 && (
                            <select
                              value={withdrawCoin}
                              onChange={(e) => {
                                setWithdrawCoin(e.target.value);
                                setWithdrawWarning(null);
                              }}
                              className="bg-[#2C2C2E] text-white text-xs font-bold px-2.5 py-1.5 rounded-xl border-0 focus:outline-none focus:ring-0 cursor-pointer font-sans"
                            >
                              {allowedWithdrawCoins.map(sym => (
                                <option key={sym} value={sym} className="bg-[#1C1C1E] text-white">{sym}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Balance formatted identically to Profile Balance */}
                        <div className="bg-[#242426] rounded-xl p-3 flex items-center justify-between border-0">
                          <span className="text-[11px] text-[#7D8B9B] font-medium font-sans">{t('withdraw.availableLabel', 'Available:')}</span>
                          <div className="text-right rtl:text-left">
                            <span className="text-[18px] font-bold text-white tracking-tight leading-none block font-sans">
                              {availBal.toFixed(availBal < 1 ? 4 : 2)} {withdrawCoin}
                            </span>
                            <span className="text-[11px] text-[#2EA5FF] font-medium font-sans block mt-0.5">
                              ≈ ${availUsd.toFixed(2)} USD
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Amount Input (Borderless, clean dark container, sans font) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-[11px] font-bold text-[#7D8B9B] uppercase tracking-wider font-sans">{t('withdraw.amountLabel', 'Amount')}</label>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        {[0.25, 0.50, 0.75, 1].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const total = userCryptoBalances[withdrawCoin] || 0;
                              setWithdrawAmount((total * pct).toFixed(pct === 1 ? 4 : 4));
                            }}
                            className="px-2 py-0.5 bg-[#242426] hover:bg-[#1E2B3A] text-[10px] font-bold text-[#2EA5FF] rounded-lg transition-colors cursor-pointer border-0 font-sans"
                          >
                            {pct === 1 ? t('withdraw.maxAll', 'MAX ALL') : `${pct * 100}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <input 
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#242426] border-0 rounded-2xl p-3.5 pr-16 text-base font-bold font-sans text-white focus:outline-none focus:ring-0 transition-all placeholder:text-[#506275]"
                      />
                      <span className="absolute right-3.5 rtl:right-auto rtl:left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2EA5FF] font-sans">
                        {withdrawCoin}
                      </span>
                    </div>
                  </div>

                  {/* 3. Material Address Input (Borderless, clean, sans font) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#7D8B9B] uppercase tracking-wider block font-sans">
                      {t('withdraw.destinationAddress', 'Destination Wallet Address')}
                    </label>
                    
                    <div className="relative flex items-center">
                      <input 
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder={t('withdraw.pasteAddressPlaceholder', 'Paste recipient {{coin}} address', { coin: withdrawCoin })}
                        className="w-full bg-[#242426] border-0 rounded-2xl p-3.5 pr-20 rtl:pr-3.5 rtl:pl-20 text-xs font-bold font-sans text-white focus:outline-none focus:ring-0 transition-all placeholder:text-[#506275]"
                      />

                      {/* Android Paste Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const txt = await navigator.clipboard.readText();
                            if (txt) {
                              setRecipientAddress(txt.trim());
                              triggerToast(t('withdraw.pastedToast', 'Pasted from clipboard!'));
                            }
                          } catch {
                            triggerToast(t('withdraw.pasteManualToast', 'Please paste manually.'));
                          }
                        }}
                        className="absolute right-2 rtl:right-auto rtl:left-2 px-3 py-1.5 bg-[#1E2B3A] hover:bg-[#28384C] text-[#2EA5FF] text-[11px] font-bold rounded-xl transition-all cursor-pointer font-sans active:scale-95 shrink-0 border-0"
                      >
                        {t('withdraw.pasteBtn', 'Paste')}
                      </button>
                    </div>
                  </div>

                  {/* 4. Minimal Swipe to Confirm Slider */}
                  <div className="pt-1">
                    <SwipeToConfirm 
                      onConfirm={handleWithdrawSubmit}
                      disabled={Boolean(activeUser.withdrawalLockUntil) && Date.now() < (activeUser.withdrawalLockUntil || 0)}
                      isLoading={isProcessing}
                      label={t('withdraw.swipeToConfirm', 'Swipe to confirm')}
                      lockedLabel={t('withdraw.withdrawalLocked', 'Withdrawal Locked (24h)')}
                    />
                  </div>
                </>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deposit Bottom Sheet Modal */}
      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
        onSelectCryptoDirect={() => navigate('/deposit')}
      />

      {/* Wallet Security Settings Modal */}
      <AnimatePresence>
        {isSecuritySettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#1C1C1E] border border-[#233242] rounded-3xl p-5 max-w-xs w-full text-center space-y-4 shadow-xl relative text-white font-sans"
            >
              <button
                type="button"
                onClick={() => setIsSecuritySettingsOpen(false)}
                className="absolute top-4 right-4 text-[#8295A8] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-11 h-11 rounded-full bg-[#2EA5FF]/10 text-[#2EA5FF] flex items-center justify-center mx-auto mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  Wallet Security
                </h3>
                <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
                  Your wallet is protected by a 4-digit passcode.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-left">
                {/* Lock Now Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWalletSessionUnlocked(false);
                    setIsUnlocked(false);
                    setIsSecuritySettingsOpen(false);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#242426] hover:bg-[#2C2C2E] active:scale-[0.98] transition-all flex items-center justify-between text-xs font-medium text-white border border-white/[0.06] cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-[#2EA5FF]" />
                    <span>Lock Wallet Now</span>
                  </span>
                  <span className="text-[10px] text-[#2EA5FF] bg-[#2EA5FF]/10 px-2 py-0.5 rounded font-mono">
                    Test
                  </span>
                </button>

                {/* Change Passcode Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSecuritySettingsOpen(false);
                    setIsSetupPinOpen(true);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#242426] hover:bg-[#2C2C2E] active:scale-[0.98] transition-all flex items-center justify-between text-xs font-medium text-white border border-white/[0.06] cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Change Passcode</span>
                  </span>
                  <span className="text-[10px] text-[#8E8E93]">➔</span>
                </button>

                {/* Disable Passcode Button */}
                <button
                  type="button"
                  onClick={() => {
                    removeWalletPin();
                    setIsPinActive(false);
                    setIsUnlocked(true);
                    setIsSecuritySettingsOpen(false);
                    triggerToast('Passcode removed');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 active:scale-[0.98] transition-all flex items-center justify-between text-xs font-medium text-rose-400 border border-rose-500/20 cursor-pointer"
                >
                  <span>Disable Passcode</span>
                  <span className="text-[10px] text-rose-400/80">OFF</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wallet Passcode Setup Modal */}
      <AnimatePresence>
        {isSetupPinOpen && (
          <WalletPinLock
            key="setup-overlay"
            mode="setup"
            onUnlocked={() => {
              setIsUnlocked(true);
              setIsPinActive(true);
              setIsSetupPinOpen(false);
              triggerToast('Wallet passcode configured!');
            }}
            onCancel={() => setIsSetupPinOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Passcode Confirmation for Withdrawal Authorization */}
      <AnimatePresence>
        {isConfirmWithdrawWithPinOpen && pendingWithdrawData && (
          <WalletPinLock
            key="withdraw-pin-auth"
            mode="confirm_action"
            actionTitle="Confirm Withdrawal"
            actionSubtitle={`Withdraw ${pendingWithdrawData.amt} ${withdrawCoin} ($${pendingWithdrawData.usdVal})`}
            onUnlocked={() => {
              setIsConfirmWithdrawWithPinOpen(false);
              if (pendingWithdrawData) {
                doExecuteWithdrawal(pendingWithdrawData.amt, pendingWithdrawData.usdVal);
                setPendingWithdrawData(null);
              }
            }}
            onCancel={() => {
              setIsConfirmWithdrawWithPinOpen(false);
              setPendingWithdrawData(null);
              setIsProcessing(false);
            }}
          />
        )}
      </AnimatePresence>
      {/* Full-Screen Telegram Wallet Transaction Detail Screen */}
      <TransactionDetailScreen
        transaction={selectedTxForDetail}
        isOpen={Boolean(selectedTxForDetail)}
        onClose={() => setSelectedTxForDetail(null)}
        usdRates={rates}
      />
    </div>
  );
}
