import { useState } from 'react';
import { usePrivacyStore } from '../store/privacyStore';
import { PrivacyFlowOrchestrator, PrivacySwapParams } from '../services/PrivacyFlowOrchestrator';
import { toast } from '@/shared/components/ui/use-toast';
import { useAccount } from '@starknet-react/core';

export const usePrivacySwap = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { address, account } = useAccount();
  const { addActiveSwap, resetFlowState } = usePrivacyStore();

  const executePrivacySwap = async (params: PrivacySwapParams) => {
    if (!address || !account) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to perform a privacy swap',
        variant: 'destructive'
      });
      return null;
    }

    setIsExecuting(true);
    resetFlowState();

    try {
      const orchestrator = PrivacyFlowOrchestrator.getInstance();
      const swapId = await orchestrator.initiatePrivacySwap(address, params, account);

      addActiveSwap(swapId);

      toast({
        title: 'Privacy swap initiated',
        description: 'Your swap is being processed through the privacy protocol. This will take 3-5 minutes.',
      });

      return swapId;
    } catch (error) {
      console.error('Privacy swap failed:', error);

      toast({
        title: 'Privacy swap failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });

      return null;
    } finally {
      setIsExecuting(false);
    }
  };

  const getSwapStatus = async (swapId: string) => {
    try {
      const orchestrator = PrivacyFlowOrchestrator.getInstance();
      return await orchestrator.getSwapStatus(swapId);
    } catch (error) {
      console.error('Failed to get swap status:', error);
      return null;
    }
  };

  const getUserSwaps = async () => {
    if (!address) return [];

    try {
      const orchestrator = PrivacyFlowOrchestrator.getInstance();
      return await orchestrator.getUserSwaps(address);
    } catch (error) {
      console.error('Failed to get user swaps:', error);
      return [];
    }
  };

  return {
    executePrivacySwap,
    getSwapStatus,
    getUserSwaps,
    isExecuting
  };
};