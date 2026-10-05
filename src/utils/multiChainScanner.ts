import { collection, query, where, getDocs, limit, runTransaction, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  checkMultiChainDepositStatus as modularScan,
  verifyDirectTxHash as modularDirectVerify
} from './scanners';

export type { DetectedBlockchainTx, VerificationResult } from './scanners';

/**
 * Checks if a transaction hash has already been registered or claimed in Firestore
 */
export async function isTxAlreadyProcessed(txHash: string): Promise<boolean> {
  const hash = txHash.trim().toLowerCase();
  if (!hash) return false;
  
  try {
    const claimDoc = await getDoc(doc(db, 'claimed_txs', hash));
    if (claimDoc.exists()) return true;

    const q1 = query(collection(db, 'deposits'), where('txid', '==', txHash), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return true;
  } catch (e) {
    console.error('[Scanner] Check duplicate failed:', e);
  }
  return false;
}

/**
 * Atomically claims a transaction hash in Firestore inside a database transaction to prevent race conditions.
 */
export async function claimDepositAtomic(txHash: string, orderId: string, userId?: string): Promise<boolean> {
  const hash = txHash.trim().toLowerCase();
  if (!hash) return false;
  
  const lockRef = doc(db, 'claimed_txs', hash);
  try {
    let success = false;
    await runTransaction(db, async (t) => {
      const snap = await t.get(lockRef);
      if (snap.exists()) {
        throw new Error("ALREADY_CLAIMED");
      }

      t.set(lockRef, {
        claimedAt: serverTimestamp(),
        orderId: orderId || 'N/A',
        userId: userId || 'N/A',
        txHash: txHash
      });
      success = true;
    });
    
    return success;
  } catch (e: any) {
    console.warn(`[Scanner] Duplicate or atomic claim rejected for ${hash}:`, e?.message || e);
    return false;
  }
}

/**
 * Checks deposit status by scanning incoming wallet transfers on-chain.
 */
export async function checkMultiChainDepositStatus(params: ScanOptions): Promise<VerificationResult> {
  const result = await modularScan(params);

  if (result.found && result.txHash) {
    const isProcessed = await isTxAlreadyProcessed(result.txHash);
    if (isProcessed) {
      return {
        status: 'ALREADY_CLAIMED',
        found: false,
        txHash: result.txHash,
        error: `Transaction ${result.txHash} has already been claimed.`
      };
    }
  }

  return result;
}

/**
 * Direct transaction hash verification on-chain
 */
export async function verifyDirectTxHash(params: DirectVerifyOptions): Promise<VerificationResult> {
  const result = await modularDirectVerify(params);

  if (result.found && result.txHash) {
    const isProcessed = await isTxAlreadyProcessed(result.txHash);
    if (isProcessed) {
      return {
        status: 'ALREADY_CLAIMED',
        found: false,
        txHash: result.txHash,
        error: `Transaction ${result.txHash} has already been claimed.`
      };
    }
  }

  return result;
}
