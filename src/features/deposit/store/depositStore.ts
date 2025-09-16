/**
 * Deposit Store with Supabase Integration
 * Replaces localStorage with Supabase for persistent storage
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabaseDepositService } from '../services/supabaseDepositService';
import type { DepositRecord } from '../types';
import type { DepositRow } from '@/core/supabase/types';

interface DepositStore {
  // State
  deposits: DepositRecord[];
  currentDeposit: DepositRecord | null;
  isLoading: boolean;
  isSync: boolean; // Tracks if we're syncing with Supabase
  error: string | null;
  syncError: string | null; // Separate error for sync issues

  // Connection status
  isConnected: boolean;
  lastSync: number | null;

  // Actions
  setCurrentDeposit: (deposit: DepositRecord | null) => void;
  addDeposit: (deposit: DepositRecord) => void;
  updateDeposit: (id: string, updates: Partial<DepositRecord>) => void;
  removeDeposit: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearDeposits: () => void;
  getUserDeposits: (walletAddress: string) => DepositRecord[];

  // Supabase sync actions
  syncWithSupabase: (walletAddress?: string) => Promise<void>;
  setSyncStatus: (isSync: boolean) => void;
  setSyncError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;

  // Real-time updates (called by external real-time hooks)
  handleRealtimeInsert: (deposit: DepositRow) => void;
  handleRealtimeUpdate: (deposit: DepositRow) => void;
  handleRealtimeDelete: (depositId: string) => void;
}

export const useDepositStore = create<DepositStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    deposits: [],
    currentDeposit: null,
    isLoading: false,
    isSync: false,
    error: null,
    syncError: null,
    isConnected: false,
    lastSync: null,

    // Basic actions (kept for backward compatibility)
    setCurrentDeposit: (deposit) => set({ currentDeposit: deposit }),

    addDeposit: (deposit) => {
      set((state) => ({
        deposits: [deposit, ...state.deposits],
        currentDeposit: deposit,
      }));

      // Async save to Supabase (fire and forget for optimistic updates)
      supabaseDepositService
        .createDeposit(supabaseDepositService.convertFromDepositRecord(deposit))
        .catch((error) => {
          console.error('Failed to sync deposit to Supabase:', error);
          set({ syncError: `Failed to save deposit: ${error.message}` });
        });
    },

    updateDeposit: (id, updates) => {
      set((state) => ({
        deposits: state.deposits.map((dep) =>
          dep.id === id ? { ...dep, ...updates } : dep
        ),
        currentDeposit:
          state.currentDeposit?.id === id
            ? { ...state.currentDeposit, ...updates }
            : state.currentDeposit,
      }));

      // Async update in Supabase
      supabaseDepositService
        .updateDeposit({
          id,
          updates: supabaseDepositService.convertFromDepositRecord({
            ...get().deposits.find(d => d.id === id)!,
            ...updates,
          } as DepositRecord),
        })
        .catch((error) => {
          console.error('Failed to update deposit in Supabase:', error);
          set({ syncError: `Failed to update deposit: ${error.message}` });
        });
    },

    removeDeposit: (id) => {
      set((state) => ({
        deposits: state.deposits.filter((dep) => dep.id !== id),
        currentDeposit:
          state.currentDeposit?.id === id ? null : state.currentDeposit,
      }));

      // Async delete from Supabase
      supabaseDepositService
        .deleteDeposit(id)
        .catch((error) => {
          console.error('Failed to delete deposit from Supabase:', error);
          set({ syncError: `Failed to delete deposit: ${error.message}` });
        });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearDeposits: () =>
      set({
        deposits: [],
        currentDeposit: null,
        error: null,
      }),

    getUserDeposits: (walletAddress) => {
      const { deposits } = get();
      return deposits
        .filter((dep) => dep.walletAddress === walletAddress)
        .sort((a, b) => b.timestamp - a.timestamp);
    },

    // Supabase sync actions
    syncWithSupabase: async (walletAddress) => {
      const { setSyncStatus, setSyncError, setConnected } = get();

      try {
        setSyncStatus(true);
        setSyncError(null);

        let deposits: DepositRow[];

        if (walletAddress) {
          // Sync deposits for specific wallet
          deposits = await supabaseDepositService.getUserDeposits(walletAddress);
        } else {
          // Sync all deposits (if needed)
          deposits = await supabaseDepositService.getDeposits();
        }

        // Convert to DepositRecord format
        const depositRecords = deposits.map(deposit =>
          supabaseDepositService.convertToDepositRecord(deposit)
        );

        set({
          deposits: depositRecords,
          lastSync: Date.now(),
          syncError: null,
        });

        setConnected(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        setSyncError(errorMessage);
        setConnected(false);
        throw error;
      } finally {
        setSyncStatus(false);
      }
    },

    setSyncStatus: (isSync) => set({ isSync }),

    setSyncError: (syncError) => set({ syncError }),

    setConnected: (connected) => set({ isConnected: connected }),

    // Real-time update handlers
    handleRealtimeInsert: (deposit) => {
      const depositRecord = supabaseDepositService.convertToDepositRecord(deposit);
      set((state) => {
        // Avoid duplicates
        const exists = state.deposits.some(d => d.id === depositRecord.id);
        if (exists) return state;

        return {
          deposits: [depositRecord, ...state.deposits],
          lastSync: Date.now(),
        };
      });
    },

    handleRealtimeUpdate: (deposit) => {
      const depositRecord = supabaseDepositService.convertToDepositRecord(deposit);
      set((state) => ({
        deposits: state.deposits.map((dep) =>
          dep.id === depositRecord.id ? depositRecord : dep
        ),
        currentDeposit:
          state.currentDeposit?.id === depositRecord.id
            ? depositRecord
            : state.currentDeposit,
        lastSync: Date.now(),
      }));
    },

    handleRealtimeDelete: (depositId) => {
      set((state) => ({
        deposits: state.deposits.filter((dep) => dep.id !== depositId),
        currentDeposit:
          state.currentDeposit?.id === depositId ? null : state.currentDeposit,
        lastSync: Date.now(),
      }));
    },
  }))
);

/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use useRealtimeDeposits hook instead for better real-time integration
 */
export const useLegacyDepositStore = useDepositStore;