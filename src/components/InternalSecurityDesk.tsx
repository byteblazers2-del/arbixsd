import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_RATES } from '../utils/cryptoRates';
import { 
  UserData, 
  Plan, 
  DepositRecord, 
  Transaction, 
  WalletConfig, 
  SystemSettings 
} from '../types';
import { 
  subscribeWallets, 
  saveWalletConfig, 
  syncWalletIconToStorage,
  initializeDefaultWallets,
  subscribeDeposits,
  subscribeTransactions,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
  subscribeUsers,
  adjustUserBalance,
  toggleUserFreeze,
  toggleUserRole,
  subscribePlans,
  createPlan,
  updatePlan,
  deletePlan,
  getSystemSettings,
  saveSystemSettings,
  DEFAULT_ADMIN_TELEGRAM_IDS
} from '../services/systemService';
import { CryptoIcon } from '../components/CryptoIcon';
import { TelegramStarIcon } from '../components/TelegramStarIcon';
import { BlockchainScannerModal } from '../components/BlockchainScannerModal';
import { 
  Shield, 
  Zap, 
  Wallet, 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Lock, 
  Unlock, 
  Settings, 
  Bot, 
  X, 
  Upload, 
  MessageSquare, 
  ChevronRight,
  ExternalLink,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminBotsHub = React.lazy(() => 
  import('../components/AdminBotsHub').then(m => ({ default: m.AdminBotsHub }))
);

type AdminTab = 'dashboard' | 'deposits' | 'withdrawals' | 'wallets' | 'users' | 'plans' | 'bots' | 'settings';

interface InternalSecurityDeskProps {
  onClose?: () => void;
}

export function InternalSecurityDesk({ onClose }: InternalSecurityDeskProps) {
  const { user, isAdmin, refreshSettings } = useAuth();
  
  // Navigation
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Real-time collections
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filters
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [userFilter, setUserFilter] = useState<'all' | 'depositors' | 'frozen' | 'admins'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [walletSearchQuery, setWalletSearchQuery] = useState('');

  // Modals
  const [editingWallet, setEditingWallet] = useState<WalletConfig | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserData | null>(null);
  const [inspectUser, setInspectUser] = useState<UserData | null>(null);
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');
  const [balanceAdjustType, setBalanceAdjustType] = useState<'add_balance' | 'deduct_balance'>('add_balance');
  const [balanceAdjustReason, setBalanceAdjustReason] = useState('');
  const [balanceAdjustCoin, setBalanceAdjustCoin] = useState<string>('USDT');
  const [rejectionModalDeposit, setRejectionModalDeposit] = useState<DepositRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newAdminTgId, setNewAdminTgId] = useState('');

  // Scanner Modal
  const [scannerModal, setScannerModal] = useState<{
    isOpen: boolean;
    deposit?: DepositRecord | null;
    txid?: string;
    address?: string;
    network: string;
    coin: string;
  }>({
    isOpen: false,
    network: 'trc20',
    coin: 'USDT'
  });

  // New Plan form
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    minAmount: 20,
    maxAmount: 5000,
    expectedReturnPct: 45,
    dailyReturnPct: 3.2,
    durationDays: 14,
    badge: 'HOT',
    description: 'Automated cross-exchange arbitrage cycle',
    isActive: true
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Live Firestore Subscriptions
  useEffect(() => {
    if (!isAdmin && user?.role !== 'admin') return;

    const unsubDep = subscribeDeposits(setDeposits);
    const unsubTx = subscribeTransactions(setTransactions);
    const unsubWal = subscribeWallets(setWallets);
    const unsubPln = subscribePlans(setPlans);
    const unsubUsr = subscribeUsers(setUsers);

    getSystemSettings().then(setSettings);

    return () => {
      unsubDep();
      unsubTx();
      unsubWal();
      unsubPln();
      unsubUsr();
    };
  }, [isAdmin, user?.role]);

  // Derived metrics
  const pendingDeposits = useMemo(() => deposits.filter(d => d.status === 'pending'), [deposits]);
  const pendingWithdrawals = useMemo(() => transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending'), [transactions]);
  const totalApprovedDepositsUsd = useMemo(() => 
    deposits.filter(d => d.status === 'approved').reduce((acc, d) => acc + (Number(d.usdAmount) || 0), 0)
  , [deposits]);
  const totalCompletedWithdrawalsUsd = useMemo(() => 
    transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
  , [transactions]);
  const totalUserBalances = useMemo(() => 
    users.reduce((acc, u) => acc + (Number(u.balance) || 0), 0)
  , [users]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    if (depositFilter === 'all') return deposits;
    return deposits.filter(d => d.status === depositFilter);
  }, [deposits, depositFilter]);

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    const list = transactions.filter(t => t.type === 'withdrawal');
    if (withdrawalFilter === 'all') return list;
    return list.filter(t => t.status === withdrawalFilter);
  }, [transactions, withdrawalFilter]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (u.telegramUsername && u.telegramUsername.toLowerCase().includes(q)) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)) ||
        String(u.telegramId).includes(q) ||
        u.id.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (userFilter === 'depositors') return (u.balance || 0) > 0;
      if (userFilter === 'frozen') return u.isFrozen;
      if (userFilter === 'admins') return u.role === 'admin';
      return true;
    });
  }, [users, userSearchQuery, userFilter]);

  // Filtered wallets
  const filteredWallets = useMemo(() => {
    const q = walletSearchQuery.toLowerCase().trim();
    if (!q) return wallets;
    return wallets.filter(w => 
      w.coinSymbol.toLowerCase().includes(q) ||
      w.networkName?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q)
    );
  }, [wallets, walletSearchQuery]);

  // Actions
  const handleApproveDeposit = async (dep: DepositRecord) => {
    setIsLoading(true);
    const res = await approveDeposit(dep);
    setIsLoading(false);
    if (res.success) {
      showToast(`Deposit of $${dep.usdAmount} approved`);
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  const handleConfirmRejectDeposit = async () => {
    if (!rejectionModalDeposit) return;
    setIsLoading(true);
    const res = await rejectDeposit(rejectionModalDeposit, rejectionReason);
    setIsLoading(false);
    setRejectionModalDeposit(null);
    setRejectionReason('');
    showToast(res.message);
  };

  const handleApproveWithdrawal = async (tx: Transaction) => {
    setIsLoading(true);
    const res = await approveWithdrawal(tx);
    setIsLoading(false);
    showToast(res.message);
  };

  const handleRejectWithdrawal = async (tx: Transaction) => {
    if (!confirm(`Are you sure you want to reject withdrawal of $${tx.amount} and refund the user?`)) return;
    setIsLoading(true);
    const res = await rejectWithdrawal(tx, 'Rejected by admin');
    setIsLoading(false);
    showToast(res.message);
  };

  const handleSaveWallet = async () => {
    if (!editingWallet) return;
    setIsLoading(true);
    try {
      await saveWalletConfig(editingWallet);
      syncWalletIconToStorage(editingWallet);
      await refreshSettings();
      showToast(`Wallet ${editingWallet.coinSymbol} saved`);
      setEditingWallet(null);
    } catch (e: any) {
      showToast('Save error: ' + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBalanceAdjustment = async () => {
    if (!selectedUserForBalance) return;
    const amt = parseFloat(balanceAdjustAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsLoading(true);
    try {
      const isDeduct = balanceAdjustType === 'deduct_balance';
      const coin = balanceAdjustCoin.toUpperCase();
      const multiplier = isDeduct ? -1 : 1;
      
      let usdChange = amt;
      let cryptoChange = amt;

      if (coin !== 'USDT') {
        const rate = FALLBACK_RATES[coin] || 1;
        usdChange = parseFloat((amt * rate).toFixed(2));
        cryptoChange = amt;
      }

      await adjustUserBalance(
        selectedUserForBalance.id, 
        usdChange * multiplier, 
        'balance', 
        balanceAdjustReason || `Manual admin adjustment (${coin})`,
        coin,
        cryptoChange * multiplier
      );

      setSelectedUserForBalance(null);
      setBalanceAdjustAmount('');
      setBalanceAdjustReason('');
      setBalanceAdjustCoin('USDT');
      showToast(`User balance updated successfully`);
    } catch (err: any) {
      alert(err.message || 'Error updating balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsLoading(true);
    try {
      await saveSystemSettings(settings);
      if (settings.starsIconUrl) {
        localStorage.setItem('custom_stars_icon_url', settings.starsIconUrl);
        localStorage.setItem('custom_icon_STARS', settings.starsIconUrl);
      } else {
        localStorage.removeItem('custom_stars_icon_url');
      }
      await refreshSettings();
      showToast('Settings saved');
    } catch (e: any) {
      showToast('Save error: ' + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdminTelegramId = async () => {
    const cleanId = newAdminTgId.trim();
    if (!cleanId) return;
    const current = settings?.adminTelegramIds || DEFAULT_ADMIN_TELEGRAM_IDS;
    if (current.map(String).includes(cleanId)) {
      alert('This ID already exists in the admin list.');
      return;
    }
    const updated = [...current, cleanId];
    await saveSystemSettings({ adminTelegramIds: updated });
    setSettings(prev => prev ? { ...prev, adminTelegramIds: updated } : null);
    setNewAdminTgId('');
    showToast(`ID ${cleanId} added to admin list`);
  };

  const handleRemoveAdminTelegramId = async (idToRemove: string | number) => {
    if (!confirm(`Are you sure you want to remove ID ${idToRemove}?`)) return;
    const current = settings?.adminTelegramIds || DEFAULT_ADMIN_TELEGRAM_IDS;
    const updated = current.filter(id => String(id) !== String(idToRemove));
    await saveSystemSettings({ adminTelegramIds: updated });
    setSettings(prev => prev ? { ...prev, adminTelegramIds: updated } : null);
    showToast(`ID removed`);
  };

  // Auth Guard
  if (!isAdmin && user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <div className="w-full max-w-sm p-6 text-center bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Access Restricted</h2>
          <p className="mt-1 text-xs text-white/50">You do not have permission to access this panel.</p>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0F0F12] text-white select-none overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* macOS WINDOW TOOLBAR                                                      */}
      {/* ========================================================================= */}
      <div className="h-14 px-4 bg-[#18181C]/90 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between shrink-0">
        
        {/* Left: Window Traffic Lights / Close */}
        <div className="flex items-center space-x-2 space-x-reverse">
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] active:scale-95 transition-all text-white/70 hover:text-white"
              title="Close Portal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center space-x-2 mr-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">System Security Desk</span>
          </div>
        </div>

        {/* Right: Quick Refresh & Admin Info */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => refreshSettings()}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/60 hover:text-white active:scale-95 transition-all"
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#007AFF]' : ''}`} />
          </button>
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] text-white/70">
            <Shield className="w-3 h-3 text-[#007AFF]" />
            <span>{user?.telegramUsername ? `@${user.telegramUsername}` : 'Admin'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* macOS SEGMENTED CONTROL TABS                                              */}
      {/* ========================================================================= */}
      <div className="px-3 py-2 bg-[#141418] border-b border-white/[0.06] overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center space-x-1 p-1 bg-black/40 rounded-xl border border-white/[0.05] min-w-max">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Zap className="w-3.5 h-3.5" /> },
            { 
              id: 'deposits', 
              label: 'Deposits', 
              icon: <ArrowDownLeft className="w-3.5 h-3.5" />,
              badge: pendingDeposits.length > 0 ? pendingDeposits.length : undefined 
            },
            { 
              id: 'withdrawals', 
              label: 'Withdrawals', 
              icon: <ArrowUpRight className="w-3.5 h-3.5" />,
              badge: pendingWithdrawals.length > 0 ? pendingWithdrawals.length : undefined 
            },
            { id: 'wallets', label: 'Wallets', icon: <Wallet className="w-3.5 h-3.5" /> },
            { id: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'plans', label: 'Strategies', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'bots', label: 'Telegram Bot', icon: <Bot className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive 
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm' 
                    : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT AREA                                                          */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-4">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Quick Metrics (macOS Widget Style) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-3.5">
                <span className="text-[11px] text-white/40 block">Total Users</span>
                <div className="text-xl font-bold text-white mt-0.5">{users.length}</div>
                <span className="text-[10px] text-emerald-400 mt-1 block">Registered</span>
              </div>

              <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-3.5">
                <span className="text-[11px] text-white/40 block">Approved Deposits</span>
                <div className="text-xl font-bold text-[#007AFF] mt-0.5">${totalApprovedDepositsUsd.toFixed(2)}</div>
                <span className="text-[10px] text-white/40 mt-1 block">{deposits.filter(d => d.status === 'approved').length} txs</span>
              </div>

              <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-3.5">
                <span className="text-[11px] text-white/40 block">Settled Withdrawals</span>
                <div className="text-xl font-bold text-white mt-0.5">${totalCompletedWithdrawalsUsd.toFixed(2)}</div>
                <span className="text-[10px] text-white/40 mt-1 block">Total Volume</span>
              </div>

              <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-3.5">
                <span className="text-[11px] text-white/40 block">User Balances</span>
                <div className="text-xl font-bold text-amber-400 mt-0.5">${totalUserBalances.toFixed(2)}</div>
                <span className="text-[10px] text-white/40 mt-1 block">Total Liabilities</span>
              </div>
            </div>

            {/* Pending Actions Quick List */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-bold text-white">Pending Actions</span>
                <span className="text-[11px] text-white/40">{pendingDeposits.length} pending deposits</span>
              </div>

              {pendingDeposits.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40">
                  No pending deposit requests.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {pendingDeposits.slice(0, 5).map(dep => (
                    <div key={dep.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <CryptoIcon symbol={dep.coin} network={dep.network} className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5 space-x-reverse">
                            <span className="text-xs font-bold text-white">${dep.usdAmount}</span>
                            <span className="text-[10px] text-white/50">{dep.cryptoAmount} {dep.coin}</span>
                          </div>
                          <span className="text-[11px] text-white/40 block mt-0.5">
                            {dep.telegramUsername ? `@${dep.telegramUsername}` : `ID: ${dep.userId.slice(0, 8)}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <button
                          onClick={() => handleApproveDeposit(dep)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectionModalDeposit(dep)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSITS */}
        {activeTab === 'deposits' && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1 space-x-reverse">
              {[
                { id: 'pending', label: `Pending (${pendingDeposits.length})` },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'all', label: 'All' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDepositFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                    depositFilter === f.id
                      ? 'bg-white/[0.15] text-white font-semibold'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Deposits List */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {filteredDeposits.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">No items found.</div>
              ) : (
                filteredDeposits.map(dep => {
                  const isPending = dep.status === 'pending';
                  const isApproved = dep.status === 'approved';
                  return (
                    <div key={dep.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <CryptoIcon symbol={dep.coin} network={dep.network} className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-sm font-bold text-white">${dep.usdAmount}</span>
                            <span className="text-[11px] text-white/50">{dep.cryptoAmount} {dep.coin} ({dep.network})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isApproved ? 'bg-emerald-500/15 text-emerald-400' :
                              isPending ? 'bg-amber-500/15 text-amber-300' :
                              'bg-rose-500/15 text-rose-400'
                            }`}>
                              {isApproved ? 'Approved' : isPending ? 'Pending' : 'Rejected'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 space-x-reverse text-[11px] text-white/40 mt-1">
                            <span>{dep.telegramUsername ? `@${dep.telegramUsername}` : dep.userId.slice(0, 10)}</span>
                            <span>•</span>
                            <span>{new Date(dep.createdAt || Date.now()).toLocaleDateString('fa-IR')}</span>
                            {dep.txHash && (
                              <>
                                <span>•</span>
                                <button
                                  onClick={() => copyText(dep.txHash!, `tx_${dep.id}`)}
                                  className="text-[#007AFF] hover:underline font-mono flex items-center space-x-1 space-x-reverse"
                                >
                                  <span>{dep.txHash.slice(0, 8)}...</span>
                                  {copiedId === `tx_${dep.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1.5 space-x-reverse self-end sm:self-auto">
                        {dep.txHash && (
                          <button
                            onClick={() => setScannerModal({
                              isOpen: true,
                              deposit: dep,
                              txid: dep.txHash,
                              network: dep.network,
                              coin: dep.coin
                            })}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-xs transition-all"
                            title="Inspect on Explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApproveDeposit(dep)}
                              disabled={isLoading}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold active:scale-95 transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectionModalDeposit(dep)}
                              disabled={isLoading}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold active:scale-95 transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1 space-x-reverse">
              {[
                { id: 'pending', label: `Pending (${pendingWithdrawals.length})` },
                { id: 'completed', label: 'Settled' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'all', label: 'All' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setWithdrawalFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                    withdrawalFilter === f.id
                      ? 'bg-white/[0.15] text-white font-semibold'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Withdrawals List */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {filteredWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">No withdrawal requests found.</div>
              ) : (
                filteredWithdrawals.map(tx => {
                  const isPending = tx.status === 'pending';
                  const isCompleted = tx.status === 'completed';
                  return (
                    <div key={tx.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <CryptoIcon symbol={tx.currency || 'USDT'} network={tx.network} className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-sm font-bold text-white">${tx.amount}</span>
                            <span className="text-[11px] text-white/50">{tx.currency}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isCompleted ? 'bg-emerald-500/15 text-emerald-400' :
                              isPending ? 'bg-amber-500/15 text-amber-300' :
                              'bg-rose-500/15 text-rose-400'
                            }`}>
                              {isCompleted ? 'Completed' : isPending ? 'Pending' : 'Rejected'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 space-x-reverse text-[11px] text-white/40 mt-1">
                            <span>ID: {tx.userId.slice(0, 10)}</span>
                            <span>•</span>
                            <span className="font-mono">{tx.address ? `${tx.address.slice(0, 10)}...` : 'No Address'}</span>
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex items-center space-x-1.5 space-x-reverse self-end sm:self-auto">
                          <button
                            onClick={() => handleApproveWithdrawal(tx)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold active:scale-95 transition-all"
                          >
                            Approve Deposit
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(tx)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold active:scale-95 transition-all"
                          >
                            Reject & Refund
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WALLETS */}
        {activeTab === 'wallets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search coin or network..."
                  value={walletSearchQuery}
                  onChange={e => setWalletSearchQuery(e.target.value)}
                  className="w-full bg-[#18181C]/90 border border-white/[0.07] rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>

              <button
                onClick={() => {
                  if (confirm('Reset wallets to default addresses?')) {
                    initializeDefaultWallets();
                    showToast('Wallets reset to default');
                  }
                }}
                className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-xs rounded-xl transition-all whitespace-nowrap"
              >
                Reset to Default
              </button>
            </div>

            {/* Wallets Grouped List */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {filteredWallets.map(w => (
                <div key={w.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      <CryptoIcon symbol={w.coinSymbol} network={w.networkName || w.networkId} customIconUrl={w.iconUrl} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-xs font-bold text-white">{w.coinSymbol}</span>
                        <span className="text-[10px] text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-md">{w.networkName}</span>
                        {w.iconUrl && (
                          <span className="text-[9px] text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.2 rounded">Custom Icon</span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 font-mono block mt-0.5 truncate max-w-xs">
                        {w.address || 'No Address'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingWallet(w)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 active:scale-95 transition-all"
                    title="Edit wallet & icon"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search user (name, ID)..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#18181C]/90 border border-white/[0.07] rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 space-x-reverse self-start sm:self-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'depositors', label: 'With Balance' },
                  { id: 'frozen', label: 'Frozen' },
                  { id: 'admins', label: 'Admins' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                      userFilter === f.id
                        ? 'bg-white/[0.15] text-white font-semibold'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">No users found.</div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.firstName ? u.firstName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="text-xs font-bold text-white">
                            {u.telegramUsername ? `@${u.telegramUsername}` : (u.firstName || 'Unknown')}
                          </span>
                          {u.role === 'admin' && (
                            <span className="text-[9px] bg-[#007AFF]/15 text-[#007AFF] px-1.5 py-0.2 rounded font-semibold">Admin</span>
                          )}
                          {u.isFrozen && (
                            <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.2 rounded font-semibold">Frozen</span>
                          )}
                        </div>
                        <span className="text-[11px] text-white/40 block mt-0.5">
                          ID: {u.telegramId || u.id.slice(0, 8)} • Balance: <strong className="text-white">${(u.balance || 0).toFixed(2)}</strong>
                        </span>
                        {u.phoneNumber && (
                          <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1 space-x-reverse mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-400 inline shrink-0" />
                            <span>{u.phoneNumber}</span>
                            {u.phoneVerified && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">TG Verified</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      {u.telegramUsername && (
                        <a
                          href={`https://t.me/${u.telegramUsername.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 active:scale-95 transition-all"
                          title="Open in Telegram"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedUserForBalance(u)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 font-medium active:scale-95 transition-all"
                      >
                        Adjust Balance
                      </button>
                      <button
                        onClick={async () => {
                          await toggleUserFreeze(u.id, !u.isFrozen);
                          showToast(`User status updated`);
                        }}
                        className={`p-2 rounded-xl transition-all ${
                          u.isFrozen ? 'bg-rose-500/15 text-rose-400' : 'bg-white/[0.06] text-white/50 hover:text-white'
                        }`}
                        title={u.isFrozen ? 'Unfreeze User' : 'Freeze User'}
                      >
                        {u.isFrozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Active Yield Strategies</span>
              <button
                onClick={() => setIsNewPlanModalOpen(true)}
                className="flex items-center space-x-1 space-x-reverse px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-xs font-medium active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Plan</span>
              </button>
            </div>

            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {plans.map(p => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
                        +{p.expectedReturnPct}% ({p.durationDays} Days)
                      </span>
                      {!p.isActive && (
                        <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.2 rounded">Inactive</span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/40 block mt-0.5">
                      Min: ${p.minAmount} • Max: ${p.maxAmount} • Daily return: {p.dailyReturnPct}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 space-x-reverse">
                    <button
                      onClick={() => setEditingPlan(p)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 active:scale-95 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete plan ${p.name}?`)) {
                          await deletePlan(p.id);
                          showToast('Plan deleted');
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: TELEGRAM BOTS */}
        {activeTab === 'bots' && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-white/40">Loading bot hub...</div>}>
            <AdminBotsHub />
          </Suspense>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            
            {/* System Limits Group */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-white block">System Financial Limits</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/50 block mb-1">Min Deposit ($)</label>
                  <input
                    type="number"
                    value={settings?.minDeposit || 10}
                    onChange={e => setSettings(prev => prev ? { ...prev, minDeposit: Number(e.target.value) } : null)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/50 block mb-1">Min Withdrawal ($)</label>
                  <input
                    type="number"
                    value={settings?.minWithdrawal || 10}
                    onChange={e => setSettings(prev => prev ? { ...prev, minWithdrawal: Number(e.target.value) } : null)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Stars Custom Icon Configuration */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <TelegramStarIcon size={24} />
                  <span className="text-xs font-bold text-white">Telegram Stars Image & Icon</span>
                </div>
                {settings?.starsIconUrl && (
                  <button
                    onClick={() => setSettings(prev => prev ? { ...prev, starsIconUrl: '' } : null)}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Remove image
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3 space-x-reverse p-2.5 bg-black/30 rounded-xl border border-white/[0.05]">
                <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-center shrink-0 p-1">
                  <TelegramStarIcon size={34} customIconUrl={settings?.starsIconUrl} />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Direct image link (https://...)"
                    value={settings?.starsIconUrl || ''}
                    onChange={e => setSettings(prev => prev ? { ...prev, starsIconUrl: e.target.value } : null)}
                    className="w-full bg-transparent text-xs text-white focus:outline-none font-mono placeholder:text-white/30"
                  />
                </div>
              </div>

              <label className="flex items-center justify-center space-x-2 space-x-reverse w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl cursor-pointer text-xs text-white transition-all">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload new image file</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const res = evt.target?.result as string;
                        if (res) setSettings(prev => prev ? { ...prev, starsIconUrl: res } : null);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            {/* Admin Whitelist */}
            <div className="bg-[#18181C]/90 border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-white block">Authorized Admin Telegram IDs</span>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="text"
                  placeholder="Numeric Telegram ID..."
                  value={newAdminTgId}
                  onChange={e => setNewAdminTgId(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
                <button
                  onClick={handleAddAdminTelegramId}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] text-xs font-semibold text-white active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5 mt-2">
                {(settings?.adminTelegramIds || DEFAULT_ADMIN_TELEGRAM_IDS).map(id => (
                  <div key={id} className="flex items-center justify-between p-2 rounded-xl bg-black/30 text-xs">
                    <span className="font-mono text-white/80">{id}</span>
                    <button
                      onClick={() => handleRemoveAdminTelegramId(id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="w-full py-3 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-xs font-bold rounded-xl active:scale-[0.99] transition-all shadow-lg shadow-[#007AFF]/20"
            >
              Save Settings
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: BALANCE ADJUSTMENT (macOS Sheet)                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedUserForBalance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px] font-telegram">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
              className="w-full max-w-sm bg-[#1C1C20] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 font-telegram"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Adjust User Balance</span>
                <button onClick={() => setSelectedUserForBalance(null)} className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

            <div className="p-3 bg-black/40 rounded-xl text-xs space-y-1">
              <div className="text-white/70">User: <strong className="text-white">{selectedUserForBalance.telegramUsername || selectedUserForBalance.id}</strong></div>
              {selectedUserForBalance.phoneNumber && (
                <div className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1 space-x-reverse">
                  <Phone className="w-3 h-3 text-emerald-400 inline shrink-0" />
                  <span>Phone: <strong className="text-white">{selectedUserForBalance.phoneNumber}</strong></span>
                </div>
              )}
              <div className="text-white/50">Current Balance: ${(selectedUserForBalance.balance || 0).toFixed(2)} USD</div>
            </div>

            <div className="flex space-x-1 space-x-reverse bg-black/30 p-1 rounded-xl">
              <button
                onClick={() => setBalanceAdjustType('add_balance')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  balanceAdjustType === 'add_balance' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50'
                }`}
              >
                + Credit Balance
              </button>
              <button
                onClick={() => setBalanceAdjustType('deduct_balance')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  balanceAdjustType === 'deduct_balance' ? 'bg-rose-500/20 text-rose-400' : 'text-white/50'
                }`}
              >
                - Debit Balance
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-white/50 block mb-1">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={balanceAdjustAmount}
                  onChange={e => setBalanceAdjustAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/50 block mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="Reason for balance change..."
                  value={balanceAdjustReason}
                  onChange={e => setBalanceAdjustReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 space-x-reverse pt-2">
              <button
                onClick={handleApplyBalanceAdjustment}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-xs font-semibold active:scale-98 transition-all cursor-pointer"
              >
                Apply Adjustment
              </button>
              <button
                onClick={() => setSelectedUserForBalance(null)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: EDIT WALLET & LOGO (macOS Sheet)                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px] font-telegram">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
              className="w-full max-w-sm bg-[#1C1C20] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 font-telegram"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <CryptoIcon symbol={editingWallet.coinSymbol} network={editingWallet.networkName} customIconUrl={editingWallet.iconUrl} className="w-6 h-6" />
                  <span className="text-sm font-bold text-white">{editingWallet.coinSymbol} ({editingWallet.networkName})</span>
                </div>
                <button onClick={() => setEditingWallet(null)} className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-white/50 block mb-1">Deposit Address</label>
                  <input
                    type="text"
                    value={editingWallet.address || ''}
                    onChange={e => setEditingWallet({ ...editingWallet, address: e.target.value })}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/50 block mb-1">Memo / Tag (Optional)</label>
                  <input
                    type="text"
                    value={editingWallet.memo || ''}
                    onChange={e => setEditingWallet({ ...editingWallet, memo: e.target.value })}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>

                {/* Logo / Image URL */}
                <div>
                  <label className="text-white/50 block mb-1">Custom Coin Logo</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="https://... or upload below"
                      value={editingWallet.iconUrl || ''}
                      onChange={e => setEditingWallet({ ...editingWallet, iconUrl: e.target.value })}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    />
                    <label className="flex items-center justify-center space-x-2 space-x-reverse w-full py-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl cursor-pointer text-xs text-white transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload logo file</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const base64 = ev.target?.result as string;
                              if (base64) setEditingWallet({ ...editingWallet, iconUrl: base64 });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 space-x-reverse pt-2">
                <button
                  onClick={handleSaveWallet}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-xs font-semibold active:scale-98 transition-all cursor-pointer"
                >
                  Save Wallet
                </button>
                <button
                  onClick={() => setEditingWallet(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: REJECT DEPOSIT REASON                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {rejectionModalDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px] font-telegram">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
              className="w-full max-w-sm bg-[#1C1C20] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 font-telegram"
            >
              <span className="text-sm font-bold text-white block">Rejection Reason</span>
              <input
                type="text"
                placeholder="E.g., Invalid tx hash or unconfirmed..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={handleConfirmRejectDeposit}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold active:scale-98 transition-all cursor-pointer"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setRejectionModalDeposit(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BLOCKCHAIN SCANNER MODAL                                                  */}
      {/* ========================================================================= */}
      {scannerModal.isOpen && (
        <BlockchainScannerModal
          isOpen={scannerModal.isOpen}
          onClose={() => setScannerModal(prev => ({ ...prev, isOpen: false }))}
          txid={scannerModal.txid}
          address={scannerModal.address}
          network={scannerModal.network}
          coin={scannerModal.coin}
          deposit={scannerModal.deposit}
          onApprove={() => {
            if (scannerModal.deposit) handleApproveDeposit(scannerModal.deposit);
            setScannerModal(prev => ({ ...prev, isOpen: false }));
          }}
          onReject={() => {
            if (scannerModal.deposit) setRejectionModalDeposit(scannerModal.deposit);
            setScannerModal(prev => ({ ...prev, isOpen: false }));
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TOAST NOTIFICATION                                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold rounded-full shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
