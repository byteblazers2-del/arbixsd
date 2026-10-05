import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserData, 
  Plan, 
  DepositRecord, 
  Transaction, 
  WalletConfig, 
  SystemSettings 
} from '../types';
import { SUPPORTED_COINS } from '../data/cryptoAssets';

export const ENV_ADMIN_TELEGRAM_IDS: (string | number)[] = (() => {
  const metaEnv = (import.meta as any).env;
  const envVal = metaEnv ? metaEnv.VITE_ADMIN_TELEGRAM_IDS : undefined;
  if (!envVal) return [];
  return String(envVal)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
})();

export const DEFAULT_ADMIN_TELEGRAM_IDS: (string | number)[] = [
  '5951882585',
  5951882585,
  'ai_zke',
  ...ENV_ADMIN_TELEGRAM_IDS
];

export const DEFAULT_SUPPORT_TELEGRAM_USERNAME = 
  ((import.meta as any).env && (import.meta as any).env.VITE_ADMIN_TELEGRAM_USERNAME) || 'ai_zke';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  announcement: '🚀 Arbitrage Engine v4.2 Online • Instant Deposits & Zero-Fee Withdrawals Active',
  isAnnouncementActive: true,
  announcementType: 'info',
  minDeposit: 10,
  minWithdrawal: 10,
  adminTelegramIds: DEFAULT_ADMIN_TELEGRAM_IDS,
  supportTelegramUsername: DEFAULT_SUPPORT_TELEGRAM_USERNAME,
  maintenanceMode: false,
  customIconUrls: {}
};

/**
 * Initialize default wallet configs from SUPPORTED_COINS if not yet populated
 */
export function getDefaultWalletConfigs(): WalletConfig[] {
  const configs: WalletConfig[] = [];
  SUPPORTED_COINS.forEach(coin => {
    coin.networks.forEach(net => {
      configs.push({
        id: `${coin.id}-${net.id}`,
        coinId: coin.id,
        coinSymbol: coin.symbol,
        networkId: net.id,
        networkName: net.name,
        address: net.address,
        memo: net.memo || '',
        minDeposit: net.minDeposit,
        isActive: true
      });
    });
  });
  return configs;
}

// ---------------------------------------------------------------------------
// SYSTEM SETTINGS & ADMIN IDS
// ---------------------------------------------------------------------------

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, 'system_config', 'settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SYSTEM_SETTINGS, ...snap.data() } as SystemSettings;
    }
  } catch (err) {
    // Silently fallback to defaults/local
  }
  return DEFAULT_SYSTEM_SETTINGS;
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  try {
    const docRef = doc(db, 'system_config', 'settings');
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {
    console.warn('Fallback saveSystemSettings:', e);
  }
}

// ---------------------------------------------------------------------------
// WALLET GATEWAYS (DEPOSIT ADDRESSES & MEMOS)
// ---------------------------------------------------------------------------

