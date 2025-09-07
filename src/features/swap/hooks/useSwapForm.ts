import React, { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Token } from '@/shared/types';
import { STARKNET_TOKENS, POPULAR_PAIRS, DEFAULT_TOKENS } from '@/constants/tokens';
import { useSwapQuotes, useSwapEstimation } from './useSwapQuotes';
import { useSwapExecution } from './useSwapExecution';
import { useSwapStore } from '../store/swapStore';
import { formatTokenAmountDisplay } from '@/shared/utils/lib/inputValidation';

export const useSwapForm = (walletAddress?: string) => {
  // Get privacy config from store
  const { privacy } = useSwapStore();
  
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

  // Swap execution hook with privacy configuration
  const swapExecution = useSwapExecution({
    selectedQuote: swapQuotes.selectedQuote,
    slippage,
    recipientAddress: privacy.recipientAddress || undefined,
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
      console.log('⏳ Skipping toAmount update during direction swap');
      return;
    }
    
    // Enhanced validation: check if quote matches current tokens to prevent stale data
    // Normalize addresses for comparison (handle leading zero differences)
    const normalizeAddress = (addr: string) => addr.toLowerCase().replace(/^0x0+/, '0x');
    
    if (currentQuote && 
        (normalizeAddress(currentQuote.sellTokenAddress) !== normalizeAddress(fromToken.address) || 
         normalizeAddress(currentQuote.buyTokenAddress) !== normalizeAddress(toToken.address))) {
      console.log('⚠️ Quote token mismatch detected, skipping update:', {
        quoteSellToken: currentQuote.sellTokenAddress,
        quoteBuyToken: currentQuote.buyTokenAddress,
        currentFromToken: fromToken.address,
        currentToToken: toToken.address,
        normalizedQuoteSell: normalizeAddress(currentQuote.sellTokenAddress),
        normalizedQuoteBuy: normalizeAddress(currentQuote.buyTokenAddress),
        normalizedFromToken: normalizeAddress(fromToken.address),
        normalizedToToken: normalizeAddress(toToken.address),
        outputAmount: outputAmount
      });
      return;
    }
    
    
    if (outputAmount && fromAmount && parseFloat(fromAmount) > 0) {
      console.log('📈 Setting toAmount from validated quote:', {
        outputAmount: outputAmount,
        fromAmount: fromAmount,
        quoteSellToken: currentQuote?.sellTokenAddress?.slice(-6),
        quoteBuyToken: currentQuote?.buyTokenAddress?.slice(-6),
        fromTokenAddr: fromToken.address.slice(-6),
        toTokenAddr: toToken.address.slice(-6),
        tokensMatch: normalizeAddress(currentQuote?.sellTokenAddress || '') === normalizeAddress(fromToken.address) && 
                     normalizeAddress(currentQuote?.buyTokenAddress || '') === normalizeAddress(toToken.address)
      });
      setToAmount(outputAmount);
      setIsEstimatingAfterSwap(false); // Clear estimating flag when real quotes arrive
    } else if (!fromAmount || parseFloat(fromAmount) <= 0) {
      console.log('🗑️ Clearing toAmount due to empty fromAmount');
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
    console.log('🔄 SWAP DIRECTION BUTTON CLICKED');
    console.log('📊 Current state before swap:');
    console.log('  - fromToken:', fromToken.symbol, '(', fromToken.address, ')');
    console.log('  - toToken:', toToken.symbol, '(', toToken.address, ')');
    console.log('  - fromAmount:', fromAmount);
    console.log('  - toAmount:', toAmount);
    console.log('  - isUserInputting:', isUserInputting);
    console.log('  - isEstimatingAfterSwap:', isEstimatingAfterSwap);
    console.log('  - Current quotes loading:', swapQuotes.isLoading);
    console.log('  - Current selected quote:', swapQuotes.selectedQuote ? 'EXISTS' : 'NULL');
    console.log('  - Current outputAmount:', swapEstimation.outputAmount);
    
    // Store current values
    const tempFromToken = fromToken;
    const tempFromAmount = fromAmount;
    const tempToAmount = toAmount;
    
    console.log('💾 Stored temporary values:');
    console.log('  - tempFromToken:', tempFromToken.symbol);
    console.log('  - tempFromAmount:', tempFromAmount);
    console.log('  - tempToAmount:', tempToAmount);
    
    // CRITICAL: Clear quotes FIRST to prevent stale data issues
    console.log('🗑️ Clearing all quotes and cache to prevent stale data...');
    swapQuotes.clearQuotes();
    
    // Use flushSync to ensure all state updates happen atomically
    console.log('⚡ Using flushSync for atomic state updates...');
    flushSync(() => {
      // Set flag FIRST to prevent useEffect interference
      setIsSwappingDirection(true);
      
      // Clear toAmount immediately
      setToAmount('');
      
      // Swap tokens
      console.log('🔀 Swapping tokens atomically...');
      setFromToken(toToken);
      setToToken(tempFromToken);
      console.log('  - New fromToken will be:', toToken.symbol);
      console.log('  - New toToken will be:', tempFromToken.symbol);
    });
    
    // Second flushSync for amount handling
    flushSync(() => {
      // Swap amounts - use toAmount as new fromAmount
      if (tempToAmount && parseFloat(tempToAmount) > 0) {
        console.log('💰 Swapping amounts (toAmount exists and > 0):');
        console.log('  - Setting fromAmount to:', tempToAmount);
        setFromAmount(tempToAmount);
      } else {
        console.log('💰 Clearing both amounts (toAmount empty or <= 0):');
        setFromAmount('');
      }
      
      // Set additional flags
      setIsUserInputting(true);
      setIsEstimatingAfterSwap(false);
    });
    
    console.log('🔄 Atomic state updates complete');
    
    // Normalize addresses for comparison
    const normalizeAddress = (addr: string) => addr.toLowerCase().replace(/^0x0+/, '0x');
    
    console.log('📈 Quote validation:', {
      hasOldQuote: !!swapEstimation.quote,
      oldQuoteSellToken: swapEstimation.quote?.sellTokenAddress,
      oldQuoteBuyToken: swapEstimation.quote?.buyTokenAddress,
      newFromToken: toToken.address,
      newToToken: tempFromToken.address,
      tokensMatch: normalizeAddress(swapEstimation.quote?.sellTokenAddress || '') === normalizeAddress(toToken.address) && 
                   normalizeAddress(swapEstimation.quote?.buyTokenAddress || '') === normalizeAddress(tempFromToken.address)
    });
    
    // Reset the swapping direction flag after longer delay (500ms instead of 100ms)
    setTimeout(() => {
      console.log('🔓 Resetting isSwappingDirection flag - toAmount can now be updated by new quotes');
      setIsSwappingDirection(false);
    }, 500);
    
    console.log('✅ SWAP DIRECTION COMPLETE - React Query should now fetch new quotes automatically');
    console.log('📈 Expected next steps:');
    console.log('  1. Old quotes cleared, no stale data');
    console.log('  2. useSwapQuotes hook will detect token/amount changes');
    console.log('  3. React Query will fetch NEW quotes for swapped pair');
    console.log('  4. After 500ms delay, toAmount can be updated by new quotes');
    console.log('  5. UI will update with correct quote data');
    console.log('---');
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
    clearQuotes: swapQuotes.clearQuotes,
    resetSwap: swapExecution.reset,
  };
};