/**
 * Real-time Deposits Hook
 * Integrates Supabase real-time subscriptions with React Query
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeUserDeposits, useRealtime } from '@/core/providers/RealtimeProvider';
import { supabaseDepositService } from '../services/supabaseDepositService';
import { useUserDeposits } from './useSupabaseDeposits';
import type { DepositRow } from '@/core/supabase/types';

// Query keys matching those in useSupabaseDeposits.ts
const QUERY_KEYS = {
  deposits: 'deposits',
  userDeposits: (walletAddress: string) => ['deposits', 'user', walletAddress],
  depositById: (id: string) => ['deposits', 'id', id],
  depositByTx: (txHash: string) => ['deposits', 'tx', txHash],
} as const;

interface UseRealtimeDepositsOptions {
  walletAddress?: string;
  enabled?: boolean;
  onDepositCreated?: (deposit: DepositRow) => void;
  onDepositUpdated?: (deposit: DepositRow) => void;
  onDepositDeleted?: (depositId: string) => void;
}

/**
 * Hook that combines user deposits query with real-time updates
 */
export const useRealtimeDeposits = (options: UseRealtimeDepositsOptions = {}) => {
  const {
    walletAddress,
    enabled = true,
    onDepositCreated,
    onDepositUpdated,
    onDepositDeleted,
  } = options;

  const queryClient = useQueryClient();
  const { isConnected, error: realtimeError } = useRealtime();

  // Get initial deposits data
  const depositsQuery = useUserDeposits(walletAddress);

  // Handle real-time deposit changes
  const handleDepositChange = useCallback((payload: any) => {
    const { eventType, new: newDeposit, old: oldDeposit } = payload;

    switch (eventType) {
      case 'INSERT':
        if (newDeposit) {
          // Update cache with new deposit
          const userDepositsKey = walletAddress ? QUERY_KEYS.userDeposits(walletAddress) : null;

          if (userDepositsKey) {
            queryClient.setQueryData<DepositRow[]>(userDepositsKey, (old = []) => [
              newDeposit,
              ...old,
            ]);
          }

          // Cache individual deposit
          queryClient.setQueryData(QUERY_KEYS.depositById(newDeposit.id), newDeposit);
          if (newDeposit.transaction_hash) {
            queryClient.setQueryData(QUERY_KEYS.depositByTx(newDeposit.transaction_hash), newDeposit);
          }

          // Invalidate general deposits queries
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.deposits] });

          // Call callback
          onDepositCreated?.(newDeposit);
        }
        break;

      case 'UPDATE':
        if (newDeposit) {
          // Update cached deposit data
          queryClient.setQueryData(QUERY_KEYS.depositById(newDeposit.id), newDeposit);
          if (newDeposit.transaction_hash) {
            queryClient.setQueryData(QUERY_KEYS.depositByTx(newDeposit.transaction_hash), newDeposit);
          }

          // Update deposit in user deposits list
          const userDepositsKey = walletAddress ? QUERY_KEYS.userDeposits(walletAddress) : null;
          if (userDepositsKey) {
            queryClient.setQueryData<DepositRow[]>(userDepositsKey, (old = []) =>
              old.map(deposit => deposit.id === newDeposit.id ? newDeposit : deposit)
            );
          }

          // Call callback
          onDepositUpdated?.(newDeposit);
        }
        break;

      case 'DELETE':
        if (oldDeposit) {
          // Remove from caches
          queryClient.removeQueries({ queryKey: QUERY_KEYS.depositById(oldDeposit.id) });
          if (oldDeposit.transaction_hash) {
            queryClient.removeQueries({ queryKey: QUERY_KEYS.depositByTx(oldDeposit.transaction_hash) });
          }

          // Remove from user deposits list
          const userDepositsKey = walletAddress ? QUERY_KEYS.userDeposits(walletAddress) : null;
          if (userDepositsKey) {
            queryClient.setQueryData<DepositRow[]>(userDepositsKey, (old = []) =>
              old.filter(deposit => deposit.id !== oldDeposit.id)
            );
          }

          // Call callback
          onDepositDeleted?.(oldDeposit.id);
        }
        break;

      default:
        console.warn('Unknown realtime event type:', eventType);
    }
  }, [walletAddress, queryClient, onDepositCreated, onDepositUpdated, onDepositDeleted]);

  // Subscribe to real-time updates
  useRealtimeUserDeposits(
    enabled && walletAddress ? walletAddress : undefined,
    handleDepositChange
  );

  // Memoize return value
  return useMemo(() => ({
    ...depositsQuery,
    isRealtimeConnected: isConnected,
    realtimeError,
    // Convert to DepositRecord format for backward compatibility
    depositRecords: depositsQuery.data?.map(deposit =>
      supabaseDepositService.convertToDepositRecord(deposit)
    ) || [],
  }), [depositsQuery, isConnected, realtimeError]);
};

