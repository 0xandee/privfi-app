import { useState, useCallback } from 'react';
import { useMistIntegration } from './useMistIntegration';
import { secretManager } from '../services';
import type { DepositData, PrivacyFormState } from '../types';

export interface UsePrivacyDepositResult {
  // Form state
  depositData: DepositData;
  formState: PrivacyFormState;

  // Form actions
  setAmount: (amount: string) => void;
  setTokenAddress: (address: string, name: string) => void;
  setClaimingKey: (key: string) => void;
  setRecipient: (address: string) => void;

  // Deposit operations
  generateRandomKey: () => void;
  validateForm: () => boolean;
  executeDeposit: () => Promise<void>;
  resetForm: () => void;

  // Utility
  isFormValid: boolean;
  supportedTokens: Array<{ id: string; name: string; decimals: number; color: string; textColor: string; icon: string }>;

  // MIST integration
  mist: ReturnType<typeof useMistIntegration>;
}

export const usePrivacyDeposit = (): UsePrivacyDepositResult => {
  const mist = useMistIntegration();

  // Local deposit form state
  const [depositData, setDepositData] = useState<DepositData>({
    amount: '',
    tokenAddress: '',
    tokenName: '',
    claimingKey: secretManager.getDevClaimingKey(),
    recipient: secretManager.getDevRecipient(),
    txHash: null,
  });

  const [formState, setFormState] = useState<PrivacyFormState>({
    isLoading: false,
    error: null,
    success: false,
    message: null,
  });

  // Get supported tokens from MistService
  const supportedTokens = mist.mistServiceInstance?.getSupportedTokens() || [];

  // Form validation
  const isFormValid = useCallback(() => {
    const validation = mist.validateInputs();
    return validation.isValid &&
           depositData.amount &&
           parseFloat(depositData.amount) > 0 &&
           depositData.tokenAddress &&
           mist.isConnected;
  }, [mist, depositData]);

  // Set amount
  const setAmount = useCallback((amount: string) => {
    setDepositData(prev => ({ ...prev, amount }));
  }, []);

  // Set token
  const setTokenAddress = useCallback((address: string, name: string) => {
    setDepositData(prev => ({
      ...prev,
      tokenAddress: address,
      tokenName: name,
    }));
  }, []);

  // Set claiming key
  const setClaimingKey = useCallback((key: string) => {
    const sanitizedKey = secretManager.sanitizeClaimingKey(key);
    setDepositData(prev => ({ ...prev, claimingKey: sanitizedKey }));
    mist.setKey(sanitizedKey);
  }, [mist]);

  // Set recipient
  const setRecipient = useCallback((address: string) => {
    setDepositData(prev => ({ ...prev, recipient: address }));
    mist.setTo(address);
  }, [mist]);

  // Generate random claiming key
  const generateRandomKey = useCallback(() => {
    if (!mist.mistServiceInstance) return;

    const newKey = mist.mistServiceInstance.generateClaimingKey();
    setClaimingKey(newKey);

    setFormState(prev => ({
      ...prev,
      message: 'New claiming key generated. Keep it safe!',
      success: true,
    }));

    // Clear success message after 3 seconds
    setTimeout(() => {
      setFormState(prev => ({ ...prev, message: null, success: false }));
    }, 3000);
  }, [mist.mistServiceInstance, setClaimingKey]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors: string[] = [];

    if (!mist.isConnected) {
      errors.push('Please connect your wallet first');
    }

    if (!depositData.amount || parseFloat(depositData.amount) <= 0) {
      errors.push('Please enter a valid amount');
    }

    if (!depositData.tokenAddress) {
      errors.push('Please select a token');
    }

    if (!depositData.claimingKey) {
      errors.push('Claiming key is required');
    } else {
      const keyValidation = secretManager.validateKeyStrength(depositData.claimingKey);
      if (!keyValidation.isValid) {
        errors.push(...keyValidation.feedback);
      }
    }

    const recipientValidation = secretManager.validateRecipientAddress(depositData.recipient);
    if (!recipientValidation.isValid) {
      errors.push(recipientValidation.error || 'Invalid recipient address');
    }

    if (errors.length > 0) {
      setFormState({
        isLoading: false,
        error: errors.join('. '),
        success: false,
        message: null,
      });
      return false;
    }

    return true;
  }, [mist.isConnected, depositData]);

  // Execute deposit
  const executeDeposit = useCallback(async () => {
    if (!validateForm()) return;

    setFormState({
      isLoading: true,
      error: null,
      success: false,
      message: 'Creating deposit transaction...',
    });

    try {
      // Create deposit transaction
      const { txHash, depositCall } = await mist.createDepositTransaction(
        depositData.tokenAddress,
        depositData.amount
      );

      // Update deposit data with transaction hash
      setDepositData(prev => ({ ...prev, txHash }));

      setFormState({
        isLoading: false,
        error: null,
        success: false,
        message: 'Executing transaction...',
      });

      // Execute the deposit transaction
      mist.send([depositCall]);

      setFormState({
        isLoading: false,
        error: null,
        success: true,
        message: `Deposit transaction created! Transaction Hash: ${txHash}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create deposit';
      console.error('Deposit failed:', error);

      setFormState({
        isLoading: false,
        error: errorMessage,
        success: false,
        message: null,
      });
    }
  }, [validateForm, mist, depositData]);

  // Reset form
  const resetForm = useCallback(() => {
    setDepositData({
      amount: '',
      tokenAddress: '',
      tokenName: '',
      claimingKey: secretManager.getDevClaimingKey(),
      recipient: mist.userAddress || secretManager.getDevRecipient(),
      txHash: null,
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
    depositData,
    formState,

    // Form actions
    setAmount,
    setTokenAddress,
    setClaimingKey,
    setRecipient,

    // Deposit operations
    generateRandomKey,
    validateForm,
    executeDeposit,
    resetForm,

    // Utility
    isFormValid: isFormValid(),
    supportedTokens,

    // MIST integration
    mist,
  };
};