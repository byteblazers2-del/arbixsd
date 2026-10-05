import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  ChevronRight, 
  Copy, 
  Check, 
  ArrowLeft, 
  Clock, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { TelegramStarIcon } from './TelegramStarIcon';
import { CryptoIcon } from './CryptoIcon';
import { VerifiedBadge } from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { submitDeposit } from '../services/systemService';
import { 
  notifyAdminDepositAlert, 
  notifyUserDepositSuccess, 
  createTelegramStarsInvoiceLink 
} from '../services/telegramBotService';
import { SUPPORTED_COINS, CryptoCoin } from '../data/cryptoAssets';
import { QRCodeSVG } from 'qrcode.react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCryptoDirect?: () => void;
  initialStep?: 'select_method' | 'stars_input' | 'stars_invoice' | 'crypto_select' | 'crypto_detail' | 'web_not_supported' | 'payment_success';
  initialUsdAmount?: string;
  initialCoinSymbol?: string;
  swapContext?: {
    fromAmount: string;
    fromSymbol: string;
    toAmount: string;
    toSymbol: string;
  };
}

export const DepositModal: React.FC<DepositModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectCryptoDirect,
  initialStep = 'select_method',
  initialUsdAmount = '10',
  initialCoinSymbol,
  swapContext
}) => {
  const { user, systemSettings, creditUserBalance } = useAuth();
  const { t, i18n } = useTranslation();

  // Step flow: 'select_method' | 'stars_input' | 'stars_invoice' | 'crypto_select' | 'crypto_detail' | 'web_not_supported' | 'payment_success'
  const [step, setStep] = useState<
    'select_method' | 'stars_input' | 'stars_invoice' | 'crypto_select' | 'crypto_detail' | 'web_not_supported' | 'payment_success'
  >(initialStep);

  // Stars top-up input (in USD)
  const [starsUsdAmount, setStarsUsdAmount] = useState<string>(initialUsdAmount);
  const [isProcessingStars, setIsProcessingStars] = useState(false);
  const [starsError, setStarsError] = useState<string | null>(null);

  // Invoice state payload
  const [invoiceDetails, setInvoiceDetails] = useState<{
    orderId: string;
    usdAmount: number;
    starsAmount: number;
    invoiceUrl: string;
    status: 'pending' | 'paid';
  } | null>(null);

  // Selected Crypto for Crypto Deposit option inside modal
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin>(SUPPORTED_COINS[0]);
  const [selectedNetIdx, setSelectedNetIdx] = useState<number>(0);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedInvoiceLink, setCopiedInvoiceLink] = useState(false);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialCoinSymbol) {
        const sym = initialCoinSymbol.toUpperCase();
        if (sym === 'STARS' || sym === 'XTR') {
          setStep('stars_input');
        } else {
          const found = SUPPORTED_COINS.find(c => c.symbol.toUpperCase() === sym) || 
                        SUPPORTED_COINS.find(c => c.networks.some(n => n.shortName.toUpperCase().includes(sym) || n.name.toUpperCase().includes(sym))) ||
                        SUPPORTED_COINS[0];
          setSelectedCoin(found);
          setSelectedNetIdx(0);
          setStep('crypto_detail');
        }
      } else {
        setStep(initialStep);
      }
      setStarsUsdAmount(initialUsdAmount || '10');
      setIsProcessingStars(false);
      setStarsError(null);
      setInvoiceDetails(null);
    }
  }, [isOpen, initialStep, initialUsdAmount, initialCoinSymbol]);

  // Calculated stars (1 USD = 50 Stars)
  const parsedUsd = Math.max(1, parseFloat(starsUsdAmount) || 10);
  const calculatedStars = Math.round(parsedUsd * 50);

  const resetModal = () => {
    setStep('select_method');
    setStarsUsdAmount('10');
    setIsProcessingStars(false);
    setInvoiceDetails(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Helper to check if running inside Telegram Mini App
  const checkIsTelegramMiniApp = () => {
    const tg = (window as any).Telegram?.WebApp;
    // Must have valid initData or user context to confirm inside Telegram Mini App
    return Boolean(
      tg && 
      (tg.initData || (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0)) &&
      tg.platform !== 'unknown'
    );
  };

  // Trigger payment success UI, credit balance, and notify admin only when confirmed
  const handlePaymentSuccess = async (customOrderId?: string) => {
    const activeOrderId = customOrderId || invoiceDetails?.orderId || `STARS-${Math.floor(100000 + Math.random() * 900000)}`;
    const approvedPayload = {
      id: activeOrderId,
      orderId: activeOrderId,
      userId: user?.id || 'guest_user',
      telegramUsername: user?.telegramUsername || null,
      telegramId: user?.telegramId || null,
      usdAmount: parsedUsd,
      cryptoAmount: String(calculatedStars),
      coin: 'STARS',
      coinName: 'Telegram Stars',
      network: 'Telegram App Invoice',
      depositAddress: 'Telegram Official Invoice',
      txid: `INV-${activeOrderId}`,
      status: 'approved' as const,
      sourceBotUsername: user?.sourceBotUsername || null,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      await submitDeposit(approvedPayload);
      if (creditUserBalance) {
        await creditUserBalance(parsedUsd, 'STARS', calculatedStars);
      }
      // ONLY DISPATCH ADMIN & USER NOTIFICATIONS UPON SUCCESSFUL PAYMENT CONFIRMATION!
      notifyAdminDepositAlert(approvedPayload).catch(console.warn);
      notifyUserDepositSuccess(approvedPayload).catch(console.warn);
    } catch (err) {
      console.warn("Failed to credit balance on UI success:", err);
    }
    setStep('payment_success');
  };

  // Issue real Telegram Stars XTR Invoice & Trigger Native Telegram Payment Modal
  const handlePayWithStars = async () => {
    setStarsError(null);

    // If user is on normal Web Browser and not in Telegram Mini App, prompt to switch to Mini App
    if (!checkIsTelegramMiniApp()) {
      setStep('web_not_supported');
      return;
    }

    setIsProcessingStars(true);
    const orderId = `STARS-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      // 1. Generate official Telegram Stars XTR Invoice Link via Telegram Bot API
      const invRes = await createTelegramStarsInvoiceLink({
        orderId,
        userId: user?.id || 'guest_user',
        usdAmount: parsedUsd,
        starsAmount: calculatedStars
      });

      if (!invRes.success || !invRes.invoiceUrl) {
        setStarsError(invRes.error || 'Failed to generate official Telegram Stars invoice.');
        setIsProcessingStars(false);
        return;
      }

      const invoiceUrl = invRes.invoiceUrl;
      const tg = (window as any).Telegram?.WebApp;

      if (tg && typeof tg.openInvoice === 'function') {
        // Open Telegram's official native payment sheet directly over the Mini App
        tg.openInvoice(invoiceUrl, (status: string) => {
          console.log("Telegram native openInvoice callback status:", status);
          setIsProcessingStars(false);
          if (status === 'paid') {
            // OFFICIAL TELEGRAM STARS PAYMENT CONFIRMED! NOW & ONLY NOW:
            // 1. Save approved deposit record
            // 2. Credit balance
            // 3. Dispatch Admin alert & User notification
            handlePaymentSuccess(orderId);
          } else {
            console.log("Stars payment cancelled or closed by user.");
          }
        });
      } else {
        // Fallback if openInvoice is not supported natively
        window.open(invoiceUrl, '_blank');
        setIsProcessingStars(false);
      }
    } catch (err: any) {
      console.error("Stars invoice creation error:", err);
      setStarsError(err.message || "Failed to create invoice.");
      setIsProcessingStars(false);
    }
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyInvoiceLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedInvoiceLink(true);
    setTimeout(() => setCopiedInvoiceLink(false), 2000);
  };

  const pageTransition = {
    duration: 0.15,
    ease: "easeOut" as const
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-telegram">
          {/* Telegram UI Backdrop with smooth blur fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={handleClose}
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
                handleClose();
              }
            }}
            className="relative w-full max-w-md bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] p-6 z-10 overflow-hidden text-white font-telegram border-0 shadow-2xl flex flex-col justify-between transform-gpu will-change-transform touch-pan-y"
          >
            <div>
              {/* Top Drag Indicator Pill */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5 opacity-70 shrink-0" />

              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center space-x-2">
                  {step !== 'select_method' && step !== 'payment_success' && (
                    <button
                      onClick={() => {
                        if (initialStep === 'stars_input' && step === 'stars_input') {
                          handleClose();
                        } else {
                          setStep('select_method');
                        }
                      }}
                      className="p-1 text-[#8E8E93] hover:text-white transition-colors mr-1 cursor-pointer active:scale-95"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h3 className="text-[17px] font-bold text-white tracking-tight">
                    {step === 'select_method' && t('deposit.depositFunds', 'Deposit Funds')}
                    {step === 'stars_input' && t('deposit.telegramStars', 'Telegram Stars')}
                    {step === 'stars_invoice' && t('deposit.paymentInvoice', 'Payment Invoice')}
                    {step === 'crypto_select' && t('deposit.selectCurrency', 'Select Currency')}
                    {step === 'crypto_detail' && `${selectedCoin.symbol} ${t('deposit.addressLabel', 'Address')}`}
                    {step === 'web_not_supported' && t('deposit.miniAppRequired', 'Mini App Required')}
                    {step === 'payment_success' && t('deposit.depositSuccess', 'Deposit Success')}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-[#2C2C2E] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90 border-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Optional Swap Context Notice */}
              {swapContext && step === 'crypto_detail' && (
                <div className="bg-[#242426] rounded-2xl p-3 mb-3 text-center border-0">
                  <span className="text-xs text-[#8E8E93] block">
                    Deposit required for instant swap:
                  </span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {swapContext.fromAmount} {swapContext.fromSymbol} → {swapContext.toAmount} {swapContext.toSymbol}
                  </span>
                </div>
              )}

              {/* Ultra-Smooth Native App Slide & Fade Transitions */}
              <AnimatePresence mode="wait">
                {/* STAGE 1: Standalone Blue & Light-Blue Gradient Action Buttons */}
                {step === 'select_method' && (
                  <motion.div
                    key="select_method"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={pageTransition}
                    className="py-4 space-y-3.5 my-auto"
                  >
                    {/* Option 1: Crypto */}
                    <button
                      onClick={() => {
                        if (onSelectCryptoDirect) {
                          onClose();
                          onSelectCryptoDirect();
                        } else {
                          setStep('crypto_select');
                        }
                      }}
                      className="w-full bg-gradient-to-r from-[#38B6FF] via-[#2EA5FF] to-[#007AFF] hover:brightness-105 active:scale-[0.98] transition-all p-4 rounded-[22px] flex items-center justify-between group cursor-pointer text-white shadow-lg shadow-[#007AFF]/25 border-0"
                    >
                      <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
                          <CryptoIcon symbol="USDT" className="w-7 h-7 drop-shadow-sm" />
                        </div>
                        <div className="text-left rtl:text-right min-w-0">
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                            <span className="text-[16px] font-bold text-white tracking-tight">
                              Crypto Deposit
                            </span>
                            <span className="text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                              Crypto
                            </span>
                          </div>
                          <span className="text-[12px] text-white/90 font-medium block truncate mt-0.5">
                            Fast transfer USDT, TON, BTC, ETH
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors mr-0.5 rtl:mr-0 rtl:ml-0.5">
                        <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Option 2: Telegram Stars */}
                    <button
                      onClick={() => setStep('stars_input')}
                      className="w-full bg-gradient-to-r from-[#38B6FF] via-[#2EA5FF] to-[#007AFF] hover:brightness-105 active:scale-[0.98] transition-all p-4 rounded-[22px] flex items-center justify-between group cursor-pointer text-white shadow-lg shadow-[#007AFF]/25 border-0"
                    >
                      <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
                          <TelegramStarIcon size={32} className="drop-shadow-md" />
                        </div>
                        <div className="text-left rtl:text-right min-w-0">
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                            <span className="text-[16px] font-bold text-white tracking-tight">
                              Telegram Stars
                            </span>
                            <span className="text-[11px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                              Stars
                            </span>
                          </div>
                          <span className="text-[12px] text-white/90 font-medium block truncate mt-0.5">
                            Instant in-app Telegram Stars
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors mr-0.5 rtl:mr-0 rtl:ml-0.5">
                        <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* STAGE 2: Telegram Stars Input */}
                {step === 'stars_input' && (
                  <motion.div
                    key="stars_input"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={pageTransition}
                    className="py-2 space-y-4"
                  >
                    {/* Header Icon */}
                    <div className="flex flex-col items-center justify-center pt-1 pb-1">
                      <TelegramStarIcon size={58} className="mb-2 drop-shadow-lg" />
                      <span className="text-[13px] text-[#8295A8] font-semibold">
                        {t('deposit.enterDepositAmountUSD', 'Enter deposit amount in USD')}
                      </span>
                    </div>

                    {/* Input Box - NO SPINNER BUTTONS */}
                    <div className="bg-[#242426] rounded-[22px] p-4">
                      <div className="flex items-center justify-between text-xs text-[#8295A8] mb-1 font-medium">
                        <span>{t('deposit.amountUSD', 'Amount (USD)')}</span>
                        <span>{t('deposit.starsRate', '1 USD = 50 Stars')}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-extrabold text-[#2EA5FF]">$</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={starsUsdAmount}
                          onChange={(e) => setStarsUsdAmount(e.target.value)}
                          placeholder="10"
                          className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none tracking-tight font-sans [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* Quick Presets (Flat colors, NO glowing shadows) */}
                    <div className="flex items-center justify-between gap-2">
                      {['5', '10', '25', '50', '100'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStarsUsdAmount(preset)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            starsUsdAmount === preset
                              ? 'bg-[#2EA5FF] text-white'
                              : 'bg-[#242426] text-[#8295A8] hover:text-white'
                          }`}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>

                    {/* Invoice Breakdown */}
                    <div className="bg-[#242426] rounded-[22px] p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#8295A8] font-medium">{t('deposit.starsRequired', 'Stars Required')}</span>
                        <span className="text-amber-400 font-bold">
                          {calculatedStars.toLocaleString()} Stars
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#8295A8] font-medium">{t('deposit.usdCredit', 'USD Credit')}</span>
                        <span className="text-white font-bold">${parsedUsd.toFixed(2)} USD</span>
                      </div>
                    </div>

                    {/* Error message display */}
                    {starsError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 text-left">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-rose-300 font-medium leading-relaxed">{starsError}</span>
                      </div>
                    )}

                    {/* Pay Button: Flat High-Contrast Blue, White Text */}
                    <button
                      onClick={handlePayWithStars}
                      disabled={isProcessingStars || parsedUsd <= 0}
                      className="w-full bg-[#007AFF] hover:bg-[#0066CC] active:scale-[0.98] text-white font-bold py-3.5 rounded-[20px] transition-all cursor-pointer disabled:opacity-50 text-center"
                    >
                      {isProcessingStars ? (
                        <span className="text-white font-bold">{t('deposit.openingTelegramPayment', 'Opening Telegram Payment...')}</span>
                      ) : (
                        <span className="text-white text-[15px] font-bold">
                          {t('deposit.payStars', 'Pay {{stars}} Stars', { stars: calculatedStars.toLocaleString() })}
                        </span>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* STAGE 3.5: Web Browser Warning (Only Mini App Supported) */}
                {step === 'web_not_supported' && (
                  <motion.div
                    key="web_not_supported"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={pageTransition}
                    className="py-4 flex flex-col items-center text-center space-y-4 font-sans my-auto"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400">
                      <AlertCircle className="w-9 h-9" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[18px] font-bold text-white">{t('deposit.telegramAppRequiredTitle', 'Telegram App Required')}</h4>
                      <p className="text-[13px] text-[#8295A8] max-w-xs mx-auto font-medium leading-relaxed">
                        {t('deposit.telegramAppRequiredDesc', 'To pay with Telegram Stars, please open this application inside the Telegram Mini App.')}
                      </p>
                    </div>

                    <div className="w-full space-y-2 pt-2">
                      <button
                        onClick={() => {
                          const botUser = systemSettings?.primaryBotUsername || systemSettings?.supportTelegramUsername || 'ai_zke';
                          window.open(`https://t.me/${botUser.replace('@', '')}`, '_blank');
                          handleClose();
                        }}
                        className="w-full bg-[#007AFF] hover:bg-[#0066CC] active:scale-[0.98] text-white font-bold py-3.5 rounded-[20px] transition-all cursor-pointer text-center text-[15px]"
                      >
                        {t('deposit.openTelegramApp', 'Open Telegram App')}
                      </button>

                      <button
                        onClick={handleClose}
                        className="w-full py-2.5 text-xs text-[#8295A8] hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        {t('deposit.exit', 'Exit')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 3.8: Payment Successful Screen */}
                {step === 'payment_success' && (
                  <motion.div
                    key="payment_success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={pageTransition}
                    className="py-4 flex flex-col items-center text-center space-y-4 font-sans my-auto"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[22px] font-extrabold text-white">{t('deposit.paymentSuccessful', 'Payment Successful!')}</h4>
                      <p className="text-[13px] text-emerald-400 font-semibold">
                        {t('deposit.paymentSuccessMsg', 'Your deposit of ${{usd}} USD ({{stars}} Stars) has been credited.', { usd: parsedUsd.toFixed(2), stars: calculatedStars.toLocaleString() })}
                      </p>
                    </div>

                    <div className="w-full bg-[#242426] rounded-[22px] p-4 space-y-2 text-left font-sans">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8295A8]">{t('deposit.status', 'Status')}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {t('deposit.completed', 'Completed')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8295A8]">{t('deposit.newMainBalance', 'New Main Balance')}</span>
                        <span className="text-white font-extrabold text-sm">${(user?.balance || 0).toFixed(2)} USD</span>
                      </div>
                    </div>

                    <button
                      onClick={handleClose}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-[20px] transition-all cursor-pointer text-center text-[15px]"
                    >
                      {t('deposit.done', 'Done')}
                    </button>
                  </motion.div>
                )}

                {/* STAGE 4: Crypto Selection */}
                {step === 'crypto_select' && (
                  <motion.div
                    key="crypto_select"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={pageTransition}
                    className="py-2 space-y-2 max-h-[50vh] overflow-y-auto"
                  >
                    {SUPPORTED_COINS.map((coin) => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin);
                          setSelectedNetIdx(0);
                          setStep('crypto_detail');
                        }}
                        className="w-full bg-[#242426] hover:bg-[#2C2C2E] p-3.5 rounded-[20px] flex items-center justify-between transition-colors cursor-pointer border-none"
                      >
                        <div className="flex items-center space-x-3">
                          <CryptoIcon symbol={coin.symbol} className="w-8 h-8" />
                          <div className="text-left rtl:text-right">
                            <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                              <span className="text-[14px] font-bold text-white block">{coin.name}</span>
                              <VerifiedBadge className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] text-[#8295A8] font-medium">{coin.symbol}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#8295A8]" />
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* STAGE 4.1: Crypto Address Detail */}
                {step === 'crypto_detail' && (
                  <motion.div
                    key="crypto_detail"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={pageTransition}
                    className="py-2 space-y-3.5"
                  >
                    {/* Network Switcher Pills (If coin has multiple networks) */}
                    {selectedCoin.networks.length > 1 && (
                      <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse bg-[#242426] p-1 rounded-xl">
                        {selectedCoin.networks.map((net, idx) => (
                          <button
                            key={net.id || idx}
                            type="button"
                            onClick={() => setSelectedNetIdx(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedNetIdx === idx 
                                ? 'bg-[#2EA5FF] text-white' 
                                : 'text-[#8E8E93] hover:text-white'
                            }`}
                          >
                            {net.shortName}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="bg-[#242426] rounded-[24px] p-4 flex flex-col items-center text-center border border-white/[0.06]">
                      <div className="bg-white p-2.5 rounded-2xl mb-3">
                        <QRCodeSVG 
                          value={selectedCoin.networks[selectedNetIdx]?.address || ''} 
                          size={140}
                          level="H"
                        />
                      </div>

                      <span className="text-xs text-[#8E8E93] font-medium mb-1">
                        Deposit Address for {selectedCoin.symbol} ({selectedCoin.networks[selectedNetIdx]?.shortName})
                      </span>

                      <div className="w-full bg-[#1C1C1E] p-2.5 rounded-xl flex items-center justify-between font-mono text-xs text-white border-0">
                        <span className="truncate pr-2 font-mono">{selectedCoin.networks[selectedNetIdx]?.address}</span>
                        <button
                          onClick={() => handleCopyAddress(selectedCoin.networks[selectedNetIdx]?.address || '')}
                          className="p-1.5 bg-[#2C2C2E] hover:bg-[#38383A] rounded-lg text-[#2EA5FF] transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleClose}
                      className="w-full bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] text-white font-bold py-3.5 rounded-[18px] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-[15px] border-0"
                    >
                      {t('deposit.done', 'Done')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