/**
 * Hook to track deposit status changes in real-time
 */
export const useDepositStatusTracker = (
  depositId: string | undefined,
  onStatusChange?: (status: DepositRow['status'], deposit: DepositRow) => void
) => {
  const queryClient = useQueryClient();
  const { isConnected } = useRealtime();

  useEffect(() => {
    if (!depositId || !isConnected) return;

    // Subscribe to changes for this specific deposit
    const channel = queryClient.getQueryCache().find({
      queryKey: QUERY_KEYS.depositById(depositId)
    });

    // Set up a query observer to watch for changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' &&
          event.query.queryKey[0] === 'deposits' &&
          event.query.queryKey[1] === 'id' &&
          event.query.queryKey[2] === depositId) {

        const newData = event.query.state.data as DepositRow | undefined;
        if (newData && onStatusChange) {
          onStatusChange(newData.status, newData);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [depositId, isConnected, queryClient, onStatusChange]);
};

/**
 * Hook to get real-time deposit statistics
 */
export const useRealtimeDepositStats = (walletAddress: string | undefined) => {
  const { depositRecords } = useRealtimeDeposits({ walletAddress });

  return useMemo(() => {
    const stats = {
      total: depositRecords.length,
      pending: depositRecords.filter(d => d.status === 'pending').length,
      confirmed: depositRecords.filter(d => d.status === 'confirmed').length,
      withdrawn: depositRecords.filter(d => d.status === 'withdrawn').length,
      totalValue: '0', // Could be calculated with token prices
      recentDeposits: depositRecords.slice(0, 5), // Last 5 deposits
    };

    return stats;
  }, [depositRecords]);
};

/**
 * Hook to show real-time notifications for deposit changes
 */
export const useDepositNotifications = (walletAddress: string | undefined) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'created' | 'confirmed' | 'withdrawn';
    deposit: DepositRow;
    timestamp: number;
  }>>([]);

  const handleDepositCreated = useCallback((deposit: DepositRow) => {
    setNotifications(prev => [...prev, {
      id: `created-${deposit.id}`,
      type: 'created',
      deposit,
      timestamp: Date.now(),
    }]);
  }, []);

  const handleDepositUpdated = useCallback((deposit: DepositRow) => {
    if (deposit.status === 'confirmed') {
      setNotifications(prev => [...prev, {
        id: `confirmed-${deposit.id}`,
        type: 'confirmed',
        deposit,
        timestamp: Date.now(),
      }]);
    } else if (deposit.status === 'withdrawn') {
      setNotifications(prev => [...prev, {
        id: `withdrawn-${deposit.id}`,
        type: 'withdrawn',
        deposit,
        timestamp: Date.now(),
      }]);
    }
  }, []);

  useRealtimeDeposits({
    walletAddress,
    onDepositCreated: handleDepositCreated,
    onDepositUpdated: handleDepositUpdated,
  });

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification,
  };
};