export function syncWalletIconToStorage(wallet: WalletConfig) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const coinSym = (wallet.coinSymbol || '').toUpperCase().trim();
  const netId = (wallet.networkId || '').toUpperCase().trim();
  const walletId = (wallet.id || '').toLowerCase().trim();

  // Always clean up legacy polluted generic USDT / USDC icons
  try {
    localStorage.removeItem('custom_icon_USDT');
    localStorage.removeItem('custom_icon_usdt');
    localStorage.removeItem('custom_icon_USDC');
    localStorage.removeItem('custom_icon_usdc');
  } catch {}

  const keys = [
    `custom_icon_wallet_${walletId}`,
    `custom_icon_${coinSym}_${netId}`
  ];

  if (wallet.networkName) {
    keys.push(`custom_icon_${coinSym}_${wallet.networkName.toUpperCase().replace(/[^A-Z0-9]/g, '')}`);
  }

  // Network specific aliases
  if (netId.includes('TON') || wallet.networkName?.toUpperCase().includes('TON') || walletId.includes('ton')) {
    keys.push(`custom_icon_${coinSym}_TON`, `custom_icon_wallet_${coinSym.toLowerCase()}-ton`);
  }
  if (netId.includes('TRC') || wallet.networkName?.toUpperCase().includes('TRC') || walletId.includes('trc')) {
    keys.push(`custom_icon_${coinSym}_TRC20`, `custom_icon_${coinSym}_TRON`, `custom_icon_wallet_${coinSym.toLowerCase()}-trc20`);
  }
  if (netId.includes('BEP') || netId.includes('BSC') || wallet.networkName?.toUpperCase().includes('BEP') || walletId.includes('bsc') || walletId.includes('bep')) {
    keys.push(`custom_icon_${coinSym}_BEP20`, `custom_icon_${coinSym}_BSC`, `custom_icon_wallet_${coinSym.toLowerCase()}-bsc`);
  }
  if (netId.includes('ERC') || wallet.networkName?.toUpperCase().includes('ERC') || wallet.networkName?.toUpperCase().includes('ETH') || walletId.includes('erc')) {
    keys.push(`custom_icon_${coinSym}_ERC20`, `custom_icon_${coinSym}_ETH`, `custom_icon_wallet_${coinSym.toLowerCase()}-erc20`);
  }
  if (netId.includes('SOL') || wallet.networkName?.toUpperCase().includes('SOL') || walletId.includes('sol')) {
    keys.push(`custom_icon_${coinSym}_SOL`, `custom_icon_wallet_${coinSym.toLowerCase()}-sol`);
  }
  if (netId.includes('POLY') || wallet.networkName?.toUpperCase().includes('POLY') || walletId.includes('polygon') || walletId.includes('matic')) {
    keys.push(`custom_icon_${coinSym}_POLYGON`, `custom_icon_wallet_${coinSym.toLowerCase()}-polygon`);
  }

  try {
    if (wallet.iconUrl && wallet.iconUrl.trim()) {
      keys.forEach(k => {
        if (k) localStorage.setItem(k, wallet.iconUrl!.trim());
      });
      // If it's a single-network coin (e.g. BTC, DOGE, SUI, BCH, STARS), also store general coin key
      if (coinSym !== 'USDT' && coinSym !== 'USDC') {
        localStorage.setItem(`custom_icon_${coinSym}`, wallet.iconUrl.trim());
      }
      if (coinSym === 'STARS' || coinSym === 'XTR' || walletId.includes('star')) {
        localStorage.setItem('custom_stars_icon_url', wallet.iconUrl.trim());
      }
    } else {
      keys.forEach(k => {
        if (k) localStorage.removeItem(k);
      });
      if (coinSym !== 'USDT' && coinSym !== 'USDC') {
        localStorage.removeItem(`custom_icon_${coinSym}`);
      }
      if (coinSym === 'STARS' || coinSym === 'XTR' || walletId.includes('star')) {
        localStorage.removeItem('custom_stars_icon_url');
      }
    }
  } catch {}
}

export function subscribeWallets(callback: (wallets: WalletConfig[]) => void) {
  try {
    const colRef = collection(db, 'system_wallets');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletConfig));
        list.forEach(w => syncWalletIconToStorage(w));
        callback(list);
      } else {
        const defaults = getDefaultWalletConfigs();
        defaults.forEach(w => syncWalletIconToStorage(w));
        callback(defaults);
      }
    }, () => {
      const defaults = getDefaultWalletConfigs();
      defaults.forEach(w => syncWalletIconToStorage(w));
      callback(defaults);
    });
  } catch {
    const defaults = getDefaultWalletConfigs();
    defaults.forEach(w => syncWalletIconToStorage(w));
    callback(defaults);
    return () => {};
  }
}

export async function saveWalletConfig(wallet: WalletConfig): Promise<void> {
  try {
    syncWalletIconToStorage(wallet);
    const docRef = doc(db, 'system_wallets', wallet.id);
    await setDoc(docRef, wallet, { merge: true });
  } catch (e) {
    console.warn('saveWalletConfig fallback:', e);
  }
}

export async function initializeDefaultWallets(): Promise<void> {
  const defaults = getDefaultWalletConfigs();
  for (const w of defaults) {
    try {
      await setDoc(doc(db, 'system_wallets', w.id), w, { merge: true });
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// DEPOSITS & TRANSACTIONS (APPROVE / REJECT / LIST)
// ---------------------------------------------------------------------------

export function subscribeDeposits(callback: (deposits: DepositRecord[]) => void) {
  let isAlive = true;
  let serverDeposits: DepositRecord[] = [];
  let firestoreDeposits: DepositRecord[] = [];

  const mergeAndNotify = () => {
    if (!isAlive) return;
    const merged = new Map<string, DepositRecord>();
    firestoreDeposits.forEach(d => merged.set(d.id, d));
    
    serverDeposits.forEach(d => {
      if (!merged.has(d.id)) {
        merged.set(d.id, d);
        // Bridge: Sync server-only deposit to Firestore
        try {
          setDoc(doc(db, 'deposits', d.id), d, { merge: true }).catch(() => {});
        } catch {}
      } else {
        const fsDep = merged.get(d.id)!;
        if (d.status !== fsDep.status) {
           merged.set(d.id, { ...fsDep, status: d.status });
           try {
             updateDoc(doc(db, 'deposits', d.id), { status: d.status }).catch(() => {});
           } catch {}
        }
      }
    });

    const list = Array.from(merged.values());
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    callback(list);
  };

  const fetchServerDeposits = async () => {
    try {
      const res = await fetch('/api/deposits').then(r => r.json());
      if (res.success && Array.isArray(res.deposits) && isAlive) {
        serverDeposits = res.deposits;
        mergeAndNotify();
      }
    } catch {
      // Fallback
    }
  };

  fetchServerDeposits();
  const interval = setInterval(fetchServerDeposits, 3000);

  // Also listen to Firestore if available
  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'deposits');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!snap.empty && isAlive) {
        firestoreDeposits = snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositRecord));
        mergeAndNotify();
      }
    }, () => {});
  } catch {
    // Ignore
  }

  return () => {
    isAlive = false;
    clearInterval(interval);
    unsubFirestore();
  };
}

