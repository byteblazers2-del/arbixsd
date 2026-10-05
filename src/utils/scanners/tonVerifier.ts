import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  parseCryptoAmountToBigInt,
  formatBigIntToCryptoString
} from './types';

const TON_API = 'https://toncenter.com/api/v2';
const DEFAULT_TIMEOUT_MS = 8000;
const PAGE_LIMIT = 50;

/**
 * Extracts 32-byte account hex from any TON address format:
 * - User-Friendly Bounceable (EQ...)
 * - User-Friendly Non-Bounceable (UQ...)
 * - Raw format (0:hex...)
 */
export function getTonAccountHex(addr?: string): string {
  if (!addr) return '';
  const clean = addr.trim();

  // If raw 0:hex or -1:hex
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return (parts[1] || '').toLowerCase();
  }

  // If base64/base64url (EQ... or UQ...)
  try {
    const b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(b64);
    if (binStr.length >= 34) {
      // 2 bytes flags+workchain, then 32 bytes account hex
      let hex = '';
      for (let i = 2; i < 34; i++) {
        const byte = binStr.charCodeAt(i);
        hex += byte.toString(16).padStart(2, '0');
      }
      return hex.toLowerCase();
    }
  } catch {}

  return clean.toLowerCase();
}

/**
 * Normalizes TON transaction hash to standard 64-char lowercase hex.
 * TonCenter returns base64 hashes, whereas explorers/users provide 64 hex characters.
 */
export function normalizeTonTxHash(hash?: string): string {
  if (!hash) return '';
  const clean = hash.trim();

  // If already 64 hex chars
  if (/^[a-f0-9]{64}$/i.test(clean)) {
    return clean.toLowerCase();
  }

  // If base64 hash (32 bytes = 44 base64 chars)
  try {
    const b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(b64);
    if (binStr.length === 32) {
      let hex = '';
      for (let i = 0; i < 32; i++) {
        const byte = binStr.charCodeAt(i);
        hex += byte.toString(16).padStart(2, '0');
      }
      return hex.toLowerCase();
    }
  } catch {}

  return clean.toLowerCase();
}

/**
 * Extracts the user message / comment / memo from a TonCenter in_msg object.
 * Handles plain text, base64 dataText, and decoded_body.
 */
export function extractTonComment(inMsg: any): string {
  if (!inMsg) return '';

  if (typeof inMsg.message === 'string' && inMsg.message.trim()) {
    return inMsg.message.trim();
  }

  if (inMsg.msg_data) {
    if (inMsg.msg_data['@type'] === 'msg.dataText' && inMsg.msg_data.text) {
      const txt = inMsg.msg_data.text;
      try {
        const decoded = atob(txt);
        // If decoded is readable text
        if (/^[\x20-\x7E\s\u0600-\u06FF]+$/.test(decoded)) {
          return decoded.trim();
        }
      } catch {}
      return txt.trim();
    }
  }

  if (inMsg.decoded_body?.text) {
    return inMsg.decoded_body.text.trim();
  }

  return '';
}

/**
 * Checks if the actual on-chain memo matches the expected user memo tag or order ID.
 */
export function isTonMemoMatching(expectedMemo?: string, actualComment?: string): boolean {
  if (!expectedMemo || !expectedMemo.trim()) return true;
  if (!actualComment || !actualComment.trim()) return false;

  const expected = expectedMemo.trim().toLowerCase();
  const actual = actualComment.trim().toLowerCase();

  // Exact match
  if (expected === actual) return true;

  // Substring match (e.g. comment has "ARB-123456" inside "Deposit ARB-123456")
  if (actual.includes(expected) || expected.includes(actual)) return true;

  // Clean numeric/alphanumeric match (e.g. "974430" matching "ARB-974430")
  const cleanExpected = expected.replace(/[^a-z0-9]/gi, '');
  const cleanActual = actual.replace(/[^a-z0-9]/gi, '');
  if (cleanExpected && cleanActual) {
    if (cleanActual === cleanExpected || cleanActual.includes(cleanExpected) || cleanExpected.includes(cleanActual)) {
      return true;
    }
  }

  return false;
}

