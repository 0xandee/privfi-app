import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSendTransaction, useAccount } from '@starknet-react/core';
import { Call } from 'starknet';
import { toast } from '@/shared/components/ui/sonner';
import { ExternalLink } from 'lucide-react';
import { AVNUService } from '../services/avnu';
import { AVNUQuote } from '../services/avnu';
import { TyphoonService } from '../services/typhoon';
import { SwapExecutionState } from '../types/swap';

export interface UseSwapExecutionParams {
  selectedQuote: AVNUQuote | null;
  slippage: number;
  recipientAddress?: string; // For private swaps
}

export interface UseSwapExecutionResult extends SwapExecutionState {
  executeSwap: () => void;
  reset: () => void;
}

export const useSwapExecution = ({
  selectedQuote,
  slippage,
  recipientAddress,
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
  const typhoonService = useMemo(() => new TyphoonService(), []);
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

  const handlePrivateWithdrawal = useCallback(async (txHash: string) => {
    try {
      // Use recipient address if provided, otherwise use wallet address
      const recipient = recipientAddress || address;
      if (!recipient) {
        throw new Error('No recipient address available for withdrawal');
      }

      await typhoonService.withdraw({
        transactionHash: txHash,
        recipientAddresses: [recipient],
      });

      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'completed',
      }));

      toast.success('Private withdrawal completed!', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'failed',
      }));

      toast.error('Withdrawal failed!', {
        description: error instanceof Error ? error.message : 'Unknown withdrawal error',
        duration: 8000,
      });
    }
  }, [typhoonService, recipientAddress, address]);

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
      case 'success': {
        const txHash = transactionData?.transaction_hash || null;
        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          transactionHash: txHash,
          withdrawalStatus: 'pending',
        }));
        
        // For private swaps, initiate withdrawal after transaction confirmation
        if (txHash && executionState.isPrivateSwap) {
          handlePrivateWithdrawal(txHash);
        }
        
        // Show success toast (only once per transaction)
        if (txHash && toastShownRef.current !== txHash) {
          toastShownRef.current = txHash;
          toast.success(executionState.isPrivateSwap ? 'Private swap successful! Completing withdrawal...' : 'Swap successful!', {
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
    }
  }, [status, transactionData, transactionError, executionState.isLoading, executionState.isPrivateSwap, handlePrivateWithdrawal]);

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

      // Generate Typhoon private swap calls (deposit calls)
      const depositCalls = await typhoonService.generateApproveAndDepositCalls(
        selectedQuote.buyAmount,
        selectedQuote.buyTokenAddress
      );

      // Combine AVNU swap calls with Typhoon deposit calls for private swap
      const allCalls = [...buildResponse.calls, ...depositCalls];

      // Set private swap state
      setExecutionState(prev => ({
        ...prev,
        isPrivateSwap: true,
      }));

      // Execute the multicall transaction (swap + deposit)
      sendTransaction(allCalls);
      
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
  }, [selectedQuote, address, slippage, avnuService, typhoonService, sendTransaction]);

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