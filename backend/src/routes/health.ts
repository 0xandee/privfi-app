import { Router } from 'express';
import { ProxyWalletManager } from '../services/ProxyWalletManager';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    const walletManager = ProxyWalletManager.getInstance();
    const walletStatus = await walletManager.getWalletStatus();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        storage: 'initialized',
        typhoon: 'initialized',
        avnu: 'ready'
      },
      config: {
        rpcUrl: process.env.STARKNET_RPC_URL,
        network: process.env.STARKNET_NETWORK,
        walletAddress: walletStatus.address
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});