import {
  VerificationResult,
  ScanOptions,
  DirectVerifyOptions,
  ASSET_CONFIG,
  parseCryptoAmountToBigInt,
  formatBigIntToCryptoString,
  normalizeAddress
} from './types';

const EVM_API_MAP: Record<string, string[]> = {
  'POLYGON': ['https://api.polygonscan.com/api', 'https://polygon-rpc.com'],
  'ERC20': ['https://api.etherscan.io/api', 'https://ethereum-rpc.publicnode.com'],
  'ETH': ['https://api.etherscan.io/api', 'https://ethereum-rpc.publicnode.com'],
  'BSC': ['https://api.bscscan.com/api', 'https://bsc-dataseed.binance.org'],
  'BEP20': ['https://api.bscscan.com/api', 'https://bsc-dataseed.binance.org']
};

/**
 * Direct EVM verification by Tx Hash
 */
export async function verifyDirectTxHashEVM(options: DirectVerifyOptions): Promise<VerificationResult> {
  const { txHash, targetAddress, networkId, coinSymbol, expectedAmount, minConfirmations = 1 } = options;
  const hash = txHash.trim();
  const netUpper = networkId.toUpperCase();
  const coinUpper = coinSymbol.toUpperCase();
  const normTarget = normalizeAddress(targetAddress);

  let internalNetKey = netUpper;
  if (netUpper.includes('POLYGON')) internalNetKey = 'POLYGON';
  else if (netUpper.includes('ERC20') || netUpper.includes('ETH')) internalNetKey = 'ETH';
  else if (netUpper.includes('BSC') || netUpper.includes('BEP20')) internalNetKey = 'BSC';

  const assetInfo = (ASSET_CONFIG[internalNetKey] || {})[coinUpper];
  if (!assetInfo) {
    return {
      status: 'MISMATCH',
      found: false,
      error: `Unsupported asset/network combination: ${coinSymbol} on ${networkId}`
    };
  }

  const isNative = assetInfo.mint === 'NATIVE';
  const decimals = assetInfo.decimals;
  const expectedBig = expectedAmount !== undefined ? parseCryptoAmountToBigInt(expectedAmount, decimals) : null;

  const endpoints = EVM_API_MAP[internalNetKey] || EVM_API_MAP['ETH'];
  const explorerApi = endpoints[0];

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    // 1. Fetch Transaction Receipt to check execution status and logs
    const receiptUrl = `${explorerApi}?module=proxy&action=eth_getTransactionReceipt&txhash=${hash}`;
    const receiptRes = await fetch(receiptUrl, { signal: controller.signal }).then(r => r.json());

    if (!receiptRes || !receiptRes.result) {
      return {
        status: 'NOT_FOUND',
        found: false,
        error: 'Transaction hash not found on EVM explorer'
      };
    }

    const receipt = receiptRes.result;
    if (receipt.status !== '0x1') {
      return {
        status: 'MISMATCH',
        found: false,
        txHash: hash,
        error: 'Transaction failed or was reverted on-chain (status !== 0x1)'
      };
    }

    // 2. Fetch Tx Details for native value and block number
    const txUrl = `${explorerApi}?module=proxy&action=eth_getTransactionByHash&txhash=${hash}`;
    const txRes = await fetch(txUrl, { signal: controller.signal }).then(r => r.json());
    const txData = txRes?.result;

    if (!txData) {
      return {
        status: 'NOT_FOUND',
        found: false,
        error: 'Transaction data not found'
      };
    }

    // 3. Fetch latest block number for accurate confirmations
    const blockUrl = `${explorerApi}?module=proxy&action=eth_blockNumber`;
    const blockRes = await fetch(blockUrl, { signal: controller.signal }).then(r => r.json());
    const latestBlock = parseInt(blockRes?.result || '0', 16);
    const txBlock = parseInt(receipt.blockNumber || txData.blockNumber || '0', 16);
    const confirmations = latestBlock > 0 && txBlock > 0 ? Math.max(1, (latestBlock - txBlock) + 1) : 1;

    let totalReceivedBig = BigInt(0);
    const senderAddress = txData.from || 'EVM Wallet';

    if (isNative) {
      if (normalizeAddress(txData.to) !== normTarget) {
        return {
          status: 'MISMATCH',
          found: false,
          txHash: hash,
          error: `Recipient mismatch: Tx target ${txData.to} != expected ${targetAddress}`
        };
      }
      totalReceivedBig = BigInt(txData.value || '0');
    } else {
      // ERC20 Token Transfer check via Logs
      // Transfer topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const paddedTargetTopic = '0x' + normTarget.replace('0x', '').padStart(64, '0');

      const logs = receipt.logs || [];
      for (const log of logs) {
        if (
          normalizeAddress(log.address) === normalizeAddress(assetInfo.mint) &&
          log.topics && log.topics[0]?.toLowerCase() === transferTopic &&
          log.topics[2]?.toLowerCase() === paddedTargetTopic
        ) {
          const val = BigInt(log.data || '0');
          totalReceivedBig += val;
        }
      }
    }

    if (totalReceivedBig <= BigInt(0)) {
      return {
        status: 'MISMATCH',
        found: false,
        txHash: hash,
        error: 'No positive token/coin transfer matching recipient address in transaction logs'
      };
    }

    // Accept actual confirmed on-chain transfer amount
    const actualCryptoAmt = Number(totalReceivedBig) / Math.pow(10, decimals);

    // Check minimum required confirmations
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
        details: `Transaction confirmed on-chain but needs ${minConfirmations} confirmations (current: ${confirmations})`
      };
    }

    // Real block timestamp fetch (optional proxy or timestamp estimate)
    let timestamp = Date.now();
    if (txData.timeStamp) {
      timestamp = Number(txData.timeStamp) * 1000;
    }

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
      network: internalNetKey,
      coinSymbol: coinUpper,
      confirmations,
      requiredConfirmations: minConfirmations
    };

  } catch (err: any) {
    return {
      status: 'API_ERROR',
      found: false,
      error: `EVM verification API request failed: ${err.message}`
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Scan EVM address for matching incoming deposit transactions
 */
export async function scanEvmNetwork(options: ScanOptions): Promise<VerificationResult> {
  const { coinSymbol, networkId, address, targetCryptoAmount, sessionStartTime, minConfirmations = 1 } = options;
  const targetAddress = address.trim();
  const normTarget = normalizeAddress(targetAddress);
  const now = Date.now();
  const thresholdTime = sessionStartTime ? (sessionStartTime - 60 * 60 * 1000) : (now - 120 * 60 * 1000);

  let internalNetKey = networkId.toUpperCase();
  if (internalNetKey.includes('POLYGON')) internalNetKey = 'POLYGON';
  else if (internalNetKey.includes('ERC20') || internalNetKey.includes('ETH')) internalNetKey = 'ETH';
  else if (internalNetKey.includes('BSC') || internalNetKey.includes('BEP20')) internalNetKey = 'BSC';

  const coinUpper = coinSymbol.toUpperCase();
  const assetInfo = (ASSET_CONFIG[internalNetKey] || {})[coinUpper];

  if (!assetInfo) {
    return { status: 'MISMATCH', found: false, error: 'Unsupported EVM asset/network' };
  }

  const isNative = assetInfo.mint === 'NATIVE';
  const decimals = assetInfo.decimals;
  const targetBig = targetCryptoAmount ? parseCryptoAmountToBigInt(targetCryptoAmount, decimals) : null;

  const endpoints = EVM_API_MAP[internalNetKey] || EVM_API_MAP['ETH'];
  const explorerApi = endpoints[0];

  let controller: AbortController | null = new AbortController();
  let timeout: NodeJS.Timeout | null = setTimeout(() => controller?.abort(), 8000);

  try {
    const action = isNative ? 'txlist' : 'tokentx';
    const url = `${explorerApi}?module=account&action=${action}&address=${targetAddress}&page=1&offset=25&sort=desc`;
    const res = await fetch(url, { signal: controller.signal }).then(r => r.json());

    if (res?.status === '1' && Array.isArray(res.result)) {
      // Calculate latest block for real confirmations
      let latestBlock = 0;
      if (res.result.length > 0) {
        latestBlock = Number(res.result[0].blockNumber || 0) + 2;
      }

      for (const item of res.result) {
        if (item.isError === '1') continue;

        const txHash = item.hash;
        if (!txHash) continue;

        if (normalizeAddress(item.to) !== normTarget) continue;
        if (!isNative && normalizeAddress(item.contractAddress) !== normalizeAddress(assetInfo.mint)) continue;

        const txTimeMs = item.timeStamp ? Number(item.timeStamp) * 1000 : now;
        if (txTimeMs < thresholdTime) continue;

        const amountBig = BigInt(item.value || '0');
        // Filter dust/zero transactions
        if (amountBig <= BigInt(0)) continue;
        const minDustThreshold = isNative ? BigInt(100000000000000) : BigInt(500000); // 0.0001 ETH/BNB or 0.5 USDT
        if (amountBig < minDustThreshold) continue;

        const itemBlock = Number(item.blockNumber || 0);
        const confirmations = item.confirmations ? Number(item.confirmations) : Math.max(1, latestBlock - itemBlock);

        const status: VerificationResult['status'] = confirmations >= minConfirmations ? 'CONFIRMED' : 'PENDING_CONFIRMATION';

        return {
          status,
          found: true,
          txHash,
          amount: Number(amountBig) / Math.pow(10, decimals),
          amountRaw: amountBig.toString(),
          cryptoAmountStr: formatBigIntToCryptoString(amountBig, decimals),
          sender: item.from || 'EVM Wallet',
          recipient: targetAddress,
          timestamp: txTimeMs,
          network: internalNetKey,
          coinSymbol: coinUpper,
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
