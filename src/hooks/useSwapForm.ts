import { useState, useCallback } from 'react';
import { STARKNET_TOKENS, Token, POPULAR_PAIRS, DEFAULT_TOKENS } from '@/constants/tokens';

export const useSwapForm = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(STARKNET_TOKENS.STRK);
  
  const percentageButtons = [25, 50, 75, 100];

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

  // Enhanced token setters with auto-switching logic
  const handleFromTokenChange = useCallback((newToken: Token) => {
    if (newToken.address === toToken.address) {
      // Same token selected, auto-switch the to token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setToToken(alternativeToken);
      setToAmount(''); // Clear to amount when token changes
    }
    setFromToken(newToken);
    setFromAmount(''); // Clear from amount when token changes
  }, [toToken.address, getAlternativeToken]);

  const handleToTokenChange = useCallback((newToken: Token) => {
    if (newToken.address === fromToken.address) {
      // Same token selected, auto-switch the from token
      const alternativeToken = getAlternativeToken(newToken, newToken);
      setFromToken(alternativeToken);
      setFromAmount(''); // Clear from amount when token changes
    }
    setToToken(newToken);
    setToAmount(''); // Clear to amount when token changes
  }, [fromToken.address, getAlternativeToken]);

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

  const handleSwap = () => {
    if (!isValidTokenPair) {
      console.error('Cannot swap same tokens');
      return;
    }
    // TODO: Implement swap logic
    console.log('Swapping:', { fromAmount, toAmount, fromToken, toToken });
  };

  return {
    // State
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    percentageButtons,
    isValidTokenPair,
    
    // Actions
    setFromAmount,
    setToAmount,
    setFromToken: handleFromTokenChange,
    setToToken: handleToTokenChange,
    handlePercentageClick,
    handleSwap,
    handleSwapDirection,
  };
};