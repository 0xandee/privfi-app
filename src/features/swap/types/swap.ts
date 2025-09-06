import { Call } from 'starknet';

export interface BuildSwapRequest {
  quoteId: string;
  takerAddress: string;
  slippage: number;
  includeApprove?: boolean;
}

export interface BuildSwapResponse {
  chainId: string;
  calls: Call[];
}

export type SwapPhase = 
  | 'preparing'
  | 'building-swap'
  | 'generating-deposit'
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'processing-withdrawal'
  | 'completed';

export interface SwapProgress {
  phase: SwapPhase;
  message: string;
  estimatedTimeMs?: number;
}

export interface SwapExecutionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  transactionHash: string | null;
  isPrivateSwap?: boolean;
  withdrawalStatus?: 'pending' | 'completed' | 'failed';
  progress?: SwapProgress;
}