import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronRight, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  Palette 
} from 'lucide-react';
import {
  FaLanguageIcon,
  FaWalletIcon,
  FaReferralIcon,
  FaDollarIcon,
  FaSupportIcon,
  LanguageFlagIcon
} from '../components/CustomIcons';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminControlPortal } from '../components/AdminControlPortal';
import { UserAvatar } from '../components/UserAvatar';
import { ReferralModal } from '../components/ReferralModal';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeModal } from '../components/ThemeModal';
import { useTheme } from '../context/ThemeContext';
import { getTelegramBotsList } from '../services/telegramBotService';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n';
import { triggerHaptic } from '../utils/haptics';

export function Profile() {
  const { user, systemSettings } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // State
  const [, setCopiedUserId] = useState(false);
  const [primaryBotUsername, setPrimaryBotUsername] = useState<string>(() => {
    return systemSettings?.primaryBotUsername || 
      localStorage.getItem('primary_bot_username') || 
      (systemSettings?.supportTelegramUsername || 'ai_zke').replace('@', '');
  });
  const { theme } = useTheme();
  const [activeModal, setActiveModal] = useState<'language' | 'referral' | 'theme' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentLangCode = (i18n.language || 'en').split('-')[0] as LanguageCode;
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  const displayUser = user || {
    id: 'guest_user',
    telegramId: 5951882585,
    telegramUsername: 'xpubj',
    balance: 0.00,
    bonusBalance: 0.00,
    role: 'user' as const,
    createdAt: Date.now(),
    referralsCount: 0,
    referralEarnings: 0,
    totalProfitEarned: 0
  };

  useEffect(() => {
    if (systemSettings?.primaryBotUsername) {
      setPrimaryBotUsername(systemSettings.primaryBotUsername.replace('@', ''));
    } else if (displayUser.sourceBotUsername) {
      setPrimaryBotUsername(displayUser.sourceBotUsername.replace('@', ''));
    } else {
      getTelegramBotsList().then(bots => {
        if (bots.length > 0) {
          const active = bots.find(b => b.isPrimary && b.isActive) || bots[0];
          if (active && active.botUsername) {
            setPrimaryBotUsername(active.botUsername.replace('@', ''));
          }
        }
      }).catch(() => {});
    }
  }, [systemSettings?.primaryBotUsername, displayUser.sourceBotUsername]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const copyUserId = () => {
    triggerHaptic('selection');
    const idToCopy = String(displayUser.telegramId || displayUser.id);
    navigator.clipboard.writeText(idToCopy);
    setCopiedUserId(true);
    showToast(t('profile.copied', 'User ID copied!'));
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const openSupport = () => {
    triggerHaptic('medium');
    const supportUsername = (systemSettings?.supportTelegramUsername || primaryBotUsername || 'ai_zke').replace('@', '');
    const supportUrl = `https://t.me/${supportUsername}`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(supportUrl);
    } else {
      window.open(supportUrl, '_blank');
    }
  };

  const userBalance = Number(displayUser.balance || 0);

  const displayName = displayUser.firstName 
    ? `${displayUser.firstName}${displayUser.lastName ? ' ' + displayUser.lastName : ''}`
    : (displayUser.telegramUsername ? displayUser.telegramUsername : 'Trader');

  const displayHandle = displayUser.telegramUsername 
    ? `@${displayUser.telegramUsername}` 
    : `@trader_${String(displayUser.telegramId || displayUser.id).slice(-4)}`;

  const isAdmin = user?.role === 'admin' || 
    String(displayUser.telegramId) === '5951882585' || 
    displayUser.telegramUsername?.toLowerCase() === 'ai_zke';

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-36 pt-4 select-none font-sans" dir="ltr" id="profile-page-container">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 inset-x-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-[#1C1C1E] px-4 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center space-x-2 shadow-2xl border-0">
              <CheckCircle2 className="w-4 h-4 text-[#007AFF]" />
              <span className="tracking-tight">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-4 space-y-3">

        {/* 1. HERO AVATAR & IDENTITY */}
        <section className="flex flex-col items-center justify-center pt-2 pb-3" id="profile-header-identity">
          <div className="relative mb-2 flex items-center justify-center">
            <UserAvatar 
              user={displayUser} 
              size="2xl" 
              className="w-22 h-22 sm:w-24 sm:h-24 text-2xl shadow-none ring-0 border-0"
            />
          </div>

          <h1 className="text-[20px] font-bold text-white tracking-tight leading-snug text-center max-w-[280px] truncate">
            {displayName}
          </h1>

          <button 
            type="button"
            onClick={copyUserId}
            className="text-[13px] text-[#8E8E93] hover:text-[#007AFF] font-medium tracking-tight transition-colors mt-0.5 active:scale-95 cursor-pointer border-0 bg-transparent"
          >
            {displayHandle}
          </button>
        </section>

        {/* 2. TOP CARD: WALLET BALANCE (Refined Typography & Exact #1C1C1E Dark Card) */}
        <section id="profile-balance-card">
          <div className="bg-[#1C1C1E] rounded-[20px] p-4 flex items-center justify-between border-0 shadow-sm">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#007AFF] flex items-center justify-center shrink-0 shadow-sm">
                <FaDollarIcon className="w-5.5 h-5.5 text-white" />
              </div>

              <div className="min-w-0">
                <span className="text-[11px] text-[#8E8E93] font-medium uppercase tracking-wider block leading-none">
                  {t('profile.yourBalance', 'Total Wallet Balance')}
                </span>
                <span className="text-[28px] sm:text-[30px] font-black text-white tracking-tight leading-tight block mt-1 font-mono tabular-nums">
                  ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Deposit Button (Exact #007AFF Vibrant Telegram Blue) */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                navigate('/deposit');
              }}
              className="px-4.5 py-2 bg-[#007AFF] hover:bg-[#0A84FF] active:scale-95 text-white text-[13.5px] font-bold rounded-full transition-all cursor-pointer shrink-0 font-sans border-0 shadow-lg shadow-[#007AFF]/25"
            >
              {t('profile.deposit', 'Deposit')}
            </button>
          </div>
        </section>

        {/* 3. SUPPORT CARD: THE SUPPORT DESK (No Arbitrage Text, Exact #1C1C1E Dark Card) */}
        <section id="profile-support-card">
          <div className="bg-[#1C1C1E] rounded-[20px] p-4 flex items-start justify-between border-0 shadow-sm">
            <div className="pr-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#409CFF]">
                <FaSupportIcon className="w-3.5 h-3.5 text-[#409CFF]" />
                <span>{t('profile.forTraders', '24/7 Official Support')}</span>
              </div>

              <h3 className="text-[15px] font-bold text-white tracking-tight mt-1 leading-snug">
                {t('profile.supportDeskTitle', 'The Official Support Desk')}
              </h3>

              <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug max-w-[230px]">
                {t('profile.supportDeskDesc', 'Priority 24/7 support for your questions, wallet transactions, and assistance.')}
              </p>
            </div>

            {/* Open Button (Exact #2C2C2E Secondary Button Color from Screenshot) */}
            <button 
              type="button"
              onClick={openSupport}
              className="px-4 py-2 bg-[#2C2C2E] hover:bg-[#38383A] active:scale-95 text-[#409CFF] text-[13px] font-semibold rounded-full transition-all cursor-pointer shrink-0 mt-1 font-sans border-0"
            >
              {t('profile.open', 'Open')}
            </button>
          </div>
        </section>

        {/* 4. GROUPED LIST CARD (Exact #1C1C1E Dark Card Surface, Cleaned Items) */}
        <section id="profile-grouped-menu">
          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden border-0 shadow-sm">
            
            {/* Row 1: Referral Program */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveModal('referral');
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer text-left group border-0 bg-transparent"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-7.5 h-7.5 rounded-[9px] bg-[#AF52DE] flex items-center justify-center text-white shrink-0">
                  <FaReferralIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-white tracking-tight">
                  {t('profile.referralProgram', 'Referral Program')}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[12px] font-semibold text-[#409CFF] bg-[#18283B] px-2.5 py-0.5 rounded-full">
                  {displayUser.referralsCount || 0} {t('profile.partners', 'Partners')}
                </span>
                <ChevronRight className="w-4 h-4 text-[#636366] group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Divider */}
            <div className="ml-14 h-[1px] bg-white/[0.04]" />

            {/* Row 2: Deposit Wallet */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                navigate('/assets');
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer text-left group border-0 bg-transparent"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-7.5 h-7.5 rounded-[9px] bg-[#0284C7] flex items-center justify-center text-white shrink-0">
                  <FaWalletIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-white tracking-tight">
                  {t('profile.wallet', 'Deposit Wallet')}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[12px] font-medium text-[#8E8E93]">
                  {t('profile.multiChain', 'Multi-Chain')}
                </span>
                <ChevronRight className="w-4 h-4 text-[#636366] group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Divider */}
            <div className="ml-14 h-[1px] bg-white/[0.04]" />

            {/* Row 3: Language Preference */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveModal('language');
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer text-left group border-0 bg-transparent"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-7.5 h-7.5 rounded-[9px] bg-[#32ADE6] flex items-center justify-center text-white shrink-0">
                  <FaLanguageIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-white tracking-tight">
                  {t('profile.language', 'Language')}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[12px] font-medium text-[#409CFF] flex items-center gap-1.5">
                  <LanguageFlagIcon code={currentLangObj.code} className="w-4 h-4 shrink-0" />
                  <span>{currentLangObj.nativeName}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#636366] group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Divider */}
            <div className="ml-14 h-[1px] bg-white/[0.04]" />

            {/* Row 4: Theme & Appearance Preference */}
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveModal('theme');
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer text-left group border-0 bg-transparent"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-7.5 h-7.5 rounded-[9px] bg-gradient-to-tr from-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-white tracking-tight">
                  Theme
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[12px] font-medium text-[#409CFF]">
                  {theme === 'onyx' ? 'Dark' : 'Navy'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#636366] group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Admin Row if authorized */}
            {isAdmin && (
              <>
                <div className="ml-14 h-[1px] bg-white/[0.04]" />
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    navigate('/admin');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#242426] active:bg-[#2C2C2E] transition-colors cursor-pointer text-left group border-0 bg-transparent"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-7.5 h-7.5 rounded-[9px] bg-[#F59E0B] flex items-center justify-center text-white shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-semibold text-white tracking-tight">
                      {t('profile.adminDesk', 'Security Desk (Admin)')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold font-mono">
                      {t('profile.adminBadge', 'Admin')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#636366] group-hover:text-white transition-colors" />
                  </div>
                </button>
              </>
            )}

          </div>
        </section>

      </div>

      {/* Admin Panel Portal mount */}
      <AdminControlPortal />

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Language Modal */}
      <LanguageSelector 
        isOpen={activeModal === 'language'} 
        onClose={() => setActiveModal(null)} 
      />

      {/* Referral Modal */}
      <ReferralModal
        isOpen={activeModal === 'referral'}
        onClose={() => setActiveModal(null)}
        currentUser={displayUser}
        botUsername={primaryBotUsername}
      />

      {/* Theme Appearance Modal */}
      <ThemeModal
        isOpen={activeModal === 'theme'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
