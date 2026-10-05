import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signInAnonymously } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserData, SystemSettings } from '../types';
import { DEFAULT_ADMIN_TELEGRAM_IDS, getSystemSettings, subscribeWallets } from '../services/systemService';
import { extractTelegramLaunchData, ParsedTelegramUser, isRestrictedPersianUser } from '../utils/telegramAuth';
import i18n, { resolveUserLanguage, updateDocumentDirection, LanguageCode } from '../i18n';
import { RegionalNodeMaintenance } from '../components/RegionalNodeMaintenance';

const DEFAULT_GUEST_USER: UserData = {
  id: 'guest_user',
  telegramId: 84920412,
  telegramUsername: 'guest_trader',
  firstName: 'Guest Trader',
  balance: 0.00,
  bonusBalance: 5.00,
  cryptoBalances: {
    USDT: 0.00,
    TON: 0.00,
    BTC: 0.00,
    ETH: 0.00
  },
  role: 'user',
  createdAt: Date.now(),
};

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  isDemo?: boolean;
  isAdmin: boolean;
  isRegionalBlocked: boolean;
  systemSettings: SystemSettings | null;
  refreshSettings: () => Promise<void>;
  simulateTelegramUser: (tgId: number | string, username: string, photoUrl?: string) => void;
  toggleAdminRole: (forceAdmin?: boolean) => void;
  creditUserBalance: (usdAmount: number, coinSymbol?: string, cryptoAmount?: number) => Promise<void>;
  updateUserLanguage: (lang: LanguageCode) => Promise<void>;
  patchUser: (updates: Partial<UserData>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: DEFAULT_GUEST_USER, 
  loading: false, 
  error: null, 
  isDemo: false,
  isAdmin: false,
  isRegionalBlocked: false,
  systemSettings: null,
  refreshSettings: async () => {},
  simulateTelegramUser: () => {},
  toggleAdminRole: () => {},
  creditUserBalance: async () => {},
  updateUserLanguage: async () => {},
  patchUser: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Extract launch data immediately
  const initialLaunch = extractTelegramLaunchData();
  const initialTgUser = initialLaunch.user;

  // Determine initial admin status
  const checkIsAdmin = (tgId?: number | string, username?: string, customAdminList?: (string | number)[]) => {
    const list = [
      ...DEFAULT_ADMIN_TELEGRAM_IDS,
      ...(customAdminList || [])
    ].map(s => String(s).toLowerCase().replace('@', '').trim());

    const idStr = tgId ? String(tgId).toLowerCase().trim() : '';
    const userStr = username ? String(username).toLowerCase().replace('@', '').trim() : '';

    return (Boolean(idStr) && list.includes(idStr)) || (Boolean(userStr) && list.includes(userStr));
  };

  const isInitialAdmin = checkIsAdmin(initialTgUser?.id, initialTgUser?.username);

  const [user, setUser] = useState<UserData | null>(() => {
    if (initialTgUser) {
      return {
        id: `tg_${initialTgUser.id}`,
        telegramId: initialTgUser.id,
        telegramUsername: initialTgUser.username || `user_${initialTgUser.id}`,
        firstName: initialTgUser.firstName || 'Trader',
        lastName: initialTgUser.lastName,
        photoUrl: initialTgUser.photoUrl,
        balance: 0.00,
        bonusBalance: 5.00,
        cryptoBalances: {
          USDT: 0.00,
          TON: 0.00,
          BTC: 0.00,
          ETH: 0.00
        },
        role: isInitialAdmin ? 'admin' : 'user',
        createdAt: Date.now(),
      };
    }
    return DEFAULT_GUEST_USER;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(!initialTgUser);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isRegionalBlocked, setIsRegionalBlocked] = useState<boolean>(() => {
    return isRestrictedPersianUser(initialTgUser?.id, initialTgUser?.languageCode);
  });

  // Load system settings
  const refreshSettings = async () => {
    try {
      const settings = await getSystemSettings();
      setSystemSettings(settings);
    } catch (e) {
      console.warn("Failed to load system settings:", e);
    }
  };

  useEffect(() => {
    refreshSettings();
    const unsubWallets = subscribeWallets(() => {
      // Wallet icons automatically synced to localStorage by subscribeWallets
    });
    return () => {
      if (typeof unsubWallets === 'function') unsubWallets();
    };
  }, []);

  useEffect(() => {
    // 1. Re-extract Telegram Launch Data (in case WebApp SDK initialized slightly after DOMContentLoaded)
    const launchData = extractTelegramLaunchData();
    const tgUser = launchData.user;
    const referralParam = launchData.startParam;
    const sourceBotParam = launchData.sourceBot;

    const tgId = tgUser?.id || null;
    const tgUsername = tgUser?.username || null;
    const firstName = tgUser?.firstName || null;
    const lastName = tgUser?.lastName || null;
    const photoUrl = tgUser?.photoUrl || null;

    // Check regional restriction
    const blocked = isRestrictedPersianUser(tgId, tgUser?.languageCode);
    setIsRegionalBlocked(blocked);
    if (blocked) {
      setLoading(false);
      return;
    }

    if (tgUser) {
      setIsDemo(false);
    }

    // Proactively fetch user profile from server API for instant 0ms latency sync
    const syncProfileFromServer = async (docId?: string, telegramId?: string | number) => {
      try {
        const qId = docId || (tgId ? `tg_${tgId}` : '');
        const qTg = telegramId ? String(telegramId) : (tgId ? String(tgId) : '');
        if (!qId && !qTg) return;

        const res = await fetch(`/api/users/profile?id=${encodeURIComponent(qId)}&tg_id=${encodeURIComponent(qTg)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.user) {
            const u = json.user;
            setUser(prev => {
              const base = prev || DEFAULT_GUEST_USER;
              return {
                ...base,
                ...u,
                phoneVerified: Boolean(base.phoneVerified || u.phoneVerified),
                phoneNumber: u.phoneNumber || base.phoneNumber,
                phoneVerifiedAt: u.phoneVerifiedAt || base.phoneVerifiedAt
              };
            });

            // Preserve server-stored language preference
            const sLang = u.preferredLanguage || u.language;
            if (sLang && ['fa', 'ru', 'en'].includes(sLang)) {
              const currentStored = localStorage.getItem('app_lang');
              if (!currentStored || currentStored === 'en') {
                i18n.changeLanguage(sLang);
                updateDocumentDirection(sLang);
                try { localStorage.setItem('app_lang', sLang); } catch {}
              }
            }
          }
        }
      } catch (e) {
        console.warn("syncProfileFromServer error:", e);
      }
    };

    // Initial server fetch
    syncProfileFromServer(tgId ? `tg_${tgId}` : undefined, tgId);

    // 2. Sign in anonymously to Firebase Auth and bind to Firestore
    let unsubscribe = () => {};
    try {
      unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          const targetDocId = tgId ? `tg_${tgId}` : firebaseUser.uid;
          const userRef = doc(db, 'users', targetDocId);
          try {
            const docSnap = await getDoc(userRef);
            
            const adminList = [
              ...DEFAULT_ADMIN_TELEGRAM_IDS,
              ...(systemSettings?.adminTelegramIds || [])
            ];

            const isTgAdmin = checkIsAdmin(tgId || (docSnap.exists() ? docSnap.data().telegramId : undefined), tgUsername || (docSnap.exists() ? docSnap.data().telegramUsername : undefined), adminList);
            const generatedRefCode = `ref_${tgId || firebaseUser.uid.slice(0, 8)}`;
            
            const isSelfReferral = Boolean(referralParam) && (
              String(referralParam) === String(tgId) ||
              String(referralParam) === `ref_${tgId}` ||
              String(referralParam) === targetDocId ||
              String(referralParam) === generatedRefCode
            );
            const validReferral = (referralParam && !isSelfReferral) ? String(referralParam) : null;

            if (!docSnap.exists()) {
              const newUser: UserData = {
                id: targetDocId,
                telegramId: tgId || firebaseUser.uid.slice(0, 8),
                telegramUsername: tgUsername || "user_" + (tgId || firebaseUser.uid.slice(0, 5)),
                firstName: firstName || 'Trader',
                lastName: lastName || undefined,
                photoUrl: photoUrl || undefined,
                balance: 0.00,
                bonusBalance: 5.00,
                cryptoBalances: {
                  USDT: 0.00,
                  TON: 0.00,
                  BTC: 0.00,
                  ETH: 0.00
                },
                role: isTgAdmin ? 'admin' : 'user',
                createdAt: Date.now(),
                lastLogin: Date.now(),
                referredBy: validReferral,
                referralCode: generatedRefCode,
                referralsCount: 0,
                referralEarnings: 0,
                sourceBotUsername: sourceBotParam || null,
                totalArbitrageInvested: 0,
                totalProfitEarned: 0
              };
              await setDoc(userRef, newUser);
              setUser(newUser);

              // Also sync to server API
              fetch('/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
              }).catch(() => {});

              // Dispatch instant Telegram notification to referrer
              if (validReferral) {
                fetch('/api/referrals/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ referrerRef: validReferral, newUser })
                }).catch(() => {});
              }
            } else {
              const existingData = docSnap.data() as UserData;
              const updates: Partial<UserData> = {
                lastLogin: Date.now()
              };

              // Ensure Starter $5.00 Bonus exists for users who haven't yet used it
              if (existingData.bonusBalance === undefined || (existingData.bonusBalance === 0 && (existingData.totalArbitrageInvested || 0) === 0)) {
                updates.bonusBalance = 5.00;
              }

              // Update Telegram profile information if newly available
              if (tgId && existingData.telegramId !== tgId) {
                updates.telegramId = tgId;
              }
              if (tgUsername && existingData.telegramUsername !== tgUsername) {
                updates.telegramUsername = tgUsername;
              }
              if (firstName && existingData.firstName !== firstName) {
                updates.firstName = firstName;
              }
              if (lastName && existingData.lastName !== lastName) {
                updates.lastName = lastName;
              }
              if (photoUrl && existingData.photoUrl !== photoUrl) {
                updates.photoUrl = photoUrl;
              }

              // Update admin role if matched in admin whitelist
              if (isTgAdmin && existingData.role !== 'admin') {
                updates.role = 'admin';
              }

              // Update referral code if missing
              if (!existingData.referralCode) {
                updates.referralCode = generatedRefCode;
              }

              // Update source bot if provided now and wasn't previously set
              if (sourceBotParam && !existingData.sourceBotUsername) {
                updates.sourceBotUsername = sourceBotParam;
              }

              // Update referredBy ONLY if user has NO referredBy yet and validReferral provided (Strict Single Referral)
              if (validReferral && !existingData.referredBy) {
                updates.referredBy = validReferral;
              }

              if (Object.keys(updates).length > 0) {
                await setDoc(userRef, updates, { merge: true });
              }

              const mergedUser = { id: docSnap.id, ...existingData, ...updates };
              setUser(mergedUser);

              // Preserve language from existing database record
              const dbLang = existingData.preferredLanguage || existingData.language;
              if (dbLang && ['zh', 'ru', 'en'].includes(dbLang)) {
                const currentStored = localStorage.getItem('app_lang');
                if (!currentStored || currentStored === 'en') {
                  i18n.changeLanguage(dbLang);
                  updateDocumentDirection(dbLang);
                  try { localStorage.setItem('app_lang', dbLang); } catch {}
                }
              }

              fetch('/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mergedUser)
              }).catch(() => {});
            }

            // Real-time snapshot listener with resilient error handler
            const snapUnsub = onSnapshot(userRef, (snapshot) => {
              if (snapshot.exists()) {
                const updatedData = { id: snapshot.id, ...snapshot.data() } as UserData;
                setUser(prev => ({
                  ...(prev || DEFAULT_GUEST_USER),
                  ...updatedData,
                  phoneVerified: Boolean(updatedData.phoneVerified || prev?.phoneVerified)
                }));

                const sLang = updatedData.preferredLanguage || updatedData.language;
                if (sLang && ['en', 'ru', 'zh'].includes(sLang) && !localStorage.getItem('app_lang')) {
                  i18n.changeLanguage(sLang);
                  updateDocumentDirection(sLang);
                  try { localStorage.setItem('app_lang', sLang); } catch {}
                }
              }
            }, (snapshotError) => {
              console.warn("User onSnapshot offline/error handler:", snapshotError);
            });

            return () => snapUnsub();
          } catch (e: any) {
            console.warn("DB user fetch fallback:", e);
          } finally {
            setLoading(false);
          }
        } else {
          try {
            await signInAnonymously(auth);
          } catch (e: any) {
            console.warn("Anonymous signin fallback:", e);
            setLoading(false);
          }
        }
      });
    } catch (err) {
      console.warn("Auth initialization fallback:", err);
      setLoading(false);
    }

    // Sync on window focus or visibility change (e.g. returning from Telegram bot)
    const handleSyncOnActive = () => {
      syncProfileFromServer(tgId ? `tg_${tgId}` : undefined, tgId);
    };

    window.addEventListener('focus', handleSyncOnActive);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncOnActive();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleSyncOnActive);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [systemSettings]);

  const simulateTelegramUser = (tgId: number | string, username: string, photoUrl?: string) => {
    localStorage.setItem('tg_simulated_id', String(tgId));
    localStorage.setItem('tg_simulated_username', username);
    if (photoUrl) localStorage.setItem('tg_simulated_photo', photoUrl);
    
    const isTgAdmin = checkIsAdmin(tgId, username, systemSettings?.adminTelegramIds);
    setUser(prev => prev ? {
      ...prev,
      telegramId: tgId,
      telegramUsername: username,
      photoUrl: photoUrl || prev.photoUrl,
      role: isTgAdmin ? 'admin' : prev.role
    } : null);
  };

  const toggleAdminRole = (forceAdmin?: boolean) => {
    setUser(prev => {
      if (!prev) return null;
      const nextRole = forceAdmin !== undefined ? (forceAdmin ? 'admin' : 'user') : (prev.role === 'admin' ? 'user' : 'admin');
      if (prev.id && prev.id !== 'guest_user') {
        setDoc(doc(db, 'users', prev.id), { role: nextRole }, { merge: true }).catch(console.warn);
      }
      return { ...prev, role: nextRole };
    });
  };

  const creditUserBalance = async (usdAmount: number, coinSymbol: string = 'USDT', cryptoAmount?: number) => {
    const coin = coinSymbol.toUpperCase();
    const cryptoAmt = cryptoAmount !== undefined && cryptoAmount > 0 ? cryptoAmount : usdAmount;

    setUser(prev => {
      if (!prev) return null;
      const curUsd = Number(prev.balance || 0);
      const newUsd = parseFloat((curUsd + usdAmount).toFixed(2));
      const curCryptoMap = prev.cryptoBalances || {};
      const curCoinVal = Number(curCryptoMap[coin] || (coin === 'USDT' ? curUsd : 0));
      const newCoinVal = parseFloat((curCoinVal + cryptoAmt).toFixed(8));

      const updatedBalances = {
        ...curCryptoMap,
        [coin]: newCoinVal
      };

      const updatedUser: UserData = {
        ...prev,
        balance: newUsd,
        cryptoBalances: updatedBalances
      };

      // Persist to Firestore
      if (prev.id && prev.id !== 'guest_user') {
        const userRef = doc(db, 'users', prev.id);
        setDoc(userRef, {
          balance: newUsd,
          cryptoBalances: updatedBalances
        }, { merge: true }).catch(console.warn);
      }

      // Sync to Server memory
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      }).catch(() => {});

      return updatedUser;
    });
  };

  const isAdmin = user?.role === 'admin';

  const updateUserLanguage = async (code: LanguageCode) => {
    i18n.changeLanguage(code);
    updateDocumentDirection(code);
    localStorage.setItem('app_lang', code);

    setUser(prev => prev ? { ...prev, preferredLanguage: code } : null);

    if (user?.id && user.id !== 'guest_user') {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { preferredLanguage: code }, { merge: true }).catch(console.warn);
    }

    fetch('/api/users/sync-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        telegramId: user?.telegramId,
        language: code
      })
    }).catch(() => {});
  };

  const patchUser = async (updates: Partial<UserData>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updates };

      if (prev.id && prev.id !== 'guest_user') {
        const userRef = doc(db, 'users', prev.id);
        setDoc(userRef, updates, { merge: true }).catch(() => {});
      }

      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      }).catch(() => {});

      return merged;
    });
  };

  const refreshUser = async () => {
    try {
      const launchInfo = extractTelegramLaunchData();
      const currentTgId = user?.telegramId || launchInfo.user?.id || '';
      const qId = user?.id || (currentTgId ? `tg_${currentTgId}` : '');
      const qTg = currentTgId ? String(currentTgId) : '';
      if (!qId && !qTg) return;

      const res = await fetch(`/api/users/profile?id=${encodeURIComponent(qId)}&tg_id=${encodeURIComponent(qTg)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          const u = json.user;
          setUser(prev => ({
            ...(prev || DEFAULT_GUEST_USER),
            ...u,
            phoneVerified: Boolean(prev?.phoneVerified || u.phoneVerified),
            phoneNumber: u.phoneNumber || prev?.phoneNumber,
            phoneVerifiedAt: u.phoneVerifiedAt || prev?.phoneVerifiedAt
          }));
        }
      }
    } catch (e) {
      console.warn("refreshUser error:", e);
    }
  };

  if (isRegionalBlocked) {
    return <RegionalNodeMaintenance />;
  }

  return (
    <AuthContext.Provider value={{ 
      user: user || DEFAULT_GUEST_USER, 
      loading, 
      error, 
      isDemo, 
      isAdmin, 
      isRegionalBlocked,
      systemSettings, 
      refreshSettings,
      simulateTelegramUser,
      toggleAdminRole,
      creditUserBalance,
      updateUserLanguage,
      patchUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

