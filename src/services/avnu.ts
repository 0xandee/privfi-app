export interface AVNUQuoteRequest {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount?: string;
  buyAmount?: string;
  takerAddress?: string;
  size?: number;
  integratorName?: string;
  integratorFeeRecipient?: string;
  integratorFees?: number;
}

export interface AVNUQuote {
  quoteId: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  sellAmountInUsd: number;
  buyAmountInUsd: number;
  buyAmountWithoutFees: string;
  buyAmountWithoutFeesInUsd: number;
  estimatedAmount: boolean;
  chainId: string;
  blockNumber: string;
  expiry: number | null;
  routes: AVNURoute[];
  gasFees: string;
  gasFeesInUsd: number;
  avnuFees: string;
  avnuFeesInUsd: number;
  avnuFeesBps: string;
  integratorFees: string;
  integratorFeesInUsd: number;
  integratorFeesBps: string;
  priceRatioUsd: number;
  liquiditySource: string;
  sellTokenPriceInUsd: number;
  buyTokenPriceInUsd: number;
  gasless?: {
    active: boolean;
    gasTokenPrices: Array<{
      tokenAddress: string;
      gasFeesInGasToken: string;
      gasFeesInUsd: number;
    }>;
  };
  exactTokenTo: boolean;
  estimatedSlippage: number;
}

export interface AVNURoute {
  name: string;
  address: string;
  percent: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
  routes?: AVNURoute[];
}

export type AVNUQuotesResponse = AVNUQuote[];

export interface AVNUError {
  message: string;
  code?: string;
  details?: unknown;
}

const AVNU_API_BASE = 'https://starknet.api.avnu.fi';

// Integrator configuration
const INTEGRATOR_CONFIG = {
  name: 'Privfi',
  feeRecipient: '0x065c065C1CF438F91C3CFFd47a959112F81b5F266d4890BbCDfb4088C39749E0',
  fees: 15, // 15 basis points = 0.15%
};

/**
 * Fetch swap quotes from AVNU API
 * @param params Quote request parameters
 * @returns Promise resolving to quotes array
 */
