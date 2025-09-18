import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSendTransaction, useAccount } from '@starknet-react/core';
import { Call } from 'starknet';
import { toast } from '@/shared/components/ui/sonner';
import { ExternalLink } from 'lucide-react';
import { AVNUService } from '../services/avnu';
import { AVNUQuote } from '../services/avnu';
import { SwapExecutionState, SwapProgress } from '../types/swap';
import { useSwapStore } from '../store/swapStore';

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
  const { setExecuting, setExecutionProgress } = useSwapStore();
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
  const progressClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateProgress = useCallback((progress: SwapProgress | undefined) => {
    setExecutionProgress(progress);
    setExecutionState(prev => ({ ...prev, progress }));
  }, [setExecutionProgress]);

  // Helper function to schedule progress clearing with timeout management
  const scheduleProgressClear = useCallback((delayMs: number) => {
    // Clear any existing timeout
    if (progressClearTimeoutRef.current) {
      clearTimeout(progressClearTimeoutRef.current);
      progressClearTimeoutRef.current = null;
    }

    // Schedule new timeout
    progressClearTimeoutRef.current = setTimeout(() => {
      updateProgress(undefined);
      progressClearTimeoutRef.current = null;
    }, delayMs);
  }, [updateProgress]);

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
          setExecuting(false);
          updateProgress(undefined);
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
        setExecuting(true);

        const now = Date.now();
        updateProgress({
          phase: 'awaiting-signature',
          message: 'Awaiting wallet signature',
          estimatedTimeMs: undefined, // No estimation - user dependent
          startedAt: now
        });
        break;
      case 'success': {
        const txHash = transactionData?.transaction_hash || null;

        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          transactionHash: txHash,
        }));

        // Phase 1: Blockchain confirmation
        const confirmNow = Date.now();
        updateProgress({
          phase: 'confirming',
          message: 'Transaction confirming',
          estimatedTimeMs: 3000,
          startedAt: confirmNow
        });

        // Complete after confirmation
        setTimeout(() => {
          updateProgress({
            phase: 'completed',
            message: 'Swap completed successfully!'
          });
          scheduleProgressClear(3000);
        }, 2000);

        // Show success toast (only once per transaction)
        if (txHash && toastShownRef.current !== txHash) {
          toastShownRef.current = txHash;
          toast.success('Swap successful!', {
            duration: 8000,
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
      }
      case 'error': {
        const errorMessage = transactionError?.message || 'Transaction failed';
        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorMessage,
          transactionHash: null,
        }));

        setExecuting(false);
        updateProgress(undefined);

        // Show error toast (only once per error)
        if (errorToastShownRef.current !== errorMessage) {
          errorToastShownRef.current = errorMessage;
          toast.error('Swap failed!', {
            description: errorMessage,
            duration: 8000,
          });
        }
        break;
      }
    }
  }, [status, transactionData, transactionError, executionState.isLoading, setExecuting, updateProgress]);

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
      // Set executing and loading state
      setExecuting(true);
      setExecutionState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        transactionHash: null,
      }));

      const now = Date.now();
      updateProgress({
        phase: 'preparing',
        message: 'Preparing swap transaction',
        estimatedTimeMs: 1000,
        startedAt: now
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const now2 = Date.now();
      updateProgress({
        phase: 'building-swap',
        message: 'Building swap calls with AVNU',
        estimatedTimeMs: 2000,
        startedAt: now2
      });

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

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now3 = Date.now();
      updateProgress({
        phase: 'awaiting-signature',
        message: 'Ready to sign - please check your wallet',
        estimatedTimeMs: undefined, // No estimation - user dependent
        startedAt: now3
      });

      // Execute the swap transaction
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

      setExecuting(false);
      updateProgress(undefined);

      if (errorToastShownRef.current !== errorMessage) {
        errorToastShownRef.current = errorMessage;
        toast.error('Swap failed!', {
          description: errorMessage,
          duration: 8000,
        });
      }
    }
  }, [selectedQuote, address, slippage, avnuService, sendTransaction, setExecuting, updateProgress]);

  const reset = useCallback(() => {
    setExecutionState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      transactionHash: null,
    });
    setExecuting(false);
    updateProgress(undefined);
    toastShownRef.current = null;
    errorToastShownRef.current = null;
    // Clear any pending progress clear timeouts
    if (progressClearTimeoutRef.current) {
      clearTimeout(progressClearTimeoutRef.current);
      progressClearTimeoutRef.current = null;
    }
    resetTransaction();
  }, [resetTransaction, setExecuting, updateProgress]);

  return {
    ...executionState,
    executeSwap,
    reset,
  };
};