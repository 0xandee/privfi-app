import { useState, useCallback } from 'react';
import { Token } from '@/shared/types';
import { STARKNET_TOKENS } from '@/constants/tokens';
import { formatTokenAmountDisplay } from '@/shared/utils/lib/inputValidation';
import { useTokenBalance } from '@/shared/hooks';
import { MinimumDepositValidation } from '../types';

export const useDepositForm = (walletAddress?: string) => {
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<Token>(STARKNET_TOKENS.ETH);
  const [isUserInputting, setIsUserInputting] = useState(false);

  // Get token balance for validation
  const { rawFormatted: balance } = useTokenBalance(token, walletAddress);



  // Handle amount changes
  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
    setIsUserInputting(true);
  }, []);

  // Handle token changes
  const handleTokenChange = useCallback((newToken: Token) => {
    setToken(newToken);
    // Clear amount when token changes to trigger new validation
    setAmount('');
    setIsUserInputting(false);
  }, []);

  // Get minimum amount for selected token (based on Typhoon requirements)
  const getMinimumAmount = useCallback((tokenAddress: string): string => {
    const normalizedAddress = tokenAddress.toLowerCase();

    // ETH: 0.001 ETH minimum
    if (normalizedAddress === '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7') {
      return '0.001';
    }

    // STRK: 10 STRK minimum
    if (normalizedAddress === '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d') {
      return '10';
    }

    // USDC: 1 USDC minimum
    if (normalizedAddress === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8') {
      return '1';
    }

    // WBTC: 0.00005 WBTC minimum
    if (normalizedAddress === '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac') {
      return '0.00005';
    }

    // Default minimum for unknown tokens
    return '0.001';
  }, []);

  // Validate minimum deposit amount
  const validateMinimumAmount = useCallback((): MinimumDepositValidation => {
    const minimumAmount = getMinimumAmount(token.address);
    const amountNum = parseFloat(amount);
    const minimumNum = parseFloat(minimumAmount);

    if (!amount || amountNum <= 0) {
      return {
        isValid: false,
        minimumAmount,
        errorMessage: `Enter deposit amount`,
      };
    }

    if (amountNum < minimumNum) {
      return {
        isValid: false,
        minimumAmount,
        errorMessage: `Minimum deposit is ${minimumAmount} ${token.symbol}`,
      };
    }

    return {
      isValid: true,
      minimumAmount,
    };
  }, [amount, token, getMinimumAmount]);

  // Check if form is valid for deposit
  const isValidForDeposit = useCallback((): boolean => {
    const validation = validateMinimumAmount();

    // Check if amount exceeds balance
    if (amount && balance && parseFloat(amount) > parseFloat(balance)) {
      return false;
    }

    return validation.isValid && !!walletAddress;
  }, [validateMinimumAmount, walletAddress, amount, balance]);

  // Reset form
  const resetForm = useCallback(() => {
    setAmount('');
    setIsUserInputting(false);
  }, []);

  return {
    // State
    amount,
    token,
    isUserInputting,

    // Validation
    minimumAmountValidation: validateMinimumAmount(),
    isValidForDeposit: isValidForDeposit(),

    // Actions
    setAmount: handleAmountChange,
    setToken: handleTokenChange,
    resetForm,
  };
};