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
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'completed';

export interface SwapProgress {
  phase: SwapPhase;
  message: string;
  estimatedTimeMs?: number;
  startedAt?: number; // Timestamp when this phase started
}

export interface SwapExecutionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  transactionHash: string | null;
  progress?: SwapProgress;
}