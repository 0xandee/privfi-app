import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WithdrawState, WithdrawStatus, RecipientInfo, DepositTransaction } from '../types';
import { WithdrawService } from '../services/withdrawService';

interface WithdrawStore extends WithdrawState {
  status: WithdrawStatus;
  withdrawService: WithdrawService;
  
  // Actions
  setTransactionHash: (hash: string) => void;
  setRecipients: (recipients: RecipientInfo[]) => void;
  addRecipient: () => void;
  removeRecipient: (id: string) => void;
  updateRecipient: (id: string, updates: Partial<RecipientInfo>) => void;
  autoDistributePercentages: () => void;
  executeWithdraw: () => Promise<void>;
  reset: () => void;
  loadDepositHistory: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultRecipient = (): RecipientInfo => ({
  id: generateId(),
  address: '',
  percentage: 100
});

const initialState: WithdrawState = {
  transactionHash: '',
  recipients: [createDefaultRecipient()],
  isLoading: false,
  isSuccess: false,
  error: null,
  transactionHistory: []
};

export const useWithdrawStore = create<WithdrawStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      status: 'idle',
      withdrawService: new WithdrawService(),

      setTransactionHash: (hash: string) => {
        set({ transactionHash: hash, error: null });
      },

      setRecipients: (recipients: RecipientInfo[]) => {
        set({ recipients, error: null });
      },

      addRecipient: () => {
        const { recipients } = get();
        const newRecipients = [...recipients, createDefaultRecipient()];
        get().autoDistributePercentages();
        set({ recipients: newRecipients });
      },

      removeRecipient: (id: string) => {
        const { recipients } = get();
        if (recipients.length <= 1) return;
        
        const newRecipients = recipients.filter(r => r.id !== id);
        set({ recipients: newRecipients });
        get().autoDistributePercentages();
      },

      updateRecipient: (id: string, updates: Partial<RecipientInfo>) => {
        const { recipients } = get();
        const newRecipients = recipients.map(r => 
          r.id === id ? { ...r, ...updates } : r
        );
        set({ recipients: newRecipients, error: null });
      },

      autoDistributePercentages: () => {
        const { recipients } = get();
        const equalPercentage = Math.floor(100 / recipients.length * 100) / 100;
        const remainder = 100 - (equalPercentage * recipients.length);
        
        const newRecipients = recipients.map((recipient, index) => ({
          ...recipient,
          percentage: index === 0 ? equalPercentage + remainder : equalPercentage
        }));
        
        set({ recipients: newRecipients });
      },

      executeWithdraw: async () => {
        const { transactionHash, recipients, withdrawService } = get();
        
        console.group('🏪 WithdrawStore.executeWithdraw');
        console.log('Current state:');
        console.log('  - Transaction hash:', transactionHash);
        console.log('  - Recipients count:', recipients.length);
        console.log('  - Recipients data:', recipients);
        
        console.log('Setting status to validating...');
        set({ 
          status: 'validating', 
          isLoading: true, 
          error: null,
          isSuccess: false 
        });

        try {
          console.log('🔍 Phase 1: Validating transaction hash...');
          // Validate transaction hash
          if (!withdrawService.validateTransactionHash(transactionHash)) {
            throw new Error('Invalid transaction hash format');
          }
          console.log('✅ Transaction hash validation passed');

          console.log('🔍 Phase 2: Validating recipients...');
          // Validate recipients
          const validation = withdrawService.validateRecipients(recipients);
          if (!validation.isValid) {
            throw new Error(validation.error);
          }
          console.log('✅ Recipients validation passed');

          console.log('Setting status to executing...');
          set({ status: 'executing' });

          console.log('🚀 Phase 3: Executing withdraw...');
          // Execute withdraw
          await withdrawService.executeWithdraw({
            transactionHash,
            recipients
          });
          console.log('✅ Withdraw execution completed');

          console.log('Setting status to success...');
          set({ 
            status: 'success',
            isLoading: false,
            isSuccess: true 
          });
          
          console.log('🎉 Withdraw process completed successfully!');
          console.groupEnd();

        } catch (error) {
          console.error('❌ Withdraw failed in WithdrawStore');
          console.error('Error type:', error?.constructor?.name);
          console.error('Error message:', error instanceof Error ? error.message : error);
          console.error('Full error:', error);
          
          set({ 
            status: 'error',
            isLoading: false,
            isSuccess: false,
            error: error instanceof Error ? error.message : 'Withdraw failed'
          });
          console.groupEnd();
        }
      },

      reset: () => {
        set({ 
          ...initialState,
          recipients: [createDefaultRecipient()],
          status: 'idle'
        });
      },

      loadDepositHistory: () => {
        const { withdrawService } = get();
        const history = withdrawService.getDepositTransactions();
        set({ transactionHistory: history });
      }
    }),
    {
      name: 'withdraw-store',
      partialize: (state) => ({
        transactionHash: state.transactionHash,
        recipients: state.recipients,
        transactionHistory: state.transactionHistory
      })
    }
  )
);