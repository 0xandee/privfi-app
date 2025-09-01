import { Call } from 'starknet';

export interface TyphoonDepositCall {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

export interface TyphoonPrivateSwapRequest {
  swapCalls: Call[]; // Calls from AVNU build
  tokenOut: string;
  amountOut: string;
  recipientAddress: string;
}

export interface TyphoonPrivateSwapResponse {
  depositCalls: TyphoonDepositCall[];
  transactionHash?: string;
}

export interface TyphoonWithdrawRequest {
  transactionHash: string;
  recipientAddresses: string[];
}