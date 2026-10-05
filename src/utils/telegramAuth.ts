/**
 * Telegram Mini App Data Extraction and Verification Utility
 * Handles extracting user information from Telegram WebApp SDK, URL Hash, URL Search params, and fallbacks.
 */

export interface ParsedTelegramUser {
  id: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface TelegramLaunchData {
  user: ParsedTelegramUser | null;
  startParam: string | null;
  sourceBot: string | null;
  initDataRaw: string | null;
}

/**
 * Safely parse a JSON string with fallback
 */
function safeJsonParse<T>(jsonStr: string): T | null {
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(jsonStr)) as T;
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Parse standard Telegram query string (e.g. user=...&auth_date=...&hash=...)
 */
function parseTelegramQueryString(queryString: string): { user: ParsedTelegramUser | null; startParam: string | null } {
  let user: ParsedTelegramUser | null = null;
  let startParam: string | null = null;

  try {
    const cleanQuery = queryString.startsWith('#') || queryString.startsWith('?') 
      ? queryString.slice(1) 
      : queryString;

    const params = new URLSearchParams(cleanQuery);

    // 1. Direct user param or tgWebAppData
    let rawUserData = params.get('user');
    const tgWebAppData = params.get('tgWebAppData');
    
    if (!rawUserData && tgWebAppData) {
      const nestedParams = new URLSearchParams(tgWebAppData);
      rawUserData = nestedParams.get('user');
      if (!startParam) {
        startParam = nestedParams.get('start_param') || nestedParams.get('startapp');
      }
    }

    if (rawUserData) {
      const parsedObj = safeJsonParse<any>(rawUserData);
      if (parsedObj && (parsedObj.id || parsedObj.user_id)) {
        user = {
          id: parsedObj.id || parsedObj.user_id,
          username: parsedObj.username || undefined,
          firstName: parsedObj.first_name || undefined,
          lastName: parsedObj.last_name || undefined,
          photoUrl: parsedObj.photo_url || undefined,
          languageCode: parsedObj.language_code || undefined,
          isPremium: Boolean(parsedObj.is_premium)
        };
      }
    }

    if (!startParam) {
      startParam = params.get('start_param') || params.get('startapp') || params.get('tgWebAppStartParam') || params.get('ref') || params.get('start');
    }
  } catch (e) {
    console.warn('Error parsing Telegram query string:', e);
  }

  return { user, startParam };
}

/**
 * Primary function to extract Telegram User Data with maximum resilience
 */
export function extractTelegramLaunchData(): TelegramLaunchData {
  let extractedUser: ParsedTelegramUser | null = null;
  let startParam: string | null = null;
  let sourceBot: string | null = null;
  let initDataRaw: string | null = null;

  if (typeof window === 'undefined') {
    return { user: null, startParam: null, sourceBot: null, initDataRaw: null };
  }

  try {
    // 1. Attempt using official window.Telegram.WebApp SDK
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready?.();
        tg.expand?.();
        tg.enableClosingConfirmation?.();
        tg.setHeaderColor?.('#0F1721');
        tg.setBackgroundColor?.('#0F1721');
        if (tg.setBottomBarColor) {
          tg.setBottomBarColor('#0F1721');
        }
      } catch (e) {}

      initDataRaw = tg.initData || null;

      if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        extractedUser = {
          id: u.id,
          username: u.username || undefined,
          firstName: u.first_name || undefined,
          lastName: u.last_name || undefined,
          photoUrl: u.photo_url || undefined,
          languageCode: u.language_code || undefined,
          isPremium: Boolean(u.is_premium)
        };
      }

