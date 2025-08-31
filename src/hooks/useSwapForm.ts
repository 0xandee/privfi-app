import { useState } from 'react';
import { STARKNET_TOKENS, Token } from '@/constants/tokens';

export const useSwapForm = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(STARKNET_TOKENS.STRK);
  
  const percentageButtons = [25, 50, 75, 100];

  const handlePercentageClick = (percentage: number, balance: string) => {
    // Calculate percentage of balance
    const balanceNum = parseFloat(balance);
    const amount = (balanceNum * percentage) / 100;
    setFromAmount(amount.toFixed(6));
  };

  const handleSwap = () => {
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
    
    // Actions
    setFromAmount,
    setToAmount,
    setFromToken,
    setToToken,
    handlePercentageClick,
    handleSwap,
  };
};