export const fetchSwapQuotes = async (params: AVNUQuoteRequest): Promise<AVNUQuote[]> => {
  try {
    // Validate required parameters
    if (!params.sellTokenAddress || !params.buyTokenAddress) {
      throw new Error('Both sell and buy token addresses are required');
    }

    if (!params.sellAmount && !params.buyAmount) {
      throw new Error('Either sellAmount or buyAmount must be provided');
    }

    // Prepare query parameters
    const queryParams = new URLSearchParams({
      sellTokenAddress: params.sellTokenAddress,
      buyTokenAddress: params.buyTokenAddress,
      size: (params.size || 3).toString(), // Default to 3 quotes
      integratorName: params.integratorName || INTEGRATOR_CONFIG.name,
      integratorFeeRecipient: params.integratorFeeRecipient || INTEGRATOR_CONFIG.feeRecipient,
      integratorFees: '0x' + (params.integratorFees || INTEGRATOR_CONFIG.fees).toString(16),
    });

    // Add amount parameter (convert to hex format)
    if (params.sellAmount) {
      const sellAmountHex = '0x' + BigInt(params.sellAmount).toString(16);
      queryParams.append('sellAmount', sellAmountHex);
    } else if (params.buyAmount) {
      const buyAmountHex = '0x' + BigInt(params.buyAmount).toString(16);
      queryParams.append('buyAmount', buyAmountHex);
    }

    // Add taker address if provided
    if (params.takerAddress) {
      queryParams.append('takerAddress', params.takerAddress);
    }


    const response = await fetch(`${AVNU_API_BASE}/swap/v2/quotes?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch quotes: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new Error(errorMessage);
    }

    const data: AVNUQuotesResponse = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No quotes available for this token pair');
    }

    
    return data;
  } catch (error) {
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred while fetching quotes');
    }
  }
};

/**
 * Get the best quote from an array of quotes
 * @param quotes Array of quotes to compare
 * @returns Best quote based on buy amount
 */
export const getBestQuote = (quotes: AVNUQuote[]): AVNUQuote | null => {
  if (!quotes || quotes.length === 0) {
    return null;
  }

  // Return the quote with the highest buy amount (best rate for user)
  return quotes.reduce((best, current) => {
    const bestBuyAmount = parseFloat(best.buyAmount);
    const currentBuyAmount = parseFloat(current.buyAmount);
    return currentBuyAmount > bestBuyAmount ? current : best;
  });
};

/**
 * Check if a quote has expired
 * @param quote Quote to check
 * @returns True if quote has expired
 */
export const isQuoteExpired = (quote: AVNUQuote): boolean => {
  if (!quote.expiry) return false;
  return Date.now() > quote.expiry * 1000; // expiry is in seconds, convert to milliseconds
};

/**
 * Format quote for display
 * @param quote Quote to format
 * @param fromTokenSymbol Symbol of the from token
 * @param toTokenSymbol Symbol of the to token
 * @returns Formatted quote information
 */
export const formatQuoteForDisplay = (
  quote: AVNUQuote,
  fromTokenSymbol: string,
  toTokenSymbol: string,
  fromTokenDecimals: number,
  toTokenDecimals: number
) => {
  // Convert hex amounts to decimal with proper decimals
  const sellAmountDecimal = parseInt(quote.sellAmount, 16) / Math.pow(10, fromTokenDecimals);
  const buyAmountDecimal = parseInt(quote.buyAmount, 16) / Math.pow(10, toTokenDecimals);
  
  // Calculate exchange rate: how many toTokens per 1 fromToken
  const exchangeRate = buyAmountDecimal / sellAmountDecimal;

  // Calculate price impact from slippage
  const priceImpact = quote.estimatedSlippage * 100;

  return {
    exchangeRate: `1 ${fromTokenSymbol} = ${exchangeRate.toFixed(2)} ${toTokenSymbol}`,
    priceImpact: `${priceImpact.toFixed(4)}%`,
    integratorFee: `$${quote.integratorFeesInUsd.toFixed(3)}`,
    avnuFee: `$${quote.avnuFeesInUsd.toFixed(3)}`,
    gasFeesUsd: `$${quote.gasFeesInUsd.toFixed(3)}`,
    totalCostUsd: quote.sellAmountInUsd + quote.integratorFeesInUsd + quote.avnuFeesInUsd + quote.gasFeesInUsd,
    routes: quote.routes.map(route => route.name).join(', '),
    expiryTime: quote.expiry ? new Date(quote.expiry * 1000) : null,
    gasless: quote.gasless?.active || false,
    sellAmountDecimal,
    buyAmountDecimal,
  };
};

/**
 * Extract token prices from AVNU quote for use in UI
 * @param quote AVNU quote containing token prices
 * @param sellTokenDecimals Decimals for the sell token
 * @param buyTokenDecimals Decimals for the buy token
 * @returns Token prices in the format expected by UI components
 */
export const extractTokenPricesFromQuote = (
  quote: AVNUQuote,
  sellTokenDecimals: number = 18,
  buyTokenDecimals: number = 18
) => {
  // Determine ETH price from the quote if ETH is involved
  const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
  let ethPriceInUsd = 4471; // Default fallback
  
  if (quote.sellTokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    ethPriceInUsd = quote.sellTokenPriceInUsd;
  } else if (quote.buyTokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    ethPriceInUsd = quote.buyTokenPriceInUsd;
  }
  
  // Helper function to create all possible address formats for lookup
  const createAddressVariants = (address: string) => {
    const normalizedAddr = address.toLowerCase();
    const variants = [normalizedAddr];
    
    // Also store with padded zeros if not already present
    if (normalizedAddr.length === 65) { // 0x + 63 chars (missing leading zero)
      const paddedAddr = '0x0' + normalizedAddr.slice(2);
      variants.push(paddedAddr);
    }
    // Also store without leading zeros if present
    if (normalizedAddr.startsWith('0x0') && normalizedAddr.length === 66) {
      const unpaddedAddr = '0x' + normalizedAddr.slice(3);
      variants.push(unpaddedAddr);
    }
    
    return variants;
  };

  const result: { [address: string]: any } = {};
  
  // Add sell token price with all address variants
  const sellTokenData = {
    address: quote.sellTokenAddress,
    priceInUSD: quote.sellTokenPriceInUsd,
    priceInETH: quote.sellTokenPriceInUsd / ethPriceInUsd,
    decimals: sellTokenDecimals,
  };
  
  const sellAddressVariants = createAddressVariants(quote.sellTokenAddress);
  sellAddressVariants.forEach(addr => {
    result[addr] = sellTokenData;
  });
  
  // Add buy token price with all address variants
  const buyTokenData = {
    address: quote.buyTokenAddress,
    priceInUSD: quote.buyTokenPriceInUsd,
    priceInETH: quote.buyTokenPriceInUsd / ethPriceInUsd,
    decimals: buyTokenDecimals,
  };
  
  const buyAddressVariants = createAddressVariants(quote.buyTokenAddress);
  buyAddressVariants.forEach(addr => {
    result[addr] = buyTokenData;
  });


  return result;
};