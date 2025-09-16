import { useState, useEffect, useCallback, useMemo } from 'react';
import { WithdrawService } from '../services/withdrawService';
import type { WithdrawalRecord } from '../types';

interface UseWithdrawalHistoryProps {
  walletAddress?: string;
  enabled?: boolean;
}

interface UseWithdrawalHistoryReturn {
  withdrawals: WithdrawalRecord[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useWithdrawalHistory = ({
  walletAddress,
  enabled = true,
}: UseWithdrawalHistoryProps): UseWithdrawalHistoryReturn => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withdrawService = useMemo(() => new WithdrawService(), []);

  const loadWithdrawals = useCallback(async () => {
    if (!walletAddress || !enabled) {
      setWithdrawals([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await withdrawService.getWithdrawalHistory(walletAddress);
      setWithdrawals(history);
    } catch (err) {
      console.error('Failed to load withdrawal history:', err);
      setError(err instanceof Error ? err : new Error('Failed to load withdrawal history'));
      setWithdrawals([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, enabled, withdrawService]);

  // Load withdrawals when wallet address changes or enabled changes
  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const refresh = useCallback(async () => {
    await loadWithdrawals();
  }, [loadWithdrawals]);

  return {
    withdrawals,
    isLoading,
    error,
    refresh,
  };
};