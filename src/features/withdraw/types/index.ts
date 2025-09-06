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
  progress?: WithdrawProgress;
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

export type WithdrawPhase = 
  | 'preparing'
  | 'validating-hash'
  | 'validating-recipients' 
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'completed';

export interface WithdrawProgress {
  phase: WithdrawPhase;
  message: string;
  estimatedTimeMs?: number;
}