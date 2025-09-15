import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PrivacyFlowPhase, PrivacyFlowState } from '../services/PrivacyFlowOrchestrator';

interface TyphoonDeposit {
  depositId: string;
  txHash: string;
  userAddress: string;
  tokenAddress: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'available' | 'partially_used' | 'exhausted';
  remainingBalance?: string;
  typhoonData?: {
    note: string;
    nullifier: string;
    commitmentHash: string;
  };
}

interface WithdrawalData {
  txHash: string;
  typhoonData: {
    note: string;
    nullifier: string;
    commitmentHash: string;
  };
  tokenAddress: string;
  amount: string;
}

interface WithdrawalHistory {
  id: string;
  userAddress: string;
  tokenAddress: string;
  amount: string;
  recipientAddress: string;
  transactionHash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

interface PrivacyStore {
  // Privacy mode settings
  isPrivacyModeEnabled: boolean;
  setPrivacyMode: (enabled: boolean) => void;

  // Deposits tracking
  deposits: TyphoonDeposit[];
  addDeposit: (deposit: TyphoonDeposit) => void;
  updateDepositStatus: (txHash: string, status: TyphoonDeposit['status'], remainingBalance?: string) => void;
  getDepositsByToken: (tokenAddress: string) => TyphoonDeposit[];
  getTotalBalance: (tokenAddress: string) => string;
  selectOptimalDeposit: (tokenAddress: string, amount: string) => TyphoonDeposit | null;

  // Privacy flow state
  flowState: PrivacyFlowState;
  updateFlowState: (updates: Partial<PrivacyFlowState>) => void;
  resetFlowState: () => void;

  // Withdrawal data
  withdrawalData: WithdrawalData | null;
  setWithdrawalData: (data: WithdrawalData) => void;
  clearWithdrawalData: () => void;

  // Withdrawal history
  withdrawalHistory: WithdrawalHistory[];
  addWithdrawalToHistory: (withdrawal: WithdrawalHistory) => void;
  updateWithdrawalStatus: (transactionHash: string, status: WithdrawalHistory['status']) => void;
  getWithdrawalHistory: (userAddress: string) => WithdrawalHistory[];

  // Active swaps
  activeSwaps: string[];
  addActiveSwap: (swapId: string) => void;
  removeActiveSwap: (swapId: string) => void;

  // Clear all data
  clearAll: () => void;
}

const initialFlowState: PrivacyFlowState = {
  phase: PrivacyFlowPhase.IDLE,
  progress: 0,
  message: ''
};

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set, get) => ({
      // Privacy mode settings
      isPrivacyModeEnabled: false,
      setPrivacyMode: (enabled) => set({ isPrivacyModeEnabled: enabled }),

      // Deposits tracking
      deposits: [],

      addDeposit: (deposit) =>
        set((state) => {
          const existing = state.deposits.findIndex(d => d.txHash === deposit.txHash);
          if (existing >= 0) {
            const updated = [...state.deposits];
            updated[existing] = deposit;
            return { deposits: updated };
          }
          return { deposits: [...state.deposits, deposit] };
        }),

      updateDepositStatus: (txHash, status, remainingBalance) =>
        set((state) => {
          const deposits = state.deposits.map(d =>
            d.txHash === txHash
              ? { ...d, status, ...(remainingBalance ? { remainingBalance } : {}) }
              : d
          );
          return { deposits };
        }),

      getDepositsByToken: (tokenAddress) => {
        const state = get();
        return state.deposits.filter(
          d => d.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        );
      },

      getTotalBalance: (tokenAddress) => {
        const state = get();
        const deposits = state.getDepositsByToken(tokenAddress);
        const total = deposits
          .filter(d => d.status === 'available' || d.status === 'partially_used')
          .reduce((sum, d) => {
            const balance = BigInt(d.remainingBalance || d.amount);
            return sum + balance;
          }, 0n);
        return total.toString();
      },

      selectOptimalDeposit: (tokenAddress, amount) => {
        const state = get();
        const deposits = state.getDepositsByToken(tokenAddress);
        const amountBigInt = BigInt(amount);

        const eligible = deposits
          .filter(d =>
            (d.status === 'available' || d.status === 'partially_used') &&
            BigInt(d.remainingBalance || d.amount) >= amountBigInt
          )
          .sort((a, b) => {
            const balanceA = BigInt(a.remainingBalance || a.amount);
            const balanceB = BigInt(b.remainingBalance || b.amount);
            return balanceA < balanceB ? -1 : balanceA > balanceB ? 1 : 0;
          });

        return eligible[0] || null;
      },

      // Privacy flow state
      flowState: initialFlowState,

      updateFlowState: (updates) =>
        set((state) => ({
          flowState: { ...state.flowState, ...updates }
        })),

      resetFlowState: () =>
        set({ flowState: initialFlowState }),

      // Withdrawal data
      withdrawalData: null,

      setWithdrawalData: (data) =>
        set({ withdrawalData: data }),

      clearWithdrawalData: () =>
        set({ withdrawalData: null }),

      // Withdrawal history
      withdrawalHistory: [],

      addWithdrawalToHistory: (withdrawal) =>
        set((state) => ({
          withdrawalHistory: [...state.withdrawalHistory, withdrawal]
        })),

      updateWithdrawalStatus: (transactionHash, status) =>
        set((state) => ({
          withdrawalHistory: state.withdrawalHistory.map(w =>
            w.transactionHash === transactionHash ? { ...w, status } : w
          )
        })),

      getWithdrawalHistory: (userAddress) => {
        const state = get();
        return state.withdrawalHistory.filter(
          w => w.userAddress.toLowerCase() === userAddress.toLowerCase()
        );
      },

      // Active swaps
      activeSwaps: [],

      addActiveSwap: (swapId) =>
        set((state) => ({
          activeSwaps: [...state.activeSwaps, swapId]
        })),

      removeActiveSwap: (swapId) =>
        set((state) => ({
          activeSwaps: state.activeSwaps.filter(id => id !== swapId)
        })),

      // Clear all data
      clearAll: () =>
        set({
          deposits: [],
          flowState: initialFlowState,
          withdrawalData: null,
          withdrawalHistory: [],
          activeSwaps: [],
          isPrivacyModeEnabled: false
        })
    }),
    {
      name: 'privacy-store',
      partialize: (state) => ({
        isPrivacyModeEnabled: state.isPrivacyModeEnabled,
        deposits: state.deposits,
        withdrawalData: state.withdrawalData,
        withdrawalHistory: state.withdrawalHistory,
        activeSwaps: state.activeSwaps
      })
    }
  )
);