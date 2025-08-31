import { Token, SwapQuote, TokenAmount } from '@/shared/types';

export interface QuoteRequest {
  sellToken: Token;
  buyToken: Token;
  sellAmount?: string;
  buyAmount?: string;
  takerAddress?: string;
  slippage?: number;
}

export interface QuoteResponse {
  quotes: SwapQuote[];
  bestQuote: SwapQuote | null;
}

export interface ExecuteSwapRequest {
  quote: SwapQuote;
  takerAddress: string;
  slippage: number;
}

export interface ExecuteSwapResponse {
  transactionHash: string;
  success: boolean;
  error?: string;
}

export interface DEXAggregatorInterface {
  /**
   * Get swap quotes from the DEX aggregator
   */
  getQuotes(request: QuoteRequest): Promise<QuoteResponse>;

  /**
   * Execute a swap transaction
   */
  executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse>;

  /**
   * Get supported tokens
   */
  getSupportedTokens(): Promise<Token[]>;

  /**
   * Check if a quote is still valid
   */
  isQuoteValid(quote: SwapQuote): boolean;

  /**
   * Get the name of the DEX aggregator
   */
  getName(): string;
}