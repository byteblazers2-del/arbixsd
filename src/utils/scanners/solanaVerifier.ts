import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  ASSET_CONFIG,
  parseCryptoAmountToBigInt,
  formatBigIntToCryptoString,
  normalizeAddress
} from './types';

const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-api.projectserum.com'
];

/**
 * Direct Solana verification by Tx Signature/Hash
 */
export async function verifyDirectTxHashSolana(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, coinSymbol, expectedAmount, minConfirmations = 1 } = options;
  const signature = txHash.trim();
  const coinUpper = coinSymbol.toUpperCase();
  const normTarget = normalizeAddress(targetAddress);

  const assetInfo = (ASSET_CONFIG['SOLANA'] || {})[coinUpper] || { mint: 'NATIVE', decimals: 9 };
  const isNative = assetInfo.mint === 'NATIVE';
  const decimals = assetInfo.decimals;
  const expectedBig = expectedAmount !== undefined ? parseCryptoAmountToBigInt(expectedAmount, decimals) : null;

  const rpcUrl = SOLANA_RPC_ENDPOINTS[0];
  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const txRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTransaction',
        params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
      }),
      signal: controller.signal
    }).then(r => r.json());

    if (!txRes?.result) {
      return { status: 'NOT_FOUND', found: false, error: 'Solana signature not found on RPC' };
    }

    const meta = txRes.result.meta;
    const txMsg = txRes.result.transaction?.message;

    if (!meta || meta.err) {
      return { status: 'MISMATCH', found: false, txHash: signature, error: 'Solana transaction failed or errored on-chain' };
    }

    let receivedAmountBig = BigInt(0);

    if (!isNative) {
      // Check SPL Token Balance difference for target owner and mint
      const preToken = meta.preTokenBalances?.find((t: any) => normalizeAddress(t.owner) === normTarget && t.mint === assetInfo.mint);
      const postToken = meta.postTokenBalances?.find((t: any) => normalizeAddress(t.owner) === normTarget && t.mint === assetInfo.mint);

      if (postToken) {
        const preAmt = BigInt(preToken ? preToken.uiTokenAmount?.amount || '0' : '0');
        const postAmt = BigInt(postToken.uiTokenAmount?.amount || '0');
        if (postAmt > preAmt) {
          receivedAmountBig = postAmt - preAmt;
        }
      }
    } else {
      // Native SOL balance change
      const accountKeys = txMsg?.accountKeys || [];
      const targetIndex = accountKeys.findIndex((k: any) => normalizeAddress(typeof k === 'string' ? k : k.pubkey) === normTarget);

      if (targetIndex !== -1 && meta.preBalances && meta.postBalances) {
        const preBal = BigInt(meta.preBalances[targetIndex] || '0');
        const postBal = BigInt(meta.postBalances[targetIndex] || '0');
        if (postBal > preBal) {
          receivedAmountBig = postBal - preBal;
        }
      }
    }

    if (receivedAmountBig <= BigInt(0)) {
      return {
        status: 'MISMATCH',
        found: false,
        txHash: signature,
        error: `No positive balance increase for recipient ${targetAddress} in transaction`
      };
    }

    // Accept actual confirmed on-chain transfer amount
    const actualCryptoAmt = Number(receivedAmountBig) / Math.pow(10, decimals);

    const timestamp = txRes.result.blockTime ? txRes.result.blockTime * 1000 : Date.now();

    return {
      status: 'CONFIRMED',
      found: true,
      txHash: signature,
      amount: Number(receivedAmountBig) / Math.pow(10, decimals),
      amountRaw: receivedAmountBig.toString(),
      cryptoAmountStr: formatBigIntToCryptoString(receivedAmountBig, decimals),
      sender: 'Solana Wallet',
      recipient: targetAddress,
      timestamp,
      network: 'SOLANA',
      coinSymbol: coinUpper,
      confirmations: 32,
      requiredConfirmations: minConfirmations
    };

  } catch (err: any) {
    return { status: 'API_ERROR', found: false, error: err.message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Scan Solana address for matching incoming deposit transactions
 */
export async function scanSolanaNetwork(options: ScanOptions): Promise<VerificationResult> {
  const { coinSymbol, address, targetCryptoAmount, sessionStartTime, minConfirmations = 1 } = options;
  const targetAddress = address.trim();
  const normTarget = normalizeAddress(targetAddress);
  const now = Date.now();
  const thresholdTime = sessionStartTime ? (sessionStartTime - 60 * 60 * 1000) : (now - 120 * 60 * 1000);

  const coinUpper = coinSymbol.toUpperCase();
  const assetInfo = (ASSET_CONFIG['SOLANA'] || {})[coinUpper];
  if (!assetInfo) return { status: 'MISMATCH', found: false, error: 'Unsupported Solana asset' };

  const isNative = assetInfo.mint === 'NATIVE';
  const decimals = assetInfo.decimals;
  const targetBig = targetCryptoAmount ? parseCryptoAmountToBigInt(targetCryptoAmount, decimals) : null;

  const rpcUrl = SOLANA_RPC_ENDPOINTS[0];
  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const sigRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getSignaturesForAddress',
        params: [targetAddress, { limit: 10 }]
      }),
      signal: controller.signal
    }).then(r => r.json());

    if (Array.isArray(sigRes?.result)) {
      for (const sigInfo of sigRes.result) {
        if (sigInfo.err) continue;

        const txHash = sigInfo.signature;
        if (!txHash) continue;

        const txTimeMs = sigInfo.blockTime ? sigInfo.blockTime * 1000 : now;
        if (txTimeMs < thresholdTime) continue;

        const txRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 2,
            method: 'getTransaction',
            params: [txHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
          })
        }).then(r => r.json());

        const meta = txRes?.result?.meta;
        const txMsg = txRes?.result?.transaction?.message;
        if (!meta || meta.err || !txMsg) continue;

        let receivedAmountBig = BigInt(0);

        if (!isNative) {
          const preToken = meta.preTokenBalances?.find((t: any) => normalizeAddress(t.owner) === normTarget && t.mint === assetInfo.mint);
          const postToken = meta.postTokenBalances?.find((t: any) => normalizeAddress(t.owner) === normTarget && t.mint === assetInfo.mint);
          if (postToken) {
            const preAmt = BigInt(preToken ? preToken.uiTokenAmount?.amount || '0' : '0');
            const postAmt = BigInt(postToken.uiTokenAmount?.amount || '0');
            if (postAmt > preAmt) {
              receivedAmountBig = postAmt - preAmt;
            }
          }
        } else {
          const accountKeys = txMsg.accountKeys;
          const targetIndex = accountKeys.findIndex((k: any) => normalizeAddress(typeof k === 'string' ? k : k.pubkey) === normTarget);
          if (targetIndex !== -1 && meta.preBalances && meta.postBalances) {
            const preBal = BigInt(meta.preBalances[targetIndex] || '0');
            const postBal = BigInt(meta.postBalances[targetIndex] || '0');
            if (postBal > preBal) {
              receivedAmountBig = postBal - preBal;
            }
          }
        }

        if (receivedAmountBig <= BigInt(0)) continue;
        if (targetBig !== null && receivedAmountBig !== targetBig) continue;

        return {
          status: 'CONFIRMED',
          found: true,
          txHash,
          amount: Number(receivedAmountBig) / Math.pow(10, decimals),
          amountRaw: receivedAmountBig.toString(),
          cryptoAmountStr: formatBigIntToCryptoString(receivedAmountBig, decimals),
          sender: 'Solana Wallet',
          recipient: targetAddress,
          timestamp: txTimeMs,
          network: 'SOLANA',
          coinSymbol: coinUpper,
          confirmations: 32,
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
