import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Token, SwapQuote } from '@/shared/types';
import { getDefaultDEX } from '../services';
import { QuoteRequest } from '../types';
import { TYPHOON_FEE_MULTIPLIER } from '@/constants/fees';
import { formatQuoteForDisplay, AVNUQuote, getBestQuote, isQuoteExpired as isAVNUQuoteExpired } from '../services/avnu';

export interface SwapQuoteParams {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  walletAddress?: string;
}

export interface SwapQuoteResult {
  quotes: AVNUQuote[];
  bestQuote: AVNUQuote | null;
  selectedQuote: AVNUQuote | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  selectQuote: (quote: AVNUQuote) => void;
  formattedQuote: ReturnType<typeof formatQuoteForDisplay> | null;
  isExpired: boolean;
  timeToExpiry: number; // in seconds
}

const QUOTE_REFRESH_INTERVAL = 30000; // 30 seconds
const QUOTE_STALE_TIME = 20000; // 20 seconds

export const useSwapQuotes = ({
  fromToken,
  toToken,
  fromAmount,
  walletAddress,
}: SwapQuoteParams): SwapQuoteResult => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<AVNUQuote | null>(null);
  const [timeToExpiry, setTimeToExpiry] = useState(0);

  // Create query key for caching
  const queryKey = useMemo(() => [
    'swapQuotes',
    fromToken.address,
    toToken.address,
    fromAmount,
    walletAddress,
  ], [fromToken.address, toToken.address, fromAmount, walletAddress]);

  // Determine if we should fetch quotes
  const shouldFetch = Boolean(
    fromToken.address &&
    toToken.address &&
    fromToken.address !== toToken.address &&
    fromAmount &&
    parseFloat(fromAmount) > 0
  );

  // Prepare quote request parameters
  const quoteParams: QuoteRequest = {
    sellToken: fromToken,
    buyToken: toToken,
    sellAmount: fromAmount ? (parseFloat(fromAmount) * Math.pow(10, fromToken.decimals)).toString() : undefined,
    takerAddress: walletAddress,
  };

  // Fetch quotes using React Query - get raw AVNU quotes
  const {
    data: quotes,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Get raw AVNU quotes directly
      const dex = await getDefaultDEX();
      if (dex.name !== 'AVNU') {
        throw new Error('Only AVNU DEX is supported');
      }
      // Use the new getRawQuotes method
      return (dex as any).getRawQuotes(quoteParams);
    },
    enabled: shouldFetch,
    staleTime: QUOTE_STALE_TIME,
    refetchInterval: QUOTE_REFRESH_INTERVAL,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const quotesArray = quotes || [];
  const bestQuote = quotesArray.length > 0 ? getBestQuote(quotesArray) : null;

  // Auto-select best quote when quotes change
  useEffect(() => {
    if (bestQuote && (!selectedQuote || selectedQuote.quoteId !== bestQuote.quoteId)) {
      setSelectedQuote(bestQuote);
    }
  }, [bestQuote, selectedQuote]);

  // Update time to expiry
  useEffect(() => {
    if (!selectedQuote || !selectedQuote.expiry) {
      setTimeToExpiry(0);
      return;
    }

    const updateExpiry = () => {
      const now = Date.now();
      // AVNU expiry is in seconds, convert to milliseconds
      const expiryMs = selectedQuote.expiry! * 1000;
      const remaining = Math.floor((expiryMs - now) / 1000);
      setTimeToExpiry(Math.max(0, remaining));
    };

    updateExpiry();
    const interval = setInterval(updateExpiry, 1000);

    return () => clearInterval(interval);
  }, [selectedQuote]);

  // Auto-refresh when quote is about to expire
  useEffect(() => {
    if (selectedQuote && selectedQuote.expiry && timeToExpiry <= 30 && timeToExpiry > 0) {
      refetch();
    }
  }, [timeToExpiry, selectedQuote, refetch]);

  // Select a specific quote
  const selectQuote = useCallback((quote: AVNUQuote) => {
    setSelectedQuote(quote);
  }, []);

  // Manual refetch with cache invalidation
  const handleRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    refetch();
  }, [queryClient, queryKey, refetch]);

  // Check if selected quote is expired
  const isExpired = selectedQuote ? isAVNUQuoteExpired(selectedQuote) : false;

  // Handle errors
  const errorMessage = error instanceof Error ? error.message : null;

  // Format selected quote for display using proper AVNU formatting
  const formattedQuote = selectedQuote && fromToken && toToken 
    ? formatQuoteForDisplay(
        selectedQuote,
        fromToken.symbol,
        toToken.symbol,
        fromToken.decimals,
        toToken.decimals
      )
    : null;

  return {
    quotes: quotesArray,
    bestQuote,
    selectedQuote,
    isLoading,
    error: errorMessage,
    refetch: handleRefetch,
    selectQuote,
    formattedQuote,
    isExpired,
    timeToExpiry,
  };
};

/**
 * Hook to get a single quote for display purposes
 */
export const useSwapQuote = (params: SwapQuoteParams) => {
  const result = useSwapQuotes(params);

  return {
    quote: result.selectedQuote,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isExpired: result.isExpired,
    timeToExpiry: result.timeToExpiry,
  };
};

/**
 * Hook to calculate output amount based on input
 */
export const useSwapEstimation = (params: SwapQuoteParams) => {
  const { selectedQuote, isLoading, error } = useSwapQuotes(params);

  const outputAmount = useMemo(() => {
    if (!selectedQuote || !selectedQuote.buyAmount) return '';

    try {
      // Parse hex string to decimal
      const buyAmountDecimal = parseInt(selectedQuote.buyAmount, 16);

      if (isNaN(buyAmountDecimal)) {
        return '';
      }

      // Convert to token units by dividing by 10^decimals
      const tokenAmount = buyAmountDecimal / Math.pow(10, params.toToken.decimals);

      // Deduct Typhoon SDK fee (0.50%)
      const tokenAmountAfterTyphoonFee = tokenAmount * TYPHOON_FEE_MULTIPLIER;

      // Format to reasonable decimal places and remove trailing zeros
      const formatted = tokenAmountAfterTyphoonFee.toFixed(8).replace(/\.?0+$/, '');

      return formatted;
    } catch (error) {
      return '';
    }
  }, [selectedQuote, params.toToken.decimals]);

  return {
    outputAmount,
    isLoading,
    error,
    quote: selectedQuote,
  };
};

