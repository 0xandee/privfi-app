import { useSwapStore } from '@/features/swap/store/swapStore';
import { usePrivacyStore } from '../store/privacyStore';
import { useAccount } from '@starknet-react/core';

export enum PrivacyFlowPhase {
  IDLE = 'idle',
  DEPOSITING = 'depositing',        // Phase 1: User deposits to Typhoon
  WITHDRAWING = 'withdrawing',      // Phase 2: Proxy withdraws from Typhoon
  SWAPPING = 'swapping',           // Phase 3: Proxy executes swap
  REDEPOSITING = 'redepositing',   // Phase 4: Proxy re-deposits to Typhoon
  READY_TO_WITHDRAW = 'ready_to_withdraw', // Phase 5: User can withdraw
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PrivacyFlowState {
  phase: PrivacyFlowPhase;
  progress: number; // 0-100
  message: string;
  error?: string;
  swapId?: string;
  depositTxHash?: string;
  proxyTxHashes?: {
    withdrawal?: string;
    swap?: string;
    redeposit?: string;
  };
  typhoonData?: {
    note?: string;
    nullifier?: string;
    commitmentHash?: string;
  };
}

export interface PrivacySwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  recipientAddress?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export class PrivacyFlowOrchestrator {
  private static instance: PrivacyFlowOrchestrator;
  private eventSource: EventSource | null = null;

  private constructor() {
    // No longer using frontend TyphoonService
  }

  static getInstance(): PrivacyFlowOrchestrator {
    if (!PrivacyFlowOrchestrator.instance) {
      PrivacyFlowOrchestrator.instance = new PrivacyFlowOrchestrator();
    }
    return PrivacyFlowOrchestrator.instance;
  }

  async initiatePrivacySwap(
    userAddress: string,
    params: PrivacySwapParams,
    account: any // StarkNet account for executing transactions
  ): Promise<string> {
    const privacyStore = usePrivacyStore.getState();

    try {
      // Phase 1: Get deposit transaction calls from backend
      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.DEPOSITING,
        progress: 0,
        message: 'Preparing privacy deposit transaction...'
      });

      // Get deposit calls from backend Typhoon service
      const depositCalls = await this.getDepositCalls(
        userAddress,
        params.fromToken,
        params.toToken,
        params.amount,
        params.slippage,
        params.recipientAddress
      );

      console.log('Deposit calls response:', depositCalls);
      console.log('Transaction calls array:', depositCalls.transactionCalls);
      console.log('Transaction calls length:', depositCalls.transactionCalls?.length);

