import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown, X } from 'lucide-react';
import { FaLanguageIcon, LanguageFlagIcon } from './CustomIcons';
import { motion, AnimatePresence } from 'motion/react';
import { SUPPORTED_LANGUAGES, LanguageCode, updateDocumentDirection } from '../i18n';
import { useAuth } from '../context/AuthContext';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'inline' | 'button' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant,
  isOpen: externalIsOpen,
  onClose: externalOnClose
}) => {
  const { i18n, t } = useTranslation();
  const { updateUserLanguage } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = externalIsOpen !== undefined;
  const isModalOpen = isControlled ? externalIsOpen : internalIsOpen;
  
  const closeModal = () => {
    if (externalOnClose) externalOnClose();
    setInternalIsOpen(false);
  };

  const currentLangCode = (i18n.language || 'en').split('-')[0] as LanguageCode;
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: LanguageCode) => {
    if (code === currentLangCode) {
      closeModal();
      return;
    }
    updateUserLanguage(code);
    try {
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } catch {}
    closeModal();
  };

  if (variant === 'full') {
    return (
      <div className="bg-[#151F2B] p-4 rounded-[20px] space-y-3 font-sans" id="language-selector-full">
        <div className="flex items-center space-x-2.5 text-white">
          <FaLanguageIcon className="w-5 h-5 text-[#2EA5FF]" />
          <span className="font-bold text-sm tracking-tight">{t('profile.selectLanguage', 'Select Language')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`p-3.5 rounded-[16px] flex items-center justify-between transition-colors active:scale-95 text-xs font-semibold cursor-pointer ${
                  isSelected
                    ? 'bg-[#1F2E40] text-[#2EA5FF]'
                    : 'bg-[#182432] hover:bg-[#202E3D] text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <LanguageFlagIcon code={lang.code} className="w-6 h-6 shrink-0" />
                  <div className="text-left rtl:text-right">
                    <div className="font-bold text-xs">{lang.nativeName}</div>
                    <div className="text-[10px] text-[#7D8B9B]">{lang.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#2EA5FF]" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const modalElement = (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 font-telegram">
          {/* Backdrop: Telegram UI blur fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/80 backdrop-blur-[6px] transform-gpu"
          />

          {/* Bottom Sheet Card */}
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
                closeModal();
              }
            }}
            className="relative w-full max-w-md bg-[#1C1C1E] sm:rounded-[28px] rounded-t-[28px] z-10 max-h-[85vh] flex flex-col overflow-hidden text-white font-sans border-0 select-none touch-pan-y"
          >
            {/* Top Sheet Drag Handle (Mobile) */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Modal Header Bar */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#32ADE6] flex items-center justify-center text-white">
                  <FaLanguageIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[15px] font-bold text-white">
                  {t('profile.selectLanguage', 'Select Language')}
                </span>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-7 h-7 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white active:scale-95 transition-all cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List */}
            <div className="p-4 pt-2 pb-8 space-y-2 select-none overflow-y-auto no-scrollbar">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLangCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-[20px] transition-colors cursor-pointer border-0 ${
                      isSelected
                        ? 'bg-[#2C2C2E] text-[#007AFF]'
                        : 'bg-[#242426] text-white hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <LanguageFlagIcon code={lang.code} className="w-7 h-7 shrink-0 shadow-sm" />
                      <div className="text-left rtl:text-right">
                        <span className={`text-[14.5px] block leading-tight ${isSelected ? 'font-bold text-[#007AFF]' : 'font-semibold text-white'}`}>
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-[#8E8E93] font-medium block mt-0.5">
                          {lang.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Compact Trigger Button ONLY when NOT controlled as a modal */}
      {!isControlled && variant !== 'modal' && (
        <button
          type="button"
          onClick={() => setInternalIsOpen(true)}
          className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#1F2E40] text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <LanguageFlagIcon code={currentLang.code} className="w-4 h-4 shrink-0" />
          <span className="uppercase text-[11px] font-bold text-white">{currentLang.code}</span>
          <ChevronDown className="w-3 h-3 text-[#7D8B9B]" />
        </button>
      )}

      {typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement}
    </>
  );
};
