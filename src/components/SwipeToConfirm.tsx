import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Check, Lock, ChevronRight, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SwipeToConfirmProps {
  onConfirm: () => boolean | void;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
  lockedLabel?: string;
}

export function SwipeToConfirm({
  onConfirm,
  disabled = false,
  isLoading = false,
  label,
  lockedLabel
}: SwipeToConfirmProps) {
  const { t } = useTranslation();
  const defaultLabel = label || t('withdraw.swipeToConfirm', 'Swipe to confirm');
  const defaultLockedLabel = lockedLabel || t('withdraw.withdrawalLocked', 'Withdrawal Locked (24h)');

  const containerRef = useRef<HTMLDivElement>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const x = useMotionValue(0);

  const handleWidth = 48;

  // Vibrant blue fill and smooth text fade
  const bgOpacity = useTransform(x, [0, 200], [0.3, 1]);
  const textOpacity = useTransform(x, [0, 80], [1, 0]);

  const handleDragEnd = () => {
    if (disabled || isLoading || isConfirmed) return;

    const containerWidth = containerRef.current?.offsetWidth || 280;
    const maxDrag = containerWidth - handleWidth - 8;
    const currentX = x.get();

    if (currentX >= maxDrag * 0.75) {
      // Execute confirm callback and check result
      const result = onConfirm();
      if (result === false) {
        // Validation failed (e.g., no balance or invalid address) -> snap back immediately
        x.set(0);
        setIsConfirmed(false);
        return;
      }

      setIsConfirmed(true);
      try {
        if ((window as any).Telegram?.WebApp?.HapticFeedback) {
          (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch {}

      setTimeout(() => {
        x.set(0);
        setIsConfirmed(false);
      }, 2500);
    } else {
      x.set(0);
    }
  };

  return (
    <div className="space-y-2">
      <div 
        ref={containerRef}
        className={`relative w-full h-[52px] rounded-2xl p-1 select-none overflow-hidden transition-all ${
          disabled 
            ? 'bg-[#151F2B]/60 cursor-not-allowed opacity-60' 
            : 'bg-[#151F2B]'
        }`}
      >
        {/* Vibrant Electric Blue Fill Track on Swipe */}
        {!disabled && !isConfirmed && (
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2EA5FF] to-[#0088FF] rounded-2xl pointer-events-none shadow-md shadow-[#2EA5FF]/30"
            style={{ width: x, opacity: bgOpacity }}
          />
        )}

        {/* Confirmed green track overlay */}
        {isConfirmed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-emerald-500 rounded-2xl flex items-center justify-center space-x-2 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t('withdraw.confirmed', 'Confirmed')}</span>
          </motion.div>
        )}

        {/* Text Label with Animated Arrow Indicator */}
        {!isConfirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-12 pr-4">
            <motion.span 
              style={{ opacity: textOpacity }}
              className={`text-[12px] font-bold tracking-tight text-center flex items-center justify-center gap-1.5 font-sans ${
                disabled ? 'text-amber-400/80' : 'text-[#7D8B9B]'
              }`}
            >
              {disabled ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{defaultLockedLabel}</span>
                </>
              ) : (
                <>
                  <span>{defaultLabel}</span>
                  {/* Animated Right Arrow Chevrons indicating direction */}
                  <span className="flex items-center text-[#2EA5FF]">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 -mr-2 shrink-0 stroke-[2.5]" />
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, ease: "easeInOut" }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 -mr-2 shrink-0 stroke-[2.5]" />
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    </motion.span>
                  </span>
                </>
              )}
            </motion.span>
          </div>
        )}

        {/* Draggable Tonkeeper Pill Handle with Nudge Hint Animation */}
        {!disabled && !isLoading && !isConfirmed ? (
          <motion.div
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0.02}
            dragSnapToOrigin={false}
            style={{ x }}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 0.95 }}
            animate={{
              x: [0, 10, 0]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 2.2,
                repeatDelay: 1.5,
                ease: "easeInOut"
              }
            }}
            className="relative z-10 w-[44px] h-[44px] bg-[#2EA5FF] active:bg-[#0088FF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#2EA5FF]/30 cursor-grab active:cursor-grabbing transform-gpu transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-white stroke-[2.5]" />
          </motion.div>
        ) : isLoading ? (
          <div className="relative z-10 w-[44px] h-[44px] bg-[#2EA5FF] rounded-xl flex items-center justify-center text-white">
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          </div>
        ) : !isConfirmed ? (
          <div className="relative z-10 w-[44px] h-[44px] bg-[#1C2733] rounded-xl flex items-center justify-center text-[#556575]">
            <Lock className="w-4 h-4 text-amber-400/70" />
          </div>
        ) : null}
      </div>

      {/* Smooth Green Check Banner Below on Confirmation */}
      <AnimatePresence>
        {isConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[12px] font-bold font-sans"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="tracking-tight">Request Submitted!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
