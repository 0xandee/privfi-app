import { Account, Contract, uint256, CallData } from 'starknet';
import { ProxyWalletManager } from './ProxyWalletManager';
import { TyphoonSDKService } from './TyphoonSDKService';
import { AVNUService } from './AVNUService';
import { PrivacyDepositManager } from './PrivacyDepositManager';
import { logger } from '../utils/logger';

interface TyphoonWithdrawData {
  note?: string;
  nullifier?: string;
  commitmentHash?: string;
}

interface TyphoonDepositResult {
  txHash: string;
  typhoonData: {
    note: string;
    nullifier: string;
    commitmentHash: string;
  };
}

export class ProxyExecutor {
  private static instance: ProxyExecutor;
  private walletManager: ProxyWalletManager;
  private typhoonService: TyphoonSDKService;
  private avnuService: AVNUService;
  private depositManager: PrivacyDepositManager;
  private logger = new logger.constructor('ProxyExecutor');

  private constructor() {
    this.walletManager = ProxyWalletManager.getInstance();
    this.typhoonService = TyphoonSDKService.getInstance();
    this.avnuService = AVNUService.getInstance();
    this.depositManager = PrivacyDepositManager.getInstance();
  }

  static getInstance(): ProxyExecutor {
    if (!ProxyExecutor.instance) {
      ProxyExecutor.instance = new ProxyExecutor();
    }
    return ProxyExecutor.instance;
  }

  async withdrawFromTyphoon(
    depositTxHash: string,
    amount: string,
    typhoonData?: TyphoonWithdrawData
  ): Promise<string> {
    try {
      const proxyAddress = this.walletManager.getAccount().address;

      this.logger.info('Withdrawing from user Typhoon deposit', {
        depositTxHash,
        amount,
        proxyAddress
      });

      // Use TyphoonSDK to withdraw from user's deposit to proxy wallet
      const withdrawResult = await this.typhoonService.withdrawFromUserDeposit(
        depositTxHash,
        proxyAddress
      );

      this.logger.info('Successfully withdrew from Typhoon to proxy wallet', {
        txHash: withdrawResult.txHash,
        amount: withdrawResult.amount
      });

      return withdrawResult.txHash;
    } catch (error) {
      this.logger.error('Failed to withdraw from Typhoon', error);
      throw error;
    }
  }

  async executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number
  ): Promise<{txHash: string, buyAmount: string}> {
    try {
      this.logger.info('Executing AVNU swap via proxy wallet', {
        fromToken,
        toToken,
        amount,
        slippage
      });

      // Use AVNU service to execute swap
      const swapResult = await this.avnuService.executeSwap(
        fromToken,
        toToken,
        amount,
        slippage
      );

      this.logger.info('AVNU swap executed successfully', {
        txHash: swapResult.txHash,
        fromToken,
        toToken,
        amount,
        buyAmount: swapResult.buyAmount
      });

      return {
        txHash: swapResult.txHash,
        buyAmount: swapResult.buyAmount
      };
    } catch (error) {
      this.logger.error('Failed to execute swap', error);
      throw error;
    }
  }

  async redepositToTyphoon(
    tokenAddress: string,
    swapTxHash: string,
    userAddress: string,
    estimatedAmount?: string
  ): Promise<TyphoonDepositResult> {
    try {
      this.logger.info('Re-depositing swapped tokens to Typhoon', {
        tokenAddress,
        swapTxHash,
        userAddress,
        estimatedAmount
      });

      // Use the actual swap output amount (passed from executeSwap result)
      const amount = estimatedAmount || await this.getSwapOutputAmount(swapTxHash);

      this.logger.info('Using swap output amount', {
        estimatedAmount,
        actualAmount: amount,
        swapTxHash
      });

      // Generate deposit calls for proxy wallet
      const depositCalls = await this.typhoonService.generateProxyDepositCalls(
        amount,
        tokenAddress,
        userAddress,
        swapTxHash
      );

      // Execute the deposit transaction
      const depositTxHash = await this.typhoonService.executeProxyDeposit(
        depositCalls,
        swapTxHash
      );

      // Get the real deposit data that was saved during generateProxyDepositCalls
      const depositData = await this.typhoonService.getDepositData(swapTxHash);

      // Use real typhoonData if available, otherwise create compatible structure
      const typhoonData = depositData?.typhoonData ? {
        note: depositData.typhoonData.note || '',
        nullifier: depositData.typhoonData.nullifiers?.[0] || '',
        commitmentHash: depositData.typhoonData.pools?.[0] || '',
        // Include the full SDK data for withdrawals
        secrets: depositData.typhoonData.secrets || [],
        nullifiers: depositData.typhoonData.nullifiers || [],
        pools: depositData.typhoonData.pools || []
      } : {
        note: `proxy_deposit_${Date.now()}`,
        nullifier: `proxy_nullifier_${Date.now()}`,
        commitmentHash: `proxy_commitment_${Date.now()}`,
        secrets: [],
        nullifiers: [],
        pools: []
      };

      this.logger.info('Successfully re-deposited to Typhoon', {
        depositTxHash,
        amount,
        tokenAddress
      });

      return {
        txHash: depositTxHash,
        typhoonData
      };
    } catch (error) {
      this.logger.error('Failed to re-deposit to Typhoon', error);
      throw error;
    }
  }

  /**
   * Get estimated swap output amount
   */
  async getEstimatedSwapOutput(
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<string> {
    try {
      return await this.avnuService.getEstimatedOutput(fromToken, toToken, amount);
    } catch (error) {
      this.logger.error('Failed to get estimated swap output', error);
      return '0';
    }
  }

  /**
   * Check if a token pair is supported for swapping
   */
  async isTokenPairSupported(
    fromToken: string,
    toToken: string
  ): Promise<boolean> {
    try {
      return await this.avnuService.isTokenPairSupported(fromToken, toToken);
    } catch (error) {
      this.logger.error('Failed to check token pair support', error);
      return false;
    }
  }

  async checkTransactionStatus(txHash: string): Promise<string> {
    try {
      const provider = this.walletManager.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return 'pending';
      }

      return receipt.isSuccess() ? 'success' : 'failed';
    } catch (error) {
      this.logger.error('Failed to check transaction status', error);
      return 'unknown';
    }
  }

  private async getSwapOutputAmount(swapTxHash: string): Promise<string> {
    // Simplified implementation - in practice, you'd parse the transaction receipt
    // to get the actual output amount
    this.logger.warn('Using placeholder swap output amount - implement transaction receipt parsing');
    return '1000000'; // Placeholder amount
  }
}