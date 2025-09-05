export interface WithdrawRequest {
  transactionHash: string;
  recipients: RecipientInfo[];
}

export interface RecipientInfo {
  id: string;
  address: string;
  percentage: number;
}

export interface WithdrawState {
  transactionHash: string;
  recipients: RecipientInfo[];
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  transactionHistory: DepositTransaction[];
}

export interface DepositTransaction {
  hash: string;
  timestamp: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface WithdrawFormData {
  transactionHash: string;
  recipients: RecipientInfo[];
}

export type WithdrawStatus = 'idle' | 'validating' | 'executing' | 'success' | 'error';