/**
 * Supabase Deposit Hooks
 * React hooks for deposit operations with Supabase
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseDepositService, type CreateDepositRequest, type UpdateDepositRequest, type GetDepositsFilters } from '../services/supabaseDepositService';
import type { DepositRecord } from '../types';
import type { DepositRow, TyphoonDataInsert } from '@/core/supabase/types';

// Query keys for React Query
const QUERY_KEYS = {
  deposits: 'deposits',
  userDeposits: (walletAddress: string) => ['deposits', 'user', walletAddress],
  depositById: (id: string) => ['deposits', 'id', id],
  depositByTx: (txHash: string) => ['deposits', 'tx', txHash],
  typhoonData: (txHash: string) => ['typhoon', txHash],
} as const;

/**
 * Hook to fetch deposits with optional filtering
 */
export const useDeposits = (filters: GetDepositsFilters = {}) => {
  const queryKey = useMemo(() => ['deposits', 'list', filters], [filters]);

  return useQuery({
    queryKey,
    queryFn: () => supabaseDepositService.getDeposits(filters),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch deposits for a specific user
 */
export const useUserDeposits = (walletAddress: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.userDeposits(walletAddress || ''),
    queryFn: () => supabaseDepositService.getUserDeposits(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30000,
    gcTime: 300000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a single deposit by ID
 */
export const useDepositById = (id: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.depositById(id || ''),
    queryFn: () => supabaseDepositService.getDepositById(id!),
    enabled: !!id,
    staleTime: 60000, // 1 minute
    gcTime: 300000,
    retry: 1,
  });
};

/**
 * Hook to fetch a single deposit by transaction hash
 */
export const useDepositByTransactionHash = (transactionHash: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.depositByTx(transactionHash || ''),
    queryFn: () => supabaseDepositService.getDepositByTransactionHash(transactionHash!),
    enabled: !!transactionHash,
    staleTime: 60000,
    gcTime: 300000,
    retry: 1,
  });
};

/**
 * Hook to create a new deposit with optimistic updates
 */
export const useCreateDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDepositRequest) =>
      supabaseDepositService.createDeposit(request),
    onMutate: async (newDeposit) => {
      // Optimistic update for user deposits if wallet address is available
      if (newDeposit.wallet_address) {
        const queryKey = QUERY_KEYS.userDeposits(newDeposit.wallet_address);
        await queryClient.cancelQueries({ queryKey });

        const previousDeposits = queryClient.getQueryData<DepositRow[]>(queryKey);

        // Create optimistic deposit record
        const optimisticDeposit: DepositRow = {
          ...newDeposit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          secrets: newDeposit.secrets || [],
          nullifiers: newDeposit.nullifiers || [],
          pools: newDeposit.pools || [],
          status: newDeposit.status || 'pending',
          note: newDeposit.note || null,
        };

        queryClient.setQueryData<DepositRow[]>(queryKey, (old = []) => [
          optimisticDeposit,
          ...old,
        ]);

        return { previousDeposits, queryKey };
      }
      return undefined;
    },
    onError: (err, newDeposit, context) => {
      // Rollback optimistic update on error
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousDeposits);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.deposits] });
      if (variables.wallet_address) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.userDeposits(variables.wallet_address)
        });
      }
    },
  });
};

/**
 * Hook to update an existing deposit
 */
export const useUpdateDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateDepositRequest) =>
      supabaseDepositService.updateDeposit(request),
    onSuccess: (data) => {
      // Update cached deposit data
      queryClient.setQueryData(QUERY_KEYS.depositById(data.id), data);
      queryClient.setQueryData(QUERY_KEYS.depositByTx(data.transaction_hash), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.deposits] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userDeposits(data.wallet_address)
      });
    },
  });
};

/**
 * Hook to update deposit status
 */
export const useUpdateDepositStatus = () => {
  const updateDeposit = useUpdateDeposit();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DepositRow['status'] }) =>
      supabaseDepositService.updateDepositStatus(id, status),
    onSuccess: updateDeposit.onSuccess,
  });
};

/**
 * Hook to update deposit with transaction hash
 */
export const useUpdateDepositWithTransactionHash = () => {
  const updateDeposit = useUpdateDeposit();

  return useMutation({
    mutationFn: ({
      id,
      transactionHash,
      status = 'confirmed'
    }: {
      id: string;
      transactionHash: string;
      status?: DepositRow['status'];
    }) => supabaseDepositService.updateDepositWithTransactionHash(id, transactionHash, status),
    onSuccess: updateDeposit.onSuccess,
  });
};

/**
 * Hook to delete a deposit
 */
export const useDeleteDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supabaseDepositService.deleteDeposit(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate queries
      queryClient.removeQueries({ queryKey: QUERY_KEYS.depositById(deletedId) });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.deposits] });
    },
  });
};

/**
 * Hook to save Typhoon data
 */
export const useSaveTyphoonData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TyphoonDataInsert) =>
      supabaseDepositService.saveTyphoonData(data),
    onSuccess: (data) => {
      // Cache the Typhoon data
      queryClient.setQueryData(QUERY_KEYS.typhoonData(data.transaction_hash), data);
    },
  });
};

/**
 * Hook to fetch Typhoon data by transaction hash
 */
export const useTyphoonData = (transactionHash: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.typhoonData(transactionHash || ''),
    queryFn: () => supabaseDepositService.getTyphoonData(transactionHash!),
    enabled: !!transactionHash,
    staleTime: 300000, // 5 minutes (Typhoon data rarely changes)
    gcTime: 600000, // 10 minutes
    retry: 1,
  });
};

/**
 * Hook to delete Typhoon data
 */
export const useDeleteTyphoonData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionHash: string) =>
      supabaseDepositService.deleteTyphoonData(transactionHash),
    onSuccess: (_, transactionHash) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.typhoonData(transactionHash) });
    },
  });
};

/**
 * Hook for deposit statistics
 */
export const useDepositStats = (walletAddress: string | undefined) => {
  const { data: deposits = [] } = useUserDeposits(walletAddress);

  return useMemo(() => {
    const stats = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending').length,
      confirmed: deposits.filter(d => d.status === 'confirmed').length,
      withdrawn: deposits.filter(d => d.status === 'withdrawn').length,
      totalValue: '0', // Could calculate total value if token prices are available
    };

    return stats;
  }, [deposits]);
};

/**
 * Composite hook that combines deposit record conversion for backward compatibility
 */
export const useDepositRecords = (walletAddress: string | undefined) => {
  const { data: deposits = [], ...rest } = useUserDeposits(walletAddress);

  const depositRecords = useMemo(() =>
    deposits.map(deposit => supabaseDepositService.convertToDepositRecord(deposit)),
    [deposits]
  );

  return {
    ...rest,
    data: depositRecords,
  };
};