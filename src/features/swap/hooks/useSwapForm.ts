import React, { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Token } from '@/shared/types';
import { STARKNET_TOKENS, POPULAR_PAIRS, DEFAULT_TOKENS } from '@/constants/tokens';
import { useSwapQuotes, useSwapEstimation } from './useSwapQuotes';
import { useSwapExecution } from './useSwapExecution';

export const useSwapForm = (walletAddress?: string) => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(STARKNET_TOKENS.STRK);
  const [isUserInputting, setIsUserInputting] = useState(false);
  const [slippage, setSlippage] = useState(0.5);
  const [isSwappingDirection, setIsSwappingDirection] = useState(false);
  const [isEstimatingAfterSwap, setIsEstimatingAfterSwap] = useState(false);

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

  // Swap execution hook
  const swapExecution = useSwapExecution({
    selectedQuote: swapQuotes.selectedQuote,
    slippage,
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

  // Debug effect to monitor toAmount changes
  useEffect(() => {
    console.log('toAmount state changed to:', toAmount);
  }, [toAmount]);

  // Update toAmount when quotes change
  useEffect(() => {
    const outputAmount = swapEstimation.outputAmount;
    
    // Don't override estimated amounts while swapping direction
    if (isSwappingDirection) {
      return;
    }
    
    if (outputAmount && fromAmount && parseFloat(fromAmount) > 0) {
      setToAmount(outputAmount);
      setIsEstimatingAfterSwap(false); // Clear estimating flag when real quotes arrive
    } else if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      setIsEstimatingAfterSwap(false);
    }
  }, [swapEstimation.outputAmount, fromAmount, swapEstimation, isSwappingDirection]);

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
    // Skip clearing amounts if we're in the middle of a direction swap
    if (isSwappingDirection) {
      setFromToken(newToken);
      return;
    }
    
    if (newToken.address === toToken.address) {
      // Same token selected, auto-switch the to token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setToToken(alternativeToken);
    }
    setFromToken(newToken);
    setFromAmount('');
    setToAmount('');
    setIsUserInputting(false);
  }, [toToken.address, getAlternativeToken, isSwappingDirection]);

  const handleToTokenChange = useCallback((newToken: Token) => {
    // Skip clearing amounts if we're in the middle of a direction swap
    if (isSwappingDirection) {
      setToToken(newToken);
      return;
    }
    
    if (newToken.address === fromToken.address) {
      // Same token selected, auto-switch the from token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setFromToken(alternativeToken);
    }
    setToToken(newToken);
    setFromAmount('');
    setToAmount('');
    setIsUserInputting(false);
  }, [fromToken.address, getAlternativeToken, isSwappingDirection]);

  // Handle from amount changes
  const handleFromAmountChange = useCallback((value: string) => {
    setFromAmount(value);
    setIsUserInputting(true);
  }, []);

  // Swap direction function
  const handleSwapDirection = useCallback(() => {
    // Store values before any state changes
    const tempFromToken = fromToken;
    const tempToToken = toToken;
    const newFromAmount = toAmount || swapEstimation.outputAmount || '';
    
    // Calculate immediate reverse estimate using current exchange rate
    let estimatedToAmount = '';
    if (newFromAmount && swapQuotes.formattedQuote) {
      try {
        const sellAmountDecimal = swapQuotes.formattedQuote.sellAmountDecimal;
        const buyAmountDecimal = swapQuotes.formattedQuote.buyAmountDecimal;
        
        if (sellAmountDecimal > 0 && buyAmountDecimal > 0) {
          // Current exchange rate: buyAmount / sellAmount
          const currentExchangeRate = buyAmountDecimal / sellAmountDecimal;
          // Reverse estimate: newFromAmount / currentExchangeRate
          const reverseAmount = parseFloat(newFromAmount) / currentExchangeRate;
          estimatedToAmount = reverseAmount.toFixed(8).replace(/\.?0+$/, '');
        }
      } catch (error) {
        console.warn('Failed to calculate reverse estimate:', error);
      }
    }
    
    // Use flushSync to ensure all updates happen synchronously
    flushSync(() => {
      setIsSwappingDirection(true);
      setFromToken(tempToToken);
      setToToken(tempFromToken);
    });
    
    // Then set amounts in a separate flushSync to avoid conflicts
    flushSync(() => {
      setFromAmount(newFromAmount);
      setToAmount(estimatedToAmount);
      setIsUserInputting(true);
      setIsEstimatingAfterSwap(!!estimatedToAmount);
    });
    
    console.log('Set all states with flushSync:', { newFromAmount, estimatedToAmount });
    
    // Reset flag after a brief delay
    setTimeout(() => setIsSwappingDirection(false), 100);
  }, [fromToken, toToken, toAmount, swapEstimation.outputAmount, swapQuotes.formattedQuote]);

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

    // Execute the swap using the swap execution hook
    swapExecution.executeSwap();
  }, [isValidTokenPair, swapQuotes, swapExecution]);

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

    // Quote data
    quotes: swapQuotes.quotes,
    selectedQuote: swapQuotes.selectedQuote,
    bestQuote: swapQuotes.bestQuote,
    formattedQuote: swapQuotes.formattedQuote,
    isLoadingQuotes: swapQuotes.isLoading,
    quotesError: swapQuotes.error,
    isQuoteExpired: swapQuotes.isExpired,
    timeToExpiry: swapQuotes.timeToExpiry,

    // Swap execution state
    isExecutingSwap: swapExecution.isLoading,
    isSwapSuccess: swapExecution.isSuccess,
    isSwapError: swapExecution.isError,
    swapError: swapExecution.error,
    transactionHash: swapExecution.transactionHash,

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
    resetSwap: swapExecution.reset,
  };
};