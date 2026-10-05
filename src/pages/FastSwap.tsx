import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowDownUp, 
  ChevronRight, 
  Search, 
  Wallet,
  RefreshCw,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { CryptoIcon } from '../components/CryptoIcon';
import { DepositModal } from '../components/DepositModal';
import { triggerHaptic } from '../utils/haptics';
import { subscribeLivePrices, TokenPrices } from '../services/livePriceService';

export interface SwapToken {
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

const BASE_TOKENS: SwapToken[] = [
  { symbol: 'GRAM', name: 'Gram', network: 'TON', decimals: 3 },
  { symbol: 'USDT', name: 'Tether USD', network: 'TRC20', decimals: 2 },
  { symbol: 'TON', name: 'Toncoin', network: 'TON', decimals: 3 },
  { symbol: 'BTC', name: 'Bitcoin', network: 'Native', decimals: 6 },
  { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', decimals: 5 },
  { symbol: 'SOL', name: 'Solana', network: 'SOL', decimals: 3 },
  { symbol: 'NOT', name: 'Notcoin', network: 'TON', decimals: 1 },
  { symbol: 'DOGS', name: 'DOGS', network: 'TON', decimals: 0 },
  { symbol: 'TRX', name: 'TRON', network: 'TRC20', decimals: 2 },
  { symbol: 'BNB', name: 'BNB Chain', network: 'BEP20', decimals: 4 },
  { symbol: 'STARS', name: 'Telegram Stars', network: 'Native', decimals: 0 }
];

export function FastSwap() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  // Real-time live prices from Binance API
  const [livePrices, setLivePrices] = useState<TokenPrices>({
    USDT: 1.00,
    GRAM: 1.462,
    TON: 5.62,
    BTC: 94850.00,
    ETH: 3380.50,
    SOL: 198.40,
    NOT: 0.00785,
    DOGS: 0.00065,
    TRX: 0.2435,
    BNB: 642.80,
    STARS: 0.02
  });

  const [isPriceUpdating, setIsPriceUpdating] = useState(false);

  useEffect(() => {
    const unsub = subscribeLivePrices((prices) => {
      setLivePrices(prices);
      setIsPriceUpdating(true);
      setTimeout(() => setIsPriceUpdating(false), 500);
    });
    return () => unsub();
  }, []);

  // Tokens: Default to GRAM -> USDT matching the screenshot
  const [fromToken, setFromToken] = useState<SwapToken>(BASE_TOKENS[0]); // GRAM
  const [toToken, setToToken] = useState<SwapToken>(BASE_TOKENS[1]); // USDT
  const [fromAmount, setFromAmount] = useState<string>('1000');

  // Token Modal
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectingTarget, setSelectingTarget] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');

  // Deposit Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmountPreset, setDepositAmountPreset] = useState('50');

  // Dynamic live prices for selected tokens
  const fromPriceUsd = livePrices[fromToken.symbol] || 1.0;
  const toPriceUsd = livePrices[toToken.symbol] || 1.0;

  // User available balance
  const userUsdBalance = Number(user?.balance || 0);
  const userFromTokenBalance = fromPriceUsd > 0 ? (userUsdBalance / fromPriceUsd) : 0;

  // Calculations
  const numericFromAmount = parseFloat(fromAmount) || 0;
  const fromAmountInUsd = numericFromAmount * fromPriceUsd;
  
  // Calculate To Amount with live Binance price
  const toAmountFormatted = useMemo(() => {
    if (!numericFromAmount || fromPriceUsd <= 0 || toPriceUsd <= 0) return '0';
    const converted = fromAmountInUsd / toPriceUsd;
    
    // Format with spaces as thousands separator matching screenshot: "1 462.486"
    const parts = converted.toFixed(3).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts[1] && parseInt(parts[1]) > 0 ? `${integerPart}.${parts[1]}` : integerPart;
  }, [numericFromAmount, fromPriceUsd, toPriceUsd, fromAmountInUsd]);

  // Rate: 1 FROM = X TO
  const unitRateFormatted = useMemo(() => {
    if (fromPriceUsd <= 0 || toPriceUsd <= 0) return '1';
    const ratio = fromPriceUsd / toPriceUsd;
    if (ratio >= 100) return ratio.toFixed(2);
    if (ratio >= 1) return ratio.toFixed(3);
    return ratio.toFixed(6);
  }, [fromPriceUsd, toPriceUsd]);

  const hasInsufficientBalance = numericFromAmount > userFromTokenBalance;

