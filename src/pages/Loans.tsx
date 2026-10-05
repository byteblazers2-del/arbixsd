import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@telegram-apps/telegram-ui';
import { 
  Phone, 
  Check, 
  User as UserIcon,
  Lock, 
  Unlock,
  KeyRound,
  ShieldCheck, 
  AlertCircle, 
  CreditCard, 
  Coins, 
  ChevronRight, 
  Shield, 
  Star,
  Crown,
  Sparkles,
  Zap, 
  Percent,
  CalendarCheck,
  Landmark,
  BadgeCheck,
  BookOpen,
  ArrowRight,
  Globe,
  Eye,
  RefreshCw,
  X,
  Radio
} from 'lucide-react';
import { FaWalletIcon, FaDollarIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LoanRecord } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from 'react-i18next';

const COLORS = {
  green: "#34d399",
  blue: "#4aa3ff",
  gold: "#f2b632",
  purple: "#b583ff",
};

const CARD = "#1C1C1E";

/** Telegram-style quote icon (top-right). */
const QuoteMark: React.FC<{ color: string }> = ({ color }) => (
  <svg
    viewBox="0 0 14 12"
    width={13}
    height={11}
    fill={color}
    className="absolute right-2.5 top-[9px] opacity-75"
    aria-hidden="true"
  >
    <path d="M0 6.2C0 2.6 1.8.6 4.6 0l.7 1.5C3.8 2 3.2 3 3.2 4.2H6V12H0zm8 0C8 2.6 9.8.6 12.6 0l.7 1.5c-1.5.5-2.1 1.5-2.1 2.7H14V12H8z" />
  </svg>
);

/** Telegram-style blockquote: left accent bar, tinted card, quote mark with refined typography. */
const Quote: React.FC<{
  color: string;
  className?: string;
  children: React.ReactNode;
}> = ({ color, className = "", children }) => (
  <div
    className={`relative rounded-[10px] border-l-[3.5px] py-2.5 pl-3 pr-8 text-[13px] sm:text-[13.5px] font-light leading-relaxed text-[#D6D6DC] ${className}`}
    style={{
      borderLeftColor: color,
      background: `linear-gradient(${color}18, ${color}18), ${CARD}`,
    }}
  >
    <QuoteMark color={color} />
    {children}
  </div>
);

const Item: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="[&+&]:mt-3">
    <h3 className="mb-0.5 flex items-center gap-1.5 text-[14px] sm:text-[14.5px] font-medium text-white tracking-tight">
      {icon}
      <span>{title}</span>
    </h3>
    <div className="text-[12.5px] sm:text-[13px] leading-relaxed text-[#CBCBD2]">
      {children}
    </div>
  </div>
);

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <b className="font-semibold text-white">{children}</b>
);

const iconProps = { size: 16, strokeWidth: 1.8 } as const;

interface DollarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vRot: number;
  color: string;
  isDollar: boolean;
}

