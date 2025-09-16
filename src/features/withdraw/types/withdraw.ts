import { Token } from '@/shared/types';
import { DepositRecord } from '@/features/deposit/types';

export interface WithdrawalRecord {
  id: string;
  depositId: string;
  transactionHash: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  recipientAddresses: string[];
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WithdrawableDeposit extends DepositRecord {
  // Additional computed fields for withdrawal UI
  canWithdraw: boolean;
  withdrawReason?: string; // If can't withdraw, reason why
}

export interface GroupedDeposits {
  tokenAddress: string;
  token: Token;
  totalAmount: string;
  depositCount: number;
  deposits: WithdrawableDeposit[];
}

export interface WithdrawFormData {
  selectedDeposits: string[]; // Array of deposit IDs
  recipientAddress: string;
  token: Token | null;
  totalAmount: string;
}

export interface WithdrawExecution {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  transactionHash: string | null;
  withdrawalRecord: WithdrawalRecord | null;
}

export interface WithdrawRequest {
  depositIds: string[];
  recipientAddress: string;
  walletAddress: string;
}

export interface WithdrawResponse {
  transactionHash: string;
  withdrawalRecord: WithdrawalRecord;
  updatedDeposits: DepositRecord[];
}