  // Switch tokens
  const handleSwitchTokens = () => {
    triggerHaptic('medium');
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Open token picker
  const handleOpenPicker = (target: 'from' | 'to') => {
    triggerHaptic('selection');
    setSelectingTarget(target);
    setSearchQuery('');
    setIsSelectModalOpen(true);
  };

  const handleSelectToken = (token: SwapToken) => {
    triggerHaptic('selection');
    if (selectingTarget === 'from') {
      if (token.symbol === toToken.symbol) {
        setToToken(fromToken);
      }
      setFromToken(token);
    } else {
      if (token.symbol === fromToken.symbol) {
        setFromToken(toToken);
      }
      setToToken(token);
    }
    setIsSelectModalOpen(false);
  };

  // Max button
  const handleSetMax = () => {
    triggerHaptic('selection');
    if (userFromTokenBalance > 0) {
      setFromAmount(userFromTokenBalance.toFixed(fromToken.decimals <= 2 ? 2 : 3));
    } else {
      setFromAmount('0');
    }
  };

  // Trigger deposit flow with exact token & amount pre-selected
  const handleOpenDeposit = () => {
    triggerHaptic('selection');
    const neededUsd = Math.max(10, Math.ceil(fromAmountInUsd - userUsdBalance));
    setDepositAmountPreset(neededUsd.toString());
    setIsDepositModalOpen(true);
  };

  // Primary action button
  const handleContinue = () => {
    if (numericFromAmount <= 0) return;

    if (hasInsufficientBalance) {
      handleOpenDeposit();
    } else {
      triggerHaptic('medium');
      // Execute swap
    }
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return BASE_TOKENS;
    return BASE_TOKENS.filter(
      t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.network.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#000000] text-white pt-3 pb-36 select-none font-sans" dir="ltr">
      <div className="max-w-md mx-auto px-5 space-y-6">
        
        {/* =========================================================================
            SECTION 1: YOU SEND (Pixel-Matched to Screenshot, Pitch Black, Single Input)
            ========================================================================= */}
        <div className="space-y-2">
          {/* Header Row: Label on Left, Balance & MAX on Right */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8E8E93]">
              {t('swap.youPay', 'You send')}
            </span>

            <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-medium">
              <Wallet className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span className="text-[#8E8E93] font-mono">
                {userFromTokenBalance > 0 ? userFromTokenBalance.toFixed(2) : '0'}
              </span>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-[#007AFF] font-bold tracking-wide hover:underline cursor-pointer pl-0.5"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Main Input Row: Token Selector (Left) & Single Clean Number Input (Right) */}
          <div className="flex items-center justify-between py-1">
            {/* Token Selector Pill */}
            <button
              type="button"
              onClick={() => handleOpenPicker('from')}
              className="flex items-center space-x-2 bg-transparent hover:opacity-80 transition-opacity cursor-pointer group shrink-0"
            >
              <CryptoIcon symbol={fromToken.symbol} network={fromToken.network} className="w-7 h-7 shrink-0" />
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {fromToken.symbol}
              </span>
              <ChevronRight className="w-5 h-5 text-[#8E8E93] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Single Pure Input: ZERO inner wrappers, ZERO spinners, ZERO border boxes */}
            <div className="flex-1 flex justify-end pl-3">
              <input
                type="text"
                inputMode="decimal"
                value={fromAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '.');
                  if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
                    setFromAmount(raw);
                  }
                }}
                placeholder="0"
                className="w-full max-w-[200px] sm:max-w-[240px] bg-transparent text-right text-3xl sm:text-4xl font-extrabold text-white tracking-tight outline-none border-none p-0 m-0 shadow-none ring-0 focus:ring-0 focus:outline-none placeholder-[#3A3A3C] font-mono appearance-none"
                style={{
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: 'transparent'
                }}
              />
            </div>
          </div>

          {/* Sub-row: Insufficient balance. Deposit */}
          <div className="flex justify-end pt-0.5 min-h-[22px]">
            {hasInsufficientBalance ? (
              <div className="text-xs sm:text-sm font-medium text-[#EF4444]">
                <span>{t('swap.insufficientBalance', 'Insufficient balance.')} </span>
                <button
                  type="button"
                  onClick={handleOpenDeposit}
                  className="text-[#007AFF] font-semibold hover:underline cursor-pointer"
                >
                  {t('deposit.depositTitle', 'Deposit')}
                </button>
              </div>
            ) : (
              <div className="text-xs text-[#8E8E93] font-mono">
                ≈ ${fromAmountInUsd.toFixed(2)} USD
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            DIVIDER WITH CENTRIC SWITCH BUTTON (⇄)
            ========================================================================= */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="w-full border-t border-white/[0.08]" />
          <button
            type="button"
            onClick={handleSwitchTokens}
            className="absolute w-9 h-9 rounded-full bg-[#1C1C1E] hover:bg-[#242426] text-[#007AFF] flex items-center justify-center cursor-pointer transition-transform active:scale-90 border-0 shadow-sm"
            title="Switch tokens"
          >
            <ArrowDownUp className="w-4 h-4 text-[#2EA5FF]" />
          </button>
        </div>

        {/* =========================================================================
            SECTION 2: YOU RECEIVE (Pixel-Matched to Screenshot, Live Binance Price)
            ========================================================================= */}
        <div className="space-y-2">
          {/* Header Row: Label on Left */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8E8E93]">
              {t('swap.youReceive', 'You receive')}
            </span>
          </div>

          {/* Main Output Row: Token Selector (Left) & Large Number (Right) */}
          <div className="flex items-center justify-between py-1">
            {/* Token Selector Pill */}
            <button
              type="button"
              onClick={() => handleOpenPicker('to')}
              className="flex items-center space-x-2 bg-transparent hover:opacity-80 transition-opacity cursor-pointer group shrink-0"
            >
              <CryptoIcon symbol={toToken.symbol} network={toToken.network} className="w-7 h-7 shrink-0" />
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {toToken.symbol}
              </span>
              <ChevronRight className="w-5 h-5 text-[#8E8E93] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Large Calculated Number (Right-aligned, big font) */}
            <div className="text-right text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono truncate max-w-[240px]">
              {toAmountFormatted}
            </div>
          </div>

          {/* Sub-row: Exchange Rate with live Binance status indicator */}
          <div className="flex items-center justify-end space-x-1.5 text-xs text-[#8E8E93] pt-0.5 font-mono">
            <span>⇄</span>
            <span>1 {fromToken.symbol} ≈ {unitRateFormatted} {toToken.symbol}</span>
            <div 
              className={`w-2 h-2 rounded-full border border-[#007AFF] ml-0.5 transition-opacity duration-300 ${
                isPriceUpdating ? 'bg-[#007AFF] opacity-100' : 'opacity-40'
              }`}
              title="Binance API Live Stream"
            />
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: ACTION BUTTON (Clean, Minimalist, Full-Width)
            ========================================================================= */}
        <div className="pt-4">
          {numericFromAmount <= 0 ? (
            <button
              type="button"
              disabled
              className="w-full py-4 rounded-[18px] bg-[#1C1C1E] text-[#55555A] font-bold text-base cursor-not-allowed border-0"
            >
              {t('common.continue', 'Continue')}
            </button>
          ) : hasInsufficientBalance ? (
            <button
              type="button"
              onClick={handleOpenDeposit}
              className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] hover:brightness-105 active:scale-[0.99] text-white font-bold text-base transition-all cursor-pointer border-0 shadow-none"
            >
              {t('deposit.depositForBot', `Deposit ${fromToken.symbol} to Continue`)}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] hover:brightness-105 active:scale-[0.99] text-white font-bold text-base transition-all cursor-pointer border-0 shadow-none"
            >
              {t('common.continue', 'Continue')}
            </button>
          )}
        </div>

