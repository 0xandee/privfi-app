import { logger } from '../utils/logger';

export interface TyphoonDepositData {
  transactionHash: string;
  secrets: any[];
  nullifiers: any[];
  pools: any[];
  tokenAddress: string;
  amount: string;
  timestamp: number;
  walletAddress: string;
  userAddress: string; // Original user who initiated the privacy swap
  isProxyDeposit: boolean; // True if this is a proxy wallet deposit
  pendingUserDeposit?: boolean; // True if this is a pending user deposit (temp ID)
  swapParams?: any; // Swap parameters for privacy flow
}

export interface PrivacySwapData {
  swapId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  phase: string;
  createdAt: number;
  updatedAt: number;
  deposits: {
    userDeposit?: TyphoonDepositData;
    proxyRedeposit?: TyphoonDepositData;
  };
  txHashes: {
    withdrawal?: string;
    swap?: string;
    redeposit?: string;
  };
}

export abstract class DatabaseService {
  abstract saveDepositData(data: TyphoonDepositData): Promise<void>;
  abstract loadDepositData(txHash: string): Promise<TyphoonDepositData | null>;
  abstract clearDepositData(txHash: string): Promise<void>;
  abstract getUserDeposits(userAddress: string): Promise<TyphoonDepositData[]>;
  abstract getProxyDeposits(tokenAddress: string): Promise<TyphoonDepositData[]>;

  abstract saveSwapData(data: PrivacySwapData): Promise<void>;
  abstract loadSwapData(swapId: string): Promise<PrivacySwapData | null>;
  abstract updateSwapData(swapId: string, updates: Partial<PrivacySwapData>): Promise<void>;
  abstract getUserSwaps(userAddress: string): Promise<PrivacySwapData[]>;

  abstract cleanup(): Promise<void>;
}