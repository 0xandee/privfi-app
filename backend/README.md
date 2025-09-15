# PrivFi Privacy Backend

Backend service for managing privacy-enhanced swaps through proxy wallet execution.

## Overview

This backend provides the proxy wallet infrastructure for PrivFi's enhanced privacy mode, enabling users to perform swaps without direct on-chain linkage between their wallet and the DEX.

## Architecture

### 5-Phase Privacy Flow

1. **Phase 1 - Depositing**: User deposits tokens to Typhoon (handled client-side)
2. **Phase 2 - Withdrawing**: Proxy wallet withdraws from Typhoon
3. **Phase 3 - Swapping**: Proxy executes swap via AVNU
4. **Phase 4 - Re-depositing**: Proxy re-deposits swapped tokens to Typhoon
5. **Phase 5 - Ready to Withdraw**: User can withdraw from Typhoon (handled client-side)

### Key Components

- **ProxyWalletManager**: Manages hot wallet with private key storage
- **TransactionQueue**: FIFO queue with automatic retry logic
- **PrivacyDepositManager**: Tracks and optimally selects Typhoon deposits
- **ProxyExecutor**: Handles Typhoon withdrawals, AVNU swaps, and re-deposits

## Setup

### Prerequisites

- Node.js 18+ and npm
- StarkNet mainnet RPC endpoint
- Proxy wallet with ETH for gas fees

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` file with your settings:

```env
# REQUIRED: Proxy Wallet Configuration
PROXY_WALLET_ADDRESS=0x... # Your proxy wallet address
PROXY_WALLET_PRIVATE_KEY=0x... # Private key (keep secure!)

# REQUIRED: Typhoon Contract
TYPHOON_CONTRACT_ADDRESS=0x... # Typhoon protocol contract address

# Optional: StarkNet RPC (defaults to public endpoint)
STARKNET_RPC_URL=https://starknet-mainnet.infura.io/v3/YOUR_KEY

# Optional: Adjust gas thresholds
MIN_ETH_BALANCE=0.01 # Minimum ETH balance for operations
ALERT_ETH_THRESHOLD=0.0005 # Alert when balance drops below this
```

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

Server runs on `http://localhost:3001` by default.

## API Endpoints

### Health Check
```
GET /api/health
```

### Deposit Management
```
POST /api/proxy/deposits - Track new Typhoon deposit
GET /api/proxy/deposits/:userAddress - Get user's deposits
GET /api/proxy/balance/:userAddress/:tokenAddress - Get total shielded balance
```

### Privacy Swaps
```
POST /api/proxy/swap - Initiate privacy swap
GET /api/proxy/swap/:swapId - Get swap status
GET /api/proxy/swaps/:userAddress - Get user's active swaps
GET /api/proxy/swap/:swapId/stream - SSE stream for real-time updates
```

### Queue Status
```
GET /api/proxy/queue/status - Get transaction queue status
```

## Security Considerations

1. **Private Key Storage**:
   - Store `PROXY_WALLET_PRIVATE_KEY` securely
   - Use environment variables, never commit to git
   - Consider using key management services in production

2. **ETH Balance Monitoring**:
   - Monitor proxy wallet ETH balance regularly
   - Automatic alerts when balance is low
   - Pre-fund wallet before operations

3. **Transaction Queue**:
   - Sequential processing prevents nonce conflicts
   - Automatic retry with exponential backoff
   - Fund recovery on failures

## Testing

### Test Privacy Swap Flow

1. Start the backend server:
```bash
npm run dev
```

2. Start the frontend (in main project directory):
```bash
npm run dev
```

3. Test flow:
   - Connect wallet on frontend
   - Enable "Enhanced Privacy Mode"
   - Perform a swap
   - Monitor progress through 5 phases
   - Verify completion

### Monitor Logs

Backend logs show detailed phase transitions:
```
[INFO] [TransactionQueue] Processing request | phase: withdrawing
[INFO] [ProxyExecutor] Withdrawing from Typhoon
[INFO] [TransactionQueue] Advanced to next phase | phase: swapping
[INFO] [ProxyExecutor] Executing AVNU swap
...
```

## Troubleshooting

### Common Issues

1. **"Proxy wallet not initialized"**
   - Ensure `PROXY_WALLET_ADDRESS` and `PROXY_WALLET_PRIVATE_KEY` are set

2. **"Low ETH balance" warnings**
   - Fund proxy wallet with ETH for gas fees

3. **CORS errors from frontend**
   - Check `CORS_ORIGIN` includes your frontend URL

4. **Transaction failures**
   - Check proxy wallet has sufficient ETH
   - Verify Typhoon contract address is correct
   - Ensure StarkNet RPC is accessible

## Production Deployment

### Recommendations

1. Use secure key management (AWS KMS, HashiCorp Vault)
2. Implement rate limiting
3. Add comprehensive monitoring and alerting
4. Use production RPC endpoints with higher rate limits
5. Implement database for persistent state (currently in-memory)
6. Add authentication for API endpoints
7. Set up automatic ETH balance top-up

## Development

### Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express server setup
│   ├── routes/               # API routes
│   │   ├── proxy.ts         # Privacy swap endpoints
│   │   └── health.ts        # Health check
│   ├── services/            # Core services
│   │   ├── ProxyWalletManager.ts
│   │   ├── TransactionQueue.ts
│   │   ├── PrivacyDepositManager.ts
│   │   └── ProxyExecutor.ts
│   ├── types/               # TypeScript types
│   ├── middleware/          # Express middleware
│   └── utils/              # Utilities
├── .env                    # Environment variables
├── .env.example           # Environment template
├── tsconfig.json         # TypeScript config
└── package.json         # Dependencies
```

### Adding New Features

1. Implement service in `src/services/`
2. Add routes in `src/routes/`
3. Update types in `src/types/`
4. Add tests (when implemented)

## License

Part of the PrivFi project.