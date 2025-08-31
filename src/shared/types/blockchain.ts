export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

export interface TokenAmount {
  token: Token;
  amount: string;
  amountInUsd?: number;
}

export interface WalletInfo {
  address: string;
  name: string;
  icon?: string;
  isConnected: boolean;
}

export interface TransactionHash {
  hash: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasFeeInUsd: number;
}

export interface SwapRoute {
  name: string;
  address: string;
  percentage: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
}

export interface SwapQuote {
  id: string;
  sellAmount: string;
  buyAmount: string;
  sellAmountInUsd: number;
  buyAmountInUsd: number;
  priceImpact: number;
  gasEstimate: GasEstimate;
  route: SwapRoute[];
  expiry: number | null;
  slippage: number;
}