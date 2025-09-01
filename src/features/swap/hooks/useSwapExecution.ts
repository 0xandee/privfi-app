import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSendTransaction, useAccount } from '@starknet-react/core';
import { Call } from 'starknet';
import { toast } from '@/shared/components/ui/sonner';
import { ExternalLink } from 'lucide-react';
import { AVNUService } from '../services/avnu';
import { AVNUQuote } from '../services/avnu';
import { SwapExecutionState } from '../types/swap';

export interface UseSwapExecutionParams {
  selectedQuote: AVNUQuote | null;
  slippage: number;
}

export interface UseSwapExecutionResult extends SwapExecutionState {
  executeSwap: () => void;
  reset: () => void;
}

export const useSwapExecution = ({
  selectedQuote,
  slippage,
}: UseSwapExecutionParams): UseSwapExecutionResult => {
  const { address } = useAccount();
  const [executionState, setExecutionState] = useState<SwapExecutionState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    transactionHash: null,
  });

  const avnuService = useMemo(() => new AVNUService(), []);
  const toastShownRef = useRef<string | null>(null);
  const errorToastShownRef = useRef<string | null>(null);

  const {
    send: sendTransaction,
    data: transactionData,
    error: transactionError,
    status,
    reset: resetTransaction,
  } = useSendTransaction({
    calls: undefined, // Will be set dynamically
  });

  // Update execution state based on transaction status
  useEffect(() => {
    switch (status) {
      case 'idle':
        if (executionState.isLoading) {
          setExecutionState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
        break;
      case 'pending':
        setExecutionState(prev => ({
          ...prev,
          isLoading: true,
          isSuccess: false,
          isError: false,
          error: null,
        }));
        break;
      case 'success':
        const txHash = transactionData?.transaction_hash || null;
        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          transactionHash: txHash,
        }));
        
        // Show success toast (only once per transaction)
        if (txHash && toastShownRef.current !== txHash) {
          toastShownRef.current = txHash;
          toast.success('Swap successful!', {
            duration: 8000, // 8 seconds
            action: {
              label: React.createElement('span', { className: 'flex items-center gap-1' }, [
                'View tx',
                React.createElement(ExternalLink, { key: 'icon', className: 'h-3 w-3' })
              ]),
              onClick: () => window.open(`https://voyager.online/tx/${txHash}`, '_blank'),
            },
          });
        }
        break;
      case 'error':
        const errorMessage = transactionError?.message || 'Transaction failed';
        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          transactionHash: null,
        }));
        
        // Show error toast (only once per error)
        if (errorToastShownRef.current !== errorMessage) {
          errorToastShownRef.current = errorMessage;
          toast.error('Swap failed!', {
            description: errorMessage,
            duration: 8000, // 8 seconds
          });
        }
        break;
    }
  }, [status, transactionData, transactionError, executionState.isLoading]);

  const executeSwap = useCallback(async () => {
    if (!selectedQuote) {
      const error = 'No quote selected';
      setExecutionState(prev => ({
        ...prev,
        isError: true,
        error,
      }));
      if (errorToastShownRef.current !== error) {
        errorToastShownRef.current = error;
        toast.error('Swap failed!', {
          description: error,
          duration: 8000,
        });
      }
      return;
    }

    if (!address) {
      const error = 'Wallet not connected';
      setExecutionState(prev => ({
        ...prev,
        isError: true,
        error,
      }));
      if (errorToastShownRef.current !== error) {
        errorToastShownRef.current = error;
        toast.error('Swap failed!', {
          description: error,
          duration: 8000,
        });
      }
      return;
    }

    try {
      setExecutionState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        transactionHash: null,
      }));

      // Build the swap calldata using AVNU's build endpoint
      const buildResponse = await avnuService.buildSwap({
        quoteId: selectedQuote.quoteId,
        takerAddress: address,
        slippage: slippage / 100, // Convert percentage to decimal
        includeApprove: true,
      });

      if (!buildResponse.calls || buildResponse.calls.length === 0) {
        throw new Error('No transaction calls received from build response');
      }

      // Execute the multicall transaction
      sendTransaction(buildResponse.calls);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute swap';
      setExecutionState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: errorMessage,
        transactionHash: null,
      }));
      if (errorToastShownRef.current !== errorMessage) {
        errorToastShownRef.current = errorMessage;
        toast.error('Swap failed!', {
          description: errorMessage,
          duration: 8000,
        });
      }
    }
  }, [selectedQuote, address, slippage, avnuService, sendTransaction]);

  const reset = useCallback(() => {
    setExecutionState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      transactionHash: null,
    });
    toastShownRef.current = null; // Reset success toast tracking
    errorToastShownRef.current = null; // Reset error toast tracking
    resetTransaction();
  }, [resetTransaction]);

  return {
    ...executionState,
    executeSwap,
    reset,
  };
};