export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  let isAlive = true;
  let serverTx: Transaction[] = [];
  let firestoreTx: Transaction[] = [];

  const mergeAndNotify = () => {
    if (!isAlive) return;
    const merged = new Map<string, Transaction>();
    firestoreTx.forEach(t => merged.set(t.id, t));
    
    serverTx.forEach(t => {
      if (!merged.has(t.id)) {
        merged.set(t.id, t);
        try {
          setDoc(doc(db, 'transactions', t.id), t, { merge: true }).catch(() => {});
        } catch {}
      }
    });

    const list = Array.from(merged.values());
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  };

  const fetchServerTx = async () => {
    try {
      const res = await fetch('/api/transactions').then(r => r.json());
      if (res.success && Array.isArray(res.transactions) && isAlive) {
        serverTx = res.transactions;
        mergeAndNotify();
      }
    } catch {
      // Fallback
    }
  };

  fetchServerTx();
  const interval = setInterval(fetchServerTx, 3500);

  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'transactions');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!snap.empty && isAlive) {
        firestoreTx = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        mergeAndNotify();
      }
    }, () => {});
  } catch {
    // Ignore
  }

  return () => {
    isAlive = false;
    clearInterval(interval);
    unsubFirestore();
  };
}

/**
 * Submit Deposit to Server API + Firestore
 */
export async function submitDeposit(depositData: Partial<DepositRecord>): Promise<{ success: boolean; deposit?: DepositRecord; message?: string }> {
  const coinSymbol = (depositData.coin || 'USDT').toUpperCase();
  const rawCryptoAmt = parseFloat(depositData.cryptoAmount || '0') || Number(depositData.usdAmount || 0);
  const usdVal = Number(depositData.usdAmount || 0);
  const isAutoApproved = depositData.status === 'approved';

  if (usdVal < 5) {
    return { success: false, message: 'Minimum deposit amount is $5.00 USD for all cryptocurrencies.' };
  }

  try {
    // 1. Submit to server API (instant write & admin Telegram notification)
    const serverRes = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depositData)
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      const savedDep = serverRes.deposit || depositData;

      // 2. Sync to Firestore in background
      try {
        await addDoc(collection(db, 'deposits'), {
          ...depositData,
          id: savedDep.id,
          createdAt: Date.now()
        });

        // If auto-approved, credit user's balance & cryptoBalances in Firestore and add transaction
        if (isAutoApproved && depositData.userId && depositData.userId !== 'guest_user') {
          const userRef = doc(db, 'users', depositData.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            const currentBalance = Number(userData.balance || 0);
            const curCryptoMap = userData.cryptoBalances || {};
            const curCoinBal = Number(curCryptoMap[coinSymbol] || (coinSymbol === 'USDT' ? currentBalance : 0));

            await updateDoc(userRef, {
              balance: parseFloat((currentBalance + usdVal).toFixed(2)),
              cryptoBalances: {
                ...curCryptoMap,
                [coinSymbol]: parseFloat((curCoinBal + rawCryptoAmt).toFixed(8))
              }
            });
          }

          // Add transaction log in Firestore
          await addDoc(collection(db, 'transactions'), {
            userId: depositData.userId,
            telegramUsername: depositData.telegramUsername || '',
            telegramId: depositData.telegramId || '',
            type: 'deposit',
            amount: usdVal,
            cryptoAmount: String(rawCryptoAmt),
            currency: coinSymbol,
            network: depositData.network || 'Mainnet',
            txid: depositData.txid || '',
            status: 'completed',
            createdAt: Date.now(),
            note: `Auto-verified on-chain deposit: ${rawCryptoAmt} ${coinSymbol} ($${usdVal} USD)`
          });
        }
      } catch (fsErr) {
        console.warn('Firestore sync note:', fsErr);
      }
      return { success: true, deposit: savedDep };
    }
  } catch (err: any) {
    console.warn('Server deposit submit fallback:', err);
  }

  // Fallback to direct Firestore
  try {
    const docRef = await addDoc(collection(db, 'deposits'), {
      ...depositData,
      createdAt: Date.now(),
      status: isAutoApproved ? 'approved' : 'pending'
    });

    if (isAutoApproved && depositData.userId && depositData.userId !== 'guest_user') {
      const userRef = doc(db, 'users', depositData.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        const currentBalance = Number(userData.balance || 0);
        const curCryptoMap = userData.cryptoBalances || {};
        const curCoinBal = Number(curCryptoMap[coinSymbol] || (coinSymbol === 'USDT' ? currentBalance : 0));

        await updateDoc(userRef, {
          balance: parseFloat((currentBalance + usdVal).toFixed(2)),
          cryptoBalances: {
            ...curCryptoMap,
            [coinSymbol]: parseFloat((curCoinBal + rawCryptoAmt).toFixed(8))
          }
        });
      }

      await addDoc(collection(db, 'transactions'), {
        userId: depositData.userId,
        telegramUsername: depositData.telegramUsername || '',
        telegramId: depositData.telegramId || '',
        type: 'deposit',
        amount: usdVal,
        cryptoAmount: String(rawCryptoAmt),
        currency: coinSymbol,
        network: depositData.network || 'Mainnet',
        txid: depositData.txid || '',
        status: 'completed',
        createdAt: Date.now(),
        note: `On-chain deposit: ${rawCryptoAmt} ${coinSymbol} ($${usdVal} USD)`
      });
    }

    return { success: true, deposit: { ...depositData, id: docRef.id } as DepositRecord };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to submit deposit' };
  }
}

