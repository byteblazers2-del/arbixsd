import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  Clock,
} from 'lucide-react';
import { CryptoCoin } from '../data/cryptoAssets';
import { CryptoIcon } from './CryptoIcon';
import { VerifiedBadge } from './VerifiedBadge';
import { Transaction } from '../types';
import { 
  fetchCoinMarketData, 
  getInstantMarketData, 
  getCachedMarketData, 
  CoinMarketData 
} from '../services/coinMarketService';
import { triggerHaptic } from '../utils/haptics';

interface CoinDetailViewProps {
  coin: CryptoCoin;
  balance: number;
  rate: number;
  transactions: Transaction[];
  onBack: () => void;
  onReceive: (coin: CryptoCoin) => void;
  onSend: (coin: CryptoCoin) => void;
  onSelectTxDetail?: (tx: Transaction) => void;
}

// Brand theme colors for each cryptocurrency chart
const COIN_THEME_COLORS: Record<string, { stroke: string; dot: string; glow: string }> = {
  BTC: { stroke: '#F7931A', dot: '#F7931A', glow: 'rgba(247, 147, 26, 0.25)' },
  TON: { stroke: '#0098EA', dot: '#0098EA', glow: 'rgba(0, 152, 234, 0.25)' },
  ETH: { stroke: '#627EEA', dot: '#627EEA', glow: 'rgba(98, 126, 234, 0.25)' },
  SOL: { stroke: '#14F195', dot: '#14F195', glow: 'rgba(20, 241, 149, 0.25)' },
  USDT: { stroke: '#26A17B', dot: '#26A17B', glow: 'rgba(38, 161, 123, 0.25)' },
  USDC: { stroke: '#2775CA', dot: '#2775CA', glow: 'rgba(39, 117, 202, 0.25)' },
  BNB: { stroke: '#F3BA2F', dot: '#F3BA2F', glow: 'rgba(243, 186, 47, 0.25)' },
  DOGE: { stroke: '#C2A633', dot: '#C2A633', glow: 'rgba(194, 166, 51, 0.25)' },
  TRX: { stroke: '#EF0027', dot: '#EF0027', glow: 'rgba(239, 0, 39, 0.25)' },
  NOT: { stroke: '#E5E7EB', dot: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.25)' },
  SUI: { stroke: '#4DA2FF', dot: '#4DA2FF', glow: 'rgba(77, 162, 255, 0.25)' },
  XRP: { stroke: '#00AAE4', dot: '#00AAE4', glow: 'rgba(0, 170, 228, 0.25)' },
  BCH: { stroke: '#0AC18E', dot: '#0AC18E', glow: 'rgba(10, 193, 142, 0.25)' },
  MATIC: { stroke: '#8247E5', dot: '#8247E5', glow: 'rgba(130, 71, 229, 0.25)' },
  STARS: { stroke: '#FFB800', dot: '#FFB800', glow: 'rgba(255, 184, 0, 0.25)' },
  USDE: { stroke: '#00D395', dot: '#00D395', glow: 'rgba(0, 211, 149, 0.25)' },
};

