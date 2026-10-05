import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Copy, 
  Share2, 
  Check, 
  X, 
  Gift, 
  Zap, 
  ChevronRight,
  DollarSign,
  Star
} from 'lucide-react';
import {
  FaReferralIcon,
  FaDollarIcon,
  FaEnergyIcon,
  FaShareIcon,
  FaEarningsIcon
} from './CustomIcons';
import { useTranslation } from 'react-i18next';
import { UserData } from '../types';
import { UserAvatar } from './UserAvatar';
import { subscribeUserReferrals } from '../services/systemService';
import { Tappable } from '@telegram-apps/telegram-ui';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData;
  botUsername?: string;
}

export function ReferralModal({ isOpen, onClose, currentUser, botUsername = 'CryptoArbitrageBot' }: ReferralModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const cleanBotUsername = (botUsername || 'CryptoArbitrageBot').replace('@', '');
  const refCode = currentUser.referralCode || `ref_${currentUser.telegramId || currentUser.id.slice(0, 8)}`;
  const inviteLink = `https://t.me/${cleanBotUsername}?start=${refCode}`;

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsub = subscribeUserReferrals(currentUser.id, currentUser.telegramId, (list) => {
      setReferrals(list);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, currentUser.id, currentUser.telegramId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    try {
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch {}
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = () => {
    const text = encodeURIComponent(
      "🚀 Join AI Crypto Arbitrage & earn automated daily trading yields!\n\n" +
      "🎁 Get a $5.00 Welcome Bonus on registration:\n"
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`;
    
    try {
      if ((window as any).Telegram?.WebApp?.openTelegramLink) {
        (window as any).Telegram.WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    } catch {
      window.open(shareUrl, '_blank');
    }
  };

  const totalReferralsCount = Math.max(referrals.length, currentUser.referralsCount || 0);
  const totalEarnings = currentUser.referralEarnings || (totalReferralsCount * 1.5);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 font-telegram">
          {/* Backdrop with Telegram blur fade */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-[6px] transform-gpu"
          />

          {/* Bottom-Sheet Modal (Telegram UI Spring & Swipe Down) */}
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
                onClose();
              }
            }}
            className="relative w-full max-w-lg bg-[#1C1C1E] border-t sm:border border-white/[0.06] sm:rounded-3xl rounded-t-[24px] z-10 max-h-[92vh] flex flex-col overflow-hidden text-white transform-gpu will-change-transform font-telegram touch-pan-y"
          >
            {/* Top Sheet Drag Handle (Mobile) */}
            <div className="w-9 h-1 bg-white/25 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Header Bar */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-[#7D8B9B] uppercase tracking-wider">
                {t('referral.partnership', 'Partnership')}
              </span>

              <Tappable 
                Component="button"
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#2C2C2E] hover:bg-[#38383A] flex items-center justify-center text-[#7D8B9B] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Tappable>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3.5 select-none no-scrollbar">
              
              {/* Top Visual Graphic & Header (Matching Major Duck/Graphic Hero) */}
              <div className="flex flex-col items-center justify-center pt-1 pb-2 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#2EA5FF] via-[#0284C7] to-[#06B6D4] p-0.5 flex items-center justify-center shadow-lg">
                  <div className="w-full h-full rounded-[22px] bg-[#1C1C1E] flex items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-9 h-9 rounded-2xl bg-[#2EA5FF]/20 text-[#2EA5FF] flex items-center justify-center mb-1">
                        <FaReferralIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-400 font-sans tracking-wide">5% COMMISSION</span>
                    </div>
                  </div>
                </div>

                <h2 className="text-[22px] font-bold text-white tracking-tight mt-3 leading-snug">
                  {t('referral.title', 'Referral Program')}
                </h2>
                <p className="text-[12px] text-[#7D8B9B] max-w-[300px] mx-auto mt-1 leading-relaxed">
                  {t('referral.subtitle', 'Invite friends and earn 5% instant commission whenever they top up or deposit.')}
                </p>
              </div>

              {/* Main Card: 5% Deposit Commission Program */}
              <div className="bg-[#1C1C1E] rounded-[22px] p-4 space-y-4">
                
                {/* 5% Commission Highlight Box */}
                <div className="bg-[#242426] border border-[#2EA5FF]/30 rounded-[18px] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#2EA5FF] flex items-center justify-center text-white shrink-0 shadow-md">
                        <FaDollarIcon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-[14px] font-bold text-white tracking-tight">
                        {t('referral.commissionTitle', '5% Deposit Commission')}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-[#2EA5FF]/20 text-[#2EA5FF] text-[11px] font-extrabold rounded-full font-sans tracking-tight">
                      +5%
                    </span>
                  </div>

                  <p className="text-[12px] text-[#C5D1DE] leading-relaxed">
                    {t('referral.commissionDesc', 'If you invite someone and they fund or deposit into their account, 5% of that deposit is instantly allocated directly to your wallet.')}
                  </p>
                </div>

                {/* Clear Commission Breakdown Points */}
                <div className="space-y-3 px-1">
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FaEnergyIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white leading-tight">
                        {t('referral.commissionPerk1Title', 'Instant 5% Payout')}
                      </h4>
                      <p className="text-[11px] text-[#7D8B9B] leading-snug mt-0.5">
                        {t('referral.commissionPerk1Desc', 'Whenever your referred partner makes any deposit, 5% is immediately credited to your wallet balance.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2EA5FF]/15 text-[#2EA5FF] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white leading-tight">
                        {t('referral.commissionPerk2Title', 'Fully Unlocked & Withdrawable')}
                      </h4>
                      <p className="text-[11px] text-[#7D8B9B] leading-snug mt-0.5">
                        {t('referral.commissionPerk2Desc', 'No hidden conditions or locks. Referral earnings are instantly available for withdrawal or arbitrage trading.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center space-x-2 pt-1">
                  <Tappable
                    Component="button"
                    type="button"
                    onClick={handleShare}
                    className="flex-1 py-3.5 px-4 bg-[#2481CC] hover:bg-[#1D74BD] text-white text-[13.5px] font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer font-telegram overflow-hidden"
                  >
                    <FaShareIcon className="w-4 h-4 text-white" />
                    <span>{t('referral.inviteFriends', 'Invite Friends')}</span>
                  </Tappable>

                  <Tappable
                    Component="button"
                    type="button"
                    onClick={handleCopy}
                    className="w-12 h-12 bg-[#242426] hover:bg-[#38383A] text-[#7D8B9B] hover:text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 overflow-hidden"
                    title="Copy Invite Link"
                  >
                    {copied ? <Check className="w-5 h-5 text-[#2EA5FF]" /> : <Copy className="w-5 h-5" />}
                  </Tappable>
                </div>
              </div>

              {/* Major Rewards / Referral Earnings Card */}
              <div className="bg-[#1C1C1E] rounded-[20px] p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0">
                    <FaEarningsIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[13.5px] font-bold text-white tracking-tight">
                    {t('referral.rewards', 'Arbitrage Rewards')}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-[13px] font-bold text-amber-400 font-sans">
                    ${totalEarnings.toFixed(2)} USD
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#4A5B6D]" />
                </div>
              </div>

              {/* Referrals Section (Matching Screenshot 2 "REFERRALS: 7 / No referral earnings yet") */}
              <div className="pt-2">
                <div className="px-1 mb-2 flex items-center justify-between text-[11px] font-bold text-[#7D8B9B] tracking-wider uppercase">
                  <span>{t('referral.referralsCount', { count: totalReferralsCount, defaultValue: `REFERRALS: ${totalReferralsCount}` })}</span>
                  {totalReferralsCount > 0 && <span>{t('referral.active', 'Active')}</span>}
                </div>

                {loading ? (
                  <div className="bg-[#1C1C1E] rounded-[20px] py-4 text-center text-xs text-[#7D8B9B]">
                    <span>{t('referral.loading', 'Loading partners...')}</span>
                  </div>
                ) : referrals.length > 0 ? (
                  <div className="space-y-1.5">
                    {referrals.map((refUser, idx) => {
                      const joinedDate = refUser.createdAt 
                        ? new Date(refUser.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Active';

                      return (
                        <div 
                          key={refUser.id || idx}
                          className="bg-[#1C1C1E] rounded-[18px] p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <UserAvatar user={refUser} size="md" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white truncate block">
                                {refUser.firstName || `@${refUser.telegramUsername || 'Trader'}`}
                              </span>
                              <span className="text-[10px] text-[#7D8B9B] font-mono">
                                @{refUser.telegramUsername || 'trader'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full block mb-0.5">
                              {t('referral.activeTag', 'Active Member')}
                            </span>
                            <span className="text-[9px] text-[#7D8B9B] font-mono">{joinedDate}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 1:1 Matching "No referral earnings yet" pill/container */
                  <div className="bg-[#1C1C1E] rounded-[20px] py-4 text-center">
                    <span className="text-xs font-semibold text-[#58687A]">
                      {t('referral.noEarnings', 'No referral earnings yet')}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
