import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getExplorerForNetwork, 
  BlockchainExplorerInfo 
} from '../utils/blockchainExplorers';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { DepositRecord } from '../types';

interface BlockchainScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit?: DepositRecord | null;
  depositRecord?: DepositRecord | null;
  customTxId?: string;
  txid?: string;
  customAddress?: string;
  address?: string;
  network: string;
  coinSymbol?: string;
  coin?: string;
  onApprove?: (deposit: DepositRecord) => void;
  onReject?: (deposit: DepositRecord) => void;
}

export function BlockchainScannerModal({
  isOpen,
  onClose,
  deposit,
  depositRecord,
  customTxId,
  txid,
  customAddress,
  address,
  network,
  coinSymbol,
  coin,
  onApprove,
  onReject
}: BlockchainScannerModalProps) {
  const activeDeposit = deposit || depositRecord;
  const activeTxId = customTxId || txid || activeDeposit?.txid || '';
  const activeAddress = customAddress || address || activeDeposit?.senderAddress || activeDeposit?.depositAddress || '';
  const activeCoin = coinSymbol || coin || activeDeposit?.coin || 'USDT';
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [isIframeError, setIsIframeError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const txId = (activeTxId || '').trim();
  const targetAddress = (activeAddress || '').trim();
  const explorer: BlockchainExplorerInfo = getExplorerForNetwork(network);

  const txUrl = txId ? explorer.txUrlTemplate(txId) : '';
  const addressUrl = targetAddress ? explorer.addressUrlTemplate(targetAddress) : '';
  const activeUrl = txUrl || addressUrl;

  const validation = explorer.validateHash(txId);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTelegramUser = () => {
    if (activeDeposit?.telegramUsername) {
      window.open(`https://t.me/${activeDeposit.telegramUsername.replace('@', '')}`, '_blank');
    } else if (activeDeposit?.telegramId) {
      window.open(`tg://user?id=${activeDeposit.telegramId}`, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-[6px] transform-gpu font-telegram">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
          className={`w-full bg-[#1C1C1E] rounded-2xl flex flex-col overflow-hidden transform-gpu will-change-transform font-telegram border border-white/[0.08] ${ isFullscreen ? 'h-[96vh] max-w-5xl' : 'h-full max-w-2xl' }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#242426] border-b border-white/[0.06]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2EA5FF]/15 flex items-center justify-center border-[#2EA5FF]/30">
                <Globe className="w-4 h-4 text-[#2EA5FF]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-black text-white">{explorer.explorerName}</h3>
                  <span className="px-1.5 py-0.2 bg-[#2EA5FF]/15 text-[#2EA5FF] text-[9px] font-extrabold rounded">
                    LIVE SCANNER
                  </span>
                </div>
                <p className="text-[10px] text-[#8295A8] font-mono">
                  {explorer.networkName} • {coinSymbol}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="p-1.5 hover:bg-white/10 text-[#8295A8] hover:text-white rounded-lg transition-colors"
                title="Reload Explorer Frame"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-white/10 text-[#8295A8] hover:text-white rounded-lg transition-colors hidden sm:block"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white/80 hover:text-white rounded-lg transition-colors flex items-center space-x-1 text-[10px] font-bold px-2"
              >
                <span>Direct Web</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-rose-500/20 text-[#8295A8] hover:text-rose-400 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TxID & Verification Card */}
          <div className="p-3.5 bg-[#242426]/70 border-b border-white/[0.06] space-y-2.5">
            {/* Hash & Copy */}
            <div className="bg-[#1C1C1E] rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#8295A8] font-semibold uppercase">TxID Hash / Signature:</span>
                <span className="font-mono text-[#8295A8] text-[9px]">{explorer.hashPatternName}</span>
              </div>
              
              <div className="flex items-center justify-between bg-[#1C1C1E] p-2 rounded-xl font-mono text-xs text-white">
                <span className="truncate pr-2 text-amber-300 select-all">
                  {txId || 'No TxID submitted'}
                </span>
                <button
                  onClick={() => copyToClipboard(txId)}
                  className="p-1.5 hover:bg-white/10 text-[#8295A8] hover:text-white rounded-lg shrink-0 flex items-center space-x-1 text-[10px] font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#2EA5FF]" />
                      <span className="text-[#2EA5FF]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Validation & Live Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className={`p-2.5 rounded-xl flex items-center space-x-2 ${ validation.valid ? 'bg-[#2EA5FF]/10 border-[#2EA5FF]/20 text-[#2EA5FF]' : 'bg-rose-500/10 border-rose-500/20 text-rose-400' }`}>
                {validation.valid ? (
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <div className="leading-tight truncate">
                  <span className="font-bold block text-[10px] uppercase">
                    {validation.valid ? 'Hash Format Verified' : 'Format Warning'}
                  </span>
                  <span className="text-[9px] opacity-80">{validation.message}</span>
                </div>
              </div>

              {deposit && (
                <div className="p-2.5 rounded-xl bg-[#1C1C1E] flex items-center justify-between">
                  <div className="text-[10px]">
                    <span className="text-[#8295A8] block">User Amount:</span>
                    <span className="text-white font-bold">${deposit.usdAmount} USDT ({deposit.coin})</span>
                  </div>

                  {deposit.telegramUsername && (
                    <button
                      onClick={handleOpenTelegramUser}
                      className="px-2.5 py-1 bg-[#2EA5FF]/20 hover:bg-[#2EA5FF]/30 text-[#2EA5FF] text-[10px] font-bold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>@{deposit.telegramUsername}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Embedded Explorer Frame */}
          <div className="flex-1 relative min-h-[280px] sm:min-h-[380px] bg-black/90 flex flex-col">
            {activeUrl ? (
              <>
                <iframe
                  key={iframeKey}
                  src={activeUrl}
                  title="Blockchain Explorer Scanner"
                  className="w-full flex-1 -0 rounded-b-2xl bg-white"
                  sandbox="allow-scripts allow-popups allow-forms allow-modals"
                  onLoad={() => {
                    setIsIframeLoaded(true);
                    setIsIframeError(false);
                  }}
                  onError={() => {
                    setIsIframeError(true);
                  }}
                />

                {/* Explorer Quick Action Bar (Overlaid at top of frame) */}
                <div className="absolute top-2 right-2 flex items-center space-x-1.5 bg-[#1C1C1E]/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-[#2EA5FF] animate-ping" />
                  <span className="text-white font-mono font-semibold">Live On-Chain View</span>
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2EA5FF] hover:underline flex items-center space-x-0.5 ml-1"
                  >
                    <span>New Tab</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8295A8]">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs font-bold text-white">No TxID or Address available for this record</p>
                <p className="text-[10px] mt-1">Please ensure user submitted an on-chain transaction hash.</p>
              </div>
            )}
          </div>

          {/* Quick Decision Footer for Admins */}
          {deposit && deposit.status === 'pending' && (
            <div className="p-3 bg-[#242426] border-t border-white/[0.06] flex gap-2">
              {onApprove && (
                <button
                  onClick={() => {
                    onApprove(deposit);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-[#2481CC] hover:bg-[#1D74BD] text-white text-xs font-extrabold rounded-xl active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Credit Balance (${deposit.usdAmount})</span>
                </button>
              )}

              {onReject && (
                <button
                  onClick={() => {
                    onReject(deposit);
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center space-x-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Tx</span>
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
