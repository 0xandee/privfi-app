import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Asset } from '@mistcash/sdk';
import type { DepositData, WithdrawalData, DepositRecord, ClaimedTransaction } from '../types';

export interface PrivacyState {
  // Deposit state
  depositData: DepositData;
  depositHistory: DepositRecord[];

  // Withdrawal state
  withdrawalData: WithdrawalData;
  claimedTransactions: ClaimedTransaction[];

  // UI state
  activeTab: 'deposit' | 'withdrawal';
  showClaimingKeyHelp: boolean;
  showSecurityWarning: boolean;

  // Settings
  developmentMode: boolean;
  autoFillRecipient: boolean;

  // Deposit actions
  setDepositData: (data: Partial<DepositData>) => void;
  addDepositRecord: (record: DepositRecord) => void;
  updateDepositRecord: (id: string, updates: Partial<DepositRecord>) => void;
  removeDepositRecord: (id: string) => void;
  clearDepositHistory: () => void;

  // Withdrawal actions
  setWithdrawalData: (data: Partial<WithdrawalData>) => void;
  markTransactionAsClaimed: (transaction: ClaimedTransaction) => void;
  clearClaimedTransactions: () => void;

  // UI actions
  setActiveTab: (tab: 'deposit' | 'withdrawal') => void;
  toggleClaimingKeyHelp: () => void;
  toggleSecurityWarning: () => void;

  // Settings actions
  setDevelopmentMode: (enabled: boolean) => void;
  setAutoFillRecipient: (enabled: boolean) => void;

  // Utility actions
  resetDepositForm: () => void;
  resetWithdrawalForm: () => void;
  resetAllData: () => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
}

const initialDepositData: DepositData = {
  amount: '',
  tokenAddress: '',
  tokenName: '',
  claimingKey: '',
  recipient: '',
  txHash: null,
};

