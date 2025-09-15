import { useMemo } from 'react';
import { Token } from '@/shared/types';
import { TyphoonService } from '../services/typhoon';
import { useSwapStore } from '../store/swapStore';

interface MinimumAmountValidation {
  isValid: boolean;
  minimumAmount: string;
  errorMessage?: string;
  warningMessage?: string;
}

interface UseMinimumAmountValidationProps {
  inputToken: Token;
  inputAmount: string;
  isPrivacyMode?: boolean; // Optional override for privacy mode
}

/**
 * Hook to validate if the input amount meets Typhoon's minimum requirements for private swaps
 */
export const useMinimumAmountValidation = ({
  inputToken,
  inputAmount,
  isPrivacyMode,
}: UseMinimumAmountValidationProps): MinimumAmountValidation => {
  // Get privacy configuration from store if not explicitly provided
  const { privacy } = useSwapStore();
  const privacyEnabled = isPrivacyMode ?? privacy.isEnabled;

  return useMemo(() => {
    // If privacy mode is disabled, validation passes
    if (!privacyEnabled) {
      return {
        isValid: true,
        minimumAmount: '0',
      };
    }

    // If no input amount, validation passes (handled elsewhere)
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      return {
        isValid: true,
        minimumAmount: '0',
      };
    }

    try {
      // Create Typhoon service instance to get minimum amount
      const typhoonService = new TyphoonService();
      const minimumAmount = typhoonService.getTokenMinimalAmount(inputToken.address);

      const inputAmountNum = parseFloat(inputAmount);
      const minimumAmountNum = parseFloat(minimumAmount);

      const isValid = inputAmountNum >= minimumAmountNum;

      if (!isValid) {
        return {
          isValid: false,
          minimumAmount,
          errorMessage: `Minimum ${minimumAmount} ${inputToken.symbol} required for private swaps`,
          warningMessage: `Private swaps require a minimum of ${minimumAmount} ${inputToken.symbol}. Current input: ${inputAmount} ${inputToken.symbol}`,
        };
      }

      return {
        isValid: true,
        minimumAmount,
      };
    } catch (error) {
      // If there's an error getting minimum amount, allow the transaction
      // This ensures the validation doesn't block legitimate swaps
      return {
        isValid: true,
        minimumAmount: '0',
      };
    }
  }, [inputToken.address, inputToken.symbol, inputAmount, privacyEnabled]);
};