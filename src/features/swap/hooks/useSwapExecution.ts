import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSendTransaction, useAccount } from '@starknet-react/core';
import { Call } from 'starknet';
import { toast } from '@/shared/components/ui/sonner';
import { ExternalLink } from 'lucide-react';
import { AVNUService } from '../services/avnu';
import { AVNUQuote } from '../services/avnu';
import { TyphoonService } from '../services/typhoon';
import { SwapExecutionState, SwapProgress } from '../types/swap';
import { useSwapStore } from '../store/swapStore';

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
  const { setExecuting, setExecutionProgress } = useSwapStore();
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

  const updateProgress = useCallback((progress: SwapProgress | undefined) => {
    setExecutionProgress(progress);
    setExecutionState(prev => ({ ...prev, progress }));
  }, [setExecutionProgress]);

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
      updateProgress({
        phase: 'processing-withdrawal',
        message: 'Processing private withdrawal...',
        estimatedTimeMs: 45000
      });

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

      updateProgress({
        phase: 'completed',
        message: 'Private swap and withdrawal completed!'
      });

      setTimeout(() => updateProgress(undefined), 3000);

      toast.success('Private withdrawal completed!', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'failed',
      }));

      updateProgress(undefined);

      toast.error('Withdrawal failed!', {
        description: error instanceof Error ? error.message : 'Unknown withdrawal error',
        duration: 8000,
      });
    }
  }, [typhoonService, recipientAddress, address, updateProgress]);

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
        
        updateProgress({
          phase: 'awaiting-signature',
          message: 'Awaiting wallet signature...',
          estimatedTimeMs: 15000
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
          withdrawalStatus: 'pending',
        }));
        
        updateProgress({
          phase: 'confirming',
          message: 'Transaction confirmed on blockchain...',
          estimatedTimeMs: 5000
        });
        
        // For private swaps, save SDK data with transaction hash first, then initiate withdrawal
        if (txHash && executionState.isPrivateSwap && address) {
          // Save the SDK data with the transaction hash for future withdrawal
          typhoonService.saveDepositDataWithTxHash(txHash, address).then(() => {
            console.log('✅ Deposit data saved, initiating withdrawal...');
            handlePrivateWithdrawal(txHash);
          }).catch((error) => {
            console.error('❌ Failed to save deposit data:', error);
            // Still attempt withdrawal in case data was already saved
            handlePrivateWithdrawal(txHash);
          });
        } else {
          // Regular swap completion
          setTimeout(() => {
            updateProgress({
              phase: 'completed',
              message: 'Swap completed successfully!'
            });
            setTimeout(() => updateProgress(undefined), 3000);
          }, 2000);
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
        
        setExecuting(false);
        updateProgress(undefined);
        
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
  }, [status, transactionData, transactionError, executionState.isLoading, executionState.isPrivateSwap, handlePrivateWithdrawal, address, setExecuting, typhoonService, updateProgress]);

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

      setExecuting(true);

      updateProgress({
        phase: 'preparing',
        message: 'Preparing swap transaction...',
        estimatedTimeMs: 3000
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      updateProgress({
        phase: 'building-swap',
        message: 'Building swap calls with AVNU...',
        estimatedTimeMs: 5000
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

      try {
        updateProgress({
          phase: 'generating-deposit',
          message: 'Generating private deposit calls...',
          estimatedTimeMs: 4000
        });

        // Attempt to generate Typhoon private swap calls (deposit calls)
        const depositCalls = await typhoonService.generateApproveAndDepositCalls(
          selectedQuote.buyAmount,
          selectedQuote.buyTokenAddress,
          address // Pass wallet address for future SDK data saving
        );

        // Combine AVNU swap calls with Typhoon deposit calls for private swap
        const allCalls = [...buildResponse.calls, ...depositCalls];

        // Set private swap state
        setExecutionState(prev => ({
          ...prev,
          isPrivateSwap: true,
        }));

        await new Promise(resolve => setTimeout(resolve, 800));

        updateProgress({
          phase: 'awaiting-signature',
          message: 'Ready to sign - please check your wallet...',
          estimatedTimeMs: 15000
        });

        // Execute the multicall transaction (swap + deposit)
        sendTransaction(allCalls);
        
      } catch (typhoonError) {
        console.group('⚠️ Typhoon Fallback Activated');
        console.warn('Typhoon service unavailable, falling back to regular swap');
        console.warn('Original error:', typhoonError);
        console.log('Proceeding with regular AVNU swap calls only');
        console.groupEnd();
        
        // Fall back to regular swap without privacy layer
        toast.warning('Private swap unavailable, proceeding with regular swap', {
          description: 'Typhoon privacy service is temporarily unavailable',
          duration: 5000,
        });

        updateProgress({
          phase: 'awaiting-signature',
          message: 'Ready to sign regular swap - check your wallet...',
          estimatedTimeMs: 15000
        });

        // Execute regular swap without deposit calls
        console.log('🔄 Executing regular swap fallback...');
        sendTransaction(buildResponse.calls);
      }
      
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
  }, [selectedQuote, address, slippage, avnuService, typhoonService, sendTransaction, setExecuting, updateProgress]);

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
    toastShownRef.current = null; // Reset success toast tracking
    errorToastShownRef.current = null; // Reset error toast tracking
    resetTransaction();
  }, [resetTransaction, setExecuting, updateProgress]);

  return {
    ...executionState,
    executeSwap,
    reset,
  };
};