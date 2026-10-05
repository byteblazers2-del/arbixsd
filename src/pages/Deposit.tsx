import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toPng, toBlob } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { 
  ChevronLeft, 
  HelpCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Share2, 
  X, 
  Send,
  MessageCircle,
  Twitter,
  Sparkles,
  Share,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Smartphone,
  ExternalLink,
  Wallet,
  RefreshCw,
  Download
} from 'lucide-react';
import { SUPPORTED_COINS, CryptoCoin, CryptoNetwork } from '../data/cryptoAssets';
import { subscribeWallets, submitDeposit } from '../services/systemService';
import { notifyAdminDepositAlert, notifyUserDepositSuccess } from '../services/telegramBotService';
import { CryptoIcon } from '../components/CryptoIcon';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { TelegramStarIcon } from '../components/TelegramStarIcon';
import { TelegramPlaneIcon } from '../components/CustomIcons';
import { DepositModal } from '../components/DepositModal';
import { motion, AnimatePresence } from 'motion/react';
import { fetchLiveCryptoRates, formatCryptoAmount, FALLBACK_RATES } from '../utils/cryptoRates';
import { generateUniqueDepositAmount } from '../utils/depositMatching';
import { generateUserTonAddress, generateTonTransferLinks } from '../utils/tonWalletGenerator';
import { checkMultiChainDepositStatus, claimDepositAtomic } from '../utils/multiChainScanner';
import { useAuth } from '../context/AuthContext';

