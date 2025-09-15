import { Account, RpcProvider, constants, Contract, uint256 } from 'starknet';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

interface WalletStatus {
  address: string;
  isInitialized: boolean;
  ethBalance?: string;
  isLowBalance?: boolean;
  network: string;
}

export class ProxyWalletManager {
  private static instance: ProxyWalletManager;
  private account: Account | null = null;
  private provider: RpcProvider;
  private logger = new logger.constructor('ProxyWalletManager');
  private isInitialized = false;
  private minEthBalance: bigint;
  private alertThreshold: bigint;

  private constructor() {
    const rpcUrl = process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io';

    // Configure provider with explicit spec version to avoid channel mismatch
    this.provider = new RpcProvider({
      nodeUrl: rpcUrl,
      // Force compatibility with RPC v0.9.0
      chainId: constants.StarknetChainId.SN_MAIN
    });

    const minBalance = process.env.MIN_ETH_BALANCE || '0.01';
    const alertBalance = process.env.ALERT_ETH_THRESHOLD || '0.0005';

    this.minEthBalance = ethers.parseEther(minBalance);
    this.alertThreshold = ethers.parseEther(alertBalance);
  }

  static getInstance(): ProxyWalletManager {
    if (!ProxyWalletManager.instance) {
      ProxyWalletManager.instance = new ProxyWalletManager();
    }
    return ProxyWalletManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const address = process.env.PROXY_WALLET_ADDRESS;
    const privateKey = process.env.PROXY_WALLET_PRIVATE_KEY;

    if (!address || !privateKey) {
      throw new Error('Proxy wallet address and private key must be configured');
    }

    try {
      this.account = new Account(this.provider, address, privateKey);

      // Verify wallet connectivity
      await this.checkBalance();

      this.isInitialized = true;
      this.logger.info('Proxy wallet initialized', { address });
    } catch (error) {
      this.logger.error('Failed to initialize proxy wallet', error);
      throw error;
    }
  }

  async checkBalance(): Promise<bigint> {
    if (!this.account) {
      throw new Error('Wallet not initialized');
    }

    try {
      // ETH token address on StarkNet mainnet
      const ethTokenAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

      // Get ETH balance
      const ethContract = new Contract(
        [
          {
            name: 'balanceOf',
            type: 'function',
            inputs: [{ name: 'account', type: 'felt' }],
            outputs: [{ name: 'balance', type: 'Uint256' }],
            stateMutability: 'view'
          }
        ],
        ethTokenAddress,
        this.provider
      );

      const balance = await ethContract.balanceOf(this.account.address);
      const balanceInWei = uint256.uint256ToBN(balance.balance);

      // Check if balance is low
      if (balanceInWei < this.alertThreshold) {
        this.logger.warn('Proxy wallet ETH balance is low', {
          balance: ethers.formatEther(balanceInWei.toString()),
          threshold: ethers.formatEther(this.alertThreshold.toString())
        });
      }

      return balanceInWei;
    } catch (error) {
      this.logger.error('Failed to check wallet balance', error);
      throw error;
    }
  }

  async getWalletStatus(): Promise<WalletStatus> {
    if (!this.account) {
      return {
        address: process.env.PROXY_WALLET_ADDRESS || 'Not configured',
        isInitialized: false,
        network: process.env.STARKNET_NETWORK || 'mainnet-alpha'
      };
    }

    try {
      const balance = await this.checkBalance();
      const balanceInEth = ethers.formatEther(balance.toString());

      return {
        address: this.account.address,
        isInitialized: this.isInitialized,
        ethBalance: balanceInEth,
        isLowBalance: balance < this.alertThreshold,
        network: process.env.STARKNET_NETWORK || 'mainnet-alpha'
      };
    } catch (error) {
      return {
        address: this.account.address,
        isInitialized: this.isInitialized,
        network: process.env.STARKNET_NETWORK || 'mainnet-alpha'
      };
    }
  }

  getAccount(): Account {
    if (!this.account) {
      throw new Error('Wallet not initialized');
    }
    return this.account;
  }

  getProvider(): RpcProvider {
    return this.provider;
  }

  async executeTransaction(calls: any[]): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not initialized');
    }

    try {
      const response = await this.account.execute(calls);
      return response.transaction_hash;
    } catch (error) {
      this.logger.error('Failed to execute transaction', error);
      throw error;
    }
  }
}