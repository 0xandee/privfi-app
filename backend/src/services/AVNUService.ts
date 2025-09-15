import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { ProxyWalletManager } from './ProxyWalletManager';

export interface AVNUQuote {
  quoteId: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  sellAmountInUsd: number;
  buyAmountInUsd: number;
  buyAmountWithoutFees: string;
  buyAmountWithoutFeesInUsd: number;
  estimatedAmount: boolean;
  chainId: string;
  blockNumber: string;
  expiry: number | null;
  routes: AVNURoute[];
  gasFees: string;
  gasFeesInUsd: number;
  avnuFees: string;
  avnuFeesInUsd: number;
  avnuFeesBps: string;
  integratorFees: string;
  integratorFeesInUsd: number;
  integratorFeesBps: string;
  priceRatioUsd: number;
  liquiditySource: string;
  sellTokenPriceInUsd: number;
  buyTokenPriceInUsd: number;
  estimatedSlippage: number;
}

export interface AVNURoute {
  name: string;
  address: string;
  percent: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
  routes?: AVNURoute[];
}

export interface AVNUSwapCall {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

export interface AVNUBuildResponse {
  calls: AVNUSwapCall[];
  approvalAmount?: string;
  estimatedGas?: string;
}

export class AVNUService {
  private static instance: AVNUService;
  private client: AxiosInstance;
  private walletManager: ProxyWalletManager;
  private logger = new logger.constructor('AVNUService');

  private baseUrl: string;
  private integratorName: string;
  private integratorFeeRecipient: string;
  private integratorFees: number;

  private constructor() {
    this.baseUrl = process.env.AVNU_API_URL || 'https://starknet.api.avnu.fi';
    this.integratorName = process.env.AVNU_INTEGRATOR_NAME || 'Privfi';
    this.integratorFeeRecipient = process.env.AVNU_INTEGRATOR_FEE_RECIPIENT || '0x065c065C1CF438F91C3CFFd47a959112F81b5F266d4890BbCDfb4088C39749E0';
    this.integratorFees = parseInt(process.env.AVNU_INTEGRATOR_FEE_BPS || '15');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.walletManager = ProxyWalletManager.getInstance();

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('AVNU API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        this.logger.error('AVNU API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('AVNU API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        this.logger.error('AVNU API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): AVNUService {
    if (!AVNUService.instance) {
      AVNUService.instance = new AVNUService();
    }
    return AVNUService.instance;
  }

  /**
   * Get swap quotes from AVNU
   */
  async getQuotes(
    sellTokenAddress: string,
    buyTokenAddress: string,
    sellAmount: string,
    takerAddress?: string
  ): Promise<AVNUQuote[]> {
    try {
      const params = {
        sellTokenAddress,
        buyTokenAddress,
        sellAmount: '0x' + BigInt(sellAmount).toString(16),
        size: '3',
        integratorName: this.integratorName,
        integratorFeeRecipient: this.integratorFeeRecipient,
        integratorFees: '0x' + this.integratorFees.toString(16),
      };

      if (takerAddress) {
        params['takerAddress'] = takerAddress;
      }

      this.logger.info('Getting AVNU quotes', {
        sellToken: sellTokenAddress,
        buyToken: buyTokenAddress,
        sellAmount
      });

      const response = await this.client.get('/swap/v2/quotes', { params });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No quotes available for this token pair');
      }

      this.logger.info('Retrieved AVNU quotes', {
        count: response.data.length,
        bestQuote: response.data[0]?.buyAmount
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get AVNU quotes', error);
      throw new Error(`AVNU quotes failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Build swap transaction calls
   */
  async buildSwap(
    quoteId: string,
    takerAddress: string,
    slippage: number
  ): Promise<AVNUBuildResponse> {
    try {
      const requestBody = {
        quoteId,
        takerAddress,
        slippage,
        includeApprove: true,
      };

      this.logger.info('Building AVNU swap', {
        quoteId,
        takerAddress,
        slippage
      });

      const response = await this.client.post('/swap/v2/build', requestBody);

      if (!response.data.calls || !Array.isArray(response.data.calls)) {
        throw new Error('Invalid build response: missing calls array');
      }

      this.logger.info('Built AVNU swap transaction', {
        callsCount: response.data.calls.length,
        approvalAmount: response.data.approvalAmount
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to build AVNU swap', error);
      throw new Error(`AVNU build failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Execute swap using proxy wallet
   */
  async executeSwap(
    sellTokenAddress: string,
    buyTokenAddress: string,
    sellAmount: string,
    slippage: number
  ): Promise<string> {
    try {
      const proxyAddress = this.walletManager.getAccount().address;

      // Get quotes
      const quotes = await this.getQuotes(
        sellTokenAddress,
        buyTokenAddress,
        sellAmount,
        proxyAddress
      );

      if (quotes.length === 0) {
        throw new Error('No quotes available');
      }

      const bestQuote = quotes[0];

      // Build swap transaction
      const buildResponse = await this.buildSwap(
        bestQuote.quoteId,
        proxyAddress,
        slippage
      );

      // Execute transaction
      const txHash = await this.walletManager.executeTransaction(buildResponse.calls);

      this.logger.info('AVNU swap executed successfully', {
        txHash,
        sellToken: sellTokenAddress,
        buyToken: buyTokenAddress,
        sellAmount,
        buyAmount: bestQuote.buyAmount
      });

      return txHash;
    } catch (error) {
      this.logger.error('Failed to execute AVNU swap', error);
      throw error;
    }
  }

  /**
   * Get estimated output amount for a swap
   */
  async getEstimatedOutput(
    sellTokenAddress: string,
    buyTokenAddress: string,
    sellAmount: string
  ): Promise<string> {
    try {
      const quotes = await this.getQuotes(sellTokenAddress, buyTokenAddress, sellAmount);
      return quotes[0]?.buyAmount || '0';
    } catch (error) {
      this.logger.error('Failed to get estimated output', error);
      return '0';
    }
  }

  /**
   * Check if a token pair is supported
   */
  async isTokenPairSupported(
    sellTokenAddress: string,
    buyTokenAddress: string
  ): Promise<boolean> {
    try {
      const quotes = await this.getQuotes(sellTokenAddress, buyTokenAddress, '1000000'); // Small test amount
      return quotes.length > 0;
    } catch (error) {
      return false;
    }
  }

  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}