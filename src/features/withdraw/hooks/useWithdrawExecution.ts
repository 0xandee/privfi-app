import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { WithdrawService } from '../services/withdrawService';
import type { WithdrawExecution, WithdrawRequest } from '../types';

interface UseWithdrawExecutionReturn extends WithdrawExecution {
  executeWithdraw: (request: WithdrawRequest) => Promise<void>;
  reset: () => void;
}

const initialState: WithdrawExecution = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
  transactionHash: null,
  withdrawalRecord: null,
};

export const useWithdrawExecution = (): UseWithdrawExecutionReturn => {
  const [state, setState] = useState<WithdrawExecution>(initialState);

  const withdrawService = useMemo(() => new WithdrawService(), []);

  const executeWithdraw = useCallback(async (request: WithdrawRequest) => {
    setState({
      ...initialState,
      isLoading: true,
    });

    try {
      console.log('Starting withdrawal execution:', request);

      // Show loading toast
      toast.loading('Processing withdrawal...', {
        id: 'withdraw-loading',
        description: 'Generating zero-knowledge proof and executing withdrawal',
      });

      // Execute withdrawal
      const result = await withdrawService.executeWithdraw(request);

      console.log('Withdrawal completed successfully:', result);

      setState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        transactionHash: result.transactionHash,
        withdrawalRecord: result.withdrawalRecord,
      });

      // Show success toast
      toast.dismiss('withdraw-loading');
      toast.success('Withdrawal successful!', {
        description: `Successfully withdrew tokens to ${request.recipientAddress}`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Withdrawal execution failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error : new Error(errorMessage),
        transactionHash: null,
        withdrawalRecord: null,
      });

      // Show error toast
      toast.dismiss('withdraw-loading');
      toast.error('Withdrawal failed', {
        description: errorMessage,
        duration: 8000,
      });

      throw error; // Re-throw for component error handling
    }
  }, [withdrawService]);

  const reset = useCallback(() => {
    setState(initialState);
    toast.dismiss('withdraw-loading');
  }, []);

  return {
    ...state,
    executeWithdraw,
    reset,
  };
};