const initialWithdrawalData: WithdrawalData = {
  claimingKey: '',
  recipient: '',
  asset: null,
};

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      // Initial state
      depositData: initialDepositData,
      depositHistory: [],
      withdrawalData: initialWithdrawalData,
      claimedTransactions: [],

      activeTab: 'deposit',
      showClaimingKeyHelp: false,
      showSecurityWarning: true,

      developmentMode: false,
      autoFillRecipient: true,

      // Deposit actions
      setDepositData: (data) =>
        set((state) => ({
          depositData: { ...state.depositData, ...data },
        })),

      addDepositRecord: (record) =>
        set((state) => ({
          depositHistory: [record, ...state.depositHistory],
        })),

      updateDepositRecord: (id, updates) =>
        set((state) => ({
          depositHistory: state.depositHistory.map((record) =>
            record.id === id ? { ...record, ...updates } : record
          ),
        })),

      removeDepositRecord: (id) =>
        set((state) => ({
          depositHistory: state.depositHistory.filter((record) => record.id !== id),
        })),

      clearDepositHistory: () =>
        set(() => ({
          depositHistory: [],
        })),

      // Withdrawal actions
      setWithdrawalData: (data) =>
        set((state) => ({
          withdrawalData: { ...state.withdrawalData, ...data },
        })),

      markTransactionAsClaimed: (transaction) =>
        set((state) => {
          // Check if already exists to prevent duplicates
          const exists = state.claimedTransactions.some(
            (tx) => tx.txId === transaction.txId
          );

          if (exists) return state;

          return {
            claimedTransactions: [transaction, ...state.claimedTransactions],
          };
        }),

      clearClaimedTransactions: () =>
        set(() => ({
          claimedTransactions: [],
        })),

      // UI actions
      setActiveTab: (tab) =>
        set(() => ({
          activeTab: tab,
        })),

      toggleClaimingKeyHelp: () =>
        set((state) => ({
          showClaimingKeyHelp: !state.showClaimingKeyHelp,
        })),

      toggleSecurityWarning: () =>
        set((state) => ({
          showSecurityWarning: !state.showSecurityWarning,
        })),

      // Settings actions
      setDevelopmentMode: (enabled) =>
        set(() => ({
          developmentMode: enabled,
        })),

      setAutoFillRecipient: (enabled) =>
        set(() => ({
          autoFillRecipient: enabled,
        })),

      // Utility actions
      resetDepositForm: () =>
        set(() => ({
          depositData: initialDepositData,
        })),

      resetWithdrawalForm: () =>
        set(() => ({
          withdrawalData: initialWithdrawalData,
        })),

      resetAllData: () =>
        set(() => ({
          depositData: initialDepositData,
          depositHistory: [],
          withdrawalData: initialWithdrawalData,
          claimedTransactions: [],
          activeTab: 'deposit',
          showClaimingKeyHelp: false,
          showSecurityWarning: true,
        })),

      exportData: () => {
        const state = get();
        const exportData = {
          depositHistory: state.depositHistory,
          claimedTransactions: state.claimedTransactions,
          settings: {
            developmentMode: state.developmentMode,
            autoFillRecipient: state.autoFillRecipient,
          },
          exportedAt: Date.now(),
        };
        return JSON.stringify(exportData, null, 2);
      },

      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);

          if (data.depositHistory && Array.isArray(data.depositHistory)) {
            set((state) => ({
              ...state,
              depositHistory: data.depositHistory,
            }));
          }

          if (data.claimedTransactions && Array.isArray(data.claimedTransactions)) {
            set((state) => ({
              ...state,
              claimedTransactions: data.claimedTransactions,
            }));
          }

          if (data.settings) {
            set((state) => ({
              ...state,
              developmentMode: data.settings.developmentMode ?? state.developmentMode,
              autoFillRecipient: data.settings.autoFillRecipient ?? state.autoFillRecipient,
            }));
          }

          return true;
        } catch (error) {
          console.error('Failed to import privacy data:', error);
          return false;
        }
      },
    }),
    {
      name: 'privfi-privacy-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist only specific data, not sensitive form inputs
        depositHistory: state.depositHistory,
        claimedTransactions: state.claimedTransactions,
        activeTab: state.activeTab,
        showSecurityWarning: state.showSecurityWarning,
        developmentMode: state.developmentMode,
        autoFillRecipient: state.autoFillRecipient,
      }),
    }
  )
);

// Selector hooks for better performance
export const useDepositData = () => usePrivacyStore((state) => state.depositData);
export const useDepositHistory = () => usePrivacyStore((state) => state.depositHistory);
export const useWithdrawalData = () => usePrivacyStore((state) => state.withdrawalData);
export const useClaimedTransactions = () => usePrivacyStore((state) => state.claimedTransactions);
export const usePrivacySettings = () => usePrivacyStore((state) => ({
  developmentMode: state.developmentMode,
  autoFillRecipient: state.autoFillRecipient,
  showSecurityWarning: state.showSecurityWarning,
}));

// Action selectors
export const useDepositActions = () => usePrivacyStore((state) => ({
  setDepositData: state.setDepositData,
  addDepositRecord: state.addDepositRecord,
  updateDepositRecord: state.updateDepositRecord,
  removeDepositRecord: state.removeDepositRecord,
  clearDepositHistory: state.clearDepositHistory,
  resetDepositForm: state.resetDepositForm,
}));

export const useWithdrawalActions = () => usePrivacyStore((state) => ({
  setWithdrawalData: state.setWithdrawalData,
  markTransactionAsClaimed: state.markTransactionAsClaimed,
  clearClaimedTransactions: state.clearClaimedTransactions,
  resetWithdrawalForm: state.resetWithdrawalForm,
}));

export const usePrivacyUIActions = () => usePrivacyStore((state) => ({
  setActiveTab: state.setActiveTab,
  toggleClaimingKeyHelp: state.toggleClaimingKeyHelp,
  toggleSecurityWarning: state.toggleSecurityWarning,
  setDevelopmentMode: state.setDevelopmentMode,
  setAutoFillRecipient: state.setAutoFillRecipient,
}));