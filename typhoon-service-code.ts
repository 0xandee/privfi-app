// typhoon.ts - Complete TyphoonService implementation
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
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    super('Typhoon', '', 10000);
    this.sdk = new TyphoonSDK();
  }

  private async initializeSDK(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Initialize the SDK with empty arrays for now
      // In a real implementation, you would load these from secure storage or API
      this.sdk.init([], [], []);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Typhoon SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * THIS IS WHERE THE ERROR OCCURS
   */
  async generateApproveAndDepositCalls(
    amountOut: string,
    tokenOutAddr: string
  ): Promise<TyphoonDepositCall[]> {
    try {
      // Ensure SDK is initialized
      await this.initializeSDK();
      
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      // 🚨 THIS CALL FAILS WITH RPC 500 ERROR
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      return depositCalls;
    } catch (error) {
      
      // Check if this is an RPC-related error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('500') || errorMessage.includes('Internal error') || errorMessage.includes('RPC')) {
        throw new Error('Typhoon service is temporarily unavailable due to RPC issues. Please try again later or use regular swap mode.');
      }
      
      throw new Error(`Typhoon deposit call generation failed: ${errorMessage}`);
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
      throw new Error(`Private swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw funds after private swap completion
   */
  async withdraw(withdrawRequest: TyphoonWithdrawRequest): Promise<void> {
    try {
      // Ensure SDK is initialized
      await this.initializeSDK();
      await this.sdk.withdraw(
        withdrawRequest.transactionHash,
        withdrawRequest.recipientAddresses
      );
    } catch (error) {
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}