      if (!depositCalls.transactionCalls || depositCalls.transactionCalls.length === 0) {
        throw new Error('No transaction calls received from backend');
      }

      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.DEPOSITING,
        progress: 10,
        message: 'Please confirm deposit transaction in your wallet...'
      });

      // User executes deposit transaction
      const depositResult = await account.execute(depositCalls.transactionCalls);
      const depositTxHash = depositResult.transaction_hash;

      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.DEPOSITING,
        progress: 20,
        message: 'Deposit transaction submitted, confirming...',
        depositTxHash
      });

      // Wait for transaction confirmation
      await this.waitForTransaction(account, depositTxHash);

      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.DEPOSITING,
        progress: 30,
        message: 'Deposit confirmed, initiating privacy swap...'
      });

      // Initiate backend privacy swap process (backend handles phases 2-5)
      const swapId = await this.initiateBackendSwap(
        userAddress,
        depositTxHash,
        params,
        depositCalls.swapData
      );

      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.WITHDRAWING,
        progress: 40,
        message: 'Privacy swap initiated, proxy processing...',
        swapId
      });

      // Subscribe to backend updates for phases 2-5
      this.subscribeToSwapUpdates(swapId);

      return swapId;
    } catch (error) {
      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.FAILED,
        progress: 0,
        message: 'Privacy swap failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get deposit transaction calls from backend
   * Backend generates the Typhoon deposit calls with SDK
   */
  private async getDepositCalls(
    userAddress: string,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    recipientAddress?: string
  ): Promise<{ transactionCalls: any[]; swapData: any }> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/deposit-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        fromToken,
        toToken,
        amount,
        slippage,
        recipientAddress
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get deposit calls: ${error}`);
    }

    return await response.json();
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(account: any, txHash: string): Promise<void> {
    try {
      console.log('Account object debug:', {
        account,
        hasProvider: !!account?.provider,
        accountType: typeof account,
        accountKeys: Object.keys(account || {}),
        providerType: typeof account?.provider
      });

      // Try different ways to access the provider
      let provider = account?.provider;

      if (!provider && account?.getProvider) {
        provider = account.getProvider();
      }

      if (!provider && account?.channel?.provider) {
        provider = account.channel.provider;
      }

      if (!provider) {
        // Create a basic provider from the RPC URL as fallback
        const { RpcProvider } = await import('starknet');
        provider = new RpcProvider({
          nodeUrl: 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_9/FXZBPkx6KsqGG8OFIH7fD'
        });
        console.log('Using fallback RPC provider');
      }

      await provider.waitForTransaction(txHash);
    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initiateBackendSwap(
    userAddress: string,
    depositTxHash: string,
    params: PrivacySwapParams,
    swapData: any
  ): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        depositTxHash,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        slippage: params.slippage,
        recipientAddress: params.recipientAddress,
        typhoonData: swapData // Pass the Typhoon data from deposit
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initiate privacy swap: ${error}`);
    }

    const data = await response.json();
    return data.swapId;
  }

  private subscribeToSwapUpdates(swapId: string): void {
    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Create new SSE connection
    this.eventSource = new EventSource(
      `${BACKEND_URL}/api/proxy/swap/${swapId}/stream`
    );

    this.eventSource.onmessage = (event) => {
      const swap = JSON.parse(event.data);
      this.handleSwapUpdate(swap);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      const privacyStore = usePrivacyStore.getState();
      privacyStore.updateFlowState({
        phase: PrivacyFlowPhase.FAILED,
        progress: 0,
        message: 'Connection to privacy service lost',
        error: 'Connection error'
      });
    };
  }

  private handleSwapUpdate(swap: any): void {
    const privacyStore = usePrivacyStore.getState();

    const phaseMessages: Record<string, { message: string; progress: number }> = {
      [PrivacyFlowPhase.WITHDRAWING]: {
        message: 'Proxy withdrawing from Typhoon...',
        progress: 40
      },
      [PrivacyFlowPhase.SWAPPING]: {
        message: 'Executing anonymous swap via AVNU...',
        progress: 60
      },
      [PrivacyFlowPhase.REDEPOSITING]: {
        message: 'Re-depositing swapped tokens to Typhoon...',
        progress: 80
      },
      [PrivacyFlowPhase.READY_TO_WITHDRAW]: {
        message: 'Swap complete! Ready for withdrawal',
        progress: 100
      },
      [PrivacyFlowPhase.COMPLETED]: {
        message: 'Privacy swap completed successfully',
        progress: 100
      },
      [PrivacyFlowPhase.FAILED]: {
        message: 'Privacy swap failed',
        progress: 0
      }
    };

    const phaseInfo = phaseMessages[swap.phase] || {
      message: 'Processing...',
      progress: 50
    };

    privacyStore.updateFlowState({
      phase: swap.phase,
      progress: phaseInfo.progress,
      message: phaseInfo.message,
      error: swap.error,
      proxyTxHashes: swap.proxyTxHashes,
      typhoonData: swap.typhoonData
    });

    // Store withdrawal data if ready
    if (swap.phase === PrivacyFlowPhase.READY_TO_WITHDRAW && swap.typhoonData) {
      privacyStore.setWithdrawalData({
        txHash: swap.proxyTxHashes.redeposit,
        typhoonData: swap.typhoonData,
        tokenAddress: swap.toToken,
        amount: swap.amount
      });
    }
  }

  async getSwapStatus(swapId: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/swap/${swapId}`);

    if (!response.ok) {
      throw new Error('Failed to get swap status');
    }

    const data = await response.json();
    return data.swap;
  }

  async getUserSwaps(userAddress: string): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/swaps/${userAddress}`);

    if (!response.ok) {
      throw new Error('Failed to get user swaps');
    }

    const data = await response.json();
    return data.swaps;
  }

  async getUserDeposits(userAddress: string): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/proxy/deposits/${userAddress}`);

    if (!response.ok) {
      throw new Error('Failed to get user deposits');
    }

    const data = await response.json();
    return data.deposits;
  }

  async getTotalBalance(userAddress: string, tokenAddress: string): Promise<string> {
    const response = await fetch(
      `${BACKEND_URL}/api/proxy/balance/${userAddress}/${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error('Failed to get balance');
    }

    const data = await response.json();
    return data.balance;
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}