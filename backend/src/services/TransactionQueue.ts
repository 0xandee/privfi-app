import { PrivacySwapRequest, PrivacyFlowPhase } from '../types/privacy';
import { logger } from '../utils/logger';
import { ProxyExecutor } from './ProxyExecutor';
import { EventEmitter } from 'events';

export class TransactionQueue extends EventEmitter {
  private static instance: TransactionQueue;
  private queue: PrivacySwapRequest[] = [];
  private processing = false;
  private logger = new logger.constructor('TransactionQueue');
  private proxyExecutor: ProxyExecutor;
  private processingInterval: NodeJS.Timeout | null = null;
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 5000; // 5 seconds

  private constructor() {
    super();
    this.proxyExecutor = ProxyExecutor.getInstance();
  }

  static getInstance(): TransactionQueue {
    if (!TransactionQueue.instance) {
      TransactionQueue.instance = new TransactionQueue();
    }
    return TransactionQueue.instance;
  }

  addRequest(request: PrivacySwapRequest): void {
    request.retryCount = 0;
    request.maxRetries = this.MAX_RETRIES;
    this.queue.push(request);

    this.logger.info('Added request to queue', {
      id: request.id,
      userAddress: request.userAddress,
      phase: request.phase,
      queueLength: this.queue.length
    });

    this.emit('requestAdded', request);
  }

  startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.logger.info('Starting transaction queue processing');

    this.processingInterval = setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processNext();
      }
    }, 1000); // Check every second
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.info('Stopped transaction queue processing');
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const request = this.queue[0];

    try {
      this.logger.info('Processing request', {
        id: request.id,
        phase: request.phase,
        retryCount: request.retryCount
      });

      await this.executePhase(request);

      // Move to next phase or complete
      if (request.phase === PrivacyFlowPhase.READY_TO_WITHDRAW) {
        request.phase = PrivacyFlowPhase.COMPLETED;
        this.completeRequest(request);
      } else {
        this.advancePhase(request);
      }
    } catch (error) {
      await this.handleError(request, error);
    } finally {
      this.processing = false;
    }
  }

  private async executePhase(request: PrivacySwapRequest): Promise<void> {
    switch (request.phase) {
      case PrivacyFlowPhase.DEPOSITING:
        // User deposits to Typhoon - handled client-side
        request.phase = PrivacyFlowPhase.WITHDRAWING;
        break;

      case PrivacyFlowPhase.WITHDRAWING:
        const withdrawTx = await this.proxyExecutor.withdrawFromTyphoon(
          request.depositTxHash,
          request.amount,
          request.typhoonData
        );
        request.proxyTxHashes.withdrawal = withdrawTx;
        request.phase = PrivacyFlowPhase.SWAPPING;
        break;

      case PrivacyFlowPhase.SWAPPING:
        const swapTx = await this.proxyExecutor.executeSwap(
          request.fromToken,
          request.toToken,
          request.amount,
          request.slippage
        );
        request.proxyTxHashes.swap = swapTx;
        request.phase = PrivacyFlowPhase.REDEPOSITING;
        break;

      case PrivacyFlowPhase.REDEPOSITING:
        const redepositData = await this.proxyExecutor.redepositToTyphoon(
          request.toToken,
          request.proxyTxHashes.swap!,
          request.userAddress
        );
        request.proxyTxHashes.redeposit = redepositData.txHash;
        request.typhoonData = redepositData.typhoonData;
        request.phase = PrivacyFlowPhase.READY_TO_WITHDRAW;
        break;

      default:
        throw new Error(`Unknown phase: ${request.phase}`);
    }

    request.updatedAt = new Date();
    this.emit('phaseCompleted', request);
  }

  private advancePhase(request: PrivacySwapRequest): void {
    this.logger.info('Advanced to next phase', {
      id: request.id,
      phase: request.phase
    });

    // Keep request in queue for next phase
    this.emit('phaseAdvanced', request);
  }

  private completeRequest(request: PrivacySwapRequest): void {
    // Remove from queue
    this.queue = this.queue.filter(r => r.id !== request.id);

    this.logger.info('Request completed', {
      id: request.id,
      userAddress: request.userAddress
    });

    this.emit('requestCompleted', request);
  }

  private async handleError(request: PrivacySwapRequest, error: any): Promise<void> {
    request.retryCount++;
    request.error = error.message || 'Unknown error';

    this.logger.error('Request processing failed', {
      id: request.id,
      phase: request.phase,
      retryCount: request.retryCount,
      error: request.error
    });

    if (request.retryCount < request.maxRetries) {
      // Retry after delay
      this.logger.info('Scheduling retry', {
        id: request.id,
        retryCount: request.retryCount,
        delayMs: this.RETRY_DELAY
      });

      setTimeout(() => {
        // Re-add to queue for retry
        this.processing = false;
      }, this.RETRY_DELAY);

      this.emit('requestRetrying', request);
    } else {
      // Max retries reached, fail the request
      request.phase = PrivacyFlowPhase.FAILED;
      this.queue = this.queue.filter(r => r.id !== request.id);

      // Attempt to recover funds
      await this.attemptFundRecovery(request);

      this.emit('requestFailed', request);
    }
  }

  private async attemptFundRecovery(request: PrivacySwapRequest): Promise<void> {
    try {
      this.logger.info('Attempting fund recovery', {
        id: request.id,
        phase: request.phase
      });

      // Depending on the phase, attempt to recover funds
      if (request.phase === PrivacyFlowPhase.WITHDRAWING) {
        // Funds still in Typhoon, user can withdraw normally
        this.logger.info('Funds still in Typhoon, no recovery needed');
      } else if (request.phase === PrivacyFlowPhase.SWAPPING && request.proxyTxHashes.withdrawal) {
        // Funds withdrawn but not swapped, re-deposit to Typhoon
        await this.proxyExecutor.redepositToTyphoon(
          request.fromToken,
          request.proxyTxHashes.withdrawal
        );
        this.logger.info('Funds re-deposited to Typhoon for user recovery');
      } else if (request.phase === PrivacyFlowPhase.REDEPOSITING && request.proxyTxHashes.swap) {
        // Funds swapped but not re-deposited, attempt re-deposit
        await this.proxyExecutor.redepositToTyphoon(
          request.toToken,
          request.proxyTxHashes.swap
        );
        this.logger.info('Swapped funds re-deposited to Typhoon');
      }

      this.emit('fundsRecovered', request);
    } catch (recoveryError) {
      this.logger.error('Fund recovery failed', {
        id: request.id,
        error: recoveryError
      });
      this.emit('fundRecoveryFailed', request);
    }
  }

  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    currentRequest?: PrivacySwapRequest;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentRequest: this.queue[0]
    };
  }

  getRequestById(id: string): PrivacySwapRequest | undefined {
    return this.queue.find(r => r.id === id);
  }

  getUserRequests(userAddress: string): PrivacySwapRequest[] {
    return this.queue.filter(r => r.userAddress.toLowerCase() === userAddress.toLowerCase());
  }
}