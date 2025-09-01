import { BaseDEXService } from './baseDEX';
import { Token, SwapQuote, SwapRoute, GasEstimate } from '@/shared/types';
import { QuoteRequest, QuoteResponse, ExecuteSwapRequest, ExecuteSwapResponse } from '../types';
import { BuildSwapRequest, BuildSwapResponse } from '../types/swap';
import { API_CONFIG, INTEGRATOR_CONFIG } from '@/core/config';
import { withRetry } from '@/core/api';
import { BuildSwapService } from './buildSwap';

// AVNU-specific types (internal)
interface AVNUQuoteRequest {
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

interface AVNUQuote {
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

interface AVNURoute {
  name: string;
  address: string;
  percent: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
  routes?: AVNURoute[];
}

export class AVNUService extends BaseDEXService {
  private buildService: BuildSwapService;

  constructor() {
    super('AVNU', API_CONFIG.avnu.baseUrl, API_CONFIG.avnu.timeout);
    this.buildService = new BuildSwapService();
  }

  async getQuotes(request: QuoteRequest): Promise<QuoteResponse> {
    const avnuRequest = this.mapToAVNURequest(request);
    
    const quotes = await withRetry(
      () => this.fetchAVNUQuotes(avnuRequest),
      { maxRetries: 2, delayMs: 1000, backoffMultiplier: 1.5 }
    );
    
    const mappedQuotes = quotes.map(quote => this.mapFromAVNUQuote(quote));
    const bestQuote = this.selectBestQuote(mappedQuotes);
    
    return {
      quotes: mappedQuotes,
      bestQuote,
    };
  }

  // Method to get raw AVNU quotes without domain mapping
  async getRawQuotes(request: QuoteRequest): Promise<AVNUQuote[]> {
    const avnuRequest = this.mapToAVNURequest(request);
    
    return withRetry(
      () => this.fetchAVNUQuotes(avnuRequest),
      { maxRetries: 2, delayMs: 1000, backoffMultiplier: 1.5 }
    );
  }

  async buildSwap(request: BuildSwapRequest): Promise<BuildSwapResponse> {
    return this.buildService.buildSwap(request);
  }

  async executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse> {
    // TODO: Implement swap execution
    // This would typically involve calling AVNU's execute API
    throw new Error('Swap execution not yet implemented');
  }

  async getSupportedTokens(): Promise<Token[]> {
    // TODO: Implement token list fetching
    // This would typically involve calling AVNU's token list API
    throw new Error('Token list fetching not yet implemented');
  }

  private async fetchAVNUQuotes(params: AVNUQuoteRequest): Promise<AVNUQuote[]> {
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
      size: (params.size || 3).toString(),
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

    const response = await this.request<AVNUQuote[]>(`/swap/v2/quotes?${queryParams}`);

    if (!Array.isArray(response) || response.length === 0) {
      throw new Error('No quotes available for this token pair');
    }

    return response;
  }

  private mapToAVNURequest(request: QuoteRequest): AVNUQuoteRequest {
    return {
      sellTokenAddress: request.sellToken.address,
      buyTokenAddress: request.buyToken.address,
      sellAmount: request.sellAmount,
      buyAmount: request.buyAmount,
      takerAddress: request.takerAddress,
      size: 3, // Get 3 quotes by default
    };
  }

  private mapFromAVNUQuote(quote: AVNUQuote): SwapQuote {
    const gasEstimate: GasEstimate = {
      gasLimit: quote.gasFees,
      gasPrice: '0', // AVNU doesn't provide separate gas price
      gasFeeInUsd: quote.gasFeesInUsd,
    };

    const routes: SwapRoute[] = quote.routes.map(route => ({
      name: route.name,
      address: route.address,
      percentage: route.percent,
      sellTokenAddress: route.sellTokenAddress,
      buyTokenAddress: route.buyTokenAddress,
    }));

    // Calculate price impact from USD amounts
    const priceImpact = this.calculatePriceImpact(
      quote.sellAmountInUsd,
      quote.buyAmountInUsd,
      quote.sellTokenPriceInUsd,
      quote.buyTokenPriceInUsd
    );

    return {
      id: quote.quoteId,
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      sellAmountInUsd: quote.sellAmountInUsd,
      buyAmountInUsd: quote.buyAmountInUsd,
      priceImpact,
      gasEstimate,
      route: routes,
      expiry: quote.expiry ? quote.expiry * 1000 : null, // Convert to milliseconds
      slippage: quote.estimatedSlippage,
    };
  }

