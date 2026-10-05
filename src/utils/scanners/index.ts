import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions
} from './types';

import { scanEvmNetwork, verifyDirectTxHashEVM } from './evmVerifier';
import { scanTronNetwork, verifyDirectTxHashTron } from './tronVerifier';
import { scanTonNetwork, verifyDirectTxHashTon } from './tonVerifier';
import { scanBitcoinNetwork, verifyDirectTxHashBtc } from './btcVerifier';
import { scanSolanaNetwork, verifyDirectTxHashSolana } from './solanaVerifier';

export * from './types';
export { scanEvmNetwork, verifyDirectTxHashEVM } from './evmVerifier';
export { scanTronNetwork, verifyDirectTxHashTron } from './tronVerifier';
export { scanTonNetwork, verifyDirectTxHashTon } from './tonVerifier';
export { scanBitcoinNetwork, verifyDirectTxHashBtc } from './btcVerifier';
export { scanSolanaNetwork, verifyDirectTxHashSolana } from './solanaVerifier';

/**
 * Universal Direct Transaction Hash Verification across all supported chains
 */
export async function verifyDirectTxHash(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, networkId = '', coinSymbol = '' } = options;
  if (!txHash || !targetAddress) {
    return {
      status: 'MISMATCH',
      found: false,
      error: 'Missing required txHash or targetAddress parameter'
    };
  }

  const netId = networkId.toUpperCase();
  const coin = coinSymbol.toUpperCase();

  if (netId.includes('TON') || coin === 'TON') {
    return verifyDirectTxHashTon(options);
  }
  if (netId.includes('TRC20') || netId.includes('TRON') || coin === 'TRX') {
    return verifyDirectTxHashTron(options);
  }
  if (netId.includes('BTC') || coin === 'BTC') {
    return verifyDirectTxHashBtc(options);
  }
  if (netId.includes('SOL') || coin === 'SOL') {
    return verifyDirectTxHashSolana(options);
  }

  // EVM default for ETH, BSC, BEP20, ERC20, POLYGON
  return verifyDirectTxHashEVM(options);
}

/**
 * Universal Multi-Chain Deposit Status Scanner for incoming address transfers
 */
export async function checkMultiChainDepositStatus(options: ScanOptions): Promise<VerificationResult> {
  const { coinSymbol = '', networkId = '', address } = options;
  if (!address) {
    return { status: 'MISMATCH', found: false, error: 'Missing target deposit address' };
  }

  const netId = networkId.toUpperCase();
  const coin = coinSymbol.toUpperCase();

  if (netId.includes('TON') || coin === 'TON') {
    return scanTonNetwork(options);
  }
  if (netId.includes('TRC20') || netId.includes('TRON') || coin === 'TRX') {
    return scanTronNetwork(options);
  }
  if (netId.includes('BTC') || coin === 'BTC') {
    return scanBitcoinNetwork(options);
  }
  if (netId.includes('SOL') || coin === 'SOL') {
    return scanSolanaNetwork(options);
  }

  // EVM default
  return scanEvmNetwork(options);
}
