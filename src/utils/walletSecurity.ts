/**
 * Wallet Passcode & Session Security Utilities
 * Provides client-side PIN protection for the Assets/Wallet section.
 * - Persistent PIN storage in localStorage ('crypto_wallet_pin_code')
 * - In-memory session flag ('inMemorySessionUnlocked')
 *   -> Once unlocked in the active app session, stays unlocked while switching tabs (Home, Earn, Demo, Profile, Assets).
 *   -> When the app is closed and reopened or reloaded, the passcode must be entered again.
 */

const PIN_STORAGE_KEY = 'crypto_wallet_pin_code';

// In-memory session cache: persists across in-app tab changes (SPA route transitions)
// Resets to false whenever the user reloads or re-opens the app.
let inMemorySessionUnlocked: boolean = false;

function getStorageKey(baseKey: string, userId?: string | number): string {
  if (userId) {
    return `${baseKey}_${userId}`;
  }
  return baseKey;
}

/**
 * Checks whether the user has set up a 4-digit wallet passcode.
 */
export function isWalletPinSet(userId?: string | number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const userPin = userId ? localStorage.getItem(getStorageKey(PIN_STORAGE_KEY, userId)) : null;
    const defaultPin = localStorage.getItem(PIN_STORAGE_KEY);
    const pin = userPin || defaultPin;
    return Boolean(pin && pin.length === 4);
  } catch {
    return false;
  }
}

/**
 * Checks whether the wallet is currently unlocked in this app session.
 * Rule:
 * 1. If no PIN is configured, it is always unlocked.
 * 2. If PIN is configured, it requires unlocking once per app launch.
 *    Navigating between tabs in the app does NOT re-lock the wallet.
 */
export function isWalletUnlockedInSession(userId?: string | number): boolean {
  if (typeof window === 'undefined') return true;

  // If no PIN is configured, wallet does not require unlocking
  if (!isWalletPinSet(userId)) {
    return true;
  }

  // Check in-memory flag (active app session)
  return inMemorySessionUnlocked;
}

/**
 * Sets session unlock status for current app runtime.
 */
export function setWalletSessionUnlocked(
  unlockedOrUserId: boolean | string | number,
  maybeUnlocked?: boolean
): void {
  const unlocked = typeof unlockedOrUserId === 'boolean' ? unlockedOrUserId : Boolean(maybeUnlocked);
  inMemorySessionUnlocked = unlocked;
}

/**
 * Saves a new 4-digit PIN in localStorage and marks the current session as unlocked.
 * Accepts both (pin) and (userId, pin).
 */
export function saveWalletPin(
  userIdOrPin: string | number,
  maybePin?: string
): void {
  if (typeof window === 'undefined') return;
  const pin = maybePin !== undefined ? maybePin : String(userIdOrPin);
  const userId = maybePin !== undefined ? userIdOrPin : undefined;

  try {
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    if (userId) {
      localStorage.setItem(getStorageKey(PIN_STORAGE_KEY, userId), pin);
    }
    inMemorySessionUnlocked = true;
  } catch (e) {
    console.warn('LocalStorage error saving PIN:', e);
  }
}

export const saveNewWalletPin = saveWalletPin;

/**
 * Verifies entered PIN against saved PIN.
 * Accepts both (enteredPin) and (userId, enteredPin).
 * If match, unlocks the current session and returns true.
 */
export function verifyWalletPin(
  userIdOrPin: string | number,
  maybePin?: string
): boolean {
  if (typeof window === 'undefined') return false;
  const enteredPin = maybePin !== undefined ? maybePin : String(userIdOrPin);
  const userId = maybePin !== undefined ? userIdOrPin : undefined;

  try {
    const userPin = userId ? localStorage.getItem(getStorageKey(PIN_STORAGE_KEY, userId)) : null;
    const defaultPin = localStorage.getItem(PIN_STORAGE_KEY);
    const savedPin = userPin || defaultPin;

    if (savedPin && savedPin === enteredPin) {
      inMemorySessionUnlocked = true;
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

/**
 * Removes the configured PIN and resets session state.
 */
export function removeWalletPin(userId?: string | number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
    if (userId) {
      localStorage.removeItem(getStorageKey(PIN_STORAGE_KEY, userId));
    }
    inMemorySessionUnlocked = true;
  } catch (e) {
    console.warn('Error removing PIN:', e);
  }
}