export function Loans() {
  const { user, patchUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Phone verification state & robust local persistence
  const [localVerified, setLocalVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arbix_phone_verified') === 'true';
    } catch {
      return false;
    }
  });

  const isPhoneVerified = Boolean(user?.phoneVerified) || localVerified;
  const [currentStep, setCurrentStep] = useState<'overview' | 'verification'>('overview');

  // Terms agreement checkbox
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // Active loans from Firestore
  const [activeLoans, setActiveLoans] = useState<LoanRecord[]>([]);

  // Loan calculator state (120% Collateral Ratio)
  const [loanAmount, setLoanAmount] = useState<number>(100);
  const loanFeePercent = 1.8; // 1.8% fixed origination fee
  const calculatedFee = Number(((loanAmount * loanFeePercent) / 100).toFixed(2));
  const collateralRequired = Math.round(loanAmount * 1.20); // 120% collateral (e.g. $100 loan -> $120 collateral)

  // 4K Loan Proof Certificate Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewImageKey, setPreviewImageKey] = useState<number>(Date.now());

  // Verification UI state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastExiting, setIsToastExiting] = useState<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [badgeScale, setBadgeScale] = useState<boolean>(false);

  const triggerToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setIsToastExiting(false);
    setToastMessage(msg);

    toastTimeoutRef.current = setTimeout(() => {
      setIsToastExiting(true);
      setTimeout(() => {
        setToastMessage(null);
        setIsToastExiting(false);
      }, 300);
    }, 2600);
  }, []);

  // Canvas sparkle Dollar particles animation ref (Optimized ultra-lightweight)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<DollarParticle[]>([]);
  const heroContainerRef = useRef<HTMLDivElement | null>(null);

  const PARTICLE_COLORS = ['#38BDF8', '#34D399', '#FBBF24', '#60A5FA', '#FFFFFF'];

  // Draw lightweight clean Dollar symbol / spark (No heavy shadowBlur)
  const drawDollarParticle = (
    ctx: CanvasRenderingContext2D,
    p: DollarParticle
  ) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    ctx.fillStyle = p.color;

    if (p.isDollar) {
      ctx.font = `bold ${Math.round(p.size)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    } else {
      const s = p.size * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  // Trigger burst of snappy, lightweight Dollars ($) on click
  const triggerDollarBurst = useCallback((count = 18) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
    const cy = canvas.height / (2 * (window.devicePixelRatio || 1));

    setBadgeScale(true);
    setTimeout(() => setBadgeScale(false), 140);
    triggerHaptic('light');

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.6;
      const dist = 24 + Math.random() * 18;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

      particlesRef.current.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        size: 10 + Math.random() * 8,
        alpha: 0,
        maxAlpha: 0.9,
        life: 0,
        maxLife: 32 + Math.random() * 20,
        rot: (Math.random() - 0.5) * 0.4,
        vRot: (Math.random() - 0.5) * 0.06,
        color,
        isDollar: Math.random() > 0.35
      });
    }
  }, []);

  // Ambient & click particles loop (Smooth, gentle auto-flow from behind the square)
  useEffect(() => {
    if (currentStep !== 'verification') return;

    const canvas = canvasRef.current;
    const container = heroContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frameCount = 0;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);
      frameCount++;

      // Automatically spawn gentle particles emerging from behind the blue square
      if (frameCount % 20 === 0 && particlesRef.current.length < 18) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.35 + Math.random() * 0.65;
        const dist = 24 + Math.random() * 14;
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

        particlesRef.current.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.25,
          size: 8 + Math.random() * 7,
          alpha: 0,
          maxAlpha: 0.75,
          life: 0,
          maxLife: 55 + Math.random() * 35,
          rot: (Math.random() - 0.5) * 0.3,
          vRot: (Math.random() - 0.5) * 0.03,
          color,
          isDollar: Math.random() > 0.4
        });
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        p.life++;

        const halfLife = p.maxLife / 2;
        if (p.life < halfLife) {
          p.alpha = (p.life / halfLife) * p.maxAlpha;
        } else {
          p.alpha = Math.max(0, (1 - (p.life - halfLife) / halfLife) * p.maxAlpha);
        }

        drawDollarParticle(ctx, p);

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStep]);

  // Subscribe to user active loans from Firestore
  useEffect(() => {
    if (!user?.id) return;
    try {
      const q = query(
        collection(db, 'loans'),
        where('userId', '==', user.id)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const list: LoanRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as LoanRecord);
        });
        setActiveLoans(list);
      }, (err) => {
        console.warn("Loans listener fallback:", err);
      });
      return () => unsub();
    } catch {}
  }, [user?.id]);

  // Phone verification save with reliable instant fallback
  const savePhoneVerification = async (phone: string) => {
    setLocalVerified(true);
    try {
      localStorage.setItem('arbix_phone_verified', 'true');
    } catch {}

    try {
      await patchUser({
        phoneVerified: true,
        phoneNumber: phone,
        phoneVerifiedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("User patch fallback:", err);
    }

    setIsVerifying(false);
    triggerToast('Phone number verified');
    triggerHaptic('medium');
  };

  const handleResetVerificationForDev = () => {
    setLocalVerified(false);
    try {
      localStorage.removeItem('arbix_phone_verified');
    } catch {}
    try {
      patchUser({
        phoneVerified: false,
        phoneNumber: '',
        phoneVerifiedAt: ''
      });
    } catch {}
    triggerToast('Verification reset for testing');
    triggerHaptic('selection');
  };

  const handleVerifyClick = async () => {
    triggerHaptic('medium');
    const tg = (window as any).Telegram?.WebApp;
    
    // Check if running inside real Telegram app with requestContact capability
    if (tg && typeof tg.requestContact === 'function' && tg.initData) {
      setIsVerifying(true);
      try {
        tg.requestContact((ok: boolean, response: any) => {
          if (ok && response?.responseUnsafe?.contact?.phone_number) {
            savePhoneVerification(response.responseUnsafe.contact.phone_number);
          } else {
            setIsVerifying(false);
            triggerToast('Verification cancelled');
          }
        });
      } catch {
        setIsVerifying(false);
        triggerToast('Could not open Telegram prompt');
      }
    } else {
      // Immediate instant mock verification for development & web testing
      setIsVerifying(true);
      setTimeout(async () => {
        const testPhone = '+1 (917) 555-0198';
        await savePhoneVerification(testPhone);
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-36 pt-2 select-none font-sans relative" dir="ltr">
      
      {/* iOS Floating Pill Toast Notification (No neon, simple & smooth) */}
      {toastMessage && (
        <div className={`fixed top-4 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none transition-all duration-300 ease-out ${
          isToastExiting ? '-translate-y-3 opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100'
        }`}>
          <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_6px_24px_rgba(0,0,0,0.5)] py-2 px-3.5 rounded-full flex items-center gap-2 pointer-events-auto select-none">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-[12px] font-medium text-white/95 leading-none">
              {toastMessage}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 space-y-4">

        {/* =========================================================================
            TOP SEGMENTED SWITCHER (Minimalist Borderless Pill)
            ========================================================================= */}
        <div className="flex items-center justify-center p-1 bg-[#1C1C1E] rounded-2xl border-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setCurrentStep('overview');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-0 ${
              currentStep === 'overview'
                ? 'bg-[#2C2C2E] text-[#2EA5FF]'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('loans.termsTab', 'Terms & Levels')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setCurrentStep('verification');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-0 ${
              currentStep === 'verification'
                ? 'bg-[#2C2C2E] text-[#2EA5FF]'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{t('loans.facilityTab', 'Credit Facility')}</span>
          </button>
        </div>

        {/* =========================================================================
            VIEW 1: TELEGRAM-STYLE QUOTE LOAN TERMS (EXACT USER SPECIFICATION)
            ========================================================================= */}
        {currentStep === 'overview' && (
          <div className="w-full pb-2 font-light animate-in fade-in duration-200" dir="ltr">
            <header className="mx-1 mb-3">
              <h1 className="text-[18px] sm:text-[19px] font-medium tracking-[0.2px] text-white">
                Arbix Liquidity Facility
              </h1>
              <p className="mt-0.5 text-xs text-[#8e8e93]">Terms &amp; Conditions</p>
            </header>

            {/* Big quote: terms 1–4 */}
            <Quote color={COLORS.blue} className="!py-[12px]">
              <Item
                icon={<Zap {...iconProps} color={COLORS.green} />}
                title="1. Instant Liquidity Allocation"
              >
                <p>
                  Borrow between <B>$100.00</B> and <B>$50,000.00 USDT</B> instantly
                  without traditional credit checks or KYC delays. Funds are credited
                  directly to your trading account in USDT (TRC20/BEP20) or TON,
                  allowing you to deploy capital immediately into real-time
                  cross-exchange arbitrage spreads.
                </p>
              </Item>

              <Item
                icon={<Percent {...iconProps} color={COLORS.blue} />}
                title="2. Fixed 1.80% Origination Fee"
              >
                <p>
                  Flat one-time facility fee of <B>1.80%</B>. No compounding daily
                  interest or hidden spread fees.
                </p>
                <p className="mt-1 text-[#8e8e93] text-[12px]">
                  Example: A $500.00 USDT facility requires exactly $9.00 USD
                  origination fee. You receive $500.00 in trading capital.
                </p>
              </Item>

              <Item
                icon={<Lock {...iconProps} color={COLORS.gold} />}
                title="3. 130% Collateral & Instant Release"
              >
                <p>
                  Secured by a <B>130%</B> collateral ratio in supported crypto (USDT,
                  TON, BTC, ETH). Your collateral is locked in isolated smart custody.
                  100% of your collateral is released and returned to your balance
                  automatically upon loan repayment.
                </p>
              </Item>

              <Item
                icon={<CalendarCheck {...iconProps} color={COLORS.purple} />}
                title="4. 30-Day Flexible Repayment"
              >
                <p>
                  Repay anytime within the <B>30-day</B> duration using accumulated
                  arbitrage profits or main balance. Zero prepayment penalties. Early
                  settlement unlocks instant facility re-borrowing and increases your
                  credit limits.
                </p>
              </Item>
            </Quote>

            {/* Small quote: term 5 */}
            <Quote color={COLORS.gold} className="mt-3">
              <Item
                icon={<ShieldCheck {...iconProps} color={COLORS.gold} />}
                title="5. Institutional Vault Security"
              >
                <p>
                  Non-rehypothecated asset custody. Dedicated risk desk support
                  available 24/7 via Telegram (<B>@ai_zke</B>).
                </p>
              </Item>
            </Quote>

            {/* Custom Interactive Agreement Checkbox & Action Button */}
            <div className="pt-3 space-y-2.5">
              <div 
                onClick={() => {
                  triggerHaptic('selection');
                  setTermsAccepted(!termsAccepted);
                }}
                className="p-3 rounded-xl bg-[#18191D] hover:bg-[#1E2026] active:scale-[0.99] flex items-center space-x-3 cursor-pointer select-none transition-all border border-white/[0.06]"
              >
                {/* Custom Telegram Squircle Checkbox (No browser default) */}
                <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all duration-200 shrink-0 ${
                  termsAccepted 
                    ? 'bg-gradient-to-tr from-[#007AFF] to-[#2EA5FF] text-white shadow-[0_0_10px_rgba(0,122,255,0.45)] scale-100' 
                    : 'bg-[#24262E] border border-white/20 text-transparent scale-95'
                }`}>
                  <Check className={`w-3.5 h-3.5 stroke-[2.8] transition-transform duration-150 ${termsAccepted ? 'scale-100' : 'scale-0'}`} />
                </div>
                <span className="text-[12px] sm:text-[12.5px] text-[#C4C4C8] font-light leading-snug">
                  I have reviewed and agree to the <b className="text-white font-medium">1.80% facility fee</b> and <b className="text-white font-medium">130% collateral terms</b>.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setCurrentStep('verification');
                }}
                className="w-full py-3.5 rounded-[16px] bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] text-white font-bold text-sm flex items-center justify-center space-x-2 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer border-0 shadow-none"
              >
                <span>Continue to Credit Facility</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* =========================================================================
            VIEW 2: CREDIT FACILITY DESK / VERIFICATION
            ========================================================================= */}
        {currentStep === 'verification' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* STAGE A: PHONE UNVERIFIED -> SHOW 3-STEP VERIFICATION TIMELINE & HERO BADGE */}
            {!isPhoneVerified ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. HERO INTERACTIVE DOLLAR BADGE ($) & SPARKLING CANVAS */}
                <div 
                  ref={heroContainerRef}
                  className="relative w-full pt-3 pb-1 flex flex-col items-center justify-center overflow-visible"
                >
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  />

                  {/* Glowing Dollar Sign Badge ($) with Click Particle Burst */}
                  <div 
                    onClick={() => triggerDollarBurst(18)}
                    className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-[24px] bg-gradient-to-b from-[#2EA5FF] to-[#007AFF] flex items-center justify-center cursor-pointer transition-transform duration-150 shadow-[0_8px_30px_rgba(0,122,255,0.35)] ${
                      badgeScale ? 'scale-90' : 'active:scale-95'
                    }`}
                    title="Tap to generate dollars"
                  >
                    <FaDollarIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md select-none" />
                  </div>

                  <div className="relative z-10 text-center mt-2.5">
                    <h2 className="text-[17px] font-bold text-white tracking-tight">
                      {t('loans.creditLineVerification', 'Credit Line Verification')}
                    </h2>
                    <p className="text-xs text-[#8E8E93] font-light mt-0.5">
                      Tap $ to generate floating dollar particles • Instant 1-click processing
                    </p>
                  </div>
                </div>

                {/* 2. CONNECTED 3-STEP TIMELINE (BORDERLESS) */}
                <div className="bg-[#1C1C1E] rounded-[24px] p-5 border-0">
                  <div className="relative">
                    
                    {/* Step 1: Telegram Mini App Session */}
                    <div className="relative flex items-start space-x-4 pb-7">
                      <div className="absolute left-5 top-10 bottom-0 w-[2px] bg-[#2C2C2E] -translate-x-1/2" />
                      
                      <div className="relative z-10 w-10 h-10 rounded-full bg-[#242426] flex items-center justify-center shrink-0 text-[#007AFF] overflow-hidden">
                        {user?.telegramUsername ? (
                          <span className="font-bold text-sm text-[#007AFF]">
                            {user.telegramUsername.substring(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <UserIcon className="w-5 h-5 text-[#007AFF]" />
                        )}
                      </div>

                      <div className="pt-2 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-bold text-white leading-tight">
                            {t('loans.telegramAccount', 'Telegram Account')}
                          </h3>
                          <span className="text-[11px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{t('loans.verified', 'Verified')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: In-App Custodial Wallet Vault */}
                    <div className="relative flex items-start space-x-4 pb-7">
                      <div className="absolute left-5 top-10 bottom-0 w-[2px] bg-[#2C2C2E] -translate-x-1/2" />

                      <div className="relative z-10 w-10 h-10 rounded-full bg-[#242426] flex items-center justify-center shrink-0 text-[#007AFF]">
                        <FaWalletIcon className="w-4.5 h-4.5 text-[#007AFF]" />
                      </div>

                      <div className="pt-2 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-bold text-white leading-tight">
                            {t('loans.inAppWallet', 'In-App Custodial Wallet')}
                          </h3>
                          <span className="text-[11px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{t('loans.active', 'Active')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Phone Number Verification (Dimmed if not verified) */}
                    <div className="relative flex items-start space-x-4 opacity-40">
                      <div className="relative z-10 w-10 h-10 rounded-full bg-[#242426] text-[#8E8E93] flex items-center justify-center shrink-0">
                        <Phone className="w-4.5 h-4.5" />
                      </div>

                      <div className="pt-2 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-bold leading-tight text-[#8E8E93]">
                            {t('loans.phoneVerification', 'Phone Verification')}
                          </h3>
                          <span className="text-[11px] font-medium text-[#8E8E93] bg-white/[0.04] px-2 py-0.5 rounded-full">
                            {t('loans.required', 'Required')}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Verification Action Button */}
                <button
                  type="button"
                  onClick={handleVerifyClick}
                  disabled={isVerifying}
                  className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] text-white font-bold text-sm flex items-center justify-center space-x-2 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 border-0 shadow-none"
                >
                  <Phone className="w-4 h-4" />
                  <span>
                    {isVerifying ? t('loans.verifying', 'Verifying...') : t('loans.verifyPhoneBtn', 'Verify Phone Number')}
                  </span>
                </button>
              </div>
            ) : (
              /* STAGE B: PHONE VERIFIED -> VERIFICATION BOX DISAPPEARS & MINIMALIST LOAN DESK TAKES CENTER STAGE */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-250">
                
                {/* Verified Header Status Banner */}
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#1C1C1E] border-0 text-emerald-400 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                    <span>{t('loans.accountVerifiedReady', 'Instant Credit Facility • Active & Ready')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetVerificationForDev}
                    className="text-[10px] text-[#8E8E93] hover:text-white underline cursor-pointer"
                    title="Reset verification for testing"
                  >
                    Reset Test
                  </button>
                </div>

                {/* Minimalist Loan Desk Card with Seamless Borderless Telegram-UI Input */}
                <div className="bg-[#1C1C1E] rounded-[24px] p-5 border-0 space-y-4 text-left">
                  <div className="flex justify-between items-center text-xs text-[#8E8E93]">
                    <span className="font-mono uppercase font-bold text-[11px] tracking-wider text-[#8E8E93]">
                      {t('loans.loanRequestAmount', 'Loan Request Amount')}
                    </span>
                    <span className="text-[#007AFF] font-bold font-mono tabular-nums">
                      {loanFeePercent}% Fixed Fee
                    </span>
                  </div>

                  {/* Official @telegram-apps/telegram-ui Input */}
                  <div className="rounded-2xl overflow-hidden bg-[#242426]">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={loanAmount > 0 ? String(loanAmount) : ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLoanAmount(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      after={
                        <div className="flex items-center space-x-1.5 pr-3 text-white font-mono font-bold text-sm">
                          <span className="text-[#007AFF] font-bold">USDT</span>
                        </div>
                      }
                      className="border-0 bg-transparent text-white font-mono font-bold text-xl"
                    />
                  </div>

                  {/* Quick Amount Selector Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setLoanAmount(amt);
                        }}
                        className={`py-2.5 rounded-xl text-xs font-mono tabular-nums font-bold transition-all cursor-pointer border-0 ${
                          loanAmount === amt
                            ? 'bg-[#007AFF] text-white shadow-[0_4px_16px_rgba(0,122,255,0.35)]'
                            : 'bg-[#242426] text-[#8E8E93] hover:text-white'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  {/* 120% Minimalist Compact Calculation Matrix */}
                  <div className="bg-[#242426] rounded-2xl p-3.5 space-y-2 text-xs font-mono tabular-nums">
                    <div className="flex justify-between items-center text-[#8E8E93]">
                      <span>Loan Liquidity:</span>
                      <span className="text-white font-extrabold">${loanAmount}.00 USDT</span>
                    </div>
                    <div className="flex justify-between items-center text-[#8E8E93]">
                      <span>Facility Fee ({loanFeePercent}%):</span>
                      <span className="text-[#007AFF] font-bold">${calculatedFee} USD</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                      <span className="text-[#8E8E93] font-medium">{t('loans.collateralRequired', 'Required Collateral (120%):')}</span>
                      <span className="text-emerald-400 font-extrabold text-sm">${collateralRequired}.00 USDT</span>
                    </div>
                  </div>

                  {/* Deposit Collateral & Borrow CTA */}
                  <button
                    type="button"
                    disabled={loanAmount <= 0}
                    onClick={() => navigate(`/deposit?amount=${collateralRequired}&title=Loan%20Collateral`)}
                    className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#2EA5FF] to-[#007AFF] text-white font-bold text-sm flex items-center justify-center space-x-2 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 border-0 shadow-none"
                  >
                    <FaWalletIcon className="w-4 h-4 text-white" />
                    <span>
                      {loanAmount > 0 
                        ? `Deposit $${collateralRequired} Collateral & Get $${loanAmount}` 
                        : 'Enter Loan Amount'}
                    </span>
                  </button>
                </div>

              </div>
            )}

            {/* 3. ACTIVE LOANS SECTION (BORDERLESS) */}
            {activeLoans.length > 0 && (
              <div className="bg-[#1C1C1E] rounded-[24px] p-4.5 border-0 space-y-3">
                <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider font-mono">
                  {t('loans.activeLoans', 'Active Loans')}
                </h3>
                <div className="divide-y divide-white/[0.04]">
                  {activeLoans.map((loan) => (
                    <div 
                      key={loan.id} 
                      className="py-2.5 flex justify-between items-center text-xs font-mono tabular-nums"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white">${loan.borrowAmount.toFixed(2)} USDT</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#007AFF]/15 text-[#007AFF]">
                            {loan.status === 'active' ? t('loans.active', 'Active') : t('loans.repaid', 'Repaid')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E8E93] mt-0.5">
                          Collateral: ${loan.collateralAmount.toFixed(2)} USD
                        </p>
                      </div>

                      <span className="text-[11px] text-[#8E8E93]">
                        {loan.txid || 'ARBIX-LN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 4K LIVE LOAN SETTLEMENT CERTIFICATE INSPECTOR (FOR DEV / TESTING) */}
            <div className="bg-[#1C1C1E] rounded-[24px] p-4.5 border border-cyan-500/20 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">🖼️ نمونه سند واریزی ۴K کانال (تست کیفیت)</h4>
                    <p className="text-[10.5px] text-[#8E8E93]">سند واریزی رندر شده توسط موتور Node.js جهت ارسال به کانال</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 shadow-md shadow-cyan-950/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>مشاهده نمونه ۴K</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* 4K FULLSCREEN LOAN CERTIFICATE PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#14151A] rounded-[28px] p-5 w-full max-w-2xl border border-cyan-500/30 shadow-2xl relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">سند واریزی وام کریپتو (4K Vector Receipt)</h3>
                  <p className="text-[11px] text-cyan-400 font-mono">ARBIX LENDING PROTOCOL • LIVE ON-CHAIN SETTLEMENT</p>
                </div>
              </div>

              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Res Image Container */}
            <div className="rounded-2xl overflow-hidden bg-black/90 border border-white/10 p-2 flex items-center justify-center shadow-inner">
              <img
                src={`/api/channel/preview-receipt?t=${previewImageKey}`}
                alt="4K Loan Disbursement Certificate"
                className="w-full h-auto max-h-[380px] object-contain rounded-xl"
              />
            </div>

            {/* Modal Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
              <span className="text-[11px] text-white/50 text-center sm:text-left">
                تولیدشده توسط کتابخانه Sharp در Node.js با رزولوشن بالا و آماده درج خودکار در کانال.
              </span>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewImageKey(Date.now())}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>سند تصادفی جدید</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all active:scale-95"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

