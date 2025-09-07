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
  loadTyphoonDepositData,
  saveTyphoonDepositData,
  clearTyphoonDepositData,
  clearAllTyphoonData,
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

  private async initializeSDK(mode: 'deposit' | 'withdrawal' = 'deposit'): Promise<void> {
    // For deposits, always force re-initialization to prevent data accumulation
    if (mode === 'deposit') {
      console.log('🔄 Forcing SDK re-initialization for new deposit');
      this.isInitialized = false;
      this.initializationPromise = null;
    }

    // For withdrawals, also force re-initialization
    if (mode === 'withdrawal') {
      this.isInitialized = false;
      this.initializationPromise = null;
    }

    // Skip re-initialization only if already initialized AND not a deposit/withdrawal
    if (this.isInitialized && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(mode);
    return this.initializationPromise;
  }

  private async performInitialization(mode: 'deposit' | 'withdrawal' = 'deposit'): Promise<void> {
    try {
      console.group('🔧 Typhoon SDK Initialization');
      console.log('Initializing Typhoon SDK for:', mode);
      console.log('SDK instance before init:', this.sdk);
      
      if (mode === 'deposit') {
        // For new deposits: Always start with empty arrays to avoid data accumulation
        console.log('🆕 Initializing for new deposit with empty arrays');
        this.sdk.init([], [], []);
        this.isInitialized = true;
        console.log('✅ SDK initialized with empty arrays for new deposit');
      } else {
        // For withdrawals: This will be handled separately with specific deposit data
        console.log('💸 Initialization for withdrawal will use specific deposit data');
        this.sdk.init([], [], []);
        this.isInitialized = true;
        console.log('✅ SDK initialized (withdrawal mode will load specific data)');
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
      await this.initializeSDK('deposit');
      
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
      console.log('📦 Extracting NEW deposit-specific SDK data for persistence...');
      try {
        const secrets = this.sdk.get_secrets();
        const nullifiers = this.sdk.get_nullifiers();
        const pools = this.sdk.get_pools();
        
        console.log('Extracted NEW deposit data (should contain only this deposit):');
        console.log('  - Secrets:', secrets?.length || 0);
        console.log('  - Nullifiers:', nullifiers?.length || 0);
        console.log('  - Pools:', pools?.length || 0);
        
        // Validate that we're not accumulating data from previous deposits
        if (secrets?.length > 5 || nullifiers?.length > 5 || pools?.length > 5) {
          console.warn('⚠️ WARNING: Extracted arrays seem too large for a single deposit!');
          console.warn('This suggests data accumulation from previous deposits.');
          console.warn('Expected: 1-5 items per array, Got:', {
            secrets: secrets?.length,
            nullifiers: nullifiers?.length,
            pools: pools?.length
          });
        } else {
          console.log('✅ Data sizes look correct for a single deposit');
        }
        
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
   * Check if there's pending deposit data to save
   */
  hasPendingDepositData(): boolean {
    return this.tempSdkData !== null;
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
      
      // Initialize SDK for withdrawal with empty state first
      console.log('🔄 Initializing SDK for withdrawal...');
      await this.initializeSDK('withdrawal');
      
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
      
      // Validate deposit data quality and consistency
      if (!depositData.secrets || !Array.isArray(depositData.secrets)) {
        throw new Error('Invalid deposit data: secrets must be a valid array');
      }
      if (!depositData.nullifiers || !Array.isArray(depositData.nullifiers)) {
        throw new Error('Invalid deposit data: nullifiers must be a valid array');
      }
      if (!depositData.pools || !Array.isArray(depositData.pools)) {
        throw new Error('Invalid deposit data: pools must be a valid array');
      }
      
      // Check data consistency - all arrays should have matching lengths for proper deposits
      if (depositData.secrets.length !== depositData.nullifiers.length || 
          depositData.nullifiers.length !== depositData.pools.length) {
        console.warn('⚠️ Deposit data arrays have inconsistent lengths:');
        console.warn('  - Secrets:', depositData.secrets.length);
        console.warn('  - Nullifiers:', depositData.nullifiers.length); 
        console.warn('  - Pools:', depositData.pools.length);
      }
      
      console.log('✅ Deposit data validation passed');
      
      // Re-initialize SDK with the specific deposit data
      console.log('🔄 Re-initializing SDK with deposit-specific data...');
      this.isInitialized = false; // Force re-initialization
      this.initializationPromise = null;
      
      try {
        // Properly re-initialize the SDK with the deposit data
        console.log('Calling sdk.init() with deposit data...');
        console.log('  - Secrets array length:', depositData.secrets.length);
        console.log('  - Nullifiers array length:', depositData.nullifiers.length);
        console.log('  - Pools array length:', depositData.pools.length);
        
        this.sdk.init(depositData.secrets, depositData.nullifiers, depositData.pools);
        this.isInitialized = true;
        
        // Add a small delay to ensure SDK is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ SDK properly re-initialized with deposit data');
        
        // Verify SDK state after initialization
        try {
          // Test if SDK is properly initialized by checking if withdraw method exists and is callable
          if (typeof this.sdk.withdraw !== 'function') {
            throw new Error('SDK withdraw method is not available after initialization');
          }
          console.log('✅ SDK state verification passed - withdraw method available');
        } catch (verifyError) {
          console.error('❌ SDK state verification failed:', verifyError);
          this.isInitialized = false;
          throw new Error(`SDK initialization failed verification: ${verifyError.message}`);
        }
        
      } catch (initError) {
        console.error('❌ SDK re-initialization failed:', initError);
        this.isInitialized = false;
        this.initializationPromise = null;
        throw new Error(`Failed to re-initialize SDK with deposit data: ${initError.message}`);
      }
      
      // Enhanced debug logging for SDK state transitions
      console.group('🔍 SDK State Analysis');
      console.log('SDK instance type:', typeof this.sdk);
      console.log('SDK constructor name:', this.sdk.constructor?.name);
      console.log('SDK initialization status:', this.isInitialized);
      console.log('SDK methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.sdk)));
      
      // Log current SDK internal state (if accessible)
      try {
        const sdkState = {
          secretsCount: depositData.secrets?.length,
          nullifiersCount: depositData.nullifiers?.length,  
          poolsCount: depositData.pools?.length,
          hasWithdrawMethod: typeof this.sdk.withdraw === 'function'
        };
        console.log('SDK internal state summary:', sdkState);
      } catch (stateError) {
        console.log('Could not access SDK internal state:', stateError.message);
      }
      console.groupEnd();
      
      // Enhanced parameter logging for withdraw call
      console.group('📋 Withdraw Parameters Analysis');
      console.log('Transaction Hash:');
      console.log('  - Value:', withdrawRequest.transactionHash);
      console.log('  - Type:', typeof withdrawRequest.transactionHash);
      console.log('  - Length:', withdrawRequest.transactionHash?.length);
      console.log('  - Starts with 0x:', withdrawRequest.transactionHash?.startsWith?.('0x'));
      
      console.log('Recipient Addresses:');
      console.log('  - Value:', withdrawRequest.recipientAddresses);
      console.log('  - Type:', typeof withdrawRequest.recipientAddresses);
      console.log('  - Is Array:', Array.isArray(withdrawRequest.recipientAddresses));
      console.log('  - Array Length:', withdrawRequest.recipientAddresses?.length);
      if (Array.isArray(withdrawRequest.recipientAddresses)) {
        withdrawRequest.recipientAddresses.forEach((addr, index) => {
          console.log(`  - Address[${index}]:`, addr, `(${typeof addr})`);
        });
      }
      console.groupEnd();
      
      // Pre-withdraw SDK state verification
      console.log('🔧 Pre-withdraw SDK verification:');
      console.log('  - SDK withdraw method exists:', typeof this.sdk.withdraw === 'function');
      console.log('  - SDK initialized:', this.isInitialized);
      console.log('  - Deposit data loaded:', depositData.secrets.length > 0);
      
      console.log('🚀 Initiating sdk.withdraw() call...');
      const startTime = Date.now();
      try {
        // Ensure we're passing the correct format for the SDK
        // The SDK needs the transaction hash WITH the 0x prefix for BigInt conversion
        const formattedTxHash = withdrawRequest.transactionHash.startsWith('0x') 
          ? withdrawRequest.transactionHash 
          : `0x${withdrawRequest.transactionHash}`;
        
        console.log('📝 Formatted transaction hash for SDK:', formattedTxHash);
        
        const result = await this.sdk.withdraw(
          formattedTxHash,
          withdrawRequest.recipientAddresses
        );
        const duration = Date.now() - startTime;
        console.log('✅ Withdraw successful');
        console.log('Execution time:', duration + 'ms');
        console.log('SDK withdraw result:', result);
        console.log('Result type:', typeof result);
        
        // Clean up stored data after successful withdrawal
        console.log('🧹 Clearing ALL stored deposit data after successful withdrawal...');
        clearAllTyphoonData();
        console.log('✅ All deposit data cleared');
        
      } catch (sdkError) {
        const duration = Date.now() - startTime;
        console.group('❌ SDK Withdraw Failure Analysis');
        console.error('SDK withdraw call failed after', duration + 'ms');
        console.error('Error details:');
        console.error('  - Error type:', sdkError?.constructor?.name);
        console.error('  - Error message:', sdkError instanceof Error ? sdkError.message : sdkError);
        console.error('  - Error stack:', sdkError instanceof Error ? sdkError.stack : 'No stack');
        
        // Log SDK state at time of failure
        console.error('SDK state at failure:');
        console.error('  - SDK initialized:', this.isInitialized);
        console.error('  - SDK type:', typeof this.sdk);
        console.error('  - Withdraw method available:', typeof this.sdk.withdraw === 'function');
        console.error('  - Secrets loaded:', depositData.secrets?.length || 0);
        console.error('  - Nullifiers loaded:', depositData.nullifiers?.length || 0);
        console.error('  - Pools loaded:', depositData.pools?.length || 0);
        
        // Log what might have caused the failure
        console.error('Potential causes:');
        if (!this.isInitialized) {
          console.error('  ⚠️ SDK not properly initialized');
        }
        if (depositData.secrets?.length === 0) {
          console.error('  ⚠️ No secrets loaded');
        }
        if (typeof this.sdk.withdraw !== 'function') {
          console.error('  ⚠️ Withdraw method not available');
        }
        
        // Check if this is a known SDK issue
        const errorMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
        if (errorMsg.includes('filter') || errorMsg.includes('undefined')) {
          console.error('  ⚠️ SDK internal error - likely missing on-chain data or pool state issue');
          console.error('  ℹ️ This can happen if:');
          console.error('    - The deposit transaction hasn\'t been fully confirmed');
          console.error('    - The pool state on-chain is different from when deposit was made');
          console.error('    - The SDK is unable to fetch required on-chain data');
        }
        console.groupEnd();
        
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