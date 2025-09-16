export interface UnifiedDeposit {
  depositId: string;
  txHash: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'available' | 'withdrawn';
  typhoonData: {
    secrets: string[];
    nullifiers: string[];
    pools: string[];
    note?: string;
    swapParams?: {
      fromToken: string;
      toToken: string;
      amount: string;
      slippage: number;
      recipientAddress?: string;
    };
  };
  source: string; // Which file this deposit came from
}

export interface RawDepositFile1 {
  [walletAddress: string]: Array<{
    depositId: string;
    txHash: string;
    userAddress: string;
    tokenAddress: string;
    amount: string;
    timestamp: number;
    status: string;
    typhoonData?: {
      secrets?: string[];
      nullifiers?: string[];
      pools?: string[];
      note?: string;
      swapParams?: {
        fromToken: string;
        toToken: string;
        amount: string;
        slippage: number;
        recipientAddress: string;
      };
    };
    remainingBalance?: string;
  }>;
}

export interface RawDepositFile2 {
  [walletAddress: string]: Array<{
    depositId: string;
    txHash: string;
    userAddress: string;
    tokenAddress: string;
    amount: string | number;
    timestamp: number;
    status: string;
    typhoonData?: {
      secrets?: string[];
      nullifiers?: string[];
      pools?: string[];
      swapParams?: {
        fromToken: string;
        toToken: string;
        amount: string;
        slippage: number;
        recipientAddress: string;
      };
    };
  }>;
}

export interface RawDepositFile3 {
  [key: string]: {
    transactionHash: string;
    secrets: string[];
    nullifiers: string[];
    pools: string[];
    tokenAddress: string;
    amount: string;
    timestamp: number;
    walletAddress: string;
    userAddress: string;
    isProxyDeposit: boolean;
    pendingUserDeposit: boolean;
    swapParams: {
      fromToken: string;
      toToken: string;
      amount: string;
      slippage: number;
      recipientAddress?: string;
    };
  } | Array<{
    depositId: string;
    txHash: string;
    userAddress: string;
    tokenAddress: string;
    amount: string;
    timestamp: number;
    status: string;
    typhoonData?: {
      fromToken: string;
      toToken: string;
      amount: string;
      slippage: number;
      recipientAddress: string;
    };
  }>;
}

export interface WithdrawalResult {
  depositId: string;
  success: boolean;
  error?: string;
  transactionHash?: string;
  timestamp: number;
}