      if (tg.initDataUnsafe?.start_param) {
        startParam = tg.initDataUnsafe.start_param;
      }
    }

    // 2. If user not found from WebApp.initDataUnsafe, parse tg.initData string
    if (!extractedUser && initDataRaw) {
      const parsedFromInit = parseTelegramQueryString(initDataRaw);
      if (parsedFromInit.user) extractedUser = parsedFromInit.user;
      if (parsedFromInit.startParam && !startParam) startParam = parsedFromInit.startParam;
    }

    // 3. Fallback: Parse location.hash (#tgWebAppData=...)
    if (!extractedUser) {
      const hashStr = window.location.hash || '';
      if (hashStr) {
        const parsedFromHash = parseTelegramQueryString(hashStr);
        if (parsedFromHash.user) extractedUser = parsedFromHash.user;
        if (parsedFromHash.startParam && !startParam) startParam = parsedFromHash.startParam;
      }
    }

    // 4. Fallback: Parse location.search (?tgWebAppData=... or ?startapp=...)
    const searchStr = window.location.search || '';
    if (searchStr) {
      const parsedFromSearch = parseTelegramQueryString(searchStr);
      if (!extractedUser && parsedFromSearch.user) extractedUser = parsedFromSearch.user;
      if (parsedFromSearch.startParam && !startParam) startParam = parsedFromSearch.startParam;

      const urlParams = new URLSearchParams(searchStr);
      sourceBot = urlParams.get('bot') || urlParams.get('source_bot') || null;
      
      // Also check direct URL params for testing/debugging
      const urlTgId = urlParams.get('tg_id') || urlParams.get('telegram_id') || urlParams.get('id');
      const urlTgUser = urlParams.get('tg_user') || urlParams.get('username');
      const urlFirstName = urlParams.get('first_name');
      const urlPhotoUrl = urlParams.get('photo_url');
      const urlLang = urlParams.get('lang') || urlParams.get('language_code');

      if (!extractedUser && urlTgId) {
        extractedUser = {
          id: urlTgId,
          username: urlTgUser || undefined,
          firstName: urlFirstName || undefined,
          photoUrl: urlPhotoUrl || undefined,
          languageCode: urlLang || undefined
        };
      } else if (extractedUser && !extractedUser.languageCode && urlLang) {
        extractedUser.languageCode = urlLang;
      }
    }

    // 5. Cache/Retrieve from sessionStorage/localStorage for persistence across SPA reloads
    if (extractedUser) {
      try {
        localStorage.setItem('tg_cached_user', JSON.stringify(extractedUser));
      } catch (e) {}
    } else {
      try {
        const cached = localStorage.getItem('tg_cached_user');
        if (cached) {
          const parsed = safeJsonParse<ParsedTelegramUser>(cached);
          if (parsed && parsed.id) extractedUser = parsed;
        }
      } catch (e) {}
    }

    // Check manual simulation storage
    const simulatedId = localStorage.getItem('tg_simulated_id');
    const simulatedUser = localStorage.getItem('tg_simulated_username');
    if (!extractedUser && simulatedId) {
      extractedUser = {
        id: simulatedId,
        username: simulatedUser || 'simulated_user',
        firstName: 'Tester'
      };
    }

  } catch (err) {
    console.warn('Error extracting Telegram launch data:', err);
  }

  return {
    user: extractedUser,
    startParam,
    sourceBot,
    initDataRaw
  };
}

/**
 * Whitelist for Persian language users authorized to access the platform.
 */
export const PERSIAN_WHITELIST_IDS = ['6011395996', '5951882585', '7432974430'];

/**
 * Checks if a user should be shown the generic System Maintenance screen.
 * - In Web Preview / Localhost / Non-Telegram browser sessions, restriction is bypassed for development.
 * - In Telegram WebApp sessions: checks device timezone (Asia/Tehran) and language (fa/farsi/iran).
 * - Telegram IDs in PERSIAN_WHITELIST_IDS always bypass all restrictions.
 */
export function isRestrictedPersianUser(
  userId?: number | string | null,
  rawLangCode?: string | null
): boolean {
  const idStr = userId ? String(userId).trim() : '';
  if (idStr && PERSIAN_WHITELIST_IDS.includes(idStr)) {
    return false;
  }

  // Exempt Web Preview / Localhost / Dev testing environments
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    // Check if running in AI Studio dev iframe or browser preview without Telegram session
    const hasTgInitData = Boolean(
      (window as any).Telegram?.WebApp?.initData ||
      hash.includes('tgWebAppData') ||
      search.includes('tgWebAppData') ||
      search.includes('tgWebApp')
    );

    // If opened directly in browser or preview (not inside Telegram WebApp), allow preview access
    if (!hasTgInitData && !userId) {
      return false;
    }

    if (search.includes('dev=1') || search.includes('preview=1') || hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }

    // 1. Timezone Check (Asia/Tehran / Iran) inside Telegram session
    try {
      const userTimeZone = (Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || '').toLowerCase();
      if (userTimeZone.includes('tehran') || userTimeZone.includes('iran')) {
        return true;
      }
    } catch {}
  }

  // 2. Telegram & Browser Language Check
  const tgLang = (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code : null) || '';
  const navLang = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  const navLangs = (typeof navigator !== 'undefined' && Array.isArray(navigator.languages) ? navigator.languages.join(',') : '') || '';

  const combinedLangs = `${rawLangCode || ''},${tgLang},${navLang},${navLangs}`.toLowerCase();

  return (
    combinedLangs.includes('fa') ||
    combinedLangs.includes('per') ||
    combinedLangs.includes('farsi') ||
    combinedLangs.includes('iran') ||
    combinedLangs.includes('tehran')
  );
}
