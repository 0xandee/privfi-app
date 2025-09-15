import { useState, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { toast } from '@/shared/components/ui/sonner';
import { AVNUQuote } from '../services/avnu';
import { usePrivacyStore } from '@/features/privacy/store/privacyStore';
import { usePrivacySwap } from '@/features/privacy/hooks/usePrivacySwap';
import { PrivacySwapParams } from '@/features/privacy/services/PrivacyFlowOrchestrator';

export interface UsePrivacySwapExecutionParams {
  selectedQuote: AVNUQuote | null;
  slippage: number;
  recipientAddress?: string;
}

export interface UsePrivacySwapExecutionResult {
  executePrivacySwap: () => Promise<void>;
  isExecuting: boolean;
  swapId: string | null;
}

export const usePrivacySwapExecution = ({
  selectedQuote,
  slippage,
  recipientAddress,
}: UsePrivacySwapExecutionParams): UsePrivacySwapExecutionResult => {
  const { address } = useAccount();
  const { isPrivacyModeEnabled } = usePrivacyStore();
  const { executePrivacySwap: executePrivacy, isExecuting } = usePrivacySwap();
  const [swapId, setSwapId] = useState<string | null>(null);

  const executePrivacySwap = useCallback(async () => {
    if (!selectedQuote || !address) {
      toast.error('Missing required data for privacy swap');
      return;
    }

    if (!isPrivacyModeEnabled) {
      toast.error('Privacy mode must be enabled for privacy swaps');
      return;
    }

    const params: PrivacySwapParams = {
      fromToken: selectedQuote.sellTokenAddress,
      toToken: selectedQuote.buyTokenAddress,
      amount: selectedQuote.sellAmount,
      slippage,
      recipientAddress: recipientAddress || address,
    };

    const id = await executePrivacy(params);
    if (id) {
      setSwapId(id);
    }
  }, [selectedQuote, address, isPrivacyModeEnabled, slippage, recipientAddress, executePrivacy]);

  return {
    executePrivacySwap,
    isExecuting,
    swapId,
  };
};