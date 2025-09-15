export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// StarkNet Mainnet Token Addresses
export const STARKNET_TOKENS: Record<string, Token> = {
  ETH: {
    address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://imagedelivery.net/0xPAQaDtnQhBs8IzYRIlNg/e07829b7-0382-4e03-7ecd-a478c5aa9f00/logo',
  },
  STRK: {
    address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    symbol: 'STRK',
    name: 'Starknet Token',
    decimals: 18,
    logoURI: 'https://imagedelivery.net/0xPAQaDtnQhBs8IzYRIlNg/1b126320-367c-48ed-cf5a-ba7580e49600/logo',
  },
  USDC: {
    address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://imagedelivery.net/0xPAQaDtnQhBs8IzYRIlNg/e5aaa970-a998-47e8-bd43-4a3b56b87200/logo',
  },
  WBTC: {
    address: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logoURI: 'https://imagedelivery.net/0xPAQaDtnQhBs8IzYRIlNg/7dcb2db2-a7a7-44af-660b-8262e057a100/logo',
  },
};

// Popular token pairs for trading
export const POPULAR_PAIRS = [
  ['ETH', 'STRK'],
  ['ETH', 'USDC'],
  ['STRK', 'USDC'],
  ['ETH', 'WBTC'],
  ['WBTC', 'USDC'],
  ['STRK', 'WBTC'],
];

// Default tokens to show in token selector
export const DEFAULT_TOKENS = ['ETH', 'STRK', 'USDC', 'WBTC'];

// Get token by symbol
export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return STARKNET_TOKENS[symbol];
};

// Helper function to normalize address by removing leading zeros after 0x
const normalizeAddress = (address: string): string => {
  if (!address || !address.startsWith('0x')) return address;

  // Remove 0x prefix, remove leading zeros, then add 0x back
  const withoutPrefix = address.slice(2);
  const withoutLeadingZeros = withoutPrefix.replace(/^0+/, '');

  // If all characters were zeros, keep at least one
  return '0x' + (withoutLeadingZeros || '0');
};

// Get token by address
export const getTokenByAddress = (address: string): Token | undefined => {
  if (!address) return undefined;

  const normalizedInputAddress = normalizeAddress(address.toLowerCase());

  return Object.values(STARKNET_TOKENS).find(token => {
    const normalizedTokenAddress = normalizeAddress(token.address.toLowerCase());
    return normalizedTokenAddress === normalizedInputAddress;
  });
};

// Format token amount with proper decimals
export const formatTokenAmount = (amount: string | number, decimals: number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (num / Math.pow(10, decimals)).toFixed(6);
};

// Parse token amount to wei/smallest unit
export const parseTokenAmount = (amount: string, decimals: number): string => {
  const num = parseFloat(amount);
  return (num * Math.pow(10, decimals)).toString();
};

// Format balance for display with appropriate precision
export const formatBalanceForDisplay = (balance: string, tokenSymbol: string): string => {
  const num = parseFloat(balance);
  
  // Handle zero or invalid balances
  if (isNaN(num) || num === 0) {
    return '0.0';
  }
  
  // For stablecoins (USDC), use 2 decimal places
  if (tokenSymbol === 'USDC') {
    if (num < 0.01) {
      return '< 0.01';
    }
    return num.toFixed(2);
  }
  
  // For other tokens, use different precision based on value size
  if (num < 0.0001) {
    return '< 0.0001';
  } else if (num < 1) {
    return num.toFixed(4);
  } else if (num < 1000) {
    return num.toFixed(4);
  } else {
    // For large amounts, use fewer decimals
    return num.toFixed(2);
  }
};