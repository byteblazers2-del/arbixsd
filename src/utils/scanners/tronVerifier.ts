import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  ASSET_CONFIG,
  parseCryptoAmountToBigInt,
  formatBigIntToCryptoString,
  normalizeAddress
} from './types';

/**
 * Direct TRON verification by Tx Hash
 */
export async function verifyDirectTxHashTron(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, networkId, coinSymbol, expectedAmount, minConfirmations = 1 } = options;
  const hash = txHash.trim();
  const normTarget = normalizeAddress(targetAddress);
  const coinUpper = coinSymbol.toUpperCase();

  const assetInfo = (ASSET_CONFIG['TRC20'] || {})[coinUpper] || { mint: 'TR7NHqJEKQxGTCi8q8ZY4pL8OTszgjLj6t', decimals: 6 };
  const isTrc20 = coinUpper !== 'TRX';
  const decimals = assetInfo.decimals;
  const expectedBig = expectedAmount !== undefined ? parseCryptoAmountToBigInt(expectedAmount, decimals) : null;

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${hash}`;
    const res = await fetch(url, { signal: controller.signal }).then(r => r.json());

    if (!res || !res.hash) {
      return { status: 'NOT_FOUND', found: false, error: 'TRON transaction hash not found' };
    }

    const isSuccess = res.contractRet === 'SUCCESS' || res.confirmed === true;
    if (!isSuccess) {
      return { status: 'MISMATCH', found: false, txHash: hash, error: 'TRON transaction failed on-chain' };
    }

    let recipientAddr = '';
    let totalReceivedBig = BigInt(0);
    let senderAddress = res.ownerAddress || 'TRON Wallet';

    if (isTrc20) {
      const trc20Transfers = res.trc20TransferInfo || [];
      const expectedContract = assetInfo.mint;

      for (const item of trc20Transfers) {
        if (
          normalizeAddress(item.to_address) === normTarget &&
          normalizeAddress(item.contract_address) === normalizeAddress(expectedContract)
        ) {
          const rawVal = BigInt(item.amount_str || '0');
          totalReceivedBig += rawVal;
          recipientAddr = item.to_address;
          if (item.from_address) senderAddress = item.from_address;
        }
      }
    } else {
      recipientAddr = res.toAddress || res.contractData?.to_address || '';
      if (normalizeAddress(recipientAddr) === normTarget) {
        const rawVal = BigInt(res.contractData?.amount || '0');
        totalReceivedBig = rawVal;
      }
    }

    if (totalReceivedBig <= BigInt(0)) {
      return {
        status: 'MISMATCH',
        found: false,
        txHash: hash,
        error: `No positive transfer matching recipient address ${targetAddress}`
      };
    }

    // Accept the actual confirmed on-chain transfer amount
    const actualCryptoAmt = Number(totalReceivedBig) / Math.pow(10, decimals);

    const isConfirmed = res.confirmed === true;
    const confirmations = isConfirmed ? Math.max(1, minConfirmations) : 0;

    if (confirmations < minConfirmations) {
      return {
        status: 'PENDING_CONFIRMATION',
        found: true,
        txHash: hash,
        amount: Number(totalReceivedBig) / Math.pow(10, decimals),
        amountRaw: totalReceivedBig.toString(),
        cryptoAmountStr: formatBigIntToCryptoString(totalReceivedBig, decimals),
        sender: senderAddress,
        recipient: targetAddress,
        confirmations,
        requiredConfirmations: minConfirmations,
        details: 'TRON transaction pending full block confirmation'
      };
    }

    const timestamp = res.timestamp || Date.now();

    return {
      status: 'CONFIRMED',
      found: true,
      txHash: hash,
      amount: Number(totalReceivedBig) / Math.pow(10, decimals),
      amountRaw: totalReceivedBig.toString(),
      cryptoAmountStr: formatBigIntToCryptoString(totalReceivedBig, decimals),
      sender: senderAddress,
      recipient: targetAddress,
      timestamp,
      network: 'TRC20',
      coinSymbol: coinUpper,
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
 * Scan TRON address for matching incoming deposit transactions
 */
export async function scanTronNetwork(options: ScanOptions): Promise<VerificationResult> {
  const { coinSymbol, address, targetCryptoAmount, sessionStartTime, minConfirmations = 1 } = options;
  const targetAddress = address.trim();
  const normTarget = normalizeAddress(targetAddress);
  const now = Date.now();
  const thresholdTime = sessionStartTime ? (sessionStartTime - 60 * 60 * 1000) : (now - 120 * 60 * 1000);

  const coinUpper = coinSymbol.toUpperCase();
  const isTrc20 = coinUpper !== 'TRX';
  const decimals = 6;
  const targetBig = targetCryptoAmount ? parseCryptoAmountToBigInt(targetCryptoAmount, decimals) : null;

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    if (isTrc20) {
      const url = `https://api.trongrid.io/v1/accounts/${targetAddress}/transactions/trc20?limit=25`;
      const res = await fetch(url, { signal: controller.signal }).then(r => r.json());

      if (res?.data && Array.isArray(res.data)) {
        for (const item of res.data) {
          const txHash = item.transaction_id;
          if (!txHash) continue;

          if (normalizeAddress(item.to) !== normTarget) continue;

          const expectedContract = ASSET_CONFIG['TRC20']['USDT'].mint;
          if (normalizeAddress(item.token_info?.address) !== normalizeAddress(expectedContract)) continue;

          const txTimeMs = item.block_timestamp || now;
          if (txTimeMs < thresholdTime) continue;

          const rawValue = BigInt(item.value || '0');
          // Filter dust/spam (< 0.5 USDT) to prevent zero-value spam attacks
          if (rawValue < BigInt(500000)) continue;

          return {
            status: 'CONFIRMED',
            found: true,
            txHash,
            amount: Number(rawValue) / Math.pow(10, decimals),
            amountRaw: rawValue.toString(),
            cryptoAmountStr: formatBigIntToCryptoString(rawValue, decimals),
            sender: item.from || 'TRON Wallet',
            recipient: targetAddress,
            timestamp: txTimeMs,
            network: 'TRC20',
            coinSymbol: coinUpper,
            confirmations: 1,
            requiredConfirmations: minConfirmations
          };
        }
      }
    } else {
      const url = `https://api.trongrid.io/v1/accounts/${targetAddress}/transactions?limit=25`;
      const res = await fetch(url, { signal: controller.signal }).then(r => r.json());

      if (res?.data && Array.isArray(res.data)) {
        for (const item of res.data) {
          if (item.ret?.[0]?.contractRet !== 'SUCCESS') continue;
          const txHash = item.txID;
          if (!txHash) continue;

          const rawContract = item.raw_data?.contract?.[0];
          if (rawContract?.type === 'TransferContract') {
            if (normalizeAddress(rawContract.parameter?.value?.to_address) !== normTarget) continue;

            const valueSun = BigInt(rawContract.parameter?.value?.amount || '0');
            const txTimeMs = item.raw_data?.timestamp || now;

            if (txTimeMs < thresholdTime) continue;
            // Minimum 1 TRX dust filter
            if (valueSun < BigInt(1000000)) continue;

            return {
              status: 'CONFIRMED',
              found: true,
              txHash,
              amount: Number(valueSun) / 1e6,
              amountRaw: valueSun.toString(),
              cryptoAmountStr: formatBigIntToCryptoString(valueSun, 6),
              sender: rawContract.parameter?.value?.owner_address || 'TRON Wallet',
              recipient: targetAddress,
              timestamp: txTimeMs,
              network: 'TRON',
              coinSymbol: 'TRX',
              confirmations: 1,
              requiredConfirmations: minConfirmations
            };
          }
        }
      }
    }

    return { status: 'NOT_FOUND', found: false };
  } catch (err: any) {
    return { status: 'API_ERROR', found: false, error: err.message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
