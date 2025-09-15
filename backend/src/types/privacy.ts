export enum PrivacyFlowPhase {
  PENDING = 'pending',
  DEPOSITING = 'depositing',        // Phase 1: User deposits to Typhoon
  WITHDRAWING = 'withdrawing',      // Phase 2: Proxy withdraws from Typhoon
  SWAPPING = 'swapping',           // Phase 3: Proxy executes swap
  REDEPOSITING = 'redepositing',   // Phase 4: Proxy re-deposits to Typhoon
  READY_TO_WITHDRAW = 'ready_to_withdraw', // Phase 5: User can withdraw
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PrivacySwapRequest {
  id: string;
  userId: string;
  userAddress: string;
  depositTxHash: string;
  fromToken: string;
  toToken: string;
  amount: string;
  buyAmount?: string; // Actual amount received from swap
  slippage: number;
  recipientAddress?: string;
  phase: PrivacyFlowPhase;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  proxyTxHashes: {
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

export interface TyphoonDeposit {
  depositId: string;
  txHash: string;
  userAddress: string;
  tokenAddress: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'available' | 'partially_used' | 'exhausted';
  remainingBalance?: string;
  typhoonData?: {
    // For user deposits (SDK data)
    secrets?: any[];
    nullifiers?: any[];
    pools?: any[];
    swapParams?: any;
    isProxyDeposit?: boolean;
    originalUserAddress?: string;
    // For final withdrawal (computed data)
    note?: string;
    nullifier?: string;
    commitmentHash?: string;
  };
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  routes: any[];
  priceImpact: number;
  estimatedGas: string;
  expiresAt: number;
}