  private calculatePriceImpact(
    sellAmountUsd: number,
    buyAmountUsd: number,
    sellTokenPrice: number,
    buyTokenPrice: number
  ): number {
    // Simple price impact calculation based on USD values
    if (sellAmountUsd === 0 || buyAmountUsd === 0) return 0;
    
    const expectedBuyAmountUsd = sellAmountUsd; // Assuming 1:1 USD value
    const actualBuyAmountUsd = buyAmountUsd;
    
    return Math.abs((expectedBuyAmountUsd - actualBuyAmountUsd) / expectedBuyAmountUsd) * 100;
  }
}

// Legacy export functions for backward compatibility
export const fetchSwapQuotes = async (params: AVNUQuoteRequest): Promise<AVNUQuote[]> => {
  const avnuService = new AVNUService();
  // Convert legacy params to new format - this is a temporary bridge
  // We should migrate callers to use the new interface
  throw new Error('Legacy function - use AVNUService class instead');
};

export const getBestQuote = (quotes: AVNUQuote[]): AVNUQuote | null => {
  if (!quotes || quotes.length === 0) return null;
  
  return quotes.reduce((best, current) => {
    const bestBuyAmount = parseFloat(best.buyAmount);
    const currentBuyAmount = parseFloat(current.buyAmount);
    return currentBuyAmount > bestBuyAmount ? current : best;
  });
};

export const isQuoteExpired = (quote: AVNUQuote): boolean => {
  if (!quote.expiry) return false;
  return Date.now() > quote.expiry * 1000;
};

/**
 * Format quote for display
 */
export const formatQuoteForDisplay = (
  quote: AVNUQuote,
  fromTokenSymbol: string,
  toTokenSymbol: string,
  fromTokenDecimals: number,
  toTokenDecimals: number
) => {
  // Early return if quote is invalid
  if (!quote || !quote.sellAmount || !quote.buyAmount) {
    return {
      exchangeRate: `1 ${fromTokenSymbol} = 0 ${toTokenSymbol}`,
      exchangeRateWithUsd: `1 ${fromTokenSymbol} = 0 ${toTokenSymbol} ($0.00)`,
      sellTokenPrice: 0,
      buyTokenPrice: 0,
      priceImpact: '0.0000%',
      integratorFee: '$0.000',
      avnuFee: '$0.000',
      gasFeesUsd: '$0.000',
      totalCostUsd: 0,
      routes: '',
      expiryTime: null,
      gasless: false,
      sellAmountDecimal: 0,
      buyAmountDecimal: 0,
    };
  }

  // Convert hex amounts to decimal with proper decimals
  const sellAmountDecimal = parseInt(quote.sellAmount, 16) / Math.pow(10, fromTokenDecimals);
  const buyAmountDecimal = parseInt(quote.buyAmount, 16) / Math.pow(10, toTokenDecimals);
  
  // Calculate exchange rate: how many toTokens per 1 fromToken
  const exchangeRate = sellAmountDecimal > 0 ? buyAmountDecimal / sellAmountDecimal : 0;

  // Format exchange rate with appropriate precision
  const formatExchangeRate = (rate: number): string => {
    if (rate === 0) return '0';
    if (rate >= 1) return rate.toFixed(2);
    if (rate >= 0.0001) return rate.toFixed(6);
    if (rate >= 0.000001) return rate.toFixed(8);
    return rate.toFixed(10);
  };

  // Calculate USD value for 1 unit of sell token
  const sellTokenPriceInUsd = quote.sellTokenPriceInUsd || 0;
  const buyTokenPriceInUsd = quote.buyTokenPriceInUsd || 0;
  const usdValueFor1Unit = exchangeRate * buyTokenPriceInUsd;

  // Calculate price impact from slippage
  const priceImpact = (quote.estimatedSlippage || 0) * 100;

  const integratorFee = quote.integratorFeesInUsd || 0;
  const avnuFee = quote.avnuFeesInUsd || 0;
  const gasFee = quote.gasFeesInUsd || 0;
  const sellAmountUsd = quote.sellAmountInUsd || 0;
  
  return {
    exchangeRate: `1 ${fromTokenSymbol} = ${formatExchangeRate(exchangeRate)} ${toTokenSymbol}`,
    exchangeRateWithUsd: `1 ${fromTokenSymbol} = ${formatExchangeRate(exchangeRate)} ${toTokenSymbol} ($${usdValueFor1Unit.toFixed(2)})`,
    sellTokenPrice: sellTokenPriceInUsd,
    buyTokenPrice: buyTokenPriceInUsd,
    priceImpact: `${priceImpact.toFixed(4)}%`,
    integratorFee: `$${integratorFee.toFixed(3)}`,
    avnuFee: `$${avnuFee.toFixed(3)}`,
    gasFeesUsd: `$${gasFee.toFixed(3)}`,
    totalCostUsd: sellAmountUsd + integratorFee + avnuFee + gasFee,
    routes: (quote.routes || []).map(route => route.name).join(', '),
    expiryTime: quote.expiry ? new Date(quote.expiry * 1000) : null,
    gasless: quote.gasless?.active || false,
    sellAmountDecimal,
    buyAmountDecimal,
  };
};

/**
 * Extract token prices from AVNU quote for use in UI
 */
export const extractTokenPricesFromQuote = (
  quote: AVNUQuote,
  sellTokenDecimals: number = 18,
  buyTokenDecimals: number = 18
) => {
  // Early return if quote is null/undefined or missing required properties
  if (!quote || !quote.sellTokenAddress || !quote.buyTokenAddress) {
    return {};
  }

  // Determine ETH price from the quote if ETH is involved
  const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
  let ethPriceInUsd = 4471; // Default fallback
  
  if (quote.sellTokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    ethPriceInUsd = quote.sellTokenPriceInUsd || 4471;
  } else if (quote.buyTokenAddress.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
    ethPriceInUsd = quote.buyTokenPriceInUsd || 4471;
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

  const result: { [address: string]: {
    address: string;
    priceInUSD: number;
    priceInETH: number;
    decimals: number;
  } } = {};
  
  // Add sell token price with all address variants
  const sellTokenPrice = quote.sellTokenPriceInUsd || 0;
  const sellTokenData = {
    address: quote.sellTokenAddress,
    priceInUSD: sellTokenPrice,
    priceInETH: sellTokenPrice / ethPriceInUsd,
    decimals: sellTokenDecimals,
  };
  
  const sellAddressVariants = createAddressVariants(quote.sellTokenAddress);
  sellAddressVariants.forEach(addr => {
    result[addr] = sellTokenData;
  });
  
  // Add buy token price with all address variants
  const buyTokenPrice = quote.buyTokenPriceInUsd || 0;
  const buyTokenData = {
    address: quote.buyTokenAddress,
    priceInUSD: buyTokenPrice,
    priceInETH: buyTokenPrice / ethPriceInUsd,
    decimals: buyTokenDecimals,
  };
  
  const buyAddressVariants = createAddressVariants(quote.buyTokenAddress);
  buyAddressVariants.forEach(addr => {
    result[addr] = buyTokenData;
  });

  return result;
};

// Export types for backward compatibility
export type { AVNUQuote, AVNURoute, AVNUQuoteRequest };