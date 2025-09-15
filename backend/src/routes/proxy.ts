import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PrivacySwapRequest, PrivacyFlowPhase, TyphoonDeposit } from '../types/privacy';
import { TransactionQueue } from '../services/TransactionQueue';
import { PrivacyDepositManager } from '../services/PrivacyDepositManager';
import { TyphoonSDKService } from '../services/TyphoonSDKService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const proxyRouter = Router();

const transactionQueue = TransactionQueue.getInstance();
const depositManager = PrivacyDepositManager.getInstance();
const routeLogger = new logger.constructor('ProxyRouter');

// Helper functions for detailed status
function getPhaseStatus(swap: PrivacySwapRequest, targetPhase: PrivacyFlowPhase): 'pending' | 'completed' | 'failed' {
  if (swap.phase === PrivacyFlowPhase.FAILED) {
    return 'failed';
  }

  const phaseOrder = [
    PrivacyFlowPhase.DEPOSITING,
    PrivacyFlowPhase.WITHDRAWING,
    PrivacyFlowPhase.SWAPPING,
    PrivacyFlowPhase.REDEPOSITING,
    PrivacyFlowPhase.READY_TO_WITHDRAW
  ];

  const currentIndex = phaseOrder.indexOf(swap.phase);
  const targetIndex = phaseOrder.indexOf(targetPhase);

  if (currentIndex > targetIndex) {
    return 'completed';
  } else if (currentIndex === targetIndex) {
    return 'completed';
  } else {
    return 'pending';
  }
}

function getCurrentPhaseNumber(phase: PrivacyFlowPhase): number {
  const phaseNumbers = {
    [PrivacyFlowPhase.PENDING]: 1,
    [PrivacyFlowPhase.DEPOSITING]: 1,
    [PrivacyFlowPhase.WITHDRAWING]: 2,
    [PrivacyFlowPhase.SWAPPING]: 3,
    [PrivacyFlowPhase.REDEPOSITING]: 4,
    [PrivacyFlowPhase.READY_TO_WITHDRAW]: 5,
    [PrivacyFlowPhase.COMPLETED]: 5,
    [PrivacyFlowPhase.FAILED]: 0
  };

  return phaseNumbers[phase] || 1;
}

// Get deposit transaction calls for privacy swap
proxyRouter.post('/deposit-calls', async (req: Request, res: Response, next: any) => {
  try {
    const {
      userAddress,
      fromToken,
      toToken,
      amount,
      slippage,
      recipientAddress
    } = req.body;

    if (!userAddress || !fromToken || !toToken || !amount || slippage === undefined) {
      throw new AppError('Missing required parameters for deposit calls', 400);
    }

    const typhoonService = TyphoonSDKService.getInstance();

    // Generate deposit calls with the backend TyphoonSDKService
    const depositCalls = await typhoonService.generateUserDepositCalls(
      amount,
      fromToken,
      userAddress,
      { fromToken, toToken, amount, slippage, recipientAddress }
    );

    // Also register the deposit with PrivacyDepositManager for tracking
    const tempDepositId = `user_${userAddress}_${Date.now()}`;
    const deposit: TyphoonDeposit = {
      depositId: uuidv4(),
      txHash: tempDepositId, // Will be updated with real hash later
      userAddress,
      tokenAddress: fromToken,
      amount,
      timestamp: Date.now(),
      status: 'pending',
      typhoonData: { fromToken, toToken, amount, slippage, recipientAddress }
    };

    await depositManager.trackDeposit(deposit);

    routeLogger.info('Deposit calls generated and tracked', {
      userAddress,
      tempDepositId,
      fromToken,
      amount
    });

    res.json({
      status: 'success',
      transactionCalls: depositCalls,
      swapData: {
        fromToken,
        toToken,
        amount,
        slippage,
        recipientAddress
      }
    });
  } catch (error) {
    next(error);
  }
});

