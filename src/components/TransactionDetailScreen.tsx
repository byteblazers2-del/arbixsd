import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Transaction } from '../types';
import { getExplorerForNetwork } from '../utils/blockchainExplorers';
import { useTranslation } from 'react-i18next';
import { CryptoIcon } from './CryptoIcon';
import { VerifiedBadge } from './VerifiedBadge';
import { SUPPORTED_COINS } from '../data/cryptoAssets';

interface TransactionDetailScreenProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  usdRates?: Record<string, number>;
}

export function TransactionDetailScreen({
  transaction,
  isOpen,
  onClose,
  usdRates = {}
}: TransactionDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRecipient, setCopiedRecipient] = useState(false);

  // Hook into Telegram WebApp native BackButton
  useEffect(() => {
    if (!isOpen) return;

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.BackButton) {
        tg.BackButton.show();
        const handleBack = () => {
          onClose();
        };
        tg.BackButton.onClick(handleBack);

        return () => {
          tg.BackButton.offClick(handleBack);
          tg.BackButton.hide();
        };
      }
    } catch {}
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  const currentLang = (i18n.language || 'en').toLowerCase().split('-')[0];
  const isFa = currentLang === 'fa';
  const isRu = currentLang === 'ru';
  const isZh = currentLang === 'zh' || currentLang === 'cn';

  const coin = (transaction.currency || 'USDT').toUpperCase();
  const isDeposit = transaction.type === 'deposit' || transaction.type === 'bonus' || transaction.type === 'yield' || transaction.type === 'profit' || transaction.type === 'investment_payout';
  const isWithdrawal = transaction.type === 'withdrawal';

  // Find server-configured coin icon if exists
  const coinAsset = SUPPORTED_COINS.find(c => c.symbol.toUpperCase() === coin || c.id.toUpperCase() === coin);
  const serverIconUrl = coinAsset?.iconUrl;

  // Format Crypto Amount
  const cryptoAmountNum = transaction.cryptoAmount 
    ? parseFloat(transaction.cryptoAmount) 
    : (transaction.amount || 0);
  
  const formattedCryptoAmount = isNaN(cryptoAmountNum) 
    ? transaction.amount.toFixed(2) 
    : cryptoAmountNum >= 1000 
      ? cryptoAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : cryptoAmountNum < 0.01 
        ? cryptoAmountNum.toFixed(4)
        : cryptoAmountNum.toFixed(2);

  // Approximate USD value
  const rate = usdRates[coin] || (coin === 'USDT' || coin === 'USDC' || coin === 'USDE' ? 1 : coin === 'BTC' ? 95000 : coin === 'ETH' ? 3400 : coin === 'TON' ? 5.2 : 0);
  const usdValue = rate > 0 
    ? (cryptoAmountNum * rate).toFixed(2)
    : transaction.amount 
      ? transaction.amount.toFixed(2)
      : '0.00';

  // Action Title resolution
  let actionTitle = t('txDetail.receivedDeposit', 'Deposit');
  if (isWithdrawal) {
    actionTitle = t('txDetail.sentWithdrawal', 'Withdrawal');
  } else if (transaction.note?.includes('Bonus') || transaction.type === 'bonus') {
    actionTitle = t('txDetail.starterBonus', 'Starter Bonus Deposit');
  } else if (transaction.note?.includes('Drawdown') || transaction.id?.includes('drawdown')) {
    actionTitle = t('txDetail.drawdown', 'Credit Line Drawdown');
  } else if (transaction.note?.includes('Collateral') || transaction.id?.includes('collateral')) {
    actionTitle = t('txDetail.collateral', 'Collateral Deposit');
  }

  // Multilingual Date Formatting: "2 April at 03:56" / "2 апреля в 03:56" / "4月2日 03:56"
  const dateObj = new Date(transaction.createdAt || Date.now());
  const day = dateObj.getDate();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  let formattedDate = '';
  if (isRu) {
    const ruMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    formattedDate = `${day} ${ruMonths[dateObj.getMonth()]} в ${timeStr}`;
  } else if (isZh) {
    formattedDate = `${dateObj.getMonth() + 1}月${day}日 ${timeStr}`;
  } else {
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    formattedDate = `${day} ${enMonths[dateObj.getMonth()]} at ${timeStr}`;
  }

  // Network resolution
  const networkStr = transaction.network || (coin === 'TON' ? 'TON' : coin === 'USDT' ? 'TRC20' : coin === 'BTC' ? 'Bitcoin' : coin === 'ETH' ? 'ERC20' : 'Mainnet');

  // Tx Hash resolution
  const txHash = transaction.txid || `tx_${transaction.id.substring(0, 16)}`;
  const truncatedHash = txHash.length > 18 
    ? `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 6)}=` 
    : txHash;

  const recipientAddr = transaction.recipient || '';
  const truncatedRecipient = recipientAddr.length > 16
    ? `${recipientAddr.substring(0, 6)}...${recipientAddr.substring(recipientAddr.length - 6)}`
    : recipientAddr;

  const explorer = getExplorerForNetwork(networkStr);
  const explorerUrl = explorer ? explorer.txUrlTemplate(txHash) : '';

  const handleCopyHash = () => {
    try {
      navigator.clipboard.writeText(txHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {}
  };

  const handleCopyRecipient = () => {
    try {
      navigator.clipboard.writeText(recipientAddr);
      setCopiedRecipient(true);
      setTimeout(() => setCopiedRecipient(false), 2000);
    } catch {}
  };

  const handleOpenExplorer = () => {
    if (explorerUrl) {
      window.open(explorerUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="tx-detail-modal"
        initial={{ y: "100%", opacity: 0.85 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
        className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col justify-between overflow-y-auto antialiased select-none font-telegram"
      >
        {/* Main Content Area */}
        <div className="w-full max-w-sm mx-auto px-4 pt-10 sm:pt-14 pb-4 flex-1 flex flex-col items-center">
          
          {/* Top Token Badge (Reads Server Icon / Official Vector Icon) */}
          <div className="mb-4 flex items-center justify-center">
            <CryptoIcon
              symbol={coin}
              network={networkStr}
              customIconUrl={serverIconUrl}
              className={coin === 'STARS' ? 'w-24 h-24 object-contain scale-125' : 'w-20 h-20 rounded-full shrink-0'}
            />
          </div>

          {/* Action Title */}
          <div className="text-center">
            <h2 className="text-[15px] font-medium text-slate-200 tracking-tight">
              {actionTitle}
            </h2>
          </div>

          {/* Main Amount */}
          <div className="text-center mt-1">
            <div className={`text-[28px] sm:text-[32px] font-bold tracking-tight font-sans flex items-center justify-center space-x-1.5 ${
              isDeposit ? 'text-[#10B981]' : 'text-white'
            }`}>
              <span>{isDeposit ? '+' : isWithdrawal ? '-' : ''}{formattedCryptoAmount} {coin}</span>
              <VerifiedBadge className="w-5 h-5 ml-1" />
            </div>
          </div>

          {/* USD Equivalent Subtitle */}
          <div className="text-center mt-0.5">
            <span className="text-[13px] font-medium text-slate-400 font-mono">
              ${usdValue}
            </span>
          </div>

          {/* Horizontal Divider Line under Amount */}
          <div className="w-full border-b border-white/[0.08] mt-6 mb-5" />

          {/* Transaction Details Section Header */}
          <div className="w-full mb-2 px-0.5 text-left rtl:text-right">
            <span className="text-[12.5px] font-normal text-slate-400">
              {t('txDetail.sectionTitle', 'Transaction Details')}
            </span>
          </div>

          {/* Minimalist 2-Column Table with Ultra-Thin Borders (No Shadow) */}
          <div className="w-full bg-[#1C1C1E] rounded-xl border border-white/[0.08] overflow-hidden text-xs shadow-none">
            
            {/* ROW 1: DATE */}
            <div className="grid grid-cols-12 border-b border-white/[0.08]">
              <div className="col-span-4 p-2.5 sm:p-3 border-r border-white/[0.08] flex items-center text-slate-400 font-normal text-[12.5px]">
                {t('txDetail.date', 'Date')}
              </div>
              <div className="col-span-8 p-2.5 sm:p-3 flex items-center text-white font-medium text-[12.5px]">
                {formattedDate}
              </div>
            </div>

            {/* ROW 2: NETWORK */}
            <div className="grid grid-cols-12 border-b border-white/[0.08]">
              <div className="col-span-4 p-2.5 sm:p-3 border-r border-white/[0.08] flex items-center text-slate-400 font-normal text-[12.5px]">
                {t('txDetail.network', 'Network')}
              </div>
              <div className="col-span-8 p-2.5 sm:p-3 flex items-center space-x-1.5 rtl:space-x-reverse text-white font-medium text-[12.5px]">
                <CryptoIcon 
                  symbol={coin} 
                  network={networkStr} 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                />
                <span>{networkStr}</span>
              </div>
            </div>

            {/* ROW 3: RECIPIENT ADDRESS (If withdrawal) */}
            {isWithdrawal && recipientAddr && (
              <div className="grid grid-cols-12 border-b border-white/[0.08]">
                <div className="col-span-4 p-2.5 sm:p-3 border-r border-white/[0.08] flex items-center text-slate-400 font-normal text-[12.5px]">
                  {t('txDetail.recipient', 'Recipient')}
                </div>
                <div className="col-span-8 p-2.5 sm:p-3 flex items-center justify-between min-w-0">
                  <span className="text-white font-mono text-[12px] truncate mr-1.5 rtl:ml-1.5 rtl:mr-0">
                    {truncatedRecipient}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRecipient}
                    className="p-1 rounded text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer shrink-0"
                    title="Copy recipient address"
                  >
                    {copiedRecipient ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ROW 4: TRANSACTION HASH */}
            <div className="grid grid-cols-12">
              <div className="col-span-4 p-2.5 sm:p-3 border-r border-white/[0.08] flex items-center text-slate-400 font-normal text-[12.5px]">
                {t('txDetail.transaction', 'Transaction')}
              </div>
              <div className="col-span-8 p-2.5 sm:p-3 flex items-center justify-between min-w-0">
                <button
                  type="button"
                  onClick={handleOpenExplorer}
                  className="text-[#2EA5FF] hover:underline font-mono text-[12px] flex items-center space-x-1 rtl:space-x-reverse truncate cursor-pointer mr-1.5 rtl:ml-1.5 rtl:mr-0"
                >
                  <span className="truncate">{truncatedHash}</span>
                  <span className="text-[11px]">↗</span>
                </button>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="p-1 rounded text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer shrink-0"
                  title="Copy hash"
                >
                  {copiedHash ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* OPTIONAL ROW 5: STATUS */}
            {transaction.status && (
              <div className="grid grid-cols-12 border-t border-white/[0.08]">
                <div className="col-span-4 p-2.5 sm:p-3 border-r border-white/[0.08] flex items-center text-slate-400 font-normal text-[12.5px]">
                  {t('txDetail.status', 'Status')}
                </div>
                <div className="col-span-8 p-2.5 sm:p-3 flex items-center space-x-1.5 rtl:space-x-reverse text-[12.5px] font-semibold">
                  {transaction.status === 'completed' || (transaction.status as string) === 'approved' ? (
                    <div className="flex items-center space-x-1 text-[#10B981]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{t('txDetail.completed', 'Completed')}</span>
                    </div>
                  ) : transaction.status === 'pending' ? (
                    <div className="flex items-center space-x-1 text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t('txDetail.processing', 'Processing')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{t('txDetail.rejected', 'Rejected')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Thin Minimalist Back Button */}
        <div className="w-full max-w-sm mx-auto px-4 pb-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#2EA5FF] hover:bg-[#2894E8] active:scale-[0.98] text-white font-medium text-[14.5px] transition-all cursor-pointer flex items-center justify-center select-none"
          >
            <span>{t('txDetail.back', 'Back')}</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
