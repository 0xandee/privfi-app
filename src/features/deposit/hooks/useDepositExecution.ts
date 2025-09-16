import { useState, useCallback, useMemo } from 'react';
import { useAccount, useProvider } from '@starknet-react/core';
import { supabaseDepositService } from '../services/supabaseDepositService';
import { DepositService, DirectDepositRequest, DirectDepositResponse } from '../services';
import { DepositExecution, DepositRecord } from '../types';
import { useDepositStore } from '../store';

export const useDepositExecution = () => {
  const { account } = useAccount();
  const { provider } = useProvider();
  const depositStore = useDepositStore();

  const [execution, setExecution] = useState<DepositExecution>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    transactionHash: null,
    depositRecord: null,
  });

  const depositService = useMemo(() => new DepositService(), []);

  // Reset execution state
  const reset = useCallback(() => {
    setExecution({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      transactionHash: null,
      depositRecord: null,
    });
  }, []);

  // Execute deposit transaction
  const executeDeposit = useCallback(
    async (amount: string, tokenAddress: string, tokenDecimals: number, walletAddress: string) => {
      if (!account || !provider) {
        setExecution(prev => ({
          ...prev,
          isError: true,
          error: new Error('Wallet not connected'),
        }));
        return;
      }

      try {
        // Set loading state
        setExecution(prev => ({
          ...prev,
          isLoading: true,
          isError: false,
          error: null,
        }));

        depositStore.setLoading(true);
        depositStore.setError(null);

        // Convert human-readable amount to raw amount (smallest unit)
        // e.g., "1" USDC with 6 decimals becomes "1000000"
        const rawAmount = (parseFloat(amount) * Math.pow(10, tokenDecimals)).toString();

        // Prepare deposit request
        const request: DirectDepositRequest = {
          amount: rawAmount,
          tokenAddress,
          walletAddress,
        };

        // Generate deposit calls and data
        const depositResponse: DirectDepositResponse = await depositService.executeDirectDeposit(request);

        // Execute the transaction calls
        const calls = depositResponse.depositCalls.map(call => ({
          contractAddress: call.contractAddress,
          entrypoint: call.entrypoint,
          calldata: call.calldata,
        }));

        const result = await account.execute(calls);

        // Wait for transaction to be accepted
        await provider.waitForTransaction(result.transaction_hash);

        // Update deposit data and record with transaction hash
        const { depositData, depositRecord } = depositService.updateDepositWithTransactionHash(
          depositResponse.depositData,
          depositResponse.depositRecord,
          result.transaction_hash
        );

        // Save to Supabase - both deposit record and Typhoon data
        try {
          // Create deposit in Supabase
          const depositRequest = supabaseDepositService.convertFromDepositRecord(depositRecord);
          const savedDeposit = await supabaseDepositService.createDeposit(depositRequest);

          // Note: Typhoon data (secrets, nullifiers, pools) is now stored directly in the deposits table
          // No need for separate typhoon_data table - this reduces redundancy and simplifies architecture

          // Update local store (for immediate UI feedback)
          // The real-time subscription will also update this, but local update is faster
          // Skip Supabase save since we already saved it above
          depositStore.addDeposit(supabaseDepositService.convertToDepositRecord(savedDeposit), true);
        } catch (supabaseError) {
          console.error('Failed to save to Supabase, falling back to local store:', supabaseError);

          // Fallback: Save to local store only
          depositStore.addDeposit(depositRecord);
          depositStore.setSyncError(
            `Failed to sync with cloud storage: ${supabaseError instanceof Error ? supabaseError.message : 'Unknown error'}`
          );
        }

        // Update execution state
        setExecution({
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          transactionHash: result.transaction_hash,
          depositRecord,
        });

        depositStore.setLoading(false);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        setExecution({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: new Error(errorMessage),
          transactionHash: null,
          depositRecord: null,
        });

        depositStore.setLoading(false);
        depositStore.setError(errorMessage);
      }
    },
    [account, provider, depositService, depositStore]
  );

  // Get minimum amount for token
  const getMinimumAmount = useCallback(
    (tokenAddress: string): string => {
      return depositService.getTokenMinimalAmount(tokenAddress);
    },
    [depositService]
  );

  return {
    // State
    isLoading: execution.isLoading,
    isSuccess: execution.isSuccess,
    isError: execution.isError,
    error: execution.error,
    transactionHash: execution.transactionHash,
    depositRecord: execution.depositRecord,

    // Actions
    executeDeposit,
    getMinimumAmount,
    reset,
  };
};