// Track a new Typhoon deposit
proxyRouter.post('/deposits', async (req: Request, res: Response, next: any) => {
  try {
    const {
      txHash,
      userAddress,
      tokenAddress,
      amount,
      typhoonData
    } = req.body;

    if (!txHash || !userAddress || !tokenAddress || !amount) {
      throw new AppError('Missing required deposit parameters', 400);
    }

    const deposit: TyphoonDeposit = {
      depositId: uuidv4(),
      txHash,
      userAddress,
      tokenAddress,
      amount,
      timestamp: Date.now(),
      status: 'pending',
      typhoonData
    };

    await depositManager.trackDeposit(deposit);

    res.json({
      status: 'success',
      deposit
    });
  } catch (error) {
    next(error);
  }
});

// Get user's deposits
proxyRouter.get('/deposits/:userAddress', async (req: Request, res: Response, next: any) => {
  try {
    const { userAddress } = req.params;
    const deposits = depositManager.getUserDeposits(userAddress);

    res.json({
      status: 'success',
      deposits
    });
  } catch (error) {
    next(error);
  }
});

// Get total balance for a token
proxyRouter.get('/balance/:userAddress/:tokenAddress', async (req: Request, res: Response, next: any) => {
  try {
    const { userAddress, tokenAddress } = req.params;
    const balance = depositManager.getTotalBalance(userAddress, tokenAddress);

    res.json({
      status: 'success',
      balance
    });
  } catch (error) {
    next(error);
  }
});

// Initiate privacy swap
proxyRouter.post('/swap', async (req: Request, res: Response, next: any) => {
  try {
    const {
      userAddress,
      depositTxHash,
      fromToken,
      toToken,
      amount,
      slippage,
      recipientAddress
    } = req.body;

    if (!userAddress || !fromToken || !toToken || !amount || slippage === undefined) {
      throw new AppError('Missing required swap parameters', 400);
    }

    // If no specific deposit provided, select optimal one
    let selectedDeposit;
    if (depositTxHash) {
      // First try to find by exact transaction hash
      selectedDeposit = depositManager.getDepositByTxHash(userAddress, depositTxHash);

      // If not found, try to find by user address and token (handles temp ID case)
      if (!selectedDeposit) {
        console.log('Deposit not found by txHash, trying by user/token:', {
          userAddress,
          depositTxHash,
          fromToken,
          amount
        });
        selectedDeposit = depositManager.selectOptimalDeposit(userAddress, fromToken, amount);

        // If still not found, try looking for any recent deposit for this user/token
        // (handles amount fallback case where SDK used different amount)
        if (!selectedDeposit) {
          const userDeposits = depositManager.getUserDeposits(userAddress);
          selectedDeposit = userDeposits.find(d =>
            d.tokenAddress === fromToken &&
            d.status === 'pending' &&
            Math.abs(Date.now() - d.timestamp) < 5 * 60 * 1000 // Within last 5 minutes
          );

          if (selectedDeposit) {
            console.log('Found recent deposit for user/token:', {
              depositAmount: selectedDeposit.amount,
              requestedAmount: amount,
              depositTxHash: selectedDeposit.txHash
            });
          }
        }

        // If found, update the record with the real transaction hash
        if (selectedDeposit) {
          console.log('Found deposit with temp ID, updating with real txHash:', {
            oldTxHash: selectedDeposit.txHash,
            newTxHash: depositTxHash
          });
          selectedDeposit.txHash = depositTxHash;
        }
      }
    } else {
      selectedDeposit = depositManager.selectOptimalDeposit(userAddress, fromToken, amount);
    }

    if (!selectedDeposit) {
      throw new AppError('No suitable deposit found for swap', 400);
    }

    const swapRequest: PrivacySwapRequest = {
      id: uuidv4(),
      userId: userAddress,
      userAddress,
      depositTxHash: selectedDeposit.txHash,
      fromToken,
      toToken,
      amount,
      slippage,
      recipientAddress: recipientAddress || userAddress,
      phase: PrivacyFlowPhase.WITHDRAWING,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      proxyTxHashes: {},
      typhoonData: selectedDeposit.typhoonData
    };

    // Add to queue for processing
    transactionQueue.addRequest(swapRequest);

    routeLogger.info('Privacy swap initiated', {
      id: swapRequest.id,
      userAddress,
      fromToken,
      toToken,
      amount
    });

    res.json({
      status: 'success',
      swapId: swapRequest.id,
      message: 'Privacy swap initiated and queued for processing'
    });
  } catch (error) {
    next(error);
  }
});

