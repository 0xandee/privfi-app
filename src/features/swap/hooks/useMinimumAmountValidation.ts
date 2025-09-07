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
  outputToken: Token;
  outputAmount: string;
  isPrivacyMode?: boolean; // Optional override for privacy mode
}

/**
 * Hook to validate if the output amount meets Typhoon's minimum requirements for private swaps
 */
export const useMinimumAmountValidation = ({
  outputToken,
  outputAmount,
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

    // If no output amount, validation passes (handled elsewhere)
    if (!outputAmount || parseFloat(outputAmount) <= 0) {
      return {
        isValid: true,
        minimumAmount: '0',
      };
    }

    try {
      // Create Typhoon service instance to get minimum amount
      const typhoonService = new TyphoonService();
      const minimumAmount = typhoonService.getTokenMinimalAmount(outputToken.address);

      const outputAmountNum = parseFloat(outputAmount);
      const minimumAmountNum = parseFloat(minimumAmount);

      const isValid = outputAmountNum >= minimumAmountNum;

      if (!isValid) {
        return {
          isValid: false,
          minimumAmount,
          errorMessage: `Minimum ${minimumAmount} ${outputToken.symbol} required for private swaps`,
          warningMessage: `Private swaps require a minimum of ${minimumAmount} ${outputToken.symbol}. Current output: ${outputAmount} ${outputToken.symbol}`,
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
  }, [outputToken.address, outputToken.symbol, outputAmount, privacyEnabled]);
};