export const CoinDetailView: React.FC<CoinDetailViewProps> = ({
  coin,
  balance,
  rate,
  transactions,
  onBack,
  onReceive,
  onSend,
  onSelectTxDetail,
}) => {
  const { t, i18n } = useTranslation();
  const [marketData, setMarketData] = useState<CoinMarketData>(() => 
    getInstantMarketData(coin.symbol, rate)
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedMarketData(coin.symbol));

  const isFa = i18n.language?.startsWith('fa');
  const coinColor = COIN_THEME_COLORS[coin.symbol.toUpperCase()] || {
    stroke: '#2EA5FF',
    dot: '#2EA5FF',
    glow: 'rgba(46, 165, 255, 0.25)',
  };

  // Fetch live market data strictly from client frontend to public Binance edge
  useEffect(() => {
    let isMounted = true;

    fetchCoinMarketData(coin.symbol)
      .then((data) => {
        if (isMounted) {
          setMarketData(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [coin.symbol]);

  // Telegram native BackButton integration
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.show();
      const handleBack = () => {
        triggerHaptic('light');
        onBack();
      };
      tg.BackButton.onClick(handleBack);
      return () => {
        tg.BackButton.offClick(handleBack);
        tg.BackButton.hide();
      };
    }
  }, [onBack]);

  // Effective rates and valuations
  const currentRate = marketData?.currentPrice || rate || 1;
  const usdValue = balance * currentRate;

  // Filter ONLY REAL database transactions belonging to this coin (Deposit and Withdrawal only)
  const coinActivity = useMemo(() => {
    const sym = coin.symbol.toUpperCase();
    
    return transactions
      .filter((tx) => {
        const txCur = (tx.currency || '').toUpperCase();
        return txCur === sym;
      })
      .map((tx) => {
        const isDeposit = tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'yield' || tx.type === 'bonus';
        const isWithdrawal = tx.type === 'withdrawal' || tx.type === 'transfer';
        
        let label = isDeposit ? 'Deposit' : 'Withdrawal';
        if (tx.type === 'profit' || tx.type === 'yield') {
          label = 'Yield Return';
        }

        const address = tx.recipient || (tx as any).txHash || (tx as any).senderAddress || '';
        const shortAddress = address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address || (isDeposit ? 'Deposit' : 'Withdrawal');
        const memo = (tx as any).memo || (tx as any).tag || (tx as any).note || (tx as any).txid?.slice(0, 5);

        const dateObj = new Date(tx.createdAt || Date.now());
        const exactDateTimeStr = dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        const timeStr = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        // Compute coin amount string
        let coinAmountFormatted = '';
        if (tx.cryptoAmount) {
          coinAmountFormatted = `${isDeposit ? '+ ' : '- '}${tx.cryptoAmount} ${sym}`;
        } else if (tx.amount) {
          const coinQty = currentRate > 0 ? (tx.amount / currentRate).toFixed(4) : tx.amount.toFixed(2);
          coinAmountFormatted = `${isDeposit ? '+ ' : '- '}${coinQty} ${sym}`;
        }

        return {
          id: tx.id,
          type: isDeposit ? 'deposit' : 'withdrawal',
          label,
          exactDateTimeStr,
          timeStr,
          shortAddress,
          memo,
          coinAmountFormatted,
          status: tx.status,
          rawTx: tx,
        };
      })
      .sort((a, b) => (b.rawTx.createdAt || 0) - (a.rawTx.createdAt || 0));
  }, [coin.symbol, transactions, currentRate, isFa]);

  // Build SVG Path for smooth Sparkline curve
  const sparklineSvg = useMemo(() => {
    const rawData = marketData?.sparkline || [];
    if (rawData.length < 2) {
      return { path: '', areaPath: '', lastX: 0, lastY: 0 };
    }

    const width = 320;
    const height = 90;
    const padding = 10;

    const min = Math.min(...rawData);
    const max = Math.max(...rawData);
    const range = max - min || 1;

    const points = rawData.map((val, idx) => {
      const x = padding + (idx / (rawData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const lastPoint = points[points.length - 1];
    const areaD = `${d} L ${lastPoint.x} ${height} L ${points[0].x} ${height} Z`;

    return {
      path: d,
      areaPath: areaD,
      lastX: lastPoint.x,
      lastY: lastPoint.y,
    };
  }, [marketData]);

  const isPositive = marketData ? marketData.isPositive : true;
  const changeStr = marketData?.change24hStr || '+0.97%';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="min-h-screen bg-[#000000] text-white px-4 pb-28 pt-2 select-none font-sans"
    >
      {/* Top Header with Back Arrow & "Wallet" Title (Clean, no Live API badge) */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={() => {
              triggerHaptic('selection');
              onBack();
            }}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/[0.06] flex items-center justify-center text-[#8295A8] hover:text-white active:scale-90 transition-all cursor-pointer"
            aria-label="Back to Wallet"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
            {t('coinDetail.walletTitle', 'Wallet')}
          </h1>
        </div>
      </div>

      {/* Main Asset Hero Card (Matches Screenshot with Coin Color Chart) */}
      <div className="bg-[#1C1C1E] rounded-[28px] p-5 border border-white/[0.06] shadow-xl relative overflow-hidden mb-6">
        {/* Top Row: Coin Icon, Balance, Name & 24h USD Valuation */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="relative">
              <CryptoIcon 
                symbol={coin.symbol} 
                network={coin.subBadge} 
                className={coin.symbol === 'STARS' ? "w-14 h-14 scale-125 object-contain" : "w-12 h-12 rounded-full"} 
              />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none mb-1">
                {balance > 0 ? balance.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0.00'}
              </div>
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="text-sm font-medium text-[#8295A8]">
                  {coin.name}
                </span>
                <VerifiedBadge className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Right: USD Valuation & 24h % */}
          <div className="text-right">
            <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-none mb-1">
              ${usdValue >= 1 ? usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : usdValue.toFixed(4)}
            </div>
            <div className={`text-xs sm:text-sm font-bold leading-none ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {changeStr} · 24h
            </div>
          </div>
        </div>

        {/* Real-time Dynamic Coin-Colored Sparkline Graph */}
        <div className="my-4 relative h-[90px] w-full flex items-center justify-center">
          {isLoading && !marketData ? (
            <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-[#2EA5FF]" />
              <span>{'Loading market data...'}</span>
            </div>
          ) : (
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox="0 0 320 90" 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`grad-${coin.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={coinColor.stroke} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={coinColor.stroke} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Gradient under curve */}
              {sparklineSvg.areaPath && (
                <path
                  d={sparklineSvg.areaPath}
                  fill={`url(#grad-${coin.symbol})`}
                />
              )}

              {/* Main Curve Line with Unique Coin Color */}
              {sparklineSvg.path && (
                <path
                  d={sparklineSvg.path}
                  fill="none"
                  stroke={coinColor.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Distinctive Dot on the Latest Price Point in Coin Color */}
              {sparklineSvg.lastX > 0 && (
                <g>
                  {/* Subtle outer glow ring */}
                  <circle
                    cx={sparklineSvg.lastX}
                    cy={sparklineSvg.lastY}
                    r="6"
                    fill={coinColor.dot}
                    opacity="0.35"
                  />
                  {/* Solid center dot */}
                  <circle
                    cx={sparklineSvg.lastX}
                    cy={sparklineSvg.lastY}
                    r="3.5"
                    fill={coinColor.dot}
                  />
                </g>
              )}
            </svg>
          )}
        </div>

        {/* 24h Price Range Labels under the chart */}
        <div className="flex items-center justify-between pt-1 pb-4 text-xs border-b border-white/[0.06]">
          <div>
            <div className="font-bold text-white text-[13px]">
              ${marketData?.openPrice ? (marketData.openPrice < 1 ? marketData.openPrice.toFixed(4) : marketData.openPrice.toFixed(2)) : currentRate.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#8295A8] mt-0.5">
              {marketData?.startLabel || ('24h ago')}
            </div>
          </div>

          <div className="text-right">
            <div className="font-bold text-white text-[13px]">
              ${currentRate < 1 ? currentRate.toFixed(4) : currentRate.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#8295A8] mt-0.5">
              {marketData?.endLabel || ('Today')}
            </div>
          </div>
        </div>

        {/* Action Buttons: Deposit & Withdraw inside card */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          {/* Deposit Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onReceive(coin);
            }}
            className="flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] transition-all cursor-pointer font-bold text-sm text-white"
          >
            <Plus className="w-4 h-4 text-[#2EA5FF]" strokeWidth={2.5} />
            <span>{t('assets.deposit', 'Deposit')}</span>
          </button>

          {/* Withdraw Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onSend(coin);
            }}
            className="flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] transition-all cursor-pointer font-bold text-sm text-white"
          >
            <ArrowUp className="w-4 h-4 text-[#2EA5FF]" strokeWidth={2.5} />
            <span>{t('assets.withdraw', 'Withdraw')}</span>
          </button>
        </div>
      </div>

      {/* Date / Section Header for Real Database Transactions */}
      <h2 className="text-[17px] font-bold text-white mb-3 px-1 tracking-tight">
        {t('assets.tabHistory', 'Transaction History')}
      </h2>

      {/* Filtered REAL Transactions List for this Coin (Individual Rounded Cards Matching Screenshot) */}
      {coinActivity.length > 0 ? (
        <div className="space-y-2.5">
          {coinActivity.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                triggerHaptic('selection');
                if (item.rawTx && onSelectTxDetail) {
                  onSelectTxDetail(item.rawTx);
                }
              }}
              className="bg-[#1C1C1E] rounded-[22px] p-3.5 flex items-center justify-between hover:bg-[#242426] active:scale-[0.99] transition-all cursor-pointer group select-none shadow-sm"
            >
              {/* Left: Direction icon or Stars coin icon, type, address and optional memo */}
              <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                {coin.symbol === 'STARS' ? (
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <CryptoIcon symbol="STARS" className="w-12 h-12 scale-125 object-contain" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0">
                    {item.type === 'withdrawal' ? (
                      <ArrowUp className="w-5 h-5 text-white/80" strokeWidth={2.2} />
                    ) : (
                      <ArrowDown className="w-5 h-5 text-white/80" strokeWidth={2.2} />
                    )}
                  </div>
                )}

                <div className="min-w-0 flex flex-col justify-center">
                  <div className="text-[15px] font-bold text-white tracking-tight leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[12px] text-[#7E8F9E] font-mono leading-none mt-1">
                    {item.shortAddress}
                  </div>
                  {item.memo && (
                    <div className="mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10.5px] font-mono text-slate-300 leading-none inline-block">
                        {item.memo}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Real Amount (+0.08 TON in green or -0.14 TON in white) & Time */}
              <div className="flex flex-col items-end shrink-0 justify-center">
                <div className={`text-[15px] font-bold tracking-tight leading-tight ${
                  item.type === 'withdrawal' ? 'text-white' : 'text-[#10B981]'
                }`}>
                  {item.coinAmountFormatted}
                </div>
                <div className="text-[12px] text-[#7E8F9E] font-medium leading-none mt-1">
                  {item.timeStr}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1C1C1E] rounded-[24px] p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center text-[#8295A8]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white mb-0.5">
              {t('coinDetail.noActivity', 'No recent activity')}
            </div>
            <div className="text-xs text-[#8295A8] max-w-xs">
              {t('coinDetail.noActivityDesc', 'You have no transactions for {{coin}} yet.', { coin: coin.name })}
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onReceive(coin);
            }}
            className="px-4 py-2 bg-gradient-to-b from-[#38B6FF] via-[#2EA5FF] to-[#007AFF] text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            {t('assets.deposit', 'Deposit')} {coin.symbol}
          </button>
        </div>
      )}
    </motion.div>
  );
};
