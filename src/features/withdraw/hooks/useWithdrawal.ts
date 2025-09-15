import { useState, useCallback } from 'react';
import { usePrivacyStore } from '@/features/privacy/store/privacyStore';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { useAccount } from '@starknet-react/core';
import { WithdrawalService, WithdrawalRequest, WithdrawalResponse } from '../services/WithdrawalService';

interface WithdrawalState {
  isLoading: boolean;
  error: string | null;
  transactionHash: string | null;
  isSuccess: boolean;
}

export const useWithdrawal = () => {
  const [state, setState] = useState<WithdrawalState>({
    isLoading: false,
    error: null,
    transactionHash: null,
    isSuccess: false
  });

  const { withdrawalData, clearWithdrawalData } = usePrivacyStore();
  const { address } = useWalletStore();
  const { account } = useAccount();
  const withdrawalService = WithdrawalService.getInstance();

  const executeWithdrawal = useCallback(async (
    tokenAddress: string,
    amount: string,
    recipientAddress?: string
  ): Promise<void> => {
    if (!address || !account) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    if (!withdrawalData) {
      setState(prev => ({ ...prev, error: 'No withdrawal data available' }));
      return;
    }

    setState({
      isLoading: true,
      error: null,
      transactionHash: null,
      isSuccess: false
    });

    try {
      // First get withdrawal calls from backend
      const request: WithdrawalRequest = {
        userAddress: address,
        tokenAddress,
        amount,
        recipientAddress: recipientAddress || address,
        typhoonData: withdrawalData.typhoonData
      };

      const withdrawalCalls = await withdrawalService.getWithdrawalCalls(request);

      if (!withdrawalCalls || withdrawalCalls.length === 0) {
        throw new Error('No withdrawal calls received from backend');
      }

      // Execute withdrawal transaction using user's wallet
      const withdrawalResult = await account.execute(withdrawalCalls);
      const transactionHash = withdrawalResult.transaction_hash;

      // Wait for transaction confirmation
      await waitForTransaction(account, transactionHash);

      setState({
        isLoading: false,
        error: null,
        transactionHash,
        isSuccess: true
      });

      // Clear withdrawal data after successful withdrawal
      clearWithdrawalData();
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
        transactionHash: null,
        isSuccess: false
      });
    }
  }, [address, account, withdrawalData, withdrawalService, clearWithdrawalData]);

  const waitForTransaction = async (account: any, txHash: string): Promise<void> => {
    try {
      let provider = account?.provider;

      if (!provider && account?.getProvider) {
        provider = account.getProvider();
      }

      if (!provider && account?.channel?.provider) {
        provider = account.channel.provider;
      }

      if (!provider) {
        const { RpcProvider } = await import('starknet');
        provider = new RpcProvider({
          nodeUrl: 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/FXZBPkx6KsqGG8OFIH7fD'
        });
      }

      await provider.waitForTransaction(txHash);
    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      transactionHash: null,
      isSuccess: false
    });
  }, []);

  return {
    ...state,
    withdrawalData,
    executeWithdrawal,
    resetState,
    hasWithdrawalData: Boolean(withdrawalData)
  };
};