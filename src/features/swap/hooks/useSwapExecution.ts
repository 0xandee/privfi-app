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
    isPrivateSwap: false,
    withdrawalStatus: undefined,
  });

  const avnuService = useMemo(() => new AVNUService(), []);
  const typhoonService = useMemo(() => new TyphoonService(), []);
  const toastShownRef = useRef<string | null>(null);
  const errorToastShownRef = useRef<string | null>(null);
  const withdrawalInitiatedRef = useRef<string | null>(null); // Track which transaction has withdrawal initiated
  const processedTransactionRef = useRef<string | null>(null); // Track processed transactions
  const isTransitioningToWalletRef = useRef<boolean>(false); // Track transition to wallet interaction
  const lastPhaseRef = useRef<string | null>(null); // Track last phase to prevent duplicates
  const lastMessageRef = useRef<string | null>(null); // Track last message to prevent duplicates
  const withdrawalCompletedRef = useRef<string | null>(null); // Track completed withdrawals
  const progressClearTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track progress clear timeouts
  const successProcessedRef = useRef<string | null>(null); // Track processed success transactions

  const updateProgress = useCallback((progress: SwapProgress | undefined) => {
    // Prevent duplicate phase transitions (check both phase and message)
    if (progress?.phase && progress?.message &&
      lastPhaseRef.current === progress.phase &&
      lastMessageRef.current === progress.message) {
      return;
    }

    if (progress?.phase) {
      lastPhaseRef.current = progress.phase;
    }
    if (progress?.message) {
      lastMessageRef.current = progress.message;
    }

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

  const handlePrivateWithdrawal = useCallback(async (txHash: string) => {
    // Prevent duplicate withdrawal calls using ref to avoid circular dependency
    if (withdrawalInitiatedRef.current === txHash) {
      return;
    }

    // Check current withdrawal status from state
    if (executionState.withdrawalStatus === 'processing' || executionState.withdrawalStatus === 'completed') {
      return;
    }

    // Mark this transaction as having withdrawal initiated
    withdrawalInitiatedRef.current = txHash;

    try {
      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'processing',
      }));


      const now = Date.now();
      updateProgress({
        phase: 'processing-withdrawal',
        message: 'Processing withdrawal',
        estimatedTimeMs: 60000, // Updated: was 45000ms, actual ~46200ms + buffer
        startedAt: now
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


      // Mark withdrawal as completed for this transaction
      withdrawalCompletedRef.current = txHash;

      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'completed',
        isPrivateSwap: false, // Clear flag after successful withdrawal
      }));

      updateProgress({
        phase: 'completed',
        message: 'Swap and withdrawal completed!'
      });

      scheduleProgressClear(3000);

      toast.success('Withdrawal completed!', {
        duration: 5000,
      });
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        withdrawalStatus: 'failed',
        isPrivateSwap: false, // Clear flag on failure too
      }));

      updateProgress(undefined);

      toast.error('Withdrawal failed!', {
        description: error instanceof Error ? error.message : 'Unknown withdrawal error',
        duration: 8000,
      });
    }
    // Note: executionState.withdrawalStatus is intentionally omitted from dependencies 
    // to prevent circular dependency that causes infinite re-renders
  }, [typhoonService, recipientAddress, address, updateProgress]);

  // Update execution state based on transaction status
  useEffect(() => {
    // Safely access current progress from store to avoid dependency issues
    const currentProgress = executionState.progress;

    switch (status) {
      case 'idle':
        // Don't clear progress if we're transitioning to wallet interaction or still executing
        if (executionState.isLoading && !isTransitioningToWalletRef.current) {
          // Don't clear progress during execution phases that should continue
          const isActivePhase = currentProgress && [
            'preparing',
            'building-swap',
            'generating-deposit',
            'awaiting-signature',
            'confirming',
            'processing-withdrawal'
          ].includes(currentProgress.phase);

          if (!isActivePhase) {
            setExecutionState(prev => ({
              ...prev,
              isLoading: false,
            }));
            setExecuting(false);
            updateProgress(undefined);
          }
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

        // Only update progress if we're not already in awaiting-signature phase or transitioning
        if (currentProgress?.phase !== 'awaiting-signature' && !isTransitioningToWalletRef.current) {
          const now = Date.now();
          updateProgress({
            phase: 'awaiting-signature',
            message: 'Awaiting wallet signature',
            estimatedTimeMs: undefined, // No estimation - user dependent
            startedAt: now
          });
        }
        break;
      case 'success': {
        const txHash = transactionData?.transaction_hash || null;

        // Prevent processing the same transaction multiple times
        if (txHash && successProcessedRef.current === txHash) {
          break;
        }

        // Don't process if withdrawal was already completed for this transaction
        if (txHash && withdrawalCompletedRef.current === txHash) {
          break;
        }

        if (txHash) {
          successProcessedRef.current = txHash;
        }

        setExecutionState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          transactionHash: txHash,
          withdrawalStatus: 'pending',
        }));

        // Phase 1: Blockchain confirmation only
        const now = Date.now();

        updateProgress({
          phase: 'confirming',
          message: 'Transaction confirming',
          estimatedTimeMs: 3000, // Updated: Only blockchain confirmation, not withdrawal
          startedAt: now
        });

        // For private swaps, save SDK data with transaction hash first, then initiate withdrawal
        // Only do this if we haven't already processed this transaction and we have pending deposit data
        if (txHash && executionState.isPrivateSwap && address &&
          processedTransactionRef.current !== txHash &&
          withdrawalInitiatedRef.current !== txHash) {
          // Mark transaction as processed to prevent re-processing
          processedTransactionRef.current = txHash;
          // Check if we have pending deposit data to save
          const hasPendingData = typhoonService.hasPendingDepositData();

          if (hasPendingData) {
            // Save the SDK data with the transaction hash for future withdrawal
            typhoonService.saveDepositDataWithTxHash(txHash, address).then(() => {
              // Wait for the confirming phase to complete (~3 seconds) before starting withdrawal
              setTimeout(() => {
                handlePrivateWithdrawal(txHash);
              }, 3000);
            }).catch((error) => {
              // Still attempt withdrawal in case data was already saved
              setTimeout(() => {
                handlePrivateWithdrawal(txHash);
              }, 3000);
            });
          } else {
            setTimeout(() => {
              handlePrivateWithdrawal(txHash);
            }, 3000);
          }
        } else if (txHash && !executionState.isPrivateSwap && withdrawalCompletedRef.current !== txHash) {
          // Regular swap completion - only if no withdrawal was completed for this transaction
          setTimeout(() => {
            updateProgress({
              phase: 'completed',
              message: 'Swap completed successfully!'
            });
            scheduleProgressClear(3000);
          }, 2000);
        }

        // Show success toast (only once per transaction)
        if (txHash && toastShownRef.current !== txHash) {
          toastShownRef.current = txHash;
          toast.success(executionState.isPrivateSwap ? 'Swap successful! Starting withdrawal' : 'Swap successful!', {
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
      // Set executing and loading state FIRST to prevent idle state clearing
      setExecuting(true);
      setExecutionState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        transactionHash: null,
        isPrivateSwap: false, // Reset private swap flag
        withdrawalStatus: 'pending', // Reset withdrawal status
      }));

      const now = Date.now();
      updateProgress({
        phase: 'preparing',
        message: 'Preparing swap transaction',
        estimatedTimeMs: 1000, // Updated: was 3000ms, actual ~500ms
        startedAt: now
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const now2 = Date.now();
      updateProgress({
        phase: 'building-swap',
        message: 'Building swap calls with AVNU',
        estimatedTimeMs: 2000, // Updated: was 5000ms, actual ~1400ms
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

      try {
        const now3 = Date.now();
        updateProgress({
          phase: 'generating-deposit',
          message: 'Generating private deposit calls',
          estimatedTimeMs: 15000, // Updated: was 10000ms, actual ~14200ms
          startedAt: now3
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

        const now4 = Date.now();
        updateProgress({
          phase: 'awaiting-signature',
          message: 'Ready to sign - please check your wallet',
          estimatedTimeMs: undefined, // No estimation - user dependent
          startedAt: now4
        });

        // Set transition flag to protect awaiting-signature state
        isTransitioningToWalletRef.current = true;

        // Execute the multicall transaction (swap + deposit)
        sendTransaction(allCalls);

        // Clear transition flag after brief delay to allow wallet to open
        setTimeout(() => {
          isTransitioningToWalletRef.current = false;
        }, 500);

      } catch (typhoonError) {

        // Fall back to regular swap without privacy layer
        toast.warning('Private swap unavailable, proceeding with regular swap', {
          description: 'Typhoon privacy service is temporarily unavailable',
          duration: 5000,
        });

        const now5 = Date.now();
        updateProgress({
          phase: 'awaiting-signature',
          message: 'Ready to sign regular swap - check your wallet',
          estimatedTimeMs: undefined, // No estimation - user dependent
          startedAt: now5
        });

        // Set transition flag to protect awaiting-signature state
        isTransitioningToWalletRef.current = true;

        // Execute regular swap without deposit calls
        sendTransaction(buildResponse.calls);

        // Clear transition flag after brief delay to allow wallet to open
        setTimeout(() => {
          isTransitioningToWalletRef.current = false;
        }, 500);
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
      isPrivateSwap: false,
      withdrawalStatus: undefined,
    });
    setExecuting(false);
    updateProgress(undefined);
    toastShownRef.current = null; // Reset success toast tracking
    errorToastShownRef.current = null; // Reset error toast tracking
    withdrawalInitiatedRef.current = null; // Reset withdrawal tracking
    processedTransactionRef.current = null; // Reset transaction processing tracking
    isTransitioningToWalletRef.current = false; // Reset transition tracking
    lastPhaseRef.current = null; // Reset phase tracking
    lastMessageRef.current = null; // Reset message tracking
    withdrawalCompletedRef.current = null; // Reset withdrawal completion tracking
    successProcessedRef.current = null; // Reset success processing tracking
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