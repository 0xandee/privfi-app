import { useState, useCallback } from 'react';
import { useMistIntegration } from './useMistIntegration';
import { secretManager } from '../services';
import type { WithdrawalData, PrivacyFormState } from '../types';

export interface UsePrivacyWithdrawalResult {
  // Form state
  withdrawalData: WithdrawalData;
  formState: PrivacyFormState;

  // Form actions
  setClaimingKey: (key: string) => void;
  setRecipient: (address: string) => void;

  // Withdrawal operations
  searchTransaction: () => Promise<void>;
  executeWithdrawal: () => Promise<void>;
  resetForm: () => void;

  // Utility
  isFormValid: boolean;
  isTransactionFound: boolean;
  isAlreadyClaimed: boolean;
  formattedAmount: string | null;
  tokenInfo: { name: string; color: string; textColor: string } | null;

  // MIST integration
  mist: ReturnType<typeof useMistIntegration>;
}

export const usePrivacyWithdrawal = (): UsePrivacyWithdrawalResult => {
  const mist = useMistIntegration();

  // Local withdrawal form state
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData>({
    claimingKey: secretManager.getDevClaimingKey(),
    recipient: secretManager.getDevRecipient(),
    asset: null,
  });

  const [formState, setFormState] = useState<PrivacyFormState>({
    isLoading: false,
    error: null,
    success: false,
    message: null,
  });

  // Check if transaction is already claimed
  const isAlreadyClaimed = secretManager.isTransactionClaimed(
    withdrawalData.claimingKey,
    withdrawalData.recipient
  );

  // Form validation
  const isFormValid = useCallback(() => {
    const validation = mist.validateInputs();
    return validation.isValid && mist.isConnected && !isAlreadyClaimed;
  }, [mist, isAlreadyClaimed]);

  // Is transaction found
  const isTransactionFound = withdrawalData.asset !== null;

  // Format amount for display
  const formattedAmount = withdrawalData.asset && mist.mistServiceInstance
    ? mist.mistServiceInstance.formatAmount(withdrawalData.asset.amount, withdrawalData.asset.addr)
    : null;

  // Get token info
  const tokenInfo = withdrawalData.asset && mist.mistServiceInstance
    ? mist.mistServiceInstance.getTokenInfo(withdrawalData.asset.addr)
    : null;

  // Set claiming key
  const setClaimingKey = useCallback((key: string) => {
    const sanitizedKey = secretManager.sanitizeClaimingKey(key);
    setWithdrawalData(prev => ({ ...prev, claimingKey: sanitizedKey }));
    mist.setKey(sanitizedKey);

    // Clear previous asset when key changes
    if (sanitizedKey !== withdrawalData.claimingKey) {
      setWithdrawalData(prev => ({ ...prev, asset: null }));
      mist.setAsset(undefined);
    }
  }, [mist, withdrawalData.claimingKey]);

  // Set recipient
  const setRecipient = useCallback((address: string) => {
    setWithdrawalData(prev => ({ ...prev, recipient: address }));
    mist.setTo(address);

    // Clear previous asset when recipient changes
    if (address !== withdrawalData.recipient) {
      setWithdrawalData(prev => ({ ...prev, asset: null }));
      mist.setAsset(undefined);
    }
  }, [mist, withdrawalData.recipient]);

  // Search for transaction
  const searchTransaction = useCallback(async () => {
    const validation = mist.validateInputs();
    if (!validation.isValid) {
      setFormState({
        isLoading: false,
        error: validation.errors.join('. '),
        success: false,
        message: null,
      });
      return;
    }

    if (isAlreadyClaimed) {
      setFormState({
        isLoading: false,
        error: 'This transaction has already been claimed.',
        success: false,
        message: null,
      });
      return;
    }

    setFormState({
      isLoading: true,
      error: null,
      success: false,
      message: 'Searching for transaction...',
    });

    try {
      // Fetch transaction asset
      const asset = await mist.fetchAsset();

      setWithdrawalData(prev => ({ ...prev, asset }));

      setFormState({
        isLoading: false,
        error: null,
        success: true,
        message: 'Transaction found! You can now claim your tokens.',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction not found';
      console.error('Transaction search failed:', error);

      setFormState({
        isLoading: false,
        error: errorMessage,
        success: false,
        message: null,
      });

      // Clear asset on error
      setWithdrawalData(prev => ({ ...prev, asset: null }));
      mist.setAsset(undefined);
    }
  }, [mist, isAlreadyClaimed]);

  // Execute withdrawal
  const executeWithdrawal = useCallback(async () => {
    if (!isFormValid || !withdrawalData.asset) {
      setFormState({
        isLoading: false,
        error: 'Please search and find a transaction first.',
        success: false,
        message: null,
      });
      return;
    }

    setFormState({
      isLoading: true,
      error: null,
      success: false,
      message: 'Executing withdrawal...',
    });

    try {
      // Execute withdrawal
      await mist.executeWithdrawal();

      // Mark transaction as claimed
      secretManager.markTransactionAsClaimed({
        txId: secretManager.generateTransactionId(
          withdrawalData.claimingKey,
          withdrawalData.recipient
        ),
        claimingKey: withdrawalData.claimingKey,
        recipient: withdrawalData.recipient,
        tokenAddress: withdrawalData.asset.addr,
        amount: withdrawalData.asset.amount.toString(),
        claimedAt: Date.now(),
      });

      setFormState({
        isLoading: false,
        error: null,
        success: true,
        message: 'Withdrawal transaction submitted! Check your wallet for confirmation.',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute withdrawal';
      console.error('Withdrawal failed:', error);

      setFormState({
        isLoading: false,
        error: errorMessage,
        success: false,
        message: null,
      });
    }
  }, [isFormValid, withdrawalData, mist]);

  // Reset form
  const resetForm = useCallback(() => {
    setWithdrawalData({
      claimingKey: secretManager.getDevClaimingKey(),
      recipient: mist.userAddress || secretManager.getDevRecipient(),
      asset: null,
    });

    setFormState({
      isLoading: false,
      error: null,
      success: false,
      message: null,
    });

    // Reset MIST hook values
    mist.setKey(secretManager.getDevClaimingKey());
    mist.setTo(mist.userAddress || secretManager.getDevRecipient());
    mist.setAsset(undefined);
  }, [mist]);

  return {
    // Form state
    withdrawalData,
    formState,

    // Form actions
    setClaimingKey,
    setRecipient,

    // Withdrawal operations
    searchTransaction,
    executeWithdrawal,
    resetForm,

    // Utility
    isFormValid: isFormValid(),
    isTransactionFound,
    isAlreadyClaimed,
    formattedAmount,
    tokenInfo,

    // MIST integration
    mist,
  };
};