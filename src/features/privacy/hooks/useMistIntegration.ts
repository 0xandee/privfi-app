import { useEffect, useState } from 'react';
import { useMist } from '@mistcash/react';
import { useProvider, useSendTransaction, useAccount } from '@starknet-react/core';
import { mistService } from '../services';
import type { Asset } from '@mistcash/sdk';

export interface UseMistIntegrationResult {
  // MIST.cash hook properties
  chamberAddress: string;
  loadingStatus: 'FINDING_TX' | 'READY';
  loadingMessage: string;
  valTo: string;
  setTo: (val: string) => void;
  valKey: string;
  setKey: (val: string) => void;
  asset: Asset | undefined;
  setAsset: (asset: Asset | undefined) => void;
  contract: any;
  send: (args?: any[]) => void;
  isPending: boolean;
  error: string | null;
  txError: Error | null;
  fetchAsset: () => Promise<Asset>;

  // Additional integration properties
  isInitialized: boolean;
  initError: string | null;
  isConnected: boolean;
  userAddress: string | undefined;
  mistServiceInstance: ReturnType<typeof mistService.getInstance> | null;

  // Enhanced methods
  initializeMistService: () => Promise<void>;
  autoFillRecipient: () => void;
  validateInputs: () => { isValid: boolean; errors: string[] };
  generateClaimingKey: () => string;
  formatAssetAmount: (asset: Asset) => string;
  createDepositTransaction: (tokenAddress: string, amount: string) => Promise<{ txHash: string; depositCall: any }>;
  executeWithdrawal: () => Promise<void>;
}

export const useMistIntegration = (): UseMistIntegrationResult => {
  const { provider } = useProvider();
  const sendTransaction = useSendTransaction({});
  const { address, isConnected } = useAccount();

  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [mistServiceInstance, setMistServiceInstance] = useState<ReturnType<typeof mistService.getInstance> | null>(null);

  // Initialize MIST.cash hook
  const mistHook = useMist(provider, sendTransaction);

  // Initialize MistService when provider is available
  const initializeMistService = async () => {
    if (!provider) {
      setInitError('Provider not available');
      return;
    }

    try {
      setInitError(null);
      const serviceInstance = mistService.initialize(provider);
      setMistServiceInstance(serviceInstance);
      setIsInitialized(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize MIST service';
      setInitError(errorMessage);
      console.error('Failed to initialize MistService:', error);
    }
  };

  // Auto-fill recipient with connected wallet address
  const autoFillRecipient = () => {
    if (address && !mistHook.valTo) {
      mistHook.setTo(address);
    }
  };

  // Validate inputs
  const validateInputs = () => {
    const errors: string[] = [];

    if (!mistHook.valKey) {
      errors.push('Claiming key is required');
    } else if (!mistServiceInstance?.validateClaimingKey(mistHook.valKey)) {
      errors.push('Claiming key must contain only numbers');
    }

    if (!mistHook.valTo) {
      errors.push('Recipient address is required');
    } else if (!mistServiceInstance?.validateRecipientAddress(mistHook.valTo)) {
      errors.push('Invalid recipient address format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Generate a new claiming key
  const generateClaimingKey = () => {
    if (!mistServiceInstance) return '';
    const key = mistServiceInstance.generateClaimingKey();
    mistHook.setKey(key);
    return key;
  };

  // Format asset amount for display
  const formatAssetAmount = (asset: Asset): string => {
    if (!mistServiceInstance) return asset.amount.toString();
    return mistServiceInstance.formatAmount(asset.amount, asset.addr);
  };

  // Create deposit transaction
  const createDepositTransaction = async (tokenAddress: string, amount: string): Promise<{ txHash: string; depositCall: any }> => {
    if (!mistServiceInstance) {
      throw new Error('MIST service not initialized');
    }

    if (!mistHook.valKey || !mistHook.valTo) {
      throw new Error('Claiming key and recipient are required');
    }

    const validation = validateInputs();
    if (!validation.isValid) {
      throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
    }

    try {
      // Parse amount to bigint
      const amountBigInt = mistServiceInstance.parseAmount(amount, tokenAddress);

      // Generate transaction hash
      const txHash = await mistServiceInstance.generateDepositTxHash(
        mistHook.valKey,
        mistHook.valTo,
        tokenAddress,
        amountBigInt.toString()
      );

      // Create deposit call
      const depositCall = mistServiceInstance.createDepositCall(txHash, {
        amount: amountBigInt,
        addr: tokenAddress
      });

      return { txHash, depositCall };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create deposit transaction';
      throw new Error(errorMessage);
    }
  };

  // Execute withdrawal transaction
  const executeWithdrawal = async (): Promise<void> => {
    if (!mistServiceInstance) {
      throw new Error('MIST service not initialized');
    }

    if (!mistHook.asset) {
      throw new Error('No asset to withdraw');
    }

    const validation = validateInputs();
    if (!validation.isValid) {
      throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
    }

    try {
      // Create withdrawal call
      const withdrawalCall = mistServiceInstance.createWithdrawalCall(
        mistHook.valKey,
        mistHook.valTo,
        mistHook.asset,
        [] // Merkle proof - empty for now (no ZK version)
      );

      // Execute transaction
      mistHook.send([withdrawalCall]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute withdrawal';
      throw new Error(errorMessage);
    }
  };

  // Auto-initialize when provider becomes available
  useEffect(() => {
    if (provider && !isInitialized && !initError) {
      initializeMistService();
    }
  }, [provider, isInitialized, initError]);

  // Auto-fill recipient when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      autoFillRecipient();
    }
  }, [isConnected, address]);

  return {
    // MIST.cash hook properties
    chamberAddress: mistHook.chamberAddress,
    loadingStatus: mistHook.loadingStatus,
    loadingMessage: mistHook.loadingMessage,
    valTo: mistHook.valTo,
    setTo: mistHook.setTo,
    valKey: mistHook.valKey,
    setKey: mistHook.setKey,
    asset: mistHook.asset,
    setAsset: mistHook.setAsset,
    contract: mistHook.contract,
    send: mistHook.send,
    isPending: mistHook.isPending,
    error: mistHook.error,
    txError: mistHook.txError,
    fetchAsset: mistHook.fetchAsset,

    // Additional integration properties
    isInitialized,
    initError,
    isConnected,
    userAddress: address,
    mistServiceInstance,

    // Enhanced methods
    initializeMistService,
    autoFillRecipient,
    validateInputs,
    generateClaimingKey,
    formatAssetAmount,
    createDepositTransaction,
    executeWithdrawal,
  };
};