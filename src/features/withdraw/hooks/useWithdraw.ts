import { useEffect } from 'react';
import { useWithdrawStore } from '../store/withdrawStore';

export const useWithdraw = () => {
  const store = useWithdrawStore();

  // Load deposit history on mount
  useEffect(() => {
    store.loadDepositHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    transactionHash: store.transactionHash,
    recipients: store.recipients,
    status: store.status,
    isLoading: store.isLoading,
    isSuccess: store.isSuccess,
    error: store.error,
    transactionHistory: store.transactionHistory,

    // Actions
    setTransactionHash: store.setTransactionHash,
    setRecipients: store.setRecipients,
    addRecipient: store.addRecipient,
    removeRecipient: store.removeRecipient,
    updateRecipient: store.updateRecipient,
    autoDistributePercentages: store.autoDistributePercentages,
    executeWithdraw: store.executeWithdraw,
    reset: store.reset,
    
    // Computed values
    canExecute: store.transactionHash.length > 0 && 
                 store.recipients.length > 0 && 
                 store.recipients.every(r => r.address.length > 0) &&
                 !store.isLoading,
    
    totalPercentage: store.recipients.reduce((sum, r) => sum + r.percentage, 0),
    
    isPercentageValid: Math.abs(
      store.recipients.reduce((sum, r) => sum + r.percentage, 0) - 100
    ) < 0.01
  };
};