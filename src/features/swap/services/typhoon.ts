import { TyphoonSDK } from 'typhoon-sdk';
import { BaseDEXService } from './baseDEX';
import { Token, SwapQuote } from '@/shared/types';
import { QuoteRequest, QuoteResponse, ExecuteSwapRequest, ExecuteSwapResponse } from '../types';
import { 
  TyphoonPrivateSwapRequest, 
  TyphoonPrivateSwapResponse, 
  TyphoonWithdrawRequest,
  TyphoonDepositCall
} from '../types/typhoon';

export class TyphoonService extends BaseDEXService {
  private sdk: TyphoonSDK;

  constructor() {
    super('Typhoon', '', 10000);
    this.sdk = new TyphoonSDK();
  }

  // Not used for quotes - we'll use AVNU for quotes and Typhoon for privacy
  async getQuotes(request: QuoteRequest): Promise<QuoteResponse> {
    throw new Error('TyphoonService is for privacy layer only. Use AVNU for quotes.');
  }

  async executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse> {
    throw new Error('Use executePrivateSwap method instead');
  }

  async getSupportedTokens(): Promise<Token[]> {
    // Typhoon supports same tokens as the underlying DEX
    return [];
  }

  /**
   * Generate approve and deposit calls for private swap
   */
  async generateApproveAndDepositCalls(
    amountOut: string,
    tokenOutAddr: string
  ): Promise<TyphoonDepositCall[]> {
    try {
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      return depositCalls;
    } catch (error) {
      console.error('Failed to generate Typhoon deposit calls:', error);
      throw new Error(`Typhoon deposit call generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute private swap by combining regular swap with Typhoon privacy layer
   */
  async executePrivateSwap(request: TyphoonPrivateSwapRequest): Promise<TyphoonPrivateSwapResponse> {
    try {
      // Generate deposit calls for the output token
      const depositCalls = await this.generateApproveAndDepositCalls(
        request.amountOut,
        request.tokenOut
      );

      return {
        depositCalls,
      };
    } catch (error) {
      console.error('Private swap execution failed:', error);
      throw new Error(`Private swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw funds after private swap completion
   */
  async withdraw(withdrawRequest: TyphoonWithdrawRequest): Promise<void> {
    try {
      await this.sdk.withdraw(
        withdrawRequest.transactionHash,
        withdrawRequest.recipientAddresses
      );
    } catch (error) {
      console.error('Typhoon withdrawal failed:', error);
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}