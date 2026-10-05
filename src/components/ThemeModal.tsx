import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, CheckCircle2 } from 'lucide-react';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useTranslation } from 'react-i18next';
import { Tappable } from '@telegram-apps/telegram-ui';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const handleSelectTheme = (newTheme: AppTheme) => {
    triggerHaptic('medium');
    setTheme(newTheme);
  };

  const modalElement = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 font-sans">
          
          {/* Telegram Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85"
          />

          {/* Bottom-Sheet Card with Telegram UI Native Physics */}
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
            className="relative w-full max-w-md bg-[#1C1C1E] sm:rounded-[28px] rounded-t-[28px] z-10 max-h-[85vh] flex flex-col overflow-hidden text-white font-sans border-0"
          >
            {/* Top Sheet Drag Handle (Mobile) */}
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Header Bar */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[16px] font-bold text-white tracking-tight">
                  Theme
                </h3>
              </div>

              <Tappable
                Component="button"
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-all cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </Tappable>
            </div>

            {/* Content: 2 Smooth Preview Options */}
            <div className="p-4 space-y-3 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                
                {/* 1. DEEP NAVY */}
                <Tappable
                  Component="button"
                  type="button"
                  onClick={() => handleSelectTheme('navy')}
                  className={`p-3 rounded-[20px] flex flex-col text-left transition-all cursor-pointer relative overflow-hidden text-white border-0 ${
                    theme === 'navy'
                      ? 'bg-[#2C2C2E] ring-2 ring-[#007AFF]'
                      : 'bg-[#242426]'
                  }`}
                >
                  {theme === 'navy' && (
                    <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Minimal Mockup Screen (Deep Navy) */}
                  <div className="w-full h-28 rounded-[16px] bg-[#0F1721] p-2 flex flex-col justify-between mb-2.5 overflow-hidden select-none pointer-events-none">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <div className="w-8 h-1.5 bg-white/40 rounded-full" />
                      <div className="w-3 h-1.5 bg-[#007AFF] rounded-full" />
                    </div>
                    <div className="p-1.5 rounded-[12px] bg-[#18222D] space-y-1">
                      <div className="w-10 h-1 bg-white/30 rounded-full" />
                      <div className="w-12 h-2 bg-white rounded-full font-bold" />
                    </div>
                    <div className="p-1 rounded-[10px] bg-[#131E2A] flex items-center justify-between">
                      <div className="w-7 h-1.5 bg-white/50 rounded-full" />
                      <div className="w-4 h-1.5 bg-emerald-400 rounded-full" />
                    </div>
                    <div className="h-2 rounded-full bg-[#131A26] flex items-center justify-around px-1">
                      <div className="w-1 h-1 rounded-full bg-[#007AFF]" />
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                    </div>
                  </div>

                  <span className="text-xs font-bold text-white block">
                    Navy
                  </span>
                </Tappable>

                {/* 2. ONYX DARK (TELEGRAM STYLE - NEW) */}
                <Tappable
                  Component="button"
                  type="button"
                  onClick={() => handleSelectTheme('onyx')}
                  className={`p-3 rounded-[20px] flex flex-col text-left transition-all cursor-pointer relative overflow-hidden text-white border-0 ${
                    theme === 'onyx'
                      ? 'bg-[#2C2C2E] ring-2 ring-[#007AFF]'
                      : 'bg-[#242426]'
                  }`}
                >
                  {theme === 'onyx' && (
                    <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Minimal Mockup Screen (Onyx Dark) */}
                  <div className="w-full h-28 rounded-[16px] bg-[#000000] p-2 flex flex-col justify-between mb-2.5 overflow-hidden select-none pointer-events-none">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
                      <div className="w-8 h-1.5 bg-white/50 rounded-full" />
                      <div className="w-4 h-1.5 bg-[#007AFF] rounded-full" />
                    </div>
                    <div className="p-1.5 rounded-[12px] bg-[#1C1C1E] space-y-1">
                      <div className="w-10 h-1 bg-white/40 rounded-full" />
                      <div className="w-12 h-2 bg-white rounded-full font-bold" />
                    </div>
                    <div className="p-1 rounded-[10px] bg-[#1C1C1E] flex items-center justify-between">
                      <div className="w-7 h-1.5 bg-white/60 rounded-full" />
                      <div className="w-4 h-1.5 bg-[#007AFF] rounded-full" />
                    </div>
                    <div className="h-2 rounded-full bg-[#1C1C1E] flex items-center justify-around px-1">
                      <div className="w-3 h-1.5 rounded-full bg-[#007AFF]" />
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                    </div>
                  </div>

                  <span className="text-xs font-bold text-white block">
                    Dark
                  </span>
                </Tappable>

              </div>

              {/* Confirm / Close Button */}
              <Tappable
                Component="button"
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-[18px] bg-[#007AFF] hover:bg-[#0A84FF] text-white font-bold text-sm shadow-lg shadow-[#007AFF]/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 mt-2 border-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done</span>
              </Tappable>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
