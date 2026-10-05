export interface CryptoNetwork {
  id: string;
  name: string; // e.g. "BNB Smart Chain (BEP20) BSC"
  shortName: string; // e.g. "BSC (BEP20)"
  address: string;
  contractEnd?: string;
  minDeposit: string;
  blockConfirmations: string;
  withdrawalUnlock: string;
  memoRequired?: boolean;
  memo?: string;
  isPopular?: boolean;
  iconUrl?: string;
}

export interface CryptoCoin {
  id: string;
  name: string;
  symbol: string;
  iconUrl?: string;
  tag?: string; // e.g. "12.92% APY"
  subBadge?: string; // e.g. "TON"
  networks: CryptoNetwork[];
  defaultNetworkIndex: number;
  unsupportedNotice: string;
}

export const SUPPORTED_COINS: CryptoCoin[] = [
  {
    id: 'stars',
    name: 'Telegram Stars',
    symbol: 'STARS',
    iconUrl: '/telegram-stars.png',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'Telegram Stars deposit directly via Telegram Invoice.',
    networks: [
      {
        id: 'stars-native',
        name: 'Telegram Stars Invoice',
        shortName: 'STARS',
        address: 'Telegram Official App',
        contractEnd: 'STARS',
        minDeposit: '50',
        blockConfirmations: 'Instant confirmation',
        withdrawalUnlock: 'Instant unlock',
        isPopular: true
      }
    ]
  },
  {
    id: 'usdt',
    name: 'USDT',
    symbol: 'USDT',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for USDT only. NFT or other tokens are not supported.',
    networks: [
      {
        id: 'trc20',
        name: 'TRON (TRC20)',
        shortName: 'TRC20',
        address: 'TYf3cdrfRLkSEpCMjKXbpTMYHG7yKp1nLK',
        contractEnd: 'p1nLK',
        minDeposit: '5',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      },
      {
        id: 'bsc',
        name: 'BNB Smart Chain (BEP20) BSC',
        shortName: 'BEP20',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        contractEnd: 'E370A',
        minDeposit: '5',
        blockConfirmations: '15 Block confirmation',
        withdrawalUnlock: '15 Subnetwork confirmation',
        isPopular: true
      },
      {
        id: 'ton',
        name: 'TON Network (TON)',
        shortName: 'TON',
        address: 'UQDgkkGXRjbavxdutAaGP3wACQiM6sW0hnJUB3eboB5ez1Ud',
        contractEnd: 'ez1Ud',
        minDeposit: '5',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      },
      {
        id: 'erc20',
        name: 'Ethereum (ERC20)',
        shortName: 'ERC20',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        contractEnd: 'dAC17',
        minDeposit: '5',
        blockConfirmations: '12 Block confirmation',
        withdrawalUnlock: '12 Subnetwork confirmation'
      },
      {
        id: 'sol',
        name: 'Solana (SPL)',
        shortName: 'SOL',
        address: 'FGucoStCGq1RgLWBWhh5cy7T6SnAT5KLD58nRLCerHns',
        contractEnd: 'erHns',
        minDeposit: '5',
        blockConfirmations: '32 Block confirmation',
        withdrawalUnlock: '32 Subnetwork confirmation',
        isPopular: true
      },
      {
        id: 'polygon',
        name: 'Polygon (MATIC)',
        shortName: 'POLYGON',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        contractEnd: 'e370A',
        minDeposit: '5',
        blockConfirmations: '64 Block confirmation',
        withdrawalUnlock: '64 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'ton',
    name: 'Toncoin',
    symbol: 'TON',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for TON only. Make sure network is TON.',
    networks: [
      {
        id: 'ton-native',
        name: 'TON Network',
        shortName: 'TON',
        address: 'UQDgkkGXRjbavxdutAaGP3wACQiM6sW0hnJUB3eboB5ez1Ud',
        contractEnd: 'ez1Ud',
        minDeposit: '0.5',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for BTC only. Do not send BCH or other forks.',
    networks: [
      {
        id: 'btc-native',
        name: 'Bitcoin (BTC Native SegWit)',
        shortName: 'BTC SegWit',
        address: 'bc1qjh0h2hhdvjfpvr6falz7h4jdx3t76qtl84ehs4',
        minDeposit: '0.0001',
        blockConfirmations: '2 Block confirmation',
        withdrawalUnlock: '2 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for ETH only. Non-EVM assets will not be recovered.',
    networks: [
      {
        id: 'eth-erc20',
        name: 'Ethereum (ERC20)',
        shortName: 'ERC20',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        minDeposit: '0.002',
        blockConfirmations: '12 Block confirmation',
        withdrawalUnlock: '12 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for SOL native only.',
    networks: [
      {
        id: 'sol-native',
        name: 'Solana (SOL)',
        shortName: 'SOL',
        address: 'FGucoStCGq1RgLWBWhh5cy7T6SnAT5KLD58nRLCerHns',
        minDeposit: '0.05',
        blockConfirmations: '32 Block confirmation',
        withdrawalUnlock: '32 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for BNB (BEP20) only.',
    networks: [
      {
        id: 'bnb-bep20',
        name: 'BNB Smart Chain (BEP20) BSC',
        shortName: 'BEP20',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        contractEnd: '00000',
        minDeposit: '0.005',
        blockConfirmations: '15 Block confirmation',
        withdrawalUnlock: '15 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'trx',
    name: 'Tron',
    symbol: 'TRX',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for TRX only. Minimum deposit is 10 TRX.',
    networks: [
      {
        id: 'trx-trc20',
        name: 'TRON (TRC20)',
        shortName: 'TRC20',
        address: 'TYf3cdrfRLkSEpCMjKXbpTMYHG7yKp1nLK',
        minDeposit: '10',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'xrp',
    name: 'XRP (Ripple)',
    symbol: 'XRP',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'Tag/Memo is required for XRP deposits if prompted.',
    networks: [
      {
        id: 'xrp-ripple',
        name: 'Ripple (XRP)',
        shortName: 'XRP',
        address: 'rGSGYW4bE2xrevjUR7nTRztPwYWfyKGCwo',
        memoRequired: true,
        memo: '84920412',
        minDeposit: '5',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'doge',
    name: 'Dogecoin',
    symbol: 'DOGE',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for Dogecoin (DOGE) native network only.',
    networks: [
      {
        id: 'doge-native',
        name: 'Dogecoin Network',
        shortName: 'DOGE',
        address: 'D9n1bY6L1f478U3H4K8J3v2Z1Y5E7R8T9P',
        minDeposit: '20',
        blockConfirmations: '6 Block confirmation',
        withdrawalUnlock: '6 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'bch',
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for BCH native only. Do not send BTC.',
    networks: [
      {
        id: 'bch-native',
        name: 'Bitcoin Cash (BCH)',
        shortName: 'BCH',
        address: 'qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
        minDeposit: '0.01',
        blockConfirmations: '2 Block confirmation',
        withdrawalUnlock: '2 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for USDC only.',
    networks: [
      {
        id: 'usdc-erc20',
        name: 'Ethereum (ERC20)',
        shortName: 'ERC20',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        minDeposit: '10',
        blockConfirmations: '12 Block confirmation',
        withdrawalUnlock: '12 Subnetwork confirmation',
        isPopular: true
      },
      {
        id: 'usdc-sol',
        name: 'Solana (SPL)',
        shortName: 'SOL',
        address: 'FGucoStCGq1RgLWBWhh5cy7T6SnAT5KLD58nRLCerHns',
        minDeposit: '1',
        blockConfirmations: '32 Block confirmation',
        withdrawalUnlock: '32 Subnetwork confirmation'
      }
    ]
  },
  {
    id: 'sui',
    name: 'Sui',
    symbol: 'SUI',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for Sui native network only.',
    networks: [
      {
        id: 'sui-native',
        name: 'Sui Network',
        shortName: 'SUI',
        address: '0x4829302830fecd1234567890abcdef1234567890abcdef1234567890abcdef',
        minDeposit: '5',
        blockConfirmations: '1 Block confirmation',
        withdrawalUnlock: '1 Subnetwork confirmation',
        isPopular: true
      }
    ]
  },
  {
    id: 'matic',
    name: 'Polygon',
    symbol: 'MATIC',
    defaultNetworkIndex: 0,
    unsupportedNotice: 'The deposit address is for Polygon (POL/MATIC) network only.',
    networks: [
      {
        id: 'matic-pos',
        name: 'Polygon PoS',
        shortName: 'POLYGON',
        address: '0x3598A6eC35b6172A308eCe3A2bf2B06bed3E370A',
        minDeposit: '5',
        blockConfirmations: '64 Block confirmation',
        withdrawalUnlock: '64 Subnetwork confirmation',
        isPopular: true
      }
    ]
  }
];

// For legacy compatibility
export const cryptoAssets = SUPPORTED_COINS.map(c => ({
  name: c.name,
  symbol: c.symbol,
  address: c.networks[c.defaultNetworkIndex]?.address || '',
  badge: c.networks[0]?.shortName || ''
}));
