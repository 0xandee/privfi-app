import { useState, useEffect, useCallback, useMemo } from 'react';
import { Token } from '@/shared/types';
import type { WithdrawFormData, GroupedDeposits } from '../types';
import { WithdrawService } from '../services/withdrawService';

interface UseWithdrawFormProps {
  walletAddress?: string;
}

interface UseWithdrawFormReturn {
  // Form data
  formData: WithdrawFormData;

  // Available deposits
  groupedDeposits: GroupedDeposits[];
  isLoadingDeposits: boolean;
  depositsError: Error | null;

  // Form actions
  setSelectedDeposits: (depositIds: string[]) => void;
  setRecipientAddress: (address: string) => void;
  selectAllDepositsForToken: (tokenAddress: string) => void;
  clearSelection: () => void;

  // Validation
  isValidForWithdraw: boolean;
  canWithdraw: boolean;
  validationError?: string;

  // Refresh deposits
  refreshDeposits: () => Promise<void>;
}

const initialFormData: WithdrawFormData = {
  selectedDeposits: [],
  recipientAddress: '',
  token: null, // Will be set when deposits are selected
  totalAmount: '0',
};

export const useWithdrawForm = ({ walletAddress }: UseWithdrawFormProps): UseWithdrawFormReturn => {
  const [formData, setFormData] = useState<WithdrawFormData>(initialFormData);
  const [groupedDeposits, setGroupedDeposits] = useState<GroupedDeposits[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [depositsError, setDepositsError] = useState<Error | null>(null);

  const withdrawService = useMemo(() => new WithdrawService(), []);

  // Load withdrawable deposits
  const loadDeposits = useCallback(async () => {
    if (!walletAddress) {
      setGroupedDeposits([]);
      return;
    }

    setIsLoadingDeposits(true);
    setDepositsError(null);

    try {
      const deposits = await withdrawService.getWithdrawableDeposits(walletAddress);
      setGroupedDeposits(deposits);
    } catch (error) {
      console.error('Failed to load withdrawable deposits:', error);
      setDepositsError(error instanceof Error ? error : new Error('Failed to load deposits'));
      setGroupedDeposits([]);
    } finally {
      setIsLoadingDeposits(false);
    }
  }, [walletAddress]);

  // Load deposits when wallet address changes
  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  // Update form data when selected deposits change
  const updateFormDataFromSelection = useCallback((selectedDepositIds: string[]) => {
    if (selectedDepositIds.length === 0) {
      setFormData(prev => ({
        ...prev,
        selectedDeposits: [],
        token: null,
        totalAmount: '0',
      }));
      return;
    }

    // Find all selected deposits across all token groups
    const allSelectedDeposits = groupedDeposits.flatMap(group =>
      group.deposits.filter(deposit => selectedDepositIds.includes(deposit.id))
    );

    if (allSelectedDeposits.length === 0) return;

    // Ensure all selected deposits are for the same token
    const tokenAddresses = [...new Set(allSelectedDeposits.map(d => d.tokenAddress))];
    if (tokenAddresses.length > 1) {
      console.warn('Selected deposits contain multiple token types');
      return;
    }

    const tokenAddress = tokenAddresses[0];
    const tokenGroup = groupedDeposits.find(g => g.tokenAddress === tokenAddress);

    if (!tokenGroup) return;

    // Calculate total amount for selected deposits
    const totalAmount = allSelectedDeposits.reduce((sum, deposit) => {
      return (BigInt(sum) + BigInt(deposit.amount)).toString();
    }, '0');

    setFormData(prev => ({
      ...prev,
      selectedDeposits: selectedDepositIds,
      token: tokenGroup.token,
      totalAmount,
    }));
  }, [groupedDeposits]);

  // Form actions
  const setSelectedDeposits = useCallback((depositIds: string[]) => {
    updateFormDataFromSelection(depositIds);
  }, [updateFormDataFromSelection]);

  const setRecipientAddress = useCallback((address: string) => {
    setFormData(prev => ({
      ...prev,
      recipientAddress: address,
    }));
  }, []);

  const selectAllDepositsForToken = useCallback((tokenAddress: string) => {
    const tokenGroup = groupedDeposits.find(g => g.tokenAddress === tokenAddress);
    if (!tokenGroup) return;

    const allDepositIds = tokenGroup.deposits
      .filter(deposit => deposit.canWithdraw)
      .map(deposit => deposit.id);

    setSelectedDeposits(allDepositIds);
  }, [groupedDeposits, setSelectedDeposits]);

  const clearSelection = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const refreshDeposits = useCallback(async () => {
    await loadDeposits();
  }, [loadDeposits]);

  // Validation
  const isValidForWithdraw =
    formData.selectedDeposits.length > 0 &&
    formData.recipientAddress.trim() !== '' &&
    formData.token !== null;

  const canWithdraw =
    isValidForWithdraw &&
    !isLoadingDeposits &&
    depositsError === null &&
    walletAddress !== undefined;

  // Validation error message
  let validationError: string | undefined;
  if (formData.selectedDeposits.length === 0) {
    validationError = 'Please select deposits to withdraw';
  } else if (formData.recipientAddress.trim() === '') {
    validationError = 'Please enter a recipient address';
  } else if (!walletAddress) {
    validationError = 'Please connect your wallet';
  } else if (depositsError) {
    validationError = depositsError.message;
  }

  return {
    formData,
    groupedDeposits,
    isLoadingDeposits,
    depositsError,
    setSelectedDeposits,
    setRecipientAddress,
    selectAllDepositsForToken,
    clearSelection,
    isValidForWithdraw,
    canWithdraw,
    validationError,
    refreshDeposits,
  };
};