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

export interface SwapExecutionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  transactionHash: string | null;
  isPrivateSwap?: boolean;
  withdrawalStatus?: 'pending' | 'completed' | 'failed';
}