import { useState, useCallback, useEffect } from 'react';
import { Token } from '@/shared/types';
import { STARKNET_TOKENS, POPULAR_PAIRS, DEFAULT_TOKENS } from '@/constants/tokens';
import { useSwapQuotes, useSwapEstimation } from './useSwapQuotes';

export const useSwapForm = (walletAddress?: string) => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(STARKNET_TOKENS.STRK);
  const [isUserInputting, setIsUserInputting] = useState(false);
  const [slippage, setSlippage] = useState(0.5);

  const percentageButtons = [25, 50, 75, 100];

  // Get swap quotes and estimation
  const swapQuotes = useSwapQuotes({
    fromToken,
    toToken,
    fromAmount,
    walletAddress,
  });

  const swapEstimation = useSwapEstimation({
    fromToken,
    toToken,
    fromAmount,
    walletAddress,
  });

  // Get a suitable alternative token when same token is selected
  const getAlternativeToken = useCallback((currentToken: Token, avoidToken: Token): Token => {
    // First, try to find a popular pair
    const currentSymbol = currentToken.symbol;
    const avoidSymbol = avoidToken.symbol;

    for (const [token1, token2] of POPULAR_PAIRS) {
      if (token1 === currentSymbol && token2 !== avoidSymbol) {
        return STARKNET_TOKENS[token2];
      }
      if (token2 === currentSymbol && token1 !== avoidSymbol) {
        return STARKNET_TOKENS[token1];
      }
    }

    // Fallback: find any different token from defaults
    for (const tokenSymbol of DEFAULT_TOKENS) {
      if (tokenSymbol !== currentSymbol && tokenSymbol !== avoidSymbol) {
        return STARKNET_TOKENS[tokenSymbol];
      }
    }

    // Last resort: return ETH if it's not the avoided token, otherwise STRK
    return avoidSymbol !== 'ETH' ? STARKNET_TOKENS.ETH : STARKNET_TOKENS.STRK;
  }, []);

  const handlePercentageClick = (percentage: number, balance: string) => {
    // Calculate percentage of balance
    const balanceNum = parseFloat(balance);
    if (balanceNum > 0) {
      const amount = (balanceNum * percentage) / 100;
      setFromAmount(amount.toFixed(6));
    }
  };

  // Update toAmount when quotes change
  useEffect(() => {
    const outputAmount = swapEstimation.outputAmount;
    
    if (outputAmount && fromAmount && parseFloat(fromAmount) > 0) {
      setToAmount(outputAmount);
    } else if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
    }
  }, [swapEstimation.outputAmount, fromAmount, swapEstimation]);

  // Reset user inputting flag after a delay
  useEffect(() => {
    if (isUserInputting) {
      const timer = setTimeout(() => {
        setIsUserInputting(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isUserInputting]);

  // Enhanced token setters with auto-switching logic
  const handleFromTokenChange = useCallback((newToken: Token) => {
    if (newToken.address === toToken.address) {
      // Same token selected, auto-switch the to token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setToToken(alternativeToken);
    }
    setFromToken(newToken);
    setFromAmount('');
    setToAmount('');
    setIsUserInputting(false);
  }, [toToken.address, getAlternativeToken]);

  const handleToTokenChange = useCallback((newToken: Token) => {
    if (newToken.address === fromToken.address) {
      // Same token selected, auto-switch the from token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setFromToken(alternativeToken);
    }
    setToToken(newToken);
    setFromAmount('');
    setToAmount('');
    setIsUserInputting(false);
  }, [fromToken.address, getAlternativeToken]);

  // Handle from amount changes
  const handleFromAmountChange = useCallback((value: string) => {
    setFromAmount(value);
    setIsUserInputting(true);
  }, []);

  // Swap direction function
  const handleSwapDirection = useCallback(() => {
    // Swap tokens
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);

    // Swap amounts
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  }, [fromToken, toToken, fromAmount, toAmount]);

  // Check if current selection is valid (different tokens)
  const isValidTokenPair = fromToken.address !== toToken.address;

  // Calculate minimum received based on slippage
  const calculateMinReceived = useCallback((amount: string, slippagePercent: number): string => {
    if (!amount || parseFloat(amount) <= 0) return '0';
    const amountNum = parseFloat(amount);
    // Apply slippage to the amount (which already has Typhoon fee deducted)
    const minReceived = amountNum * (1 - slippagePercent / 100);
    return minReceived.toFixed(8).replace(/\.?0+$/, '');
  }, []);

  const minReceived = calculateMinReceived(toAmount, slippage);

  const handleSlippageChange = useCallback((newSlippage: number) => {
    setSlippage(newSlippage);
  }, []);

  const handleSwap = () => {
    if (!isValidTokenPair) {
      return;
    }

    if (!swapQuotes.selectedQuote) {
      return;
    }

    if (swapQuotes.isExpired) {
      swapQuotes.refetch();
      return;
    }

    // TODO: Implement actual swap execution with selected quote
  };

  return {
    // State
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    percentageButtons,
    isValidTokenPair,
    slippage,
    minReceived,

    // Quote data
    quotes: swapQuotes.quotes,
    selectedQuote: swapQuotes.selectedQuote,
    bestQuote: swapQuotes.bestQuote,
    formattedQuote: swapQuotes.formattedQuote,
    isLoadingQuotes: swapQuotes.isLoading,
    quotesError: swapQuotes.error,
    isQuoteExpired: swapQuotes.isExpired,
    timeToExpiry: swapQuotes.timeToExpiry,

    // Actions
    setFromAmount: handleFromAmountChange,
    setToAmount,
    setFromToken: handleFromTokenChange,
    setToToken: handleToTokenChange,
    handlePercentageClick,
    handleSwap,
    handleSwapDirection,
    handleSlippageChange,
    refreshQuotes: swapQuotes.refetch,
    selectQuote: swapQuotes.selectQuote,
  };
};