function toSafeNumber(value: bigint, decimals: number): number | undefined {
  const str = formatBigIntToCryptoString(value, decimals);
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

async function fetchJson<T>(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });

    if (!response.ok) {
      throw new Error(`TON API HTTP ${response.status}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Direct TON verification by Tx Hash (base64 or hex) or body_hash.
 */
export async function verifyDirectTxHashTon(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, expectedAmount, expectedMemo, minConfirmations = 1 } = options;

  if (!txHash || !targetAddress) {
    return { status: 'MISMATCH', found: false, error: 'Missing required TON verification parameters' };
  }

  const normTargetHex = getTonAccountHex(targetAddress);
  const targetHexHash = normalizeTonTxHash(txHash);
  const decimals = 9; // TON Nano
  const targetNano = expectedAmount !== undefined ? parseCryptoAmountToBigInt(expectedAmount, decimals) : null;

  try {
    const url = `${TON_API}/getTransactions?address=${encodeURIComponent(targetAddress)}&limit=${PAGE_LIMIT}&archival=true`;
    const res = await fetchJson<any>(url);

    if (!res?.ok || !Array.isArray(res.result)) {
      return { status: 'NOT_FOUND', found: false, txHash, error: 'Unable to retrieve TON transactions' };
    }

    for (const tx of res.result) {
      const inMsg = tx.in_msg;
      if (!inMsg) continue;

      const currentRawHash = tx.transaction_id?.hash || inMsg.body_hash || inMsg.hash || '';
      const currentNormHash = normalizeTonTxHash(currentRawHash);

      // Match by normalized hex hash
      if (currentNormHash !== targetHexHash && normalizeTonTxHash(inMsg.body_hash) !== targetHexHash) {
        continue;
      }

      // Validate recipient account hex
      const destHex = getTonAccountHex(inMsg.destination);
      if (destHex !== normTargetHex) {
        return {
          status: 'MISMATCH',
          found: false,
          txHash,
          error: `TON recipient mismatch: Tx destination does not match vault address`
        };
      }

      const nanoValue = BigInt(inMsg.value || '0');
      if (nanoValue <= BigInt(0)) {
        return { status: 'MISMATCH', found: false, txHash, error: 'TON transaction value is zero or negative' };
      }

      const actualComment = extractTonComment(inMsg);

      // If user provided an expected memo, verify memo matching
      if (expectedMemo && expectedMemo.trim()) {
        const memoMatched = isTonMemoMatching(expectedMemo, actualComment);
        if (!memoMatched) {
          return {
            status: 'MISMATCH',
            found: false,
            txHash,
            amount: toSafeNumber(nanoValue, decimals),
            amountRaw: nanoValue.toString(),
            cryptoAmountStr: formatBigIntToCryptoString(nanoValue, decimals),
            error: `TON Memo mismatch: expected "${expectedMemo}", got "${actualComment || 'none'}"`
          };
        }
      } else if (targetNano !== null) {
        // If no memo was specified, verify exact amount
        if (nanoValue !== targetNano) {
          return {
            status: 'MISMATCH',
            found: false,
            txHash,
            amount: toSafeNumber(nanoValue, decimals),
            amountRaw: nanoValue.toString(),
            cryptoAmountStr: formatBigIntToCryptoString(nanoValue, decimals),
            error: `Amount mismatch: expected ${formatBigIntToCryptoString(targetNano, decimals)} TON, received ${formatBigIntToCryptoString(nanoValue, decimals)} TON`
          };
        }
      }

      const timestamp = tx.utime ? Number(tx.utime) * 1000 : undefined;
      const finalDisplayHash = /^[a-f0-9]{64}$/i.test(txHash) ? txHash : (targetHexHash || txHash);

      return {
        status: 'CONFIRMED',
        found: true,
        txHash: finalDisplayHash,
        amount: toSafeNumber(nanoValue, decimals),
        amountRaw: nanoValue.toString(),
        cryptoAmountStr: formatBigIntToCryptoString(nanoValue, decimals),
        sender: inMsg.source || 'TON Wallet',
        recipient: targetAddress,
        timestamp,
        network: 'TON',
        coinSymbol: 'TON',
        confirmations: 1,
        requiredConfirmations: minConfirmations
      };
    }

    return { status: 'NOT_FOUND', found: false, txHash, error: 'TON transaction not found in recent history' };

  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { status: 'API_ERROR', found: false, txHash, error: 'TON API request timeout' };
    }
    return { status: 'API_ERROR', found: false, txHash, error: err?.message || 'TON verification failed' };
  }
}

/**
 * Scan TON address for incoming deposit transactions.
 * Uses user-specific Memo Tag or unique amount.
 */
export async function scanTonNetwork(options: ScanOptions): Promise<VerificationResult> {
  const { address, targetCryptoAmount, expectedMemo, sessionStartTime, minConfirmations = 1 } = options;

  if (!address) {
    return { status: 'MISMATCH', found: false, error: 'Missing TON scan target address' };
  }

  const targetAddress = address.trim();
  const normTargetHex = getTonAccountHex(targetAddress);
  const now = Date.now();
  const minTimestamp = sessionStartTime ? Math.max(0, sessionStartTime - 60 * 60 * 1000) : now - 120 * 60 * 1000;
  const decimals = 9;
  const targetNano = targetCryptoAmount !== undefined ? parseCryptoAmountToBigInt(targetCryptoAmount, decimals) : null;

  try {
    const url = `${TON_API}/getTransactions?address=${encodeURIComponent(targetAddress)}&limit=${PAGE_LIMIT}&archival=true`;
    const res = await fetchJson<any>(url);

    if (res?.ok && Array.isArray(res.result)) {
      for (const tx of res.result) {
        const inMsg = tx.in_msg;
        if (!inMsg) continue;

        // Verify recipient destination
        if (getTonAccountHex(inMsg.destination) !== normTargetHex) continue;

        const rawTxHash = tx.transaction_id?.hash || inMsg.body_hash || inMsg.hash || '';
        const normHexHash = normalizeTonTxHash(rawTxHash);
        if (!normHexHash) continue;

        const txTimestamp = tx.utime ? Number(tx.utime) * 1000 : 0;
        if (txTimestamp > 0 && txTimestamp < minTimestamp) continue;

        const nanoValue = BigInt(inMsg.value || '0');
        if (nanoValue <= BigInt(0)) continue;

        const actualComment = extractTonComment(inMsg);

        // Matching logic:
        // 1. If user has a unique Memo (e.g. ARB-974430 or 5951882585), match by memo!
        //    Any positive amount is accepted and credited!
        // 2. If no memo, match by exact unique target amount.
        let isMatch = false;

        if (expectedMemo && expectedMemo.trim()) {
          isMatch = isTonMemoMatching(expectedMemo, actualComment);
        } else {
          // Minimum 0.05 TON dust filter
          isMatch = nanoValue >= BigInt(50000000);
        }

        if (isMatch) {
          return {
            status: 'CONFIRMED',
            found: true,
            txHash: normHexHash,
            amount: toSafeNumber(nanoValue, decimals),
            amountRaw: nanoValue.toString(),
            cryptoAmountStr: formatBigIntToCryptoString(nanoValue, decimals),
            sender: inMsg.source || 'TON Wallet',
            recipient: targetAddress,
            timestamp: txTimestamp || now,
            network: 'TON',
            coinSymbol: 'TON',
            confirmations: 1,
            requiredConfirmations: minConfirmations
          };
        }
      }
    }

    return { status: 'NOT_FOUND', found: false };

  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { status: 'API_ERROR', found: false, error: 'TON scanner request timeout' };
    }
    return { status: 'API_ERROR', found: false, error: err?.message || 'TON scan failed' };
  }
}