/**
 * Approve a Deposit: Updates deposit doc status & credits user's balance
 */
export async function approveDeposit(deposit: DepositRecord): Promise<{ success: boolean; message: string }> {
  const coinSymbol = (deposit.coin || 'USDT').toUpperCase();
  const rawCryptoAmt = parseFloat(deposit.cryptoAmount || '0') || Number(deposit.usdAmount || 0);
  const usdVal = Number(deposit.usdAmount || 0);

  try {
    // 1. Server API Call
    const serverRes = await fetch(`/api/deposits/${deposit.id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      // Background firestore sync
      try {
        const depRef = doc(db, 'deposits', deposit.id);
        await updateDoc(depRef, { status: 'approved', approvedAt: Date.now() });

        if (deposit.userId && deposit.userId !== 'guest_user') {
          const userRef = doc(db, 'users', deposit.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            const currentBalance = Number(userData.balance || 0);
            const curCryptoMap = userData.cryptoBalances || {};
            const curCoinBal = Number(curCryptoMap[coinSymbol] || (coinSymbol === 'USDT' ? currentBalance : 0));

            await updateDoc(userRef, {
              balance: parseFloat((currentBalance + usdVal).toFixed(2)),
              cryptoBalances: {
                ...curCryptoMap,
                [coinSymbol]: parseFloat((curCoinBal + rawCryptoAmt).toFixed(8))
              }
            });
          }

          await addDoc(collection(db, 'transactions'), {
            userId: deposit.userId,
            telegramUsername: deposit.telegramUsername || '',
            telegramId: deposit.telegramId || '',
            type: 'deposit',
            amount: usdVal,
            cryptoAmount: String(rawCryptoAmt),
            currency: coinSymbol,
            network: deposit.network,
            txid: deposit.txid,
            status: 'completed',
            createdAt: Date.now(),
            note: `Approved deposit: ${rawCryptoAmt} ${coinSymbol} ($${usdVal} USD)`
          });
        }
      } catch {}
      return { success: true, message: serverRes.message || 'Deposit approved & balance credited!' };
    }
  } catch (e) {
    console.warn('Server approveDeposit fallback:', e);
  }

  // Firestore direct fallback
  try {
    const depRef = doc(db, 'deposits', deposit.id);
    await updateDoc(depRef, {
      status: 'approved',
      approvedAt: Date.now()
    });

    if (deposit.userId && deposit.userId !== 'guest_user') {
      const userRef = doc(db, 'users', deposit.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        const currentBalance = Number(userData.balance || 0);
        const curCryptoMap = userData.cryptoBalances || {};
        const curCoinBal = Number(curCryptoMap[coinSymbol] || (coinSymbol === 'USDT' ? currentBalance : 0));

        await updateDoc(userRef, {
          balance: parseFloat((currentBalance + usdVal).toFixed(2)),
          cryptoBalances: {
            ...curCryptoMap,
            [coinSymbol]: parseFloat((curCoinBal + rawCryptoAmt).toFixed(8))
          }
        });

        // 5% Instant Referral Commission to Inviter
        if (userData.referredBy && usdVal > 0) {
          const commission = parseFloat((usdVal * 0.05).toFixed(2));
          if (commission > 0) {
            try {
              const cleanRef = String(userData.referredBy).replace(/^ref_/, '').replace(/^tg_/, '').trim();
              let refUserDoc = await getDoc(doc(db, 'users', cleanRef));
              let refUserId = cleanRef;
              if (!refUserDoc.exists()) {
                const qSnap = await getDocs(query(collection(db, 'users'), where('telegramId', '==', Number(cleanRef) || cleanRef)));
                if (!qSnap.empty) {
                  refUserDoc = qSnap.docs[0];
                  refUserId = refUserDoc.id;
                }
              }
              if (refUserDoc.exists()) {
                const refData = refUserDoc.data() as UserData;
                const refBal = Number(refData.balance || 0);
                const refEarn = Number(refData.referralEarnings || 0);
                await updateDoc(doc(db, 'users', refUserId), {
                  balance: parseFloat((refBal + commission).toFixed(2)),
                  referralEarnings: parseFloat((refEarn + commission).toFixed(2))
                });
                await addDoc(collection(db, 'transactions'), {
                  userId: refUserId,
                  telegramUsername: refData.telegramUsername || '',
                  telegramId: refData.telegramId || '',
                  type: 'profit',
                  amount: commission,
                  cryptoAmount: String(commission),
                  currency: 'USDT',
                  status: 'completed',
                  createdAt: Date.now(),
                  note: `5% referral deposit commission from partner deposit ($${usdVal} USD)`
                });
              }
            } catch (e) {
              console.warn('Error crediting referral commission in client fallback:', e);
            }
          }
        }
      }

      await addDoc(collection(db, 'transactions'), {
        userId: deposit.userId,
        telegramUsername: deposit.telegramUsername || '',
        telegramId: deposit.telegramId || '',
        type: 'deposit',
        amount: usdVal,
        cryptoAmount: String(rawCryptoAmt),
        currency: coinSymbol,
        network: deposit.network,
        txid: deposit.txid,
        status: 'completed',
        createdAt: Date.now(),
        note: `Approved deposit for ${rawCryptoAmt} ${coinSymbol} ($${usdVal} USD)`
      });
    }

    return { success: true, message: `Deposit approved & balance credited!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to approve deposit' };
  }
}

/**
 * Reject a Deposit
 */
export async function rejectDeposit(deposit: DepositRecord, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const serverRes = await fetch(`/api/deposits/${deposit.id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      try {
        const depRef = doc(db, 'deposits', deposit.id);
        await updateDoc(depRef, { status: 'rejected', rejectedReason: reason });
      } catch {}
      return { success: true, message: 'Deposit marked as rejected.' };
    }
  } catch (e) {
    console.warn('Server rejectDeposit fallback:', e);
  }

  try {
    const depRef = doc(db, 'deposits', deposit.id);
    await updateDoc(depRef, {
      status: 'rejected',
      rejectedReason: reason || 'Invalid TxID or unconfirmed on-chain'
    });
    return { success: true, message: 'Deposit marked as rejected.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to reject deposit' };
  }
}

export async function submitWithdrawal(withdrawalData: {
  userId: string;
  telegramUsername?: string;
  telegramId?: number | string;
  amount: number;
  currency: string;
  network?: string;
  recipient: string;
}): Promise<{ success: boolean; message: string; tx?: Transaction }> {
  try {
    const serverRes = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withdrawalData)
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      const tx = serverRes.tx;
      try {
        await addDoc(collection(db, 'transactions'), tx);
        if (withdrawalData.userId && withdrawalData.userId !== 'guest_user') {
          const uRef = doc(db, 'users', withdrawalData.userId);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const curBal = Number(uSnap.data().balance || 0);
            await updateDoc(uRef, {
              balance: parseFloat(Math.max(0, curBal - withdrawalData.amount).toFixed(2))
            });
          }
        }
      } catch (fsErr) {
        console.warn('Firestore withdrawal sync note:', fsErr);
      }
      return { success: true, message: 'Withdrawal submitted successfully and is pending admin approval.', tx };
    } else {
      return { success: false, message: serverRes?.error || 'Failed to submit withdrawal request.' };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error submitting withdrawal.' };
  }
}

export async function approveWithdrawal(tx: Transaction): Promise<{ success: boolean; message: string }> {
  try {
    const serverRes = await fetch(`/api/withdrawals/${tx.id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      try {
        const txRef = doc(db, 'transactions', tx.id);
        await updateDoc(txRef, {
          status: 'completed',
          note: 'Processed & sent on-chain'
        });
      } catch {}
      return { success: true, message: `Withdrawal for $${tx.amount} ${tx.currency} approved!` };
    }
  } catch (e) {
    console.warn('Server approveWithdrawal fallback:', e);
  }

  try {
    const txRef = doc(db, 'transactions', tx.id);
    await updateDoc(txRef, {
      status: 'completed',
      note: 'Processed & sent on-chain'
    });
    return { success: true, message: `Withdrawal for $${tx.amount} ${tx.currency} approved!` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to approve withdrawal' };
  }
}

export async function rejectWithdrawal(tx: Transaction, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const serverRes = await fetch(`/api/withdrawals/${tx.id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(r => r.json());

    if (serverRes && serverRes.success) {
      try {
        const txRef = doc(db, 'transactions', tx.id);
        await updateDoc(txRef, {
          status: 'rejected',
          note: reason || 'Withdrawal rejected - funds refunded'
        });

        if (tx.userId && tx.userId !== 'guest_user') {
          const userRef = doc(db, 'users', tx.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const currentBalance = Number(userDoc.data().balance || 0);
            await updateDoc(userRef, {
              balance: parseFloat((currentBalance + Number(tx.amount)).toFixed(2))
            });
          }
        }
      } catch {}
      return { success: true, message: 'Withdrawal rejected and funds refunded to user.' };
    }
  } catch (e) {
    console.warn('Server rejectWithdrawal fallback:', e);
  }

  try {
    const txRef = doc(db, 'transactions', tx.id);
    await updateDoc(txRef, {
      status: 'rejected',
      note: reason || 'Withdrawal rejected - funds refunded'
    });

    if (tx.userId && tx.userId !== 'guest_user') {
      const userRef = doc(db, 'users', tx.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentBalance = Number(userDoc.data().balance || 0);
        await updateDoc(userRef, {
          balance: parseFloat((currentBalance + Number(tx.amount)).toFixed(2))
        });
      }
    }

    return { success: true, message: 'Withdrawal rejected and funds refunded to user.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to reject withdrawal' };
  }
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT & MANUAL ADJUSTMENTS
// ---------------------------------------------------------------------------

export function subscribeUsers(callback: (users: UserData[]) => void) {
  let isAlive = true;
  let serverUsers: UserData[] = [];
  let firestoreUsers: UserData[] = [];

  const mergeAndNotify = () => {
    if (!isAlive) return;
    const merged = new Map<string, UserData>();
    firestoreUsers.forEach(u => merged.set(u.id, u));
    
    serverUsers.forEach(u => {
      if (!merged.has(u.id)) {
        merged.set(u.id, u);
        // Bridge: Sync server-only user to Firestore
        try {
          const userRef = doc(db, 'users', u.id);
          setDoc(userRef, u, { merge: true }).catch(() => {});
        } catch {}
      } else {
        // Check if server has higher balance (e.g. from Stars payment)
        const fsUser = merged.get(u.id)!;
        if ((u.balance || 0) > (fsUser.balance || 0)) {
           merged.set(u.id, { ...fsUser, balance: u.balance });
           try {
             updateDoc(doc(db, 'users', u.id), { balance: u.balance }).catch(() => {});
           } catch {}
        }
      }
    });

    const list = Array.from(merged.values());
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  };

  const fetchServerUsers = async () => {
    try {
      const res = await fetch('/api/users').then(r => r.json());
      if (res.success && Array.isArray(res.users) && isAlive) {
        serverUsers = res.users;
        mergeAndNotify();
      }
    } catch {}
  };

  fetchServerUsers();
  const interval = setInterval(fetchServerUsers, 3000);

  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'users');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!snap.empty && isAlive) {
        firestoreUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
        mergeAndNotify();
      }
    }, () => {});
  } catch {}

  return () => {
    isAlive = false;
    clearInterval(interval);
    unsubFirestore();
  };
}

export async function adjustUserBalance(
  userId: string, 
  amountChange: number, 
  type: 'balance' | 'bonus',
  reason?: string,
  coin?: string,
  cryptoAmountChange?: number
): Promise<void> {
  // 1. Server API
  try {
    await fetch(`/api/users/${userId}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountChange, type, reason, coin, cryptoAmountChange })
    });
  } catch (e) {
    console.warn('Server adjustUserBalance fallback:', e);
  }

  // 2. Firestore
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data() as UserData;
      const updates: any = {};

      if (type === 'balance') {
        const current = Number(data.balance || 0);
        const next = Math.max(0, parseFloat((current + amountChange).toFixed(2)));
        updates.balance = next;

        if (coin) {
          const coinSym = coin.toUpperCase();
          const cDelta = cryptoAmountChange !== undefined ? cryptoAmountChange : amountChange;
          const curCryptoMap = data.cryptoBalances || {};
          const curCoinBal = Number(curCryptoMap[coinSym] || (coinSym === 'USDT' ? Math.max(0, current) : 0));
          const nextCoinBal = Math.max(0, parseFloat((curCoinBal + cDelta).toFixed(8)));
          
          updates.cryptoBalances = {
            ...curCryptoMap,
            [coinSym]: nextCoinBal
          };
        }
      } else {
        const current = Number(data.bonusBalance || 0);
        const next = Math.max(0, parseFloat((current + amountChange).toFixed(2)));
        updates.bonusBalance = next;
      }

      await updateDoc(userRef, updates);

      await addDoc(collection(db, 'transactions'), {
        userId,
        telegramUsername: data.telegramUsername || '',
        telegramId: data.telegramId || '',
        type: amountChange >= 0 ? 'bonus' : 'withdrawal',
        amount: Math.abs(amountChange),
        cryptoAmount: cryptoAmountChange ? String(Math.abs(cryptoAmountChange)) : String(Math.abs(amountChange)),
        currency: coin || 'USDT',
        status: 'completed',
        createdAt: Date.now(),
        note: reason || `Manual balance adjustment (${amountChange >= 0 ? '+' : ''}${amountChange} ${coin || 'USDT'} ${type})`
      });
    }
  } catch (e) {
    console.warn('Firestore adjust balance note:', e);
  }
}

