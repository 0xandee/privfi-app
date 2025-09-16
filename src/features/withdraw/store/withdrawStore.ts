import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WithdrawFormData,
  WithdrawExecution,
  WithdrawalRecord,
  GroupedDeposits
} from '../types';

interface WithdrawState {
  // Form state
  formData: WithdrawFormData;
  groupedDeposits: GroupedDeposits[];

  // Execution state
  execution: WithdrawExecution;

  // History
  withdrawalHistory: WithdrawalRecord[];

  // UI state
  isLoadingDeposits: boolean;
  depositsError: string | null;

  // Actions
  setFormData: (formData: WithdrawFormData) => void;
  setGroupedDeposits: (deposits: GroupedDeposits[]) => void;
  setExecution: (execution: WithdrawExecution) => void;
  setWithdrawalHistory: (history: WithdrawalRecord[]) => void;
  setIsLoadingDeposits: (loading: boolean) => void;
  setDepositsError: (error: string | null) => void;

  // Reset actions
  resetForm: () => void;
  resetExecution: () => void;
  resetAll: () => void;
}

const initialFormData: WithdrawFormData = {
  selectedDeposits: [],
  recipientAddress: '',
  token: null,
  totalAmount: '0',
};

const initialExecution: WithdrawExecution = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
  transactionHash: null,
  withdrawalRecord: null,
};

export const useWithdrawStore = create<WithdrawState>()(
  persist(
    (set, get) => ({
      // Initial state
      formData: initialFormData,
      groupedDeposits: [],
      execution: initialExecution,
      withdrawalHistory: [],
      isLoadingDeposits: false,
      depositsError: null,

      // Actions
      setFormData: (formData) => set({ formData }),

      setGroupedDeposits: (deposits) => set({ groupedDeposits: deposits }),

      setExecution: (execution) => set({ execution }),

      setWithdrawalHistory: (history) => set({ withdrawalHistory: history }),

      setIsLoadingDeposits: (loading) => set({ isLoadingDeposits: loading }),

      setDepositsError: (error) => set({ depositsError: error }),

      // Reset actions
      resetForm: () => set({ formData: initialFormData }),

      resetExecution: () => set({ execution: initialExecution }),

      resetAll: () => set({
        formData: initialFormData,
        groupedDeposits: [],
        execution: initialExecution,
        withdrawalHistory: [],
        isLoadingDeposits: false,
        depositsError: null,
      }),
    }),
    {
      name: 'privfi-withdraw-store',
      // Only persist form data and withdrawal history, not execution state
      partialize: (state) => ({
        formData: state.formData,
        withdrawalHistory: state.withdrawalHistory,
      }),
      // Skip hydration for sensitive data
      skipHydration: false,
    }
  )
);

// Selectors for convenient access
export const useWithdrawFormData = () => useWithdrawStore((state) => state.formData);
export const useWithdrawGroupedDeposits = () => useWithdrawStore((state) => state.groupedDeposits);
export const useWithdrawExecution = () => useWithdrawStore((state) => state.execution);
export const useWithdrawHistory = () => useWithdrawStore((state) => state.withdrawalHistory);
export const useWithdrawLoadingState = () => useWithdrawStore((state) => ({
  isLoadingDeposits: state.isLoadingDeposits,
  depositsError: state.depositsError,
}));