import { ApiClient } from '@/core/api';
import { Token, SwapQuote } from '@/shared/types';
import { DEXAggregatorInterface, QuoteRequest, QuoteResponse, ExecuteSwapRequest, ExecuteSwapResponse } from '../types';

export abstract class BaseDEXService extends ApiClient implements DEXAggregatorInterface {
  protected name: string;

  constructor(name: string, baseUrl: string, timeout?: number) {
    super(baseUrl, timeout);
    this.name = name;
  }

  abstract getQuotes(request: QuoteRequest): Promise<QuoteResponse>;
  abstract executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse>;
  abstract getSupportedTokens(): Promise<Token[]>;

  getName(): string {
    return this.name;
  }

  isQuoteValid(quote: SwapQuote): boolean {
    if (!quote.expiry) {
      return true; // No expiry means always valid
    }
    
    return Date.now() < quote.expiry;
  }

  protected sortQuotesByBestPrice(quotes: SwapQuote[]): SwapQuote[] {
    return [...quotes].sort((a, b) => {
      // Higher buy amount is better
      const amountComparison = parseFloat(b.buyAmount) - parseFloat(a.buyAmount);
      if (amountComparison !== 0) return amountComparison;
      
      // Lower gas fees is better if amounts are equal
      return a.gasEstimate.gasFeeInUsd - b.gasEstimate.gasFeeInUsd;
    });
  }

  protected selectBestQuote(quotes: SwapQuote[]): SwapQuote | null {
    if (quotes.length === 0) return null;
    
    const sortedQuotes = this.sortQuotesByBestPrice(quotes);
    return sortedQuotes[0];
  }
}