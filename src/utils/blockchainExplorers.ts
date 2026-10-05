export interface BlockchainExplorerInfo {
  networkId: string;
  networkName: string;
  explorerName: string;
  txUrlTemplate: (txid: string) => string;
  addressUrlTemplate: (address: string) => string;
  canEmbedIframe?: boolean;
  hashPatternName: string;
  samplePlaceholder: string;
  validateHash: (txid: string) => { valid: boolean; message: string };
}

export const BLOCKCHAIN_EXPLORERS: Record<string, BlockchainExplorerInfo> = {
  ton: {
    networkId: 'ton',
    networkName: 'TON (The Open Network)',
    explorerName: 'Tonviewer / Tonscan',
    txUrlTemplate: (txid) => `https://tonviewer.com/transaction/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://tonviewer.com/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Base64url / Hex 64-character hash',
    samplePlaceholder: 'e.g. 5dc9c2794101e4ec985f52dd6e2467d3c05c...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'TxID is required' };
      if (clean.length < 16) return { valid: false, message: 'TxID is too short for TON network (minimum 16-64 chars)' };
      return { valid: true, message: 'Valid TON transaction hash structure' };
    }
  },
  trc20: {
    networkId: 'trc20',
    networkName: 'TRON (TRC20)',
    explorerName: 'TronScan',
    txUrlTemplate: (txid) => `https://tronscan.org/#/transaction/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://tronscan.org/#/address/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Hex 64-character SHA256 string',
    samplePlaceholder: 'e.g. f4000da44e005085d7747e937d32ee2a106f3630f9a2...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'TxID is required' };
      const isHex = /^[a-fA-F0-9]{64}$/.test(clean);
      if (!isHex && clean.length !== 64) {
        return { valid: false, message: `TRON TxID should be exactly 64 hex characters (found ${clean.length})` };
      }
      return { valid: true, message: 'Valid TRON TRC20 64-character transaction hash' };
    }
  },
  bep20: {
    networkId: 'bep20',
    networkName: 'BNB Smart Chain (BEP20)',
    explorerName: 'BscScan',
    txUrlTemplate: (txid) => `https://bscscan.com/tx/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://bscscan.com/address/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Hex 64/66-character (0x...)',
    samplePlaceholder: 'e.g. 0x8ab9c7e0984812a1df3e04812b1239841284...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'TxID is required' };
      const hasPrefix = clean.startsWith('0x');
      const hexPart = hasPrefix ? clean.slice(2) : clean;
      if (!/^[a-fA-F0-9]{64}$/.test(hexPart)) {
        return { valid: false, message: 'BSC TxID should be 64 hexadecimal characters (with or without 0x prefix)' };
      }
      return { valid: true, message: 'Valid BSC BEP20 transaction hash' };
    }
  },
  erc20: {
    networkId: 'erc20',
    networkName: 'Ethereum (ERC20)',
    explorerName: 'Etherscan',
    txUrlTemplate: (txid) => `https://etherscan.io/tx/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://etherscan.io/address/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Hex 64/66-character (0x...)',
    samplePlaceholder: 'e.g. 0x3d7b415a77263599e4f20bc129486c071d2b...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'TxID is required' };
      const hasPrefix = clean.startsWith('0x');
      const hexPart = hasPrefix ? clean.slice(2) : clean;
      if (!/^[a-fA-F0-9]{64}$/.test(hexPart)) {
        return { valid: false, message: 'Ethereum TxID should be 64 hexadecimal characters' };
      }
      return { valid: true, message: 'Valid Ethereum transaction hash' };
    }
  },
  solana: {
    networkId: 'solana',
    networkName: 'Solana Network',
    explorerName: 'Solscan / SolanaFM',
    txUrlTemplate: (txid) => `https://solscan.io/tx/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://solscan.io/account/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Base58 88-character signature',
    samplePlaceholder: 'e.g. 5Kq1Z7cK...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'Signature is required' };
      if (clean.length < 32 || clean.length > 95) {
        return { valid: false, message: `Solana signature length should be ~88 Base58 chars (found ${clean.length})` };
      }
      return { valid: true, message: 'Valid Solana transaction signature format' };
    }
  },
  bitcoin: {
    networkId: 'bitcoin',
    networkName: 'Bitcoin Mainnet',
    explorerName: 'Mempool.space / Blockstream',
    txUrlTemplate: (txid) => `https://mempool.space/tx/${txid.trim()}`,
    addressUrlTemplate: (address) => `https://mempool.space/address/${address.trim()}`,
    canEmbedIframe: true,
    hashPatternName: 'Hex 64-character hash',
    samplePlaceholder: 'e.g. 9b88e10d80c6812836263b652a92634d0b...',
    validateHash: (txid) => {
      const clean = txid.trim();
      if (!clean) return { valid: false, message: 'Bitcoin TxID is required' };
      if (!/^[a-fA-F0-9]{64}$/.test(clean)) {
        return { valid: false, message: `BTC TxID must be exactly 64 hexadecimal characters (found ${clean.length})` };
      }
      return { valid: true, message: 'Valid Bitcoin transaction hash' };
    }
  }
};

export function getExplorerForNetwork(networkNameOrId: string): BlockchainExplorerInfo {
  const norm = (networkNameOrId || '').toLowerCase();
  if (norm.includes('ton') || norm.includes('gram')) return BLOCKCHAIN_EXPLORERS.ton;
  if (norm.includes('trc20') || norm.includes('tron') || norm.includes('trx')) return BLOCKCHAIN_EXPLORERS.trc20;
  if (norm.includes('bep20') || norm.includes('bsc') || norm.includes('binance')) return BLOCKCHAIN_EXPLORERS.bep20;
  if (norm.includes('erc20') || norm.includes('eth') || norm.includes('ethereum')) return BLOCKCHAIN_EXPLORERS.erc20;
  if (norm.includes('sol') || norm.includes('solana')) return BLOCKCHAIN_EXPLORERS.solana;
  if (norm.includes('btc') || norm.includes('bitcoin')) return BLOCKCHAIN_EXPLORERS.bitcoin;
  
  // default to trc20
  return BLOCKCHAIN_EXPLORERS.trc20;
}
