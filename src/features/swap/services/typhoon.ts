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
    this.sdk = new TyphoonSDK();
  }

  private async initializeSDK(mode: 'deposit' | 'withdrawal' = 'deposit'): Promise<void> {
    // For deposits, always force re-initialization to prevent data accumulation
    if (mode === 'deposit') {
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
      if (mode === 'deposit') {
        // For new deposits: Always start with empty arrays to avoid data accumulation
        this.sdk.init([], [], []);
        this.isInitialized = true;
      } else {
        // For withdrawals: This will be handled separately with specific deposit data
        this.sdk.init([], [], []);
        this.isInitialized = true;
      }
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
   * Get the minimal amount required by Typhoon to mix tokens
   * Returns the minimal amount as a string (human-readable format)
   */
  getTokenMinimalAmount(tokenAddress: string): string {
    // Normalize token address for comparison
    const normalizedAddress = tokenAddress.toLowerCase();
    
    // Check against known token addresses from constants
    // ETH: 0.001 ETH minimum
    if (normalizedAddress === '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7') {
      return '0.001';
    }
    
    // STRK: 10 STRK minimum
    if (normalizedAddress === '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d') {
      return '10';
    }
    
    // USDC: 1 USDC minimum
    if (normalizedAddress === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8') {
      return '1';
    }
    
    // WBTC: 0.00005 WBTC minimum (approximately $2-3 equivalent)
    if (normalizedAddress === '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac') {
      return '0.00005';
    }
    
    // Default minimum for unknown tokens (equivalent to ~$1)
    return '0.001';
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
      
      // Ensure SDK is initialized
      await this.initializeSDK('deposit');
      
      // Convert string amount to BigInt
      const amountBigInt = BigInt(amountOut);
      
      const depositCalls = await this.sdk.generate_approve_and_deposit_calls(
        amountBigInt,
        tokenOutAddr
      );
      
      // CRITICAL: Save SDK data after generation (as per Typhoon docs)
      try {
        const secrets = this.sdk.get_secrets();
        const nullifiers = this.sdk.get_nullifiers();
        const pools = this.sdk.get_pools();
        
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
        } else if (secrets?.length || nullifiers?.length || pools?.length) {
          // Store temporarily if we don't have transaction hash yet
          this.tempSdkData = {
            secrets: secrets || [],
            nullifiers: nullifiers || [],
            pools: pools || [],
            tokenAddress: tokenOutAddr,
            amount: amountOut
          };
        }
        
      } catch (sdkDataError) {
        // Failed to extract SDK data (non-critical)
      }
      
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
      if (!this.tempSdkData) {
        return;
      }
      
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
      
      // Clear temporary data after saving
      this.tempSdkData = null;
    } catch (error) {
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
      throw new Error(`Private swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw funds after private swap completion
   * Restores SDK state from stored deposit data before withdrawal
   */
  async withdraw(withdrawRequest: TyphoonWithdrawRequest): Promise<void> {
    try {
      // Initialize SDK for withdrawal with empty state first
      await this.initializeSDK('withdrawal');
      
      // CRITICAL: Load specific deposit data for this transaction
      const depositData = loadTyphoonDepositData(withdrawRequest.transactionHash);
      
      if (!depositData) {
        throw new Error(`No deposit data found for transaction ${withdrawRequest.transactionHash}. Cannot withdraw without original deposit secrets.`);
      }
      
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
      
      // Re-initialize SDK with the specific deposit data
      this.isInitialized = false; // Force re-initialization
      this.initializationPromise = null;
      
      try {
        // Properly re-initialize the SDK with the deposit data
        this.sdk.init(depositData.secrets, depositData.nullifiers, depositData.pools);
        this.isInitialized = true;
        
        // Add a small delay to ensure SDK is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify SDK state after initialization
        try {
          // Test if SDK is properly initialized by checking if withdraw method exists and is callable
          if (typeof this.sdk.withdraw !== 'function') {
            throw new Error('SDK withdraw method is not available after initialization');
          }
        } catch (verifyError) {
          this.isInitialized = false;
          throw new Error(`SDK initialization failed verification: ${verifyError.message}`);
        }
        
      } catch (initError) {
        this.isInitialized = false;
        this.initializationPromise = null;
        throw new Error(`Failed to re-initialize SDK with deposit data: ${initError.message}`);
      }
      
      // Ensure we're passing the correct format for the SDK
      // The SDK needs the transaction hash WITH the 0x prefix for BigInt conversion
      const formattedTxHash = withdrawRequest.transactionHash.startsWith('0x') 
        ? withdrawRequest.transactionHash 
        : `0x${withdrawRequest.transactionHash}`;
      
      const result = await this.sdk.withdraw(
        formattedTxHash,
        withdrawRequest.recipientAddresses
      );
      
      // Clean up stored data after successful withdrawal
      clearAllTyphoonData();
    } catch (error) {
      
      throw new Error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}