// Get swap status
proxyRouter.get('/swap/:swapId', async (req: Request, res: Response, next: any) => {
  try {
    const { swapId } = req.params;
    const swap = transactionQueue.getRequestById(swapId);

    if (!swap) {
      throw new AppError('Swap not found', 404);
    }

    res.json({
      status: 'success',
      swap
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed swap status with phase breakdown
proxyRouter.get('/swap/:swapId/detailed', async (req: Request, res: Response, next: any) => {
  try {
    const { swapId } = req.params;
    const swap = transactionQueue.getRequestById(swapId);

    if (!swap) {
      throw new AppError('Swap not found', 404);
    }

    // Calculate phase details
    const phaseDetails = [
      {
        phase: 1,
        name: 'User Deposit',
        status: 'completed',
        transactionHash: swap.depositTxHash,
        description: 'User deposits tokens to Typhoon privacy pool'
      },
      {
        phase: 2,
        name: 'Proxy Withdrawal',
        status: getPhaseStatus(swap, PrivacyFlowPhase.WITHDRAWING),
        transactionHash: swap.proxyTxHashes?.withdrawal,
        description: 'Proxy wallet withdraws from Typhoon pool'
      },
      {
        phase: 3,
        name: 'Anonymous Swap',
        status: getPhaseStatus(swap, PrivacyFlowPhase.SWAPPING),
        transactionHash: swap.proxyTxHashes?.swap,
        description: 'Anonymous swap execution via AVNU DEX'
      },
      {
        phase: 4,
        name: 'Re-deposit',
        status: getPhaseStatus(swap, PrivacyFlowPhase.REDEPOSITING),
        transactionHash: swap.proxyTxHashes?.redeposit,
        description: 'Proxy re-deposits swapped tokens to Typhoon'
      },
      {
        phase: 5,
        name: 'Ready for Withdrawal',
        status: swap.phase === PrivacyFlowPhase.READY_TO_WITHDRAW ? 'completed' : 'pending',
        transactionHash: null,
        description: 'User can withdraw swapped tokens from Typhoon'
      }
    ];

    // Calculate overall progress
    const completedPhases = phaseDetails.filter(p => p.status === 'completed').length;
    const totalProgress = Math.round((completedPhases / phaseDetails.length) * 100);

    // Estimate completion time
    const startTime = swap.createdAt.getTime();
    const currentTime = Date.now();
    const avgPhaseTime = 2 * 60 * 1000; // 2 minutes per phase
    const remainingPhases = phaseDetails.filter(p => p.status === 'pending').length;
    const estimatedCompletion = currentTime + (remainingPhases * avgPhaseTime);

    const detailedStatus = {
      swapId: swap.id,
      currentPhase: getCurrentPhaseNumber(swap.phase),
      totalProgress,
      estimatedCompletion,
      phaseDetails,
      metadata: {
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        amount: swap.amount,
        slippage: swap.slippage,
        createdAt: swap.createdAt,
        retryCount: swap.retryCount,
        maxRetries: swap.maxRetries
      },
      error: swap.error
    };

    res.json({
      status: 'success',
      detailedStatus
    });
  } catch (error) {
    next(error);
  }
});

// Get user's active swaps
proxyRouter.get('/swaps/:userAddress', async (req: Request, res: Response, next: any) => {
  try {
    const { userAddress } = req.params;
    const swaps = transactionQueue.getUserRequests(userAddress);

    res.json({
      status: 'success',
      swaps
    });
  } catch (error) {
    next(error);
  }
});

// Get queue status
proxyRouter.get('/queue/status', async (req: Request, res: Response, next: any) => {
  try {
    const status = transactionQueue.getQueueStatus();

    res.json({
      status: 'success',
      queue: status
    });
  } catch (error) {
    next(error);
  }
});

// Get withdrawal transaction calls for user execution
proxyRouter.post('/withdrawal-calls', async (req: Request, res: Response, next: any) => {
  try {
    const {
      userAddress,
      tokenAddress,
      amount,
      recipientAddress,
      txHash,
      typhoonData
    } = req.body;

    if (!userAddress || !tokenAddress || !amount || !txHash || !typhoonData) {
      throw new AppError('Missing required parameters for withdrawal calls (need txHash)', 400);
    }

    const typhoonService = TyphoonSDKService.getInstance();

    // Generate withdrawal transaction calls using transaction hash
    const withdrawalCalls = await typhoonService.generateUserWithdrawalCalls(
      txHash,
      typhoonData,
      recipientAddress || userAddress
    );

    routeLogger.info('Withdrawal calls generated', {
      userAddress,
      tokenAddress,
      amount,
      recipientAddress,
      txHash,
      callsCount: withdrawalCalls.length
    });

    res.json({
      status: 'success',
      transactionCalls: withdrawalCalls
    });
  } catch (error) {
    next(error);
  }
});

// Execute withdrawal for user (legacy endpoint for direct backend execution)
proxyRouter.post('/withdraw', async (req: Request, res: Response, next: any) => {
  try {
    const {
      userAddress,
      tokenAddress,
      amount,
      recipientAddress,
      typhoonData
    } = req.body;

    if (!userAddress || !tokenAddress || !amount || !typhoonData) {
      throw new AppError('Missing required withdrawal parameters', 400);
    }

    const typhoonService = TyphoonSDKService.getInstance();

    // For now, we'll generate calls and return them for frontend execution
    // This maintains consistency with the privacy flow architecture
    const withdrawalCalls = await typhoonService.generateUserWithdrawalCalls(
      typhoonData,
      recipientAddress || userAddress
    );

    routeLogger.info('Withdrawal transaction prepared', {
      userAddress,
      tokenAddress,
      amount,
      recipientAddress
    });

    res.json({
      success: true,
      message: 'Withdrawal calls generated - execute on frontend',
      transactionCalls: withdrawalCalls
    });
  } catch (error) {
    routeLogger.error('Withdrawal failed', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Withdrawal failed'
    });
  }
});

// Subscribe to swap updates via SSE
proxyRouter.get('/swap/:swapId/stream', (req: Request, res: Response) => {
  const { swapId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendUpdate = (swap: PrivacySwapRequest) => {
    if (swap.id === swapId) {
      res.write(`data: ${JSON.stringify(swap)}\n\n`);
    }
  };

  // Send initial status
  const swap = transactionQueue.getRequestById(swapId);
  if (swap) {
    sendUpdate(swap);
  }

  // Listen for updates
  transactionQueue.on('phaseCompleted', sendUpdate);
  transactionQueue.on('phaseAdvanced', sendUpdate);
  transactionQueue.on('requestCompleted', sendUpdate);
  transactionQueue.on('requestFailed', sendUpdate);
  transactionQueue.on('requestRetrying', sendUpdate);

  // Clean up on disconnect
  req.on('close', () => {
    transactionQueue.removeListener('phaseCompleted', sendUpdate);
    transactionQueue.removeListener('phaseAdvanced', sendUpdate);
    transactionQueue.removeListener('requestCompleted', sendUpdate);
    transactionQueue.removeListener('requestFailed', sendUpdate);
    transactionQueue.removeListener('requestRetrying', sendUpdate);
  });
});