export async function adjustUserCryptoBalance(
  userId: string,
  coin: string,
  cryptoAmountChange: number,
  usdValueChange: number,
  reason?: string
): Promise<void> {
  try {
    await adjustUserBalance(userId, usdValueChange, 'balance', reason, coin, cryptoAmountChange);
  } catch (e) {
    console.warn('adjustUserCryptoBalance note:', e);
  }
}

export async function toggleUserFreeze(userId: string, currentStatus: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isFrozen: !currentStatus });
  } catch (e) {
    console.warn('toggleUserFreeze note:', e);
  }
}

export async function toggleUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role: newRole });
  } catch (e) {
    console.warn('toggleUserRole note:', e);
  }
}

// ---------------------------------------------------------------------------
// INVESTMENT PLANS (FULL CRUD VIA SERVER API + FIRESTORE FALLBACK)
// ---------------------------------------------------------------------------

export const DEFAULT_PLANS: Plan[] = [
  { 
    id: 'p1', 
    name: 'TON / USDT AMM Liquidity Vault (7 Days)', 
    minAmount: 10, 
    maxAmount: 1000,
    durationDays: 7, 
    expectedReturnPct: 8.40, 
    dailyReturnPct: 1.20,
    badge: 'TON DEFI',
    description: 'Provide micro-liquidity to STON.fi & DeDust DEXs with daily 0.3% trading fee accrual',
    isActive: true
  },
  { 
    id: 'p2', 
    name: 'SOL & BTC High-Velocity Pool (14 Days)', 
    minAmount: 25, 
    maxAmount: 5000,
    durationDays: 14, 
    expectedReturnPct: 14.70, 
    dailyReturnPct: 1.05,
    badge: 'MULTI-AMM',
    description: 'Cross-chain AMM liquidity routing on Uniswap v3 & Raydium CLMM with automated fee compounding',
    isActive: true
  },
  { 
    id: 'p3', 
    name: 'Deep Institutional Liquidity Core (30 Days)', 
    minAmount: 100, 
    maxAmount: 20000,
    durationDays: 30, 
    expectedReturnPct: 30.00, 
    dailyReturnPct: 1.00,
    badge: 'CORE VAULT',
    description: 'Aggregated liquidity pool supplying high-volume DEX trading pairs with priority fee yields',
    isActive: true
  },
  { 
    id: 'p4', 
    name: 'Whale Market-Making Protocol (60 Days)', 
    minAmount: 500, 
    maxAmount: 100000,
    durationDays: 60, 
    expectedReturnPct: 66.00, 
    dailyReturnPct: 1.10,
    badge: 'VIP WHALE',
    description: 'Direct institutional liquidity provisioning with specialized zero-slippage fee rebating',
    isActive: true
  },
];