      </div>

      {/* =========================================================================
          TOKEN SELECTION BOTTOM SHEET (Minimal, Pitch Black Backdrop)
          ========================================================================= */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 font-sans">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85"
            onClick={() => setIsSelectModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-[#1C1C1E] rounded-t-[28px] sm:rounded-[28px] p-5 max-h-[82vh] flex flex-col z-10 border-0 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white">
                {t('swap.chooseToken', 'Choose Token')}
              </h3>
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="bg-[#242426] rounded-xl px-3.5 py-2.5 flex items-center space-x-2.5 my-3 border-0">
              <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('swap.searchToken', 'Search token...')}
                className="w-full bg-transparent text-sm text-white placeholder-[#55555A] outline-none border-none p-0"
              />
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {filteredTokens.map((token) => {
                const tokenPrice = livePrices[token.symbol] || 1.0;
                return (
                  <div
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    className="bg-[#242426] hover:bg-[#2C2C2E] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <CryptoIcon symbol={token.symbol} network={token.network} className="w-8 h-8" />
                      <div>
                        <div className="font-bold text-white text-base font-mono leading-tight">
                          {token.symbol}
                        </div>
                        <div className="text-xs text-[#8E8E93] leading-tight mt-0.5">
                          {token.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-white">
                        ${tokenPrice >= 1 ? tokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : tokenPrice}
                      </div>
                      <div className="text-[11px] text-[#007AFF] font-medium">
                        {token.network}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          DEPOSIT MODAL (Customized & Pre-Filled for Current Swap)
          ========================================================================= */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        initialCoinSymbol={fromToken.symbol}
        initialUsdAmount={depositAmountPreset}
        swapContext={{
          fromAmount,
          fromSymbol: fromToken.symbol,
          toAmount: toAmountFormatted,
          toSymbol: toToken.symbol
        }}
      />

    </div>
  );
}
