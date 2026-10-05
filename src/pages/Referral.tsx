import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Copy, 
  Share2, 
  Check, 
  HandCoins,
  Crown,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserData } from '../types';
import { subscribeUserReferrals } from '../services/systemService';
import { triggerHaptic } from '../utils/haptics';

export function Referral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<UserData[]>([]);

  const currentUserId = user?.id || 'guest_user';
  const currentTgId = user?.telegramId;
  const botUsername = 'CryptoArbitrageBot';
  const refCode = user?.referralCode || `ref_${currentTgId || currentUserId.slice(0, 8)}`;
  const inviteLink = `https://t.me/${botUsername}?startapp=${refCode}`;

  useEffect(() => {
    const unsub = subscribeUserReferrals(currentUserId, currentTgId, (list) => {
      setReferrals(list);
    });
    return () => unsub();
  }, [currentUserId, currentTgId]);

  const handleCopyLink = () => {
    triggerHaptic('medium');
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShareLink = () => {
    triggerHaptic('selection');
    const shareText = "🚀 Join Crypto Trading & Instant Loans Mini App!\n\n🎁 Claim a $5.00 Welcome Bonus instantly via this link:\n";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    } catch {
      window.open(shareUrl, '_blank');
    }
  };

  const totalReferralsCount = Math.max(referrals.length, user?.referralsCount || 0);
  const totalEarnings = user?.referralEarnings || (totalReferralsCount * 3.5);

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 pt-2 select-none font-sans">
      <div className="max-w-md mx-auto px-4 space-y-3.5">
        
        {/* TOP HERO CARD: Clean dark card #1C1C1E */}
        <div className="rounded-[28px] bg-[#1C1C1E] p-5 text-center">
          
          <h1 className="text-[22px] sm:text-[24px] font-bold text-white tracking-tight mb-2">
            Referral & Partner Program
          </h1>

          <div className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-[#242426] mb-5">
            <span className="text-[12px] font-bold text-[#2EA5FF] tracking-wide">
              VIP Tiers • Instant USD Payout
            </span>
          </div>

          <div className="flex items-end justify-center space-x-3 pt-1">
            <div className="w-[110px] h-[92px] rounded-t-2xl bg-[#242426] flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
              </svg>
            </div>

            <div className="w-[110px] h-[92px] rounded-t-2xl bg-[#2C2C2E] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#2EA5FF]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* FEATURE BENEFIT CARDS */}
        <div className="space-y-2.5">
          
          {/* Card 1 */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2EA5FF]/15 flex items-center justify-center text-[#2EA5FF] shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <h4 className="text-[14.5px] font-bold text-white tracking-tight">
                Loan Commission & Cashback
              </h4>
              <p className="text-[12px] text-[#8E8E93] font-medium leading-relaxed mt-0.5">
                Earn up to 30% instant cash commission whenever your referred friends take out or service a loan.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <h4 className="text-[14.5px] font-bold text-white tracking-tight">
                High-Volume Inviter VIP Tiers
              </h4>
              <p className="text-[12px] text-[#8E8E93] font-medium leading-relaxed mt-0.5">
                Inviting 10+ active members unlocks VIP status with up to 50% revenue share across all their activities.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <h4 className="text-[14.5px] font-bold text-white tracking-tight">
                Lifetime Deposit & Action Earnings
              </h4>
              <p className="text-[12px] text-[#8E8E93] font-medium leading-relaxed mt-0.5">
                Invited friends remain permanently linked to your account with recurring commissions on every deposit.
              </p>
            </div>
          </div>

        </div>

        {/* REFERRAL LINK BOX */}
        <div className="pt-1 space-y-2.5">
          <div className="text-left px-1">
            <span className="text-[12px] font-semibold text-[#8E8E93]">
              Your link for friends
            </span>
          </div>

          <div 
            onClick={handleCopyLink}
            className="w-full bg-[#1C1C1E] hover:bg-[#242426] rounded-2xl px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-mono text-[#8E8E93] cursor-pointer active:scale-[0.99] transition-all"
          >
            <span className="truncate pr-2 select-all font-mono tracking-tight text-white">
              {inviteLink}
            </span>
            <div className="p-1 rounded-lg text-[#8E8E93] hover:text-white transition-colors shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </div>
          </div>

          {/* Dual Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleCopyLink}
              type="button"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer border-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#8E8E93]" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareLink}
              type="button"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] hover:brightness-105 active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer border-0"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* CLEAN STATS STRIP */}
        <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-around text-center mt-3">
          <div>
            <span className="text-[11px] font-medium text-[#8E8E93] block">
              Total Invites
            </span>
            <span className="text-[18px] font-bold text-white font-mono mt-0.5 block">
              {totalReferralsCount}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div>
            <span className="text-[11px] font-medium text-[#8E8E93] block">
              Total Earned
            </span>
            <span className="text-[18px] font-bold text-emerald-400 font-mono mt-0.5 block">
              ${totalEarnings.toFixed(2)}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div>
            <span className="text-[11px] font-medium text-[#8E8E93] block">
              Max Tier
            </span>
            <span className="text-[18px] font-bold text-[#2EA5FF] font-mono mt-0.5 block">
              Up to 50%
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