export function subscribePlans(callback: (plans: Plan[]) => void) {
  let isAlive = true;

  const fetchServerPlans = async () => {
    try {
      const res = await fetch('/api/plans').then(r => r.json());
      if (res.success && Array.isArray(res.plans) && res.plans.length > 0 && isAlive) {
        callback(res.plans);
      }
    } catch {}
  };

  fetchServerPlans();
  const interval = setInterval(fetchServerPlans, 4000);

  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'plans');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!snap.empty && isAlive) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
        list.sort((a, b) => a.minAmount - b.minAmount);
        callback(list);
      }
    }, () => {});
  } catch {}

  return () => {
    isAlive = false;
    clearInterval(interval);
    unsubFirestore();
  };
}

export async function initializeDefaultPlans(): Promise<void> {
  // Server already initializes default plans
}

export async function createPlan(plan: Omit<Plan, 'id'>): Promise<string> {
  // 1. Server API
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    }).then(r => r.json());

    if (res.success && res.plan?.id) {
      try {
        await setDoc(doc(db, 'plans', res.plan.id), res.plan, { merge: true });
      } catch {}
      return res.plan.id;
    }
  } catch (e) {
    console.warn('Server createPlan fallback:', e);
  }

  // 2. Firestore fallback
  try {
    const colRef = collection(db, 'plans');
    const res = await addDoc(colRef, {
      ...plan,
      isActive: plan.isActive ?? true
    });
    return res.id;
  } catch {
    return `plan_${Date.now()}`;
  }
}

