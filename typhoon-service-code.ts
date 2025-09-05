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
      console.group('🔧 Typhoon SDK Initialization');
      console.log('Initializing Typhoon SDK...');
      console.log('SDK instance before init:', this.sdk);
      
      // Initialize the SDK with empty arrays for now
      // In a real implementation, you would load these from secure storage or API
      this.sdk.init([], [], []);
      this.isInitialized = true;
      
      console.log('SDK initialized with empty arrays');
      console.log('SDK instance after init:', this.sdk);
      console.log('Available SDK methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
      console.groupEnd();
    } catch (error) {
      console.error('❌ Failed to initialize Typhoon SDK');
      console.error('Error:', error);
      console.groupEnd();
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
      console.group('💰 Typhoon Deposit Calls Debug');
      console.log('Amount Out (string):', amountOut);
      console.log('Token Out Address:', tokenOutAddr);
      console.log('Token Address Length:', tokenOutAddr.length);
      console.log('Token Address Valid:', /^0x[a-fA-F0-9]{63,64}$/.test(tokenOutAddr));
      
      // Ensure SDK is initialized
      await this.initializeSDK();
      
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      console.log('Amount Out (BigInt):', amountBigInt.toString());
      
      console.log('Calling sdk.generate_approve_and_deposit_calls()...');
      // 🚨 THIS CALL FAILS WITH RPC 500 ERROR
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      console.log('✅ Deposit calls generated:', depositCalls);
      console.groupEnd();
      return depositCalls;
    } catch (error) {
      console.error('❌ Failed to generate Typhoon deposit calls');
      console.error('Error:', error);
      console.groupEnd();
      
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
      console.error('Private swap execution failed:', error);
      throw new Error(`Private swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw funds after private swap completion
   */
  async withdraw(withdrawRequest: TyphoonWithdrawRequest): Promise<void> {
    try {
      // Debug logging for withdraw request
      console.group('🔍 Typhoon Withdraw Debug Info');
      console.log('Transaction Hash:', withdrawRequest.transactionHash);
      console.log('Transaction Hash Length:', withdrawRequest.transactionHash.length);
      console.log('Transaction Hash (without 0x):', withdrawRequest.transactionHash.slice(2));
      console.log('Recipient Addresses:', withdrawRequest.recipientAddresses);
      console.log('Number of Recipients:', withdrawRequest.recipientAddresses.length);
      
      // Log each recipient for validation
      withdrawRequest.recipientAddresses.forEach((address, index) => {
        console.log(`Recipient ${index + 1}:`, address);
        console.log(`  - Length: ${address.length}`);
        console.log(`  - Without 0x: ${address.slice(2)}`);
        console.log(`  - Valid format: ${/^0x[a-fA-F0-9]{63,64}$/.test(address)}`);
      });
      
      // Ensure SDK is initialized
      console.log('Initializing SDK...');
      await this.initializeSDK();
      console.log('SDK initialized successfully');
      
      // Log SDK state if possible
      console.log('SDK instance:', this.sdk);
      console.log('SDK methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
      
      console.log('Calling sdk.withdraw()...');
      await this.sdk.withdraw(
        withdrawRequest.transactionHash,
        withdrawRequest.recipientAddresses
      );
      console.log('✅ Withdraw successful');
      console.groupEnd();
    } catch (error) {
      console.error('❌ Typhoon withdrawal failed');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Full error object:', error);
      
      // Try to extract more details from the error
      if (error && typeof error === 'object') {
        console.error('Error properties:', Object.keys(error));
        console.error('Error stack:', (error as any).stack);
        console.error('Error code:', (error as any).code);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      console.groupEnd();
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}