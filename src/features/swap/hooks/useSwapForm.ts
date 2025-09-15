import React, { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Token } from '@/shared/types';
import { STARKNET_TOKENS, POPULAR_PAIRS, DEFAULT_TOKENS } from '@/constants/tokens';
import { useSwapQuotes, useSwapEstimation } from './useSwapQuotes';
import { useSwapExecution } from './useSwapExecution';
import { usePrivacySwapExecution } from './usePrivacySwapExecution';
import { useSwapStore } from '../store/swapStore';
import { usePrivacyStore } from '@/features/privacy/store/privacyStore';
import { formatTokenAmountDisplay } from '@/shared/utils/lib/inputValidation';
import { useMinimumAmountValidation } from './useMinimumAmountValidation';

export const useSwapForm = (walletAddress?: string) => {
  // Get privacy config from stores
  const { privacy } = useSwapStore();
  const { isPrivacyModeEnabled } = usePrivacyStore();

  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(STARKNET_TOKENS.STRK);
  const [isUserInputting, setIsUserInputting] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [isEstimatingAfterSwap, setIsEstimatingAfterSwap] = useState(false);
  const [isSwappingDirection, setIsSwappingDirection] = useState(false);

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

  // Regular swap execution hook
  const swapExecution = useSwapExecution({
    selectedQuote: swapQuotes.selectedQuote,
    slippage,
    recipientAddress: privacy.recipientAddress || undefined,
  });

  // Privacy swap execution hook
  const privacySwapExecution = usePrivacySwapExecution({
    selectedQuote: swapQuotes.selectedQuote,
    slippage,
    recipientAddress: privacy.recipientAddress || undefined,
  });

  // Minimum amount validation for private swaps
  const minimumAmountValidation = useMinimumAmountValidation({
    inputToken: fromToken,
    inputAmount: fromAmount,
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
      let amount = (balanceNum * percentage) / 100;
      
      // For 100%, use Math.floor to ensure we never exceed the balance due to rounding
      if (percentage === 100) {
        // Truncate to 6 decimal places to prevent exceeding balance
        const multiplier = Math.pow(10, 6);
        amount = Math.floor(amount * multiplier) / multiplier;
      }
      
      setFromAmount(formatTokenAmountDisplay(amount, 6));
    }
  };


  // Update toAmount when quotes change
  useEffect(() => {
    const outputAmount = swapEstimation.outputAmount;
    const currentQuote = swapEstimation.quote;
    
    // Don't override toAmount during direction swap to allow proper clearing
    if (isSwappingDirection) {
      return;
    }
    
    // Enhanced validation: check if quote matches current tokens to prevent stale data
    // Normalize addresses for comparison (handle leading zero differences)
    const normalizeAddress = (addr: string) => addr.toLowerCase().replace(/^0x0+/, '0x');
    
    if (currentQuote && 
        (normalizeAddress(currentQuote.sellTokenAddress) !== normalizeAddress(fromToken.address) || 
         normalizeAddress(currentQuote.buyTokenAddress) !== normalizeAddress(toToken.address))) {
      return;
    }
    
    
    if (outputAmount && fromAmount && parseFloat(fromAmount) > 0) {
      setToAmount(outputAmount);
      setIsEstimatingAfterSwap(false); // Clear estimating flag when real quotes arrive
    } else if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      setIsEstimatingAfterSwap(false);
    }
  }, [swapEstimation.outputAmount, fromAmount, swapEstimation, isSwappingDirection, fromToken.address, toToken.address]);

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
      // Clear amounts only when we need to auto-switch tokens due to conflict
      setFromAmount('');
      setToAmount('');
    } else {
      // Different tokens - preserve fromAmount, clear toAmount to trigger new quote
      setToAmount('');
    }
    setFromToken(newToken);
    setIsUserInputting(false);
  }, [toToken.address, getAlternativeToken]);

  const handleToTokenChange = useCallback((newToken: Token) => {
    
    if (newToken.address === fromToken.address) {
      // Same token selected, auto-switch the from token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setFromToken(alternativeToken);
      // Clear amounts only when we need to auto-switch tokens due to conflict
      setFromAmount('');
      setToAmount('');
    } else {
      // Different tokens - preserve fromAmount, clear toAmount to trigger new quote
      setToAmount('');
    }
    setToToken(newToken);
    setIsUserInputting(false);
  }, [fromToken.address, getAlternativeToken]);

  // Handle from amount changes
  const handleFromAmountChange = useCallback((value: string) => {
    setFromAmount(value);
    setIsUserInputting(true);
  }, []);


  // Check if current selection is valid (different tokens)
  const isValidTokenPair = fromToken.address !== toToken.address;

  // Calculate minimum received based on slippage
  const calculateMinReceived = useCallback((amount: string, slippagePercent: number): string => {
    if (!amount || parseFloat(amount) <= 0) return '0';
    const amountNum = parseFloat(amount);
    // Apply slippage to the amount (which already has Typhoon fee deducted)
    const minReceived = amountNum * (1 - slippagePercent / 100);
    return formatTokenAmountDisplay(minReceived, 8);
  }, []);

  const minReceived = calculateMinReceived(toAmount, slippage);

  const handleSlippageChange = useCallback((newSlippage: number) => {
    setSlippage(newSlippage);
  }, []);

  // Swap direction function
  const handleSwapDirection = useCallback(() => {
    // Store current values
    const tempFromToken = fromToken;
    const tempFromAmount = fromAmount;
    const tempToAmount = toAmount;
    
    // CRITICAL: Clear quotes FIRST to prevent stale data issues
    swapQuotes.clearQuotes();
    
    // Use flushSync to ensure all state updates happen atomically
    flushSync(() => {
      // Set flag FIRST to prevent useEffect interference
      setIsSwappingDirection(true);
      
      // Clear toAmount immediately
      setToAmount('');
      
      // Swap tokens
      setFromToken(toToken);
      setToToken(tempFromToken);
    });
    
    // Second flushSync for amount handling
    flushSync(() => {
      // Swap amounts - use toAmount as new fromAmount
      if (tempToAmount && parseFloat(tempToAmount) > 0) {
        setFromAmount(tempToAmount);
      } else {
        setFromAmount('');
      }
      
      // Set additional flags
      setIsUserInputting(true);
      setIsEstimatingAfterSwap(false);
    });
    
    // Reset the swapping direction flag after longer delay (500ms instead of 100ms)
    setTimeout(() => {
      setIsSwappingDirection(false);
    }, 500);
  }, [fromToken, toToken, fromAmount, toAmount, isUserInputting, isEstimatingAfterSwap, swapQuotes, swapEstimation]);

  const handleSwap = useCallback(() => {
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

    // Use privacy swap if privacy mode is enabled, otherwise use regular swap
    if (isPrivacyModeEnabled) {
      privacySwapExecution.executePrivacySwap();
    } else {
      swapExecution.executeSwap();
    }
  }, [isValidTokenPair, swapQuotes, swapExecution, isPrivacyModeEnabled, privacySwapExecution]);

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
    isEstimatingAfterSwap,
    isSwappingDirection,

    // Quote data
    quotes: swapQuotes.quotes,
    selectedQuote: swapQuotes.selectedQuote,
    bestQuote: swapQuotes.bestQuote,
    formattedQuote: swapQuotes.formattedQuote,
    isLoadingQuotes: swapQuotes.isLoading,
    quotesError: swapQuotes.error,
    isQuoteExpired: swapQuotes.isExpired,
    timeToExpiry: swapQuotes.timeToExpiry,

    // Swap execution state (use privacy execution state if privacy mode is enabled)
    isExecutingSwap: isPrivacyModeEnabled ? privacySwapExecution.isExecuting : swapExecution.isLoading,
    isSwapSuccess: swapExecution.isSuccess,
    isSwapError: swapExecution.isError,
    swapError: swapExecution.error,
    transactionHash: swapExecution.transactionHash,

    // Minimum amount validation for private swaps
    minimumAmountValidation,

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
    clearQuotes: swapQuotes.clearQuotes,
    resetSwap: swapExecution.reset,
  };
};