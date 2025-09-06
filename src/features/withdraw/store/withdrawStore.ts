import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WithdrawState, WithdrawStatus, RecipientInfo, DepositTransaction, WithdrawProgress, WithdrawPhase } from '../types';
import { WithdrawService } from '../services/withdrawService';
import { toast } from '@/shared/components/ui/sonner';
import React from 'react';
import { ExternalLink, CheckCircle } from 'lucide-react';

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
  setProgress: (progress: WithdrawProgress | undefined) => void;
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
  transactionHistory: [],
  progress: undefined
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

      setProgress: (progress: WithdrawProgress | undefined) => {
        set({ progress });
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
        const { transactionHash, recipients, withdrawService, setProgress } = get();
        
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
          console.log('🔍 Phase 1: Preparing transaction...');
          setProgress({
            phase: 'preparing',
            message: 'Preparing withdrawal transaction...',
            estimatedTimeMs: 2000
          });
          await new Promise(resolve => setTimeout(resolve, 500));

          console.log('🔍 Phase 2: Validating transaction hash...');
          setProgress({
            phase: 'validating-hash',
            message: 'Validating transaction hash...',
            estimatedTimeMs: 3000
          });
          
          if (!withdrawService.validateTransactionHash(transactionHash)) {
            throw new Error('Invalid transaction hash format');
          }
          console.log('✅ Transaction hash validation passed');
          await new Promise(resolve => setTimeout(resolve, 1000));

          console.log('🔍 Phase 3: Validating recipients...');
          setProgress({
            phase: 'validating-recipients',
            message: 'Validating recipient addresses and percentages...',
            estimatedTimeMs: 2000
          });
          
          const validation = withdrawService.validateRecipients(recipients);
          if (!validation.isValid) {
            throw new Error(validation.error);
          }
          console.log('✅ Recipients validation passed');
          await new Promise(resolve => setTimeout(resolve, 800));

          console.log('Setting status to executing...');
          set({ status: 'executing' });

          setProgress({
            phase: 'awaiting-signature',
            message: 'Awaiting wallet signature...',
            estimatedTimeMs: 15000
          });
          await new Promise(resolve => setTimeout(resolve, 1000));

          console.log('🚀 Phase 4: Broadcasting transaction...');
          setProgress({
            phase: 'broadcasting',
            message: 'Broadcasting transaction to network...',
            estimatedTimeMs: 5000
          });

          await withdrawService.executeWithdraw({
            transactionHash,
            recipients
          });
          
          await new Promise(resolve => setTimeout(resolve, 2000));

          console.log('🔍 Phase 5: Confirming transaction...');
          setProgress({
            phase: 'confirming',
            message: 'Waiting for blockchain confirmation...',
            estimatedTimeMs: 30000
          });
          await new Promise(resolve => setTimeout(resolve, 3000));

          console.log('✅ Withdraw execution completed');
          setProgress({
            phase: 'completed',
            message: 'Withdrawal completed successfully!',
          });

          console.log('Setting status to success...');
          set({ 
            status: 'success',
            isLoading: false,
            isSuccess: true 
          });

          // Show success toast
          toast.success('Withdrawal completed successfully!', {
            duration: 8000,
            action: {
              label: React.createElement('span', { className: 'flex items-center gap-1' }, [
                React.createElement(CheckCircle, { key: 'icon', className: 'h-3 w-3' }),
                'Success'
              ]),
              onClick: () => console.log('Withdrawal success acknowledged'),
            },
          });
          
          setTimeout(() => {
            setProgress(undefined);
          }, 2000);
          
          console.log('🎉 Withdraw process completed successfully!');
          console.groupEnd();

        } catch (error) {
          console.error('❌ Withdraw failed in WithdrawStore');
          console.error('Error type:', error?.constructor?.name);
          console.error('Error message:', error instanceof Error ? error.message : error);
          console.error('Full error:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Withdraw failed';
          
          set({ 
            status: 'error',
            isLoading: false,
            isSuccess: false,
            error: errorMessage,
            progress: undefined
          });

          // Show error toast
          toast.error('Withdrawal failed!', {
            description: errorMessage,
            duration: 8000,
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