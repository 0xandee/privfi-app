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
      // Check if we're in development mode
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      
      if (isDev) {
        console.log('Initializing Typhoon SDK in development mode...');
      }

      // Initialize the SDK with empty arrays for now
      // In a real implementation, you would load these from secure storage or API
      this.sdk.init([], [], []);
      this.isInitialized = true;
      
      if (isDev) {
        console.log('Typhoon SDK initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Typhoon SDK:', error);
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
   */
  async generateApproveAndDepositCalls(
    amountOut: string,
    tokenOutAddr: string
  ): Promise<TyphoonDepositCall[]> {
    try {
      // Check if we're in development and Typhoon is disabled
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      const typhoonDisabled = import.meta.env.VITE_DISABLE_TYPHOON === 'true';
      
      if (isDev && typhoonDisabled) {
        console.warn('Typhoon is disabled in development mode');
        return []; // Return empty array to skip private swap
      }

      // Ensure SDK is initialized
      await this.initializeSDK();
      
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      return depositCalls;
    } catch (error) {
      console.error('Failed to generate Typhoon deposit calls:', error);
      
      // In development mode, don't fail the entire swap - just skip private layer
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      if (isDev) {
        console.warn('Skipping Typhoon deposit calls due to error in development mode');
        return [];
      }
      
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
      // Check if we're in development and Typhoon is disabled
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      const typhoonDisabled = import.meta.env.VITE_DISABLE_TYPHOON === 'true';
      
      if (isDev && typhoonDisabled) {
        console.warn('Typhoon withdrawal skipped - disabled in development mode');
        return;
      }

      // Ensure SDK is initialized
      await this.initializeSDK();
      
      await this.sdk.withdraw(
        withdrawRequest.transactionHash,
        withdrawRequest.recipientAddresses
      );
    } catch (error) {
      console.error('Typhoon withdrawal failed:', error);
      
      // In development mode, don't fail - just log the error
      const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
      if (isDev) {
        console.warn('Skipping Typhoon withdrawal due to error in development mode');
        return;
      }
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}