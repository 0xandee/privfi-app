import { useState } from 'react';

export const useSwapForm = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  
  const percentageButtons = [25, 50, 75, 100];

  const handlePercentageClick = (percentage: number, balance: string) => {
    // Calculate percentage of balance
    const balanceNum = parseFloat(balance);
    const amount = (balanceNum * percentage) / 100;
    setFromAmount(amount.toFixed(6));
  };

  const handleSwap = () => {
    // TODO: Implement swap logic
    console.log('Swapping:', { fromAmount, toAmount });
  };

  return {
    // State
    fromAmount,
    toAmount,
    percentageButtons,
    
    // Actions
    setFromAmount,
    setToAmount,
    handlePercentageClick,
    handleSwap,
  };
};