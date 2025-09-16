import { Token } from '@/shared/types';

export interface DepositRecord {
  id: string;
  transactionHash: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  secrets: unknown[];
  nullifiers: unknown[];
  pools: unknown[];
  timestamp: number;
  status: 'pending' | 'confirmed' | 'withdrawn';
  note?: string;
}

export interface DepositFormData {
  token: Token;
  amount: string;
}

export interface DepositExecution {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  transactionHash: string | null;
  depositRecord: DepositRecord | null;
}

export interface MinimumDepositValidation {
  isValid: boolean;
  minimumAmount: string;
  errorMessage?: string;
  warningMessage?: string;
}