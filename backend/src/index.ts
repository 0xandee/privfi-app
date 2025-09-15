import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { proxyRouter } from './routes/proxy';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { ProxyWalletManager } from './services/ProxyWalletManager';
import { TransactionQueue } from './services/TransactionQueue';
import { TyphoonSDKService } from './services/TyphoonSDKService';
import { AVNUService } from './services/AVNUService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Serve WASM files with correct headers for Typhoon SDK
app.use('/wasm', express.static('public/wasm', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    if (path.endsWith('.zkey')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
  }
}));

// Initialize services
const proxyWalletManager = ProxyWalletManager.getInstance();
const typhoonService = TyphoonSDKService.getInstance();
const avnuService = AVNUService.getInstance();
const transactionQueue = TransactionQueue.getInstance();

// Routes
app.use('/api/health', healthRouter);
app.use('/api/proxy', proxyRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, '127.0.0.1', () => {
  logger.info(`Privacy proxy server running on port ${PORT}`);

  // Initialize services in background, don't block the server
  (async () => {
    try {
      await typhoonService.initialize();
      logger.info('Typhoon service initialized');

      // Initialize wallet manager with timeout
      const walletInitPromise = proxyWalletManager.initialize();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wallet initialization timeout')), 10000)
      );

      await Promise.race([walletInitPromise, timeoutPromise]);
      logger.info('Wallet manager initialized');

      // Start transaction queue processor
      transactionQueue.startProcessing();
      logger.info('All services initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize services:', err);
      // Don't exit, let server run without full initialization
    }
  })();
});