export function Deposit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, creditUserBalance } = useAuth();
  const { t } = useTranslation();

  // Route state
  const locationState = location.state as {
    fromBot?: boolean;
    botName?: string;
    amount?: number;
  } | null;

  const isFromBot = Boolean(locationState?.fromBot);
  const initialBotAmount = locationState?.amount ? String(locationState.amount) : '10';
  const botPlanName = locationState?.botName || 'Arbitrage Strategy';

  // View state: 'select_coin' | 'invoice' | 'success'
  const [viewState, setViewState] = useState<'select_coin' | 'invoice' | 'success'>('select_coin');
  const [customInvoiceTitle, setCustomInvoiceTitle] = useState<string | null>(null);

  // USD Deposit Amount
  const [usdAmount, setUsdAmount] = useState<string>(isFromBot ? initialBotAmount : '10');
  const [usdAmountError, setUsdAmountError] = useState<string | null>(null);

  // Live Crypto Exchange Rates
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  // Dynamic Coins
  const [coins, setCoins] = useState<CryptoCoin[]>(SUPPORTED_COINS);
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin>(SUPPORTED_COINS[0]);
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number>(SUPPORTED_COINS[0].defaultNetworkIndex);

  // Subscribe to real-time custom wallets configured by Admin
  useEffect(() => {
    const unsub = subscribeWallets((wallets) => {
      if (!wallets || wallets.length === 0) return;
      const walletMap = new Map(wallets.map(w => [w.id, w]));

      const updated = SUPPORTED_COINS.map(c => ({
        ...c,
        networks: c.networks.map(net => {
          const custom = walletMap.get(`${c.id}-${net.id}`);
          if (custom) {
            return {
              ...net,
              address: custom.address || net.address,
              memo: custom.memo !== undefined ? custom.memo : net.memo,
              minDeposit: custom.minDeposit || net.minDeposit,
              iconUrl: custom.iconUrl || net.iconUrl
            };
          }
          return net;
        })
      }));

      setCoins(updated);
      setSelectedCoin(prev => {
        const found = updated.find(x => x.id === prev.id);
        return found || updated[0];
      });
    });

    return () => unsub();
  }, []);

  // Invoice Details
  const [orderId, setOrderId] = useState<string>(() => `ARB-${Math.floor(100000 + Math.random() * 900000)}`);

  // UI toggles
  const [copiedType, setCopiedType] = useState<'address' | 'amount' | 'order' | 'memo' | 'txid' | null>(null);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Share & Modal State
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Submitted Deposit state
  const [submittedDeposit, setSubmittedDeposit] = useState<{
    orderId: string;
    txid: string;
    submittedAt: number;
    usdAmount: number;
    cryptoAmount: number;
  } | null>(null);

  const receiptCardRef = useRef<HTMLDivElement>(null);

  // Background rate updates
  useEffect(() => {
    let isMounted = true;
    const loadRates = async () => {
      try {
        const liveRates = await fetchLiveCryptoRates();
        if (isMounted) setRates(liveRates);
      } catch (err) {
        console.error('Rates fetch error:', err);
      }
    };
    loadRates();
    const interval = setInterval(loadRates, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Prefill amount and verification state from URL search params
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const urlAmount = params.get('amount');
      if (urlAmount) {
        const parsed = parseFloat(urlAmount);
        if (!isNaN(parsed) && parsed > 0) {
          setUsdAmount(String(parsed));
        }
      }
      const urlTitle = params.get('title') || locationState?.botName;
      if (urlTitle) {
        setCustomInvoiceTitle(urlTitle);
      }
      const autoInvoice = params.get('invoice') === 'true';
      if (autoInvoice) {
        setViewState('invoice');
      }
      const autoSuccess = params.get('success') === 'true';
      if (autoSuccess) {
        setSubmittedDeposit({
          orderId: orderId || 'ARB-849201',
          txid: '0x8f4c391a2e7c91a2d5e4b78912',
          submittedAt: Date.now(),
          usdAmount: urlAmount ? parseFloat(urlAmount) : 130,
          cryptoAmount: urlAmount ? parseFloat(urlAmount) : 130
        });
        setViewState('success');
      }
    } catch (e) {
      console.warn('URLSearchParams error in Deposit page:', e);
    }
  }, [location.search, locationState]);

  const selectedCoinRate = rates[selectedCoin.symbol] || FALLBACK_RATES[selectedCoin.symbol] || 1;

  const baseUsdAmount = useMemo(() => {
    const clean = usdAmount.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) || num <= 0 ? 10 : num;
  }, [usdAmount]);

  const depositDescriptor = useMemo(() => {
    return generateUniqueDepositAmount(baseUsdAmount, user?.telegramId || user?.id, orderId);
  }, [baseUsdAmount, user?.telegramId, user?.id, orderId]);

  const parsedUsdAmount = depositDescriptor.uniqueUsdAmount;
  const userDedicatedMemo = depositDescriptor.userMemoTag;

  const tonDedicatedInfo = useMemo(() => {
    return generateUserTonAddress(user?.telegramId || user?.id || '5951882585');
  }, [user?.telegramId, user?.id]);

  const currentNetwork: CryptoNetwork = useMemo(() => {
    const net = selectedCoin.networks[selectedNetworkIndex] || selectedCoin.networks[0];
    const isTonNetwork = net.id.toLowerCase().includes('ton') || selectedCoin.id.toLowerCase() === 'ton';
    
    if (isTonNetwork) {
      return {
        ...net,
        address: tonDedicatedInfo.userAddress,
        contractEnd: tonDedicatedInfo.userAddress.slice(-5),
        memo: tonDedicatedInfo.memoComment
      };
    }
    return net;
  }, [selectedCoin, selectedNetworkIndex, tonDedicatedInfo]);

  const calculatedCryptoAmount = useMemo(() => {
    return formatCryptoAmount(parsedUsdAmount, selectedCoin.symbol, selectedCoinRate);
  }, [parsedUsdAmount, selectedCoin.symbol, selectedCoinRate]);

  // Blockchain Monitoring
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [invoiceStartTime, setInvoiceStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (viewState === 'invoice') {
      setInvoiceStartTime(Date.now());
    }
  }, [viewState]);

  const handlePerformBlockchainCheck = async (isManual = false) => {
    if (submittedDeposit) return;
    if (isManual) setIsManualScanning(true);

    try {
      const scanRes = await fetch('/api/deposits/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinSymbol: selectedCoin.symbol,
          networkId: currentNetwork.id,
          address: currentNetwork.address,
          targetCryptoAmount: Number(calculatedCryptoAmount),
          expectedMemo: currentNetwork.memo || userDedicatedMemo,
          sessionStartTime: invoiceStartTime
        })
      }).then(r => r.json());

      if (scanRes?.success && scanRes.verification?.found && scanRes.verification?.txHash) {
        const check = scanRes.verification;

        const verifyRes = await fetch('/api/deposits/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: check.txHash,
            targetAddress: currentNetwork.address,
            networkId: currentNetwork.id,
            coinSymbol: selectedCoin.symbol,
            expectedAmount: Number(calculatedCryptoAmount),
            expectedMemo: currentNetwork.memo || userDedicatedMemo,
            orderId,
            userId: user?.id || 'guest_user',
            telegramUsername: user?.telegramUsername || null,
            telegramId: user?.telegramId || null,
            coinName: selectedCoin.name,
            networkName: currentNetwork.name,
            usdAmount: selectedCoin.symbol === 'USDT' ? (check.amount || Number(calculatedCryptoAmount)) : (selectedCoinRate > 0 ? (check.amount || Number(calculatedCryptoAmount)) * selectedCoinRate : parsedUsdAmount),
            isFromBot,
            botPlanName,
            sourceBotUsername: user?.sourceBotUsername || null
          })
        }).then(r => r.json());

        if (verifyRes?.success && verifyRes.verified) {
          const finalUsd = verifyRes.deposit?.usdAmount || parsedUsdAmount;
          const finalCrypto = Number(verifyRes.deposit?.cryptoAmount || calculatedCryptoAmount);

          if (creditUserBalance) {
            creditUserBalance(finalUsd, selectedCoin.symbol, finalCrypto).catch(console.warn);
          }

          setSubmittedDeposit({
            orderId,
            txid: check.txHash,
            submittedAt: Date.now(),
            usdAmount: finalUsd,
            cryptoAmount: finalCrypto
          });
          setViewState('success');
          triggerToast('Deposit verified and credited on-chain!');
        } else if (isManual && verifyRes?.error) {
          triggerToast(`Verification Note: ${verifyRes.error}`);
        }
      } else if (isManual) {
        if (scanRes?.verification?.error) {
          triggerToast(`Scanner: ${scanRes.verification.error}`);
        } else {
          triggerToast('Scanning blockchain... No new incoming transaction detected yet.');
        }
      }
    } catch (e) {
      console.warn('Multi-chain auto-poll error:', e);
    } finally {
      if (isManual) {
        setTimeout(() => setIsManualScanning(false), 800);
      }
    }
  };

  useEffect(() => {
    if (viewState !== 'invoice') return;
    let isCancelled = false;

    const initialTimer = setTimeout(() => {
      if (!isCancelled) handlePerformBlockchainCheck(false);
    }, 1000);

    const pollInterval = setInterval(async () => {
      if (isCancelled || submittedDeposit) return;
      await handlePerformBlockchainCheck(false);
    }, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
    };
  }, [viewState, currentNetwork, selectedCoin, calculatedCryptoAmount, orderId, user, parsedUsdAmount, isFromBot, botPlanName, submittedDeposit, invoiceStartTime, userDedicatedMemo]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isTonNetwork = currentNetwork.id.toLowerCase().includes('ton') || selectedCoin.id.toLowerCase() === 'ton';
  const tonLinks = useMemo(() => {
    if (!isTonNetwork) return null;
    return generateTonTransferLinks(
      currentNetwork.address,
      calculatedCryptoAmount,
      currentNetwork.memo || userDedicatedMemo
    );
  }, [isTonNetwork, currentNetwork.address, calculatedCryptoAmount, currentNetwork.memo, userDedicatedMemo]);

  const handleUsdAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Normalize Persian and Arabic numerals to standard digits
    val = val.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setUsdAmount(val);
      const num = parseFloat(val);
      if (val === '') {
        setUsdAmountError(t('deposit.minDepositError', 'Minimum deposit is $5.00 USD'));
      } else if (isNaN(num) || num < 5) {
        setUsdAmountError(t('deposit.minDepositError', 'Minimum deposit is $5.00 USD'));
      } else {
        setUsdAmountError(null);
      }
    }
  };

  const handleSelectCoin = (coin: CryptoCoin, networkIndex?: number) => {
    const num = parseFloat(usdAmount);
    if (isNaN(num) || num < 5) {
      const errMsg = t('deposit.minDepositError', 'Minimum deposit is $5.00 USD');
      setUsdAmountError(errMsg);
      triggerToast(errMsg);
      return;
    }
    setSelectedCoin(coin);
    setSelectedNetworkIndex(networkIndex !== undefined ? networkIndex : coin.defaultNetworkIndex);
    setOrderId(`ARB-${Math.floor(100000 + Math.random() * 900000)}`);
    setSubmittedDeposit(null);
    setViewState('invoice');
  };

  const handleCopy = (text: string, type: 'address' | 'amount' | 'order' | 'memo' | 'txid') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    triggerToast(`Copied`);
    setTimeout(() => setCopiedType(null), 1800);
  };

  // Generate friendly, emoji-rich, multi-language pre-filled support message (Strictly English, Russian, or Chinese)
  const supportUrl = useMemo(() => {
    const rawLang = i18n.language ? i18n.language.toLowerCase() : 'en';
    const tgLang = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.toLowerCase() || '';
    
    // Strictly Chinese, Russian, or default English (no Persian in prefilled text as requested)
    let lang = 'en';
    if (rawLang.startsWith('zh') || rawLang.startsWith('cn') || tgLang.startsWith('zh')) {
      lang = 'zh';
    } else if (rawLang.startsWith('ru') || tgLang.startsWith('ru')) {
      lang = 'ru';
    } else {
      lang = 'en';
    }
    
    const userIdentifier = user?.telegramUsername 
      ? `@${user.telegramUsername.replace(/^@/, '')}` 
      : (user?.telegramId ? `ID: ${user.telegramId}` : `ID: ${user?.id || 'User'}`);
    const userTgIdNum = user?.telegramId || user?.id || '';

    let messageText = '';

    if (lang === 'ru') {
      messageText = `Привет! 👋😊\nПишу из мини-приложения Arbitrage.\n\n👤 Мой профиль:\n• Пользователь: ${userIdentifier}\n• Telegram ID: ${userTgIdNum}\n\n💬 Мой вопрос / Консультация:\nХотел уточнить пару моментов по работе бота (как сделать депозит, расчет доходности) или проверить статус перевода 🚀\n\n${viewState === 'invoice' ? `📌 Детали инвойса:\n• Валюта: ${selectedCoin.symbol} (${currentNetwork.name})\n• Сумма: ${calculatedCryptoAmount} ${selectedCoin.symbol} (~$${parsedUsdAmount.toFixed(2)} USD)\n• Номер заказа: ${orderId}\n• Адрес кошелька: ${currentNetwork.address}` : '📌 Выбираю способ депозита'}\n\nЗаранее большое спасибо за помощь! ✨`;
    } else if (lang === 'zh') {
      messageText = `您好！👋😊\n我来自套利 Mini App。\n\n👤 我的账号信息：\n• 用户: ${userIdentifier}\n• TG ID: ${userTgIdNum}\n\n💬 咨询事宜 / 提问：\n我想咨询关于充值流程、套利策略收益或查询订单状态 🚀\n\n${viewState === 'invoice' ? `📌 账单信息:\n• 币种: ${selectedCoin.symbol} (${currentNetwork.name})\n• 充值数量: ${calculatedCryptoAmount} ${selectedCoin.symbol} (~$${parsedUsdAmount.toFixed(2)} USD)\n• 订单编号: ${orderId}\n• 充值地址: ${currentNetwork.address}` : '📌 正在选择充值方式'}\n\n非常感谢您的协助！✨`;
    } else {
      // Default: English (Friendly, warm, multi-purpose)
      messageText = `Hey there! 👋😊\nI'm reaching out from the Arbitrage Mini App.\n\n👤 My Account:\n• User: ${userIdentifier}\n• Telegram ID: ${userTgIdNum}\n\n💬 What I'd like help with:\nI wanted to ask a quick question / get some guidance (about how deposits work, bot profits, or checking a transaction) 🚀\n\n${viewState === 'invoice' ? `📌 Invoice Details:\n• Asset: ${selectedCoin.symbol} (${currentNetwork.name})\n• Amount: ${calculatedCryptoAmount} ${selectedCoin.symbol} (~$${parsedUsdAmount.toFixed(2)} USD)\n• Order ID: ${orderId}\n• Deposit Address: ${currentNetwork.address}` : '📌 Exploring deposit methods'}\n\nThanks a lot in advance! Looking forward to your reply ✨`;
    }

    return `https://t.me/ai_zke?text=${encodeURIComponent(messageText)}`;
  }, [i18n.language, user, selectedCoin, currentNetwork, calculatedCryptoAmount, parsedUsdAmount, orderId, viewState]);

  const handleOpenSupport = () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(supportUrl);
        return;
      }
    } catch {}
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
  };

  // Flat list of selectable coins (No search bar, no card borders)
  const selectableItems = useMemo(() => {
    const items: Array<{
      id: string;
      coin: typeof SUPPORTED_COINS[0];
      networkIndex: number;
      displayName: string;
      symbol: string;
      networkShortName: string;
      networkFullName: string;
      customIconUrl?: string;
    }> = [];

    coins.forEach(coin => {
      if (coin.id === 'stars' || coin.symbol === 'STARS') return;
      if (coin.symbol === 'USDT') {
        coin.networks.forEach((net, netIdx) => {
          items.push({
            id: `usdt-${net.id}`,
            coin,
            networkIndex: netIdx,
            displayName: 'USDT',
            symbol: 'USDT',
            networkShortName: net.shortName,
            networkFullName: net.name,
            customIconUrl: net.iconUrl
          });
        });
      } else {
        const defaultNet = coin.networks[coin.defaultNetworkIndex || 0];
        items.push({
          id: coin.id,
          coin,
          networkIndex: coin.defaultNetworkIndex || 0,
          displayName: coin.name,
          symbol: coin.symbol,
          networkShortName: defaultNet?.shortName || coin.symbol,
          networkFullName: defaultNet?.name || `${coin.name} Network`,
          customIconUrl: defaultNet?.iconUrl || coin.iconUrl
        });
      }
    });

    return items;
  }, [coins]);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between select-none relative pb-28 font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[220] bg-[#1C1C1E] text-white text-xs font-semibold px-4 py-2.5 rounded-full flex items-center space-x-2 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2EA5FF] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* VIEW 1: COIN SELECTION (ULTRA MINIMAL - NO CARDS, NO ICON BOXES)          */}
        {/* ========================================================================= */}
        {viewState === 'select_coin' ? (
          <motion.div 
            key="coin-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md mx-auto px-5 pt-4 pb-8"
          >
            {/* Minimal Top Header */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => navigate(-1)}
                className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
              <h1 className="text-[17px] font-bold text-white tracking-tight">
                {customInvoiceTitle || (isFromBot ? t('deposit.depositForBot', 'Deposit for Bot') : t('deposit.depositTitle', 'Deposit'))}
              </h1>
              <div className="w-6" />
            </div>

            {/* iOS-style Minimalist Amount Input - Simple, minimalist, borderless, no enclosing card */}
            <div className="mb-6 px-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-[#8295A8] uppercase tracking-wider font-mono">{t('deposit.depositAmountUSD', 'Deposit Amount (USD)')}</span>
                {usdAmountError && (
                  <span className="text-[11px] text-rose-400 font-semibold leading-none">{usdAmountError}</span>
                )}
              </div>
              <div className="flex items-center bg-transparent py-2.5 border-b border-[#1C2735]/30 focus-within:border-[#2EA5FF]/60 transition-all">
                <span className="text-3xl font-bold text-[#2EA5FF] mr-2.5 rtl:ml-2.5 rtl:mr-0 font-sans">$</span>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={usdAmount}
                  onChange={handleUsdAmountChange}
                  placeholder="10"
                  className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-white/20 focus:outline-none tracking-tight font-sans"
                />
              </div>
            </div>

            {/* CURRENCIES & METHODS - Wrapped in Single Card with Subtle Corners */}
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden divide-y divide-[#1C2735]/30 shadow-lg">
              {/* Option 1: Telegram Stars */}
              <button
                onClick={() => {
                  const num = parseFloat(usdAmount);
                  if (isNaN(num) || num < 5) {
                    const errMsg = t('deposit.minDepositError', 'Minimum deposit is $5.00 USD');
                    setUsdAmountError(errMsg);
                    triggerToast(errMsg);
                    return;
                  }
                  setShowStarsModal(true);
                }}
                className="w-full p-3.5 flex items-center justify-between group hover:bg-[#242426]/30 active:bg-[#2C2C2E]/40 transition-colors cursor-pointer text-left rtl:text-right"
              >
                <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-inner">
                    <TelegramStarIcon size={38} className="shrink-0 drop-shadow-md" />
                  </div>
                  <div className="text-left rtl:text-right">
                    <span className="text-[15px] font-bold text-white block leading-snug">{t('deposit.telegramStars', 'Telegram Stars')}</span>
                    <span className="text-[12px] text-[#8295A8] font-medium leading-none">{t('deposit.instantPayment', 'Instant Payment')}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8295A8] group-hover:text-white transition-colors shrink-0 rtl:rotate-180" />
              </button>

              {/* Crypto Options */}
              {selectableItems.map((item) => {
                return (
                  <button
                    key={item.id}
                    id={`deposit-coin-${item.symbol.toLowerCase()}`}
                    data-tour={`coin-${item.symbol.toLowerCase()}`}
                    onClick={() => handleSelectCoin(item.coin, item.networkIndex)}
                    className="w-full p-3.5 flex items-center justify-between group hover:bg-[#242426]/30 active:bg-[#2C2C2E]/40 transition-colors cursor-pointer text-left rtl:text-right"
                  >
                    <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                      {/* Un-boxed Icon */}
                      <CryptoIcon 
                        symbol={item.symbol} 
                        network={item.networkShortName} 
                        customIconUrl={item.customIconUrl}
                        className="w-9 h-9 shrink-0 rounded-full" 
                      />
                      <div className="text-left rtl:text-right">
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                          <span className="text-[15px] font-bold text-white leading-snug">
                            {item.displayName || item.symbol}
                          </span>
                          <VerifiedBadge className="w-3.5 h-3.5" />
                          <span className="px-1.5 py-0.5 bg-[#2C2C2E] text-[#8295A8] text-[11px] font-semibold rounded-md leading-none">
                            {item.networkShortName}
                          </span>
                        </div>
                        <span className="text-[12px] text-[#8295A8] font-medium block mt-0.5 leading-none">
                          {item.networkFullName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <ChevronRight className="w-5 h-5 text-[#8295A8] group-hover:text-white transition-colors shrink-0 rtl:rotate-180" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* General Inquiries & Live Support Button */}
            <div className="mt-8 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleOpenSupport}
                className="w-full py-3.5 px-4 bg-[#1C1C1E] hover:bg-[#242426] active:bg-[#2C2C2E] border border-0 text-white font-medium text-xs rounded-2xl transition-all flex items-center justify-center space-x-2.5 rtl:space-x-reverse cursor-pointer shadow-sm select-none"
              >
                <TelegramPlaneIcon className="w-4 h-4 text-[#2EA5FF] shrink-0" />
                <span className="text-[#A5B7C9]">{t('deposit.needHelpSupport', 'Have questions? Chat with Live Support')}</span>
              </button>
            </div>

          </motion.div>
        ) : viewState === 'invoice' ? (
          /* ========================================================================= */
          /* VIEW 2: INVOICE SCREEN (ROCK SOLID - NO MOUSE/TOUCH DRAG OR SHAKING)     */
          /* ========================================================================= */
          <motion.div 
            key="invoice-factor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md mx-auto flex flex-col flex-1 px-5 pt-4 pb-8 select-none"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/[0.06]">
              <button 
                onClick={() => setViewState('select_coin')}
                className="p-1 text-[#8295A8] hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button 
                onClick={() => setShowCoinModal(true)}
                className="flex items-center space-x-2 bg-[#242426] px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-[#2C2C2E] transition-colors"
              >
                <CryptoIcon 
                  symbol={selectedCoin.symbol} 
                  network={currentNetwork.shortName} 
                  customIconUrl={currentNetwork.iconUrl}
                  className="w-5 h-5" 
                />
                <span className="text-sm font-bold text-white">
                  {selectedCoin.symbol} ({currentNetwork.shortName})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8295A8]" />
              </button>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleOpenSupport}
                  title="Telegram Support"
                  className="p-1.5 text-[#2EA5FF] hover:text-[#52b6ff] transition-colors cursor-pointer"
                >
                  <TelegramPlaneIcon className="w-5.5 h-5.5 shrink-0" />
                </button>
              </div>
            </div>

            {/* Custom Invoice Title Banner */}
            {customInvoiceTitle && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-[#2EA5FF]/10 border border-[#2EA5FF]/25 text-center flex items-center justify-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#2EA5FF] shrink-0" />
                <span className="text-xs font-bold text-[#2EA5FF]">
                  {customInvoiceTitle}
                </span>
              </div>
            )}

            {/* Fixed Printable Receipt Area */}
            <div className="space-y-4">
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center py-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  <QRCodeSVG
                    value={currentNetwork.address}
                    size={170}
                    level="H"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>
                <span className="text-[12px] text-[#8295A8] mt-3 font-medium">
                  {t('deposit.scanOrCopy', 'Scan QR code or copy deposit address')}
                </span>
              </div>

              {/* Deposit Address Block */}
              <div className="bg-[#1C1C1E] rounded-[22px] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8295A8] font-medium">
                    {currentNetwork.name} {t('deposit.addressLabel', 'Official Deposit Address')}
                  </span>
                  <button
                    id="deposit-copy-address-btn"
                    data-tour="copy-address-btn"
                    onClick={() => handleCopy(currentNetwork.address, 'address')}
                    className="text-xs font-bold text-[#2EA5FF] hover:text-[#52b6ff] flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedType === 'address' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t('deposit.copied', 'Copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('deposit.copy', 'Copy')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div 
                  onClick={() => handleCopy(currentNetwork.address, 'address')}
                  className="bg-[#242426] p-3 rounded-xl text-xs text-white font-mono break-all cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                >
                  {currentNetwork.address}
                </div>

                {/* MEMO Tag for TON */}
                {(currentNetwork.memo || userDedicatedMemo) && (
                  <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center">
                    <div>
                      <span className="text-[11px] text-[#8295A8] block">{t('deposit.memoComment', 'MEMO / Comment')}</span>
                      <span className="text-xs font-bold text-white font-mono">{currentNetwork.memo || userDedicatedMemo}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(currentNetwork.memo || userDedicatedMemo, 'memo')}
                      className="p-1.5 bg-[#242426] hover:bg-[#2C2C2E] rounded-lg text-xs text-[#2EA5FF] flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedType === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedType === 'memo' ? t('deposit.copied', 'Copied') : t('deposit.copy', 'Copy')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TON Direct 1-Click Buttons */}
              {isTonNetwork && tonLinks && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={tonLinks.tonkeeperUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-2 bg-[#2EA5FF] hover:bg-[#2694E8] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Tonkeeper</span>
                  </a>
                  <a
                    href={tonLinks.tonUri}
                    className="py-3 px-2 bg-[#1C1C1E] hover:bg-[#242426] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-[#2EA5FF]" />
                    <span>Telegram @wallet</span>
                  </a>
                </div>
              )}

              {/* Amount Breakdown */}
              <div className="bg-[#1C1C1E] rounded-[22px] p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8295A8] font-medium">{t('deposit.amountToSend', 'Amount to Send')}</span>
                  <button
                    onClick={() => handleCopy(calculatedCryptoAmount.toString(), 'amount')}
                    className="text-xs font-bold text-[#2EA5FF] flex items-center space-x-1.5 hover:text-[#52b6ff] cursor-pointer"
                  >
                    <span className="font-bold text-white text-[15px] tracking-tight">{calculatedCryptoAmount} {selectedCoin.symbol}</span>
                    {copiedType === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                  <span className="text-xs text-[#8295A8] font-medium">{t('deposit.equivalentUSD', 'Equivalent USD')}</span>
                  <span className="text-sm font-bold text-[#2EA5FF] tracking-tight">${parsedUsdAmount.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Automated Scanner Notification */}
              <div className="space-y-3 pt-1">
                <div className="p-3.5 bg-[#1C1C1E]/70 border border-white/[0.06] rounded-2xl flex items-start space-x-3 rtl:space-x-reverse text-xs text-[#8295A8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-0.5 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <div className="flex-1 text-[11.5px] leading-relaxed text-[#94A3B8]">
                    <span className="text-white font-semibold block mb-0.5">
                      {t('deposit.autoScannerTitle', '⚡ Automated Keyless Verification Active')}
                    </span>
                    {t('deposit.autoScannerDesc', 'Transfer the exact amount, or more/less. The system monitors the blockchain automatically and instantly credits your balance with the exact received value. No TxID needed!')}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : viewState === 'success' ? (
          /* ========================================================================= */
          /* VIEW 3: SUCCESS SCREEN                                                   */
          /* ========================================================================= */
          <motion.div
            key="deposit-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md mx-auto flex flex-col flex-1 px-5 pt-8 pb-8 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1">
              {t('deposit.depositConfirmed', 'Deposit Confirmed!')}
            </h2>
            <p className="text-xs text-[#8295A8] mb-6">
              {t('deposit.depositConfirmedDesc', 'Your transaction has been verified on-chain and added to your balance.')}
            </p>

            <div className="bg-[#1C1C1E] rounded-[22px] p-4 space-y-3 text-left font-sans mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8295A8]">{t('deposit.creditedAmount', 'Credited Amount')}</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  +${(submittedDeposit?.usdAmount || parsedUsdAmount).toFixed(2)} USD
                  {submittedDeposit?.cryptoAmount ? ` (${submittedDeposit.cryptoAmount} ${selectedCoin.symbol})` : ''}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8295A8]">{t('deposit.network', 'Network')}</span>
                <span className="text-white font-bold">{currentNetwork.name}</span>
              </div>
              {submittedDeposit?.txid && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#8295A8]">{t('deposit.txid', 'On-Chain Tx')}</span>
                  <span className="text-white font-mono text-[11px] truncate max-w-[180px]">{submittedDeposit.txid}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-[#8295A8]">{t('deposit.orderId', 'Order ID')}</span>
                <span className="text-white font-mono font-bold">{orderId}</span>
              </div>
            </div>

            <button
              id="deposit-go-to-portfolio-btn"
              data-tour="go-to-portfolio-btn"
              onClick={() => navigate('/assets')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-[20px] transition-all cursor-pointer text-[15px]"
            >
              {t('deposit.goToPortfolio', 'Go to Portfolio')}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* QUICK COIN DRAWER MODAL */}
      <AnimatePresence>
        {showCoinModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center font-telegram">
            {/* Telegram UI Backdrop with smooth blur fade */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => setShowCoinModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-[6px] transform-gpu" 
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
                  setShowCoinModal(false);
                }
              }}
              className="relative w-full max-w-md bg-[#242426] p-5 z-10 rounded-t-[32px] overflow-hidden max-h-[70vh] flex flex-col transform-gpu will-change-transform font-telegram border-t border-white/[0.06] touch-pan-y"
            >
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-4 opacity-70" />

              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-bold text-white">{t('deposit.selectCryptocurrency', 'Select Cryptocurrency')}</h3>
                <button 
                  onClick={() => setShowCoinModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2C2C2E] text-[#8295A8] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pb-4">
                {selectableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleSelectCoin(item.coin, item.networkIndex);
                      setShowCoinModal(false);
                    }}
                    className={`w-full py-3.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${ selectedCoin.id === item.coin.id && selectedNetworkIndex === item.networkIndex ? 'bg-[#2C2C2E] text-white' : 'hover:bg-[#1C1C1E] text-[#8295A8]' }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CryptoIcon 
                        symbol={item.symbol} 
                        network={item.networkShortName} 
                        customIconUrl={item.customIconUrl}
                        className="w-7 h-7" 
                      />
                      <div className="text-left rtl:text-right">
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                          <span className="text-sm font-bold text-white block">{item.displayName}</span>
                          <VerifiedBadge className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs text-[#8295A8] font-medium">{item.networkFullName}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8295A8]" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Telegram Stars Modal */}
      <DepositModal 
        isOpen={showStarsModal} 
        onClose={() => setShowStarsModal(false)}
        initialStep="stars_input"
        initialUsdAmount={usdAmount}
      />

    </div>
  );
}