export async function updatePlan(id: string, plan: Partial<Plan>): Promise<void> {
  // 1. Server API (never throws permission errors)
  try {
    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    }).then(r => r.json());

    if (res && res.success) {
      // Silently try Firestore in background
      try {
        const docRef = doc(db, 'plans', id);
        await setDoc(docRef, plan, { merge: true });
      } catch {}
      return;
    }
  } catch (e) {
    console.warn('Server updatePlan fallback:', e);
  }

  // 2. Firestore fallback
  try {
    const docRef = doc(db, 'plans', id);
    await setDoc(docRef, plan, { merge: true });
  } catch (e: any) {
    console.warn('Firestore update plan note:', e);
  }
}

export async function deletePlan(id: string): Promise<void> {
  try {
    await fetch(`/api/plans/${id}`, { method: 'DELETE' });
  } catch {}

  try {
    const docRef = doc(db, 'plans', id);
    await deleteDoc(docRef);
  } catch {}
}

/**
 * Real-time subscription to get referred users for a specific inviter
 */
export function subscribeUserReferrals(
  userId: string | number, 
  telegramId: string | number | null | undefined, 
  callback: (referrals: UserData[]) => void
) {
  let isAlive = true;
  let serverRefs: UserData[] = [];
  let firestoreRefs: UserData[] = [];

  const uid = String(userId).trim();
  const tgid = telegramId ? String(telegramId).trim() : '';

  const isMatchingReferrer = (referredByVal?: string | null) => {
    if (!referredByVal) return false;
    const cleanRef = String(referredByVal).replace(/^ref_/, '').replace(/^tg_/, '').trim();
    if (uid && (referredByVal === uid || referredByVal === `ref_${uid}` || cleanRef === uid)) return true;
    if (tgid && (referredByVal === tgid || referredByVal === `ref_${tgid}` || cleanRef === tgid)) return true;
    return false;
  };

  const mergeAndNotify = () => {
    if (!isAlive) return;
    const map = new Map<string, UserData>();
    firestoreRefs.forEach(u => {
      if (isMatchingReferrer(u.referredBy)) {
        map.set(u.id, u);
      }
    });

    serverRefs.forEach(u => {
      if (isMatchingReferrer(u.referredBy) && !map.has(u.id)) {
        map.set(u.id, u);
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  };

  const fetchServerReferrals = async () => {
    try {
      const targetId = tgid || uid;
      const res = await fetch(`/api/referrals/${targetId}`).then(r => r.json());
      if (res.success && Array.isArray(res.referrals) && isAlive) {
        serverRefs = res.referrals;
        mergeAndNotify();
      }
    } catch {}
  };

  fetchServerReferrals();
  const interval = setInterval(fetchServerReferrals, 3500);

  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'users');
    unsubFirestore = onSnapshot(colRef, (snap) => {
      if (!snap.empty && isAlive) {
        firestoreRefs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
        mergeAndNotify();
      }
    }, () => {});
  } catch {}

  return () => {
    isAlive = false;
    clearInterval(interval);
    unsubFirestore();
  };
}

