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
import { 
  getAllTyphoonSdkData, 
  loadTyphoonDepositData,
  saveTyphoonDepositData,
  clearTyphoonDepositData,
  TyphoonDepositData
} from '../utils/typhoonStorage';

export class TyphoonService extends BaseDEXService {
  private sdk: TyphoonSDK;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private tempSdkData: {
    secrets: unknown[];
    nullifiers: unknown[];
    pools: unknown[];
    tokenAddress: string;
    amount: string;
  } | null = null;

  constructor() {
    super('Typhoon', '', 10000);
    console.group('🏗️ TyphoonService Constructor');
    console.log('Creating TyphoonSDK instance...');
    this.sdk = new TyphoonSDK();
    console.log('TyphoonSDK instance created:', this.sdk);
    console.log('SDK prototype:', Object.getPrototypeOf(this.sdk));
    console.log('SDK methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
    console.log('Initialization status:', this.isInitialized);
    console.groupEnd();
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
      
      // Load stored Typhoon data from previous deposits
      const storedData = getAllTyphoonSdkData();
      console.log('Loading stored Typhoon data:');
      console.log('  - Secrets:', storedData.secrets.length);
      console.log('  - Nullifiers:', storedData.nullifiers.length);
      console.log('  - Pools:', storedData.pools.length);
      
      // Initialize the SDK with stored data (or empty arrays for first use)
      this.sdk.init(storedData.secrets, storedData.nullifiers, storedData.pools);
      this.isInitialized = true;
      
      if (storedData.secrets.length > 0 || storedData.nullifiers.length > 0 || storedData.pools.length > 0) {
        console.log('✅ SDK initialized with stored deposit data');
      } else {
        console.log('ℹ️ SDK initialized with empty arrays (first use)');
      }
      
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
   * Also saves the generated SDK data for later withdrawal
   */
  async generateApproveAndDepositCalls(
    amountOut: string,
    tokenOutAddr: string,
    walletAddress?: string,
    transactionHash?: string
  ): Promise<TyphoonDepositCall[]> {
    try {
      console.group('💰 Typhoon Deposit Calls Debug');
      console.log('Amount Out (string):', amountOut);
      console.log('Token Out Address:', tokenOutAddr);
      console.log('Token Address Length:', tokenOutAddr.length);
      console.log('Token Address Valid:', /^0x[a-fA-F0-9]{63,64}$/.test(tokenOutAddr));
      console.log('Wallet Address:', walletAddress);
      console.log('Transaction Hash:', transactionHash);
      
      // Ensure SDK is initialized
      await this.initializeSDK();
      
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      console.log('Amount Out (BigInt):', amountBigInt.toString());
      
      console.log('Calling sdk.generate_approve_and_deposit_calls()...');
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      console.log('✅ Deposit calls generated:', depositCalls);
      
      // CRITICAL: Save SDK data after generation (as per Typhoon docs)
      console.log('📦 Extracting SDK data for persistence...');
      try {
        const secrets = this.sdk.get_secrets();
        const nullifiers = this.sdk.get_nullifiers();
        const pools = this.sdk.get_pools();
        
        console.log('Extracted SDK data:');
        console.log('  - Secrets:', secrets?.length || 0);
        console.log('  - Nullifiers:', nullifiers?.length || 0);
        console.log('  - Pools:', pools?.length || 0);
        
        // Save data if we have transaction hash and wallet address
        if (transactionHash && walletAddress && (secrets?.length || nullifiers?.length || pools?.length)) {
          const depositData: TyphoonDepositData = {
            transactionHash,
            secrets: secrets || [],
            nullifiers: nullifiers || [],
            pools: pools || [],
            tokenAddress: tokenOutAddr,
            amount: amountOut,
            timestamp: Date.now(),
            walletAddress
          };
          
          saveTyphoonDepositData(depositData);
          console.log('💾 SDK data saved for future withdrawal');
        } else if (secrets?.length || nullifiers?.length || pools?.length) {
          // Store temporarily if we don't have transaction hash yet
          this.tempSdkData = {
            secrets: secrets || [],
            nullifiers: nullifiers || [],
            pools: pools || [],
            tokenAddress: tokenOutAddr,
            amount: amountOut
          };
          console.log('📋 SDK data stored temporarily - will save after transaction');
        } else {
          console.warn('⚠️ Cannot save SDK data - missing transaction hash or wallet address');
        }
        
      } catch (sdkDataError) {
        console.warn('⚠️ Failed to extract SDK data (non-critical):', sdkDataError);
      }
      
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
   * Save temporarily stored SDK data with transaction hash and wallet address
   * This method is called after transaction completion to persist deposit data
   */
  async saveDepositDataWithTxHash(transactionHash: string, walletAddress: string): Promise<void> {
    try {
      console.group('💾 Saving Typhoon Deposit Data Post-Transaction');
      console.log('Transaction Hash:', transactionHash);
      console.log('Wallet Address:', walletAddress);
      
      if (!this.tempSdkData) {
        console.warn('⚠️ No temporary SDK data to save');
        console.groupEnd();
        return;
      }
      
      console.log('Temporary SDK data found:');
      console.log('  - Secrets:', this.tempSdkData.secrets?.length || 0);
      console.log('  - Nullifiers:', this.tempSdkData.nullifiers?.length || 0);
      console.log('  - Pools:', this.tempSdkData.pools?.length || 0);
      console.log('  - Token:', this.tempSdkData.tokenAddress);
      console.log('  - Amount:', this.tempSdkData.amount);
      
      const depositData: TyphoonDepositData = {
        transactionHash,
        secrets: this.tempSdkData.secrets,
        nullifiers: this.tempSdkData.nullifiers,
        pools: this.tempSdkData.pools,
        tokenAddress: this.tempSdkData.tokenAddress,
        amount: this.tempSdkData.amount,
        timestamp: Date.now(),
        walletAddress
      };
      
      saveTyphoonDepositData(depositData);
      console.log('✅ SDK data saved successfully for withdrawal');
      
      // Clear temporary data after saving
      this.tempSdkData = null;
      console.log('🧹 Temporary data cleared');
      console.groupEnd();
    } catch (error) {
      console.error('❌ Failed to save deposit data with transaction hash');
      console.error('Error:', error);
      console.groupEnd();
      throw new Error(`Failed to save deposit data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Restores SDK state from stored deposit data before withdrawal
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
      
      // CRITICAL: Load specific deposit data for this transaction
      console.log('📂 Loading deposit data for transaction...');
      const depositData = loadTyphoonDepositData(withdrawRequest.transactionHash);
      
      if (!depositData) {
        console.error('❌ No deposit data found for transaction hash');
        console.error('This means either:');
        console.error('1. The deposit was made in a different session and data was lost');
        console.error('2. The transaction hash is incorrect');
        console.error('3. The deposit was never made through this app');
        throw new Error(`No deposit data found for transaction ${withdrawRequest.transactionHash}. Cannot withdraw without original deposit secrets.`);
      }
      
      console.log('✅ Found deposit data:');
      console.log('  - Secrets:', depositData.secrets?.length || 0);
      console.log('  - Nullifiers:', depositData.nullifiers?.length || 0);
      console.log('  - Pools:', depositData.pools?.length || 0);
      console.log('  - Token:', depositData.tokenAddress);
      console.log('  - Amount:', depositData.amount);
      console.log('  - Age:', Date.now() - depositData.timestamp, 'ms');
      
      // Re-initialize SDK with the specific deposit data
      console.log('🔄 Re-initializing SDK with deposit-specific data...');
      this.isInitialized = false; // Force re-initialization
      this.initializationPromise = null;
      
      // Set the specific deposit data in the SDK
      this.sdk.set_secrets(depositData.secrets);
      this.sdk.set_nullifiers(depositData.nullifiers);
      this.sdk.set_pools(depositData.pools);
      
      console.log('✅ SDK state restored with deposit data');
      
      // Log SDK state
      console.log('SDK instance:', this.sdk);
      console.log('SDK methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
      
      // Log the exact parameters being passed to the SDK
      console.log('Parameters being passed to sdk.withdraw():');
      console.log('  - transactionHash (raw):', withdrawRequest.transactionHash);
      console.log('  - transactionHash (type):', typeof withdrawRequest.transactionHash);
      console.log('  - recipientAddresses (raw):', withdrawRequest.recipientAddresses);
      console.log('  - recipientAddresses (type):', typeof withdrawRequest.recipientAddresses);
      console.log('  - recipientAddresses (Array.isArray):', Array.isArray(withdrawRequest.recipientAddresses));
      
      // Check SDK method existence
      console.log('SDK withdraw method exists:', typeof this.sdk.withdraw === 'function');
      
      console.log('Calling sdk.withdraw()...');
      const startTime = Date.now();
      try {
        const result = await this.sdk.withdraw(
          withdrawRequest.transactionHash,
          withdrawRequest.recipientAddresses
        );
        const duration = Date.now() - startTime;
        console.log('✅ Withdraw successful');
        console.log('Execution time:', duration + 'ms');
        console.log('SDK withdraw result:', result);
        console.log('Result type:', typeof result);
        
        // Clean up stored data after successful withdrawal
        console.log('🧹 Clearing stored deposit data after successful withdrawal...');
        clearTyphoonDepositData(withdrawRequest.transactionHash);
        console.log('✅ Deposit data cleared');
        
      } catch (sdkError) {
        const duration = Date.now() - startTime;
        console.error('❌ SDK withdraw call failed');
        console.error('Execution time:', duration + 'ms');
        console.error('SDK Error details:');
        console.error('  - Error type:', sdkError?.constructor?.name);
        console.error('  - Error message:', sdkError instanceof Error ? sdkError.message : sdkError);
        console.error('  - Error stack:', sdkError instanceof Error ? sdkError.stack : 'No stack');
        throw sdkError; // Re-throw to maintain error flow
      }
      console.groupEnd();
    } catch (error) {
      console.error('❌ Typhoon withdrawal failed');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Full error object:', error);
      
      // Try to extract more details from the error
      if (error && typeof error === 'object') {
        console.error('Error properties:', Object.keys(error));
        console.error('Error stack:', (error as Error).stack);
        console.error('Error code:', (error as { code?: unknown }).code);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      console.groupEnd();
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}