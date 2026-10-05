import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Send } from 'lucide-react';
import { 
  saveWalletPin, 
  verifyWalletPin 
} from '../utils/walletSecurity';

interface WalletPinLockProps {
  onUnlocked: () => void;
  mode?: 'unlock' | 'setup' | 'confirm_action';
  actionTitle?: string;
  actionSubtitle?: string;
  onCancel?: () => void;
}

// Crisp native-style backspace key icon matching the provided design
function BackspaceKey() {
  return (
    <svg className="w-8 h-6" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.5 2.5H27.5C29.1569 2.5 30.5 3.84315 30.5 5.5V18.5C30.5 20.1569 29.1569 21.5 27.5 21.5H9.5C8.5 21.5 7.55 21 6.95 20.18L1.6 12.98C1.1 12.35 1.1 11.65 1.6 11.02L6.95 3.82C7.55 3 8.5 2.5 9.5 2.5Z"
        fill="white"
      />
      <path
        d="M15 8.5L21 15.5M21 8.5L15 15.5"
        stroke="#0B0E14"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const WalletPinLock: React.FC<WalletPinLockProps> = ({ 
  onUnlocked, 
  mode: initialMode = 'unlock',
  actionTitle,
  actionSubtitle,
  onCancel
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split('-')[0];
  const isFa = currentLang === 'fa';

  // Sub-step for setup: 'first' (enter new PIN) or 'confirm' (re-enter PIN)
  const [setupStep, setSetupStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Native Telegram haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'error' | 'success') => {
    try {
      const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
      if (tg) {
        if (type === 'error') tg.notificationOccurred('error');
        else if (type === 'success') tg.notificationOccurred('success');
        else tg.impactOccurred(type === 'medium' ? 'medium' : 'light');
      }
    } catch {}
  };

  const handleKeyPress = (digit: string) => {
    if (isSuccess || enteredPin.length >= 4) return;
    triggerHaptic('light');
    setErrorMessage(null);
    setEnteredPin(prev => prev + digit);
  };

  const handleDelete = () => {
    if (isSuccess || enteredPin.length === 0) return;
    triggerHaptic('light');
    setEnteredPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  // Open Telegram Support for forgotten PIN
  const handleOpenSupport = () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink('https://t.me/ai_zke');
      } else {
        window.open('https://t.me/ai_zke', '_blank');
      }
    } catch {
      window.open('https://t.me/ai_zke', '_blank');
    }
  };

  // Evaluate PIN when 4 digits are completed
  useEffect(() => {
    if (enteredPin.length < 4) return;

    const timer = setTimeout(() => {
      if (initialMode === 'setup') {
        if (setupStep === 'first') {
          triggerHaptic('medium');
          setFirstPin(enteredPin);
          setEnteredPin('');
          setSetupStep('confirm');
        } else {
          if (enteredPin === firstPin) {
            triggerHaptic('success');
            saveWalletPin(enteredPin);
            setIsSuccess(true);
            setTimeout(() => {
              onUnlocked();
            }, 250);
          } else {
            triggerHaptic('error');
            setIsShaking(true);
            setErrorMessage('PINs do not match');
            setEnteredPin('');
            setTimeout(() => setIsShaking(false), 400);
          }
        }
      } else {
        // Unlock or Confirm Action Mode
        const isValid = verifyWalletPin(enteredPin);
        if (isValid) {
          triggerHaptic('success');
          setIsSuccess(true);
          setTimeout(() => {
            onUnlocked();
          }, 200);
        } else {
          triggerHaptic('error');
          setIsShaking(true);
          setErrorMessage('Incorrect passcode');
          setEnteredPin('');
          setTimeout(() => setIsShaking(false), 400);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [enteredPin, initialMode, setupStep, firstPin, onUnlocked, isFa]);

  // Clean minimal titles matching the requested design
  const getHeaderTitle = () => {
    if (initialMode === 'setup') {
      if (setupStep === 'first') {
        return 'Set passcode';
      } else {
        return 'Re-enter passcode';
      }
    }

    if (initialMode === 'confirm_action') {
      return actionTitle || ('Enter passcode');
    }

    return 'Enter passcode';
  };

  const title = getHeaderTitle();

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col justify-between items-center pt-24 pb-10 px-6 select-none font-sans overflow-hidden"
      id="wallet-passcode-view"
    >
      {/* Top / Center Section: Title & 4 Dots */}
      <div className="flex flex-col items-center justify-center w-full max-w-xs">
        {/* Title: Exactly "Enter passcode" */}
        <h2 className="text-[22px] sm:text-[24px] font-bold text-white tracking-tight text-center">
          {title}
        </h2>

        {/* Subtitle if in confirm_action mode */}
        {actionSubtitle && (
          <p className="text-xs text-[#8295A8] mt-1 text-center px-4">
            {actionSubtitle}
          </p>
        )}

        {/* 4 Clean Minimal Dots: Filled = #2EA5FF, Empty = Solid Dark Slate #182332 */}
        <motion.div
          animate={isShaking ? { x: [-10, 10, -7, 7, -4, 4, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-center space-x-5 rtl:space-x-reverse mt-6 mb-3"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isSuccess
                    ? 'bg-emerald-400'
                    : isShaking
                    ? 'bg-rose-500'
                    : isFilled
                    ? 'bg-[#2EA5FF]'
                    : 'bg-[#2C2C2E]'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error / Verified Notice Box */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.span
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs font-medium text-rose-400 text-center"
              >
                {errorMessage}
              </motion.span>
            )}
            {isSuccess && (
              <motion.span
                key="succ"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs font-medium text-emerald-400 text-center"
              >
                {'Verified'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keypad Section: Clean, Frameless Numbers Directly on Background */}
      <div className="w-full max-w-xs flex flex-col items-center pb-2">
        <div className="grid grid-cols-3 gap-y-6 sm:gap-y-8 gap-x-12 sm:gap-x-14 place-items-center">
          {/* Digits 1 through 9 */}
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`wallet-pin-digit-${digit}`}
              data-keypad-digit={digit}
              data-tour={`keypad-digit-${digit}`}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-[34px] sm:text-[38px] font-semibold text-white active:opacity-30 active:scale-95 transition-all select-none cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Row 4 Column 1: Cancel or subtle back to Market */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            {initialMode === 'unlock' ? (
              <button
                type="button"
                onClick={() => (onCancel ? onCancel() : navigate('/'))}
                className="text-sm font-medium text-[#7D8B9B] hover:text-white active:opacity-40 active:scale-95 transition-all select-none cursor-pointer"
              >
                Cancel
              </button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-medium text-[#7D8B9B] hover:text-white active:opacity-40 active:scale-95 transition-all select-none cursor-pointer"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {/* Row 4 Column 2: Digit 0 */}
          <button
            type="button"
            id="wallet-pin-digit-0"
            data-keypad-digit="0"
            data-tour="keypad-digit-0"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-[34px] sm:text-[38px] font-semibold text-white active:opacity-30 active:scale-95 transition-all select-none cursor-pointer"
          >
            0
          </button>

          {/* Row 4 Column 3: Custom White Backspace Key matching the design */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={enteredPin.length === 0}
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center active:opacity-30 active:scale-95 transition-all select-none cursor-pointer disabled:opacity-20"
            aria-label="Delete"
          >
            <BackspaceKey />
          </button>
        </div>

        {/* Subtle Forgot Passcode Link for recovery */}
        {initialMode === 'unlock' && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs text-[#52667C] hover:text-[#2EA5FF] transition-colors cursor-pointer select-none"
            >
              {'Forgot passcode?'}
            </button>
          </div>
        )}
      </div>

      {/* Forgot Passcode Recovery Dialog */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#1C1C1E] border border-[#233242] rounded-3xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl"
            >
              <div className="w-10 h-10 rounded-full bg-[#2EA5FF]/10 text-[#2EA5FF] flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {'Passcode Recovery'}
                </h3>
                <p className="text-xs text-[#8295A8] leading-relaxed">
                  To protect your assets from unauthorized access, passcode recovery requires identity verification via Telegram support.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenSupport}
                  className="w-full py-2.5 rounded-xl bg-[#2EA5FF] hover:bg-[#208DE6] text-white text-xs font-bold active:scale-95 transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Contact Support (@ai_zke)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2 rounded-xl text-xs font-medium text-[#8295A8] hover:text-white transition-all cursor-pointer"
                >
                  {'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
