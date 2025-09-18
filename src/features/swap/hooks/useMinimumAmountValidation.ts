import { useMemo } from 'react';
import { Token } from '@/shared/types';

interface MinimumAmountValidation {
  isValid: boolean;
  minimumAmount: string;
  errorMessage?: string;
  warningMessage?: string;
}

interface UseMinimumAmountValidationProps {
  outputToken: Token;
  outputAmount: string;
}

/**
 * Hook to validate minimum amounts for swaps
 * Simplified after removing privacy features - always returns valid
 */
export const useMinimumAmountValidation = ({
  outputToken,
  outputAmount,
}: UseMinimumAmountValidationProps): MinimumAmountValidation => {
  return useMemo(() => {
    // Without privacy features, no minimum amount validation is needed
    return {
      isValid: true,
      minimumAmount: '0',
    };
  }, [outputToken.address, outputToken.symbol, outputAmount]);
};