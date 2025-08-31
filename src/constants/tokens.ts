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
  },
  STRK: {
    address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    symbol: 'STRK',
    name: 'Starknet Token',
    decimals: 18,
  },
  USDC: {
    address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  WBTC: {
    address: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
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

// Get token by address
export const getTokenByAddress = (address: string): Token | undefined => {
  return Object.values(STARKNET_TOKENS).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
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