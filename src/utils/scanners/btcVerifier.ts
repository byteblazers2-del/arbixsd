import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  parseCryptoAmountToBigInt,
  formatBigIntToCryptoString,
  normalizeAddress
} from './types';

/**
 * Direct Bitcoin verification by Tx Hash
 */
export async function verifyDirectTxHashBtc(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, expectedAmount, minConfirmations = 1 } = options;
  const hash = txHash.trim();
  const normTarget = normalizeAddress(targetAddress);
  const targetSats = expectedAmount !== undefined ? parseCryptoAmountToBigInt(expectedAmount, 8) : null;

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const [txRes, tipRes] = await Promise.all([
      fetch(`https://mempool.space/api/tx/${hash}`, { signal: controller.signal }),
      fetch(`https://mempool.space/api/blocks/tip/height`, { signal: controller.signal })
    ]);

    if (!txRes.ok) {
      return { status: 'NOT_FOUND', found: false, error: 'Bitcoin transaction hash not found on Mempool.space' };
    }

    const tx = await txRes.json();
    const tipText = await tipRes.text();
    const currentHeight = Number(tipText) || 0;

    if (!tx || !tx.txid) {
      return { status: 'NOT_FOUND', found: false, error: 'Invalid BTC transaction structure' };
    }

    let receivedSats = BigInt(0);
    let matchedRecipient = '';

    if (Array.isArray(tx.vout)) {
      for (const out of tx.vout) {
        if (normalizeAddress(out.scriptpubkey_address) === normTarget) {
          receivedSats += BigInt(out.value || 0);
          matchedRecipient = out.scriptpubkey_address;
        }
      }
    }

    if (receivedSats <= BigInt(0)) {
      return {
        status: 'MISMATCH',
        found: false,
        txHash: hash,
        error: `No output matching recipient address ${targetAddress} in BTC transaction`
      };
    }

    // Accept actual confirmed on-chain transfer amount
    const actualCryptoAmt = Number(receivedSats) / 1e8;

    const isConfirmed = !!tx.status?.confirmed;
    const blockHeight = tx.status?.block_height || 0;
    let confirmations = 0;
    if (isConfirmed && currentHeight >= blockHeight) {
      confirmations = (currentHeight - blockHeight) + 1;
    }

    if (confirmations < minConfirmations) {
      return {
        status: 'PENDING_CONFIRMATION',
        found: true,
        txHash: hash,
        amount: Number(receivedSats) / 1e8,
        amountRaw: receivedSats.toString(),
        cryptoAmountStr: formatBigIntToCryptoString(receivedSats, 8),
        sender: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet',
        recipient: matchedRecipient || targetAddress,
        confirmations,
        requiredConfirmations: minConfirmations,
        details: 'Bitcoin transaction seen in mempool, awaiting block confirmation'
      };
    }

    const timestamp = tx.status?.block_time ? tx.status.block_time * 1000 : Date.now();

    return {
      status: 'CONFIRMED',
      found: true,
      txHash: hash,
      amount: Number(receivedSats) / 1e8,
      amountRaw: receivedSats.toString(),
      cryptoAmountStr: formatBigIntToCryptoString(receivedSats, 8),
      sender: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet',
      recipient: matchedRecipient || targetAddress,
      timestamp,
      network: 'BTC',
      coinSymbol: 'BTC',
      confirmations,
      requiredConfirmations: minConfirmations
    };

  } catch (err: any) {
    return { status: 'API_ERROR', found: false, error: err.message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Scan Bitcoin address for matching incoming deposit transactions
 */
export async function scanBitcoinNetwork(options: ScanOptions): Promise<VerificationResult> {
  const { address, targetCryptoAmount, sessionStartTime, minConfirmations = 1 } = options;
  const targetAddress = address.trim();
  const normTarget = normalizeAddress(targetAddress);
  const now = Date.now();
  const thresholdTime = sessionStartTime ? (sessionStartTime - 60 * 60 * 1000) : (now - 120 * 60 * 1000);

  let targetSats: bigint | null = null;
  if (targetCryptoAmount) targetSats = parseCryptoAmountToBigInt(targetCryptoAmount, 8);

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const [txsRes, tipRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${targetAddress}/txs`, { signal: controller.signal }),
      fetch(`https://mempool.space/api/blocks/tip/height`, { signal: controller.signal })
    ]);

    if (!txsRes.ok) return { status: 'NOT_FOUND', found: false };

    const txs = await txsRes.json();
    const tipText = await tipRes.text();
    const currentHeight = Number(tipText) || 0;

    if (Array.isArray(txs)) {
      for (const tx of txs) {
        const txHash = tx.txid;
        if (!txHash) continue;

        let receivedSats = BigInt(0);
        if (Array.isArray(tx.vout)) {
          for (const out of tx.vout) {
            if (normalizeAddress(out.scriptpubkey_address) === normTarget) {
              receivedSats += BigInt(out.value || 0);
            }
          }
        }

        if (receivedSats <= BigInt(0)) continue;

        const txTimeMs = tx.status?.block_time ? tx.status.block_time * 1000 : now;
        if (txTimeMs < thresholdTime) continue;

        // Minimum dust filter: 1000 satoshis
        if (receivedSats < BigInt(1000)) continue;

        const isConfirmed = !!tx.status?.confirmed;
        const blockHeight = tx.status?.block_height || 0;
        let confirmations = 0;
        if (isConfirmed && currentHeight >= blockHeight) {
          confirmations = (currentHeight - blockHeight) + 1;
        }

        const status: VerificationResult['status'] = confirmations >= minConfirmations ? 'CONFIRMED' : 'PENDING_CONFIRMATION';

        return {
          status,
          found: true,
          txHash,
          amount: Number(receivedSats) / 1e8,
          amountRaw: receivedSats.toString(),
          cryptoAmountStr: formatBigIntToCryptoString(receivedSats, 8),
          sender: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet',
          recipient: targetAddress,
          timestamp: txTimeMs,
          network: 'BTC',
          coinSymbol: 'BTC',
          confirmations,
          requiredConfirmations: minConfirmations
        };
      }
    }

    return { status: 'NOT_FOUND', found: false };
  } catch (err: any) {
    return { status: 'API_ERROR', found: false, error: err.message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
