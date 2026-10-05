import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, ShieldCheck, HandCoins } from 'lucide-react';
import { TelegramStarIcon } from './TelegramStarIcon';

interface AssetsBannerSliderProps {
  isPinActive: boolean;
  onOpenSetupPin: () => void;
  onOpenSecuritySettings: () => void;
}

interface BannerSlide {
  id: string;
  badge?: string;
  badgeActive?: boolean;
  title: string;
  actionText: string;
  onClick: () => void;
  radialGlow: string;
  renderGraphic: () => React.ReactNode;
}

export function AssetsBannerSlider({
  isPinActive,
  onOpenSetupPin,
  onOpenSecuritySettings,
}: AssetsBannerSliderProps) {
  const navigate = useNavigate();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slide list definitions
  const slides: BannerSlide[] = [
    // 1. Passcode / Wallet Security Banner (Set Passcode)
    {
      id: 'passcode',
      badge: isPinActive ? 'PROTECTED' : 'SECURITY',
      badgeActive: isPinActive,
      title: isPinActive
        ? 'Wallet Protected with 4-Digit Passcode'
        : 'Set 4-Digit Passcode to Secure Wallet',
      actionText: isPinActive ? 'Security settings' : 'Set passcode now',
      onClick: () => {
        if (isPinActive) {
          onOpenSecuritySettings();
        } else {
          onOpenSetupPin();
        }
      },
      radialGlow: isPinActive
        ? 'radial-gradient(circle, rgba(16, 185, 129, 0.85) 0%, rgba(6, 182, 212, 0.4) 45%, transparent 72%)'
        : 'radial-gradient(circle, rgba(37, 99, 235, 0.9) 0%, rgba(14, 165, 233, 0.45) 45%, transparent 72%)',
      renderGraphic: () => (
        <div className="relative w-28 h-20 flex items-center justify-end">
          {/* Translucent Vault Outline */}
          <svg className="w-16 h-20 text-white/30 drop-shadow-md" viewBox="0 0 64 80" fill="none">
            <defs>
              <linearGradient id="vaultBodyGrad" x1="0" y1="0" x2="64" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#94A3B8" stopOpacity="0.22" />
                <stop stopColor="#1E293B" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="vaultStrokeGrad" x1="0" y1="0" x2="64" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFFFF" stopOpacity="0.45" />
                <stop stopColor="#64748B" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path d="M24 6C24 4.89543 24.8954 4 26 4H38C39.1046 4 40 4.89543 40 6V10H24V6Z" fill="url(#vaultBodyGrad)" stroke="url(#vaultStrokeGrad)" strokeWidth="1.5" />
            <rect x="8" y="10" width="48" height="64" rx="14" fill="url(#vaultBodyGrad)" stroke="url(#vaultStrokeGrad)" strokeWidth="1.8" />
            <circle cx="32" cy="42" r="14" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.35" />
            <circle cx="32" cy="42" r="5" fill="#94A3B8" fillOpacity="0.25" />
          </svg>

          {/* Overlapping Foreground Shield / Lock Badge */}
          <div className={`absolute -bottom-0.5 right-1 w-12 h-12 rounded-full border-[2.5px] border-[#1C1C1E] shadow-xl flex items-center justify-center text-white transition-all ${
            isPinActive
              ? 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]'
              : 'bg-gradient-to-br from-[#1E6BFF] via-[#1B5CC4] to-[#103E8A]'
          }`}>
            {isPinActive ? (
              <ShieldCheck className="w-5 h-5 text-white drop-shadow-md" />
            ) : (
              <Lock className="w-5 h-5 text-white drop-shadow-md" />
            )}
          </div>
        </div>
      )
    },
    // 2. Instant Liquidity Facility & Loans
    {
      id: 'loans',
      badge: 'CREDIT FACILITY',
      badgeActive: true,
      title: 'Instant Credit Facility & Low 1.8% Fee',
      actionText: 'Explore facility',
      onClick: () => navigate('/loans'),
      radialGlow: 'radial-gradient(circle, rgba(16, 185, 129, 0.9) 0%, rgba(6, 182, 212, 0.45) 45%, transparent 72%)',
      renderGraphic: () => (
        <div className="relative w-28 h-20 flex items-center justify-end">
          <div className="relative w-16 h-16 rounded-full border border-cyan-500/30 flex items-center justify-center bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10">
            <div className="w-10 h-10 rounded-full border border-cyan-400/40 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </div>
          <div className="absolute -bottom-0.5 right-0.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-600 to-blue-700 border-[2px] border-[#1C1C1E] shadow-xl flex items-center space-x-1 text-white">
            <span className="text-[10px] font-black font-mono tracking-tight">1.8%</span>
          </div>
        </div>
      )
    },
    // 3. Telegram Stars Instant Deposit Slide
    {
      id: 'stars',
      badge: 'INSTANT DEPOSIT',
      badgeActive: true,
      title: 'Instant Top-Up with Telegram Stars',
      actionText: 'Deposit Stars now',
      onClick: () => navigate('/deposit'),
      radialGlow: 'radial-gradient(circle, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.45) 45%, transparent 72%)',
      renderGraphic: () => (
        <div className="relative w-28 h-20 flex items-center justify-end">
          <div className="relative w-16 h-16 rounded-full border border-amber-500/30 flex items-center justify-center bg-gradient-to-br from-amber-500/15 via-transparent to-yellow-500/10 shadow-inner">
            <TelegramStarIcon size={38} className="drop-shadow-lg" />
          </div>
          <div className="absolute -bottom-0.5 right-0.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 border-[2px] border-[#1C1C1E] shadow-xl flex items-center space-x-1 text-white">
            <span className="text-[10px] font-black font-mono tracking-tight">STARS</span>
          </div>
        </div>
      )
    }
  ];

  const scrollToSlide = useCallback((index: number) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const width = container.clientWidth;
    container.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const width = container.clientWidth;
    if (width <= 0) return;
    const newIdx = Math.round(container.scrollLeft / width);
    if (newIdx >= 0 && newIdx < slides.length && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
    }
  }, [slides.length, activeIndex]);

  // Auto-slide timer
  useEffect(() => {
    if (isInteracting) return;
    autoPlayTimerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % slides.length;
        scrollToSlide(next);
        return next;
      });
    }, 6000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isInteracting, slides.length, scrollToSlide]);

  return (
    <div className="w-full max-w-[348px] sm:max-w-[360px] mx-auto mt-6 select-none" id="assets-banner-slider-container">
      {/* Horizontal Swipeable Container (Sheet / Page Slide Style) */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsInteracting(false), 2500);
        }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-[22px] w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="w-full shrink-0 snap-center"
          >
            <div
              onClick={slide.onClick}
              className="relative overflow-hidden bg-[#1C1C1E] border-0 rounded-[22px] p-4 flex items-center justify-between shadow-sm cursor-pointer group active:scale-[0.99] transition-all min-h-[96px]"
            >
              {/* Left Side: Badge, Title & Action Link */}
              <div className="flex-1 pr-2 z-10 text-left max-w-[200px] sm:max-w-[220px]">
                {slide.badge && (
                  <div className="mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider uppercase border ${
                      slide.badgeActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-[#2EA5FF]/10 text-[#2EA5FF] border-[#2EA5FF]/25'
                    }`}>
                      {slide.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-[13px] sm:text-[13.5px] font-bold text-white tracking-tight leading-snug line-clamp-2">
                  {slide.title}
                </h3>

                <div className="mt-1.5 flex items-center space-x-1 text-[#2EA5FF] text-[11px] font-semibold group-hover:underline">
                  <span>{slide.actionText}</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Right Side: Graphic with Subtle Glow */}
              <div className="relative shrink-0 flex items-center justify-end z-10 pointer-events-none">
                {/* Radial Glow Backdrop */}
                <div
                  className="absolute -inset-4 opacity-40 blur-xl pointer-events-none rounded-full"
                  style={{ background: slide.radialGlow }}
                />
                {slide.renderGraphic()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Compact Dot Indicators */}
      <div className="flex items-center justify-center space-x-1.5 mt-2.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSlide(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer border-0 p-0 ${
              activeIndex === idx
                ? 'w-5 h-1.5 bg-[#2EA5FF]'
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
