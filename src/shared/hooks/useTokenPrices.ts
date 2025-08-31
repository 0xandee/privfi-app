import { useQuery } from '@tanstack/react-query';

export interface TokenPrice {
  address: string;
  priceInUSD: number;
  priceInETH: number;
  decimals: number;
}

interface TokenPricesResponse {
  [address: string]: TokenPrice;
}

const AVNU_API_BASE = 'https://starknet.impulse.avnu.fi/v1';

const fetchTokenPrices = async (tokenAddresses: string[]): Promise<TokenPricesResponse> => {
  if (tokenAddresses.length === 0) {
    return {};
  }

  // AVNU API accepts up to 10 tokens per request
  const chunks = [];
  for (let i = 0; i < tokenAddresses.length; i += 10) {
    chunks.push(tokenAddresses.slice(i, i + 10));
  }

  const allPrices: TokenPricesResponse = {};

  for (const chunk of chunks) {
    const params = new URLSearchParams();
    chunk.forEach(address => params.append('token', address));
    
    const response = await fetch(`${AVNU_API_BASE}/tokens/prices?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    const data: TokenPrice[] = await response.json();
    
    // Convert array to object keyed by address
    // Handle both padded and unpadded addresses by storing both versions
    data.forEach(price => {
      const normalizedAddr = price.address.toLowerCase();
      allPrices[normalizedAddr] = price;
      
      // Also store with padded zeros if not already present
      if (normalizedAddr.length === 65) { // 0x + 63 chars (missing leading zero)
        const paddedAddr = '0x0' + normalizedAddr.slice(2);
        allPrices[paddedAddr] = price;
      }
      // Also store without leading zeros if present
      if (normalizedAddr.startsWith('0x0') && normalizedAddr.length === 66) {
        const unpaddedAddr = '0x' + normalizedAddr.slice(3);
        allPrices[unpaddedAddr] = price;
      }
    });
  }

  return allPrices;
};

export const useTokenPrices = (tokenAddresses: string[]) => {
  // Filter out empty addresses and normalize to lowercase
  const normalizedAddresses = tokenAddresses
    .filter(address => address && address.trim() !== '')
    .map(address => address.toLowerCase());

  return useQuery({
    queryKey: ['tokenPrices', normalizedAddresses.sort()],
    queryFn: () => fetchTokenPrices(normalizedAddresses),
    staleTime: 60 * 1000, // 1 minute - matches AVNU update frequency
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled: normalizedAddresses.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useTokenPrice = (tokenAddress: string) => {
  // Skip API call entirely if no address provided
  const addressesToFetch = tokenAddress && tokenAddress.trim() !== '' ? [tokenAddress] : [];
  const { data, isLoading, error } = useTokenPrices(addressesToFetch);
  
  const price = tokenAddress ? data?.[tokenAddress.toLowerCase()] : null;
  
  
  return {
    price: price?.priceInUSD || 0,
    priceData: price,
    isLoading: addressesToFetch.length > 0 ? isLoading : false,
    error: addressesToFetch.length > 0 ? error : null,
  };
};