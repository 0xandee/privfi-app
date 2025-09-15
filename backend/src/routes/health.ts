import { Router } from 'express';
import { ProxyWalletManager } from '../services/ProxyWalletManager';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        storage: 'initialized',
        typhoon: 'initialized',
        avnu: 'ready'
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