# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses port 8080, accessible via IPv6)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`
- **Run E2E tests**: `npx playwright test` (tests expect server on port 8084, automatically starts dev server via `webServer` config)
- **Deploy to Vercel**: `vercel --prod` (requires Vercel CLI installed)

### Backend Development Commands (Privacy Server)

- **Start backend dev server**: `cd backend && npm run dev` (runs on port 3001 with hot reload)
- **Build backend**: `cd backend && npm run build`
- **Start backend production**: `cd backend && npm start`
- **Backend setup**: Copy `backend/.env.example` to `backend/.env` and configure proxy wallet settings
- **Test backend**: `cd backend && npm test` (currently placeholder)

Note: This project uses Yarn 4.8.1 with PnP. All npm commands work via Yarn compatibility layer.

## Project Architecture

This is **Privfi** - a React-based private cryptocurrency swap application built with Vite and TypeScript, using shadcn/ui components. The project follows a **feature-based architecture** with clear module boundaries and centralized state management. Includes a **backend privacy server** for enhanced privacy swaps through proxy wallet execution.

**Current Deployment**: https://privfi-app.vercel.app
**Backend Service**: Node.js/Express server for Phase III enhanced privacy features

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite with SWC plugin for fast compilation
- **UI Framework**: shadcn/ui (based on Radix UI primitives)
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Routing**: React Router v6
- **State Management**: Zustand stores with persistence + React Query (TanStack Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Blockchain Integration**: StarkNet integration via `@starknet-react/core`, `@starknet-io/get-starknet`, and `starknet` packages
- **Testing**: Playwright for E2E testing

### Feature-Based Architecture

The codebase is organized by features rather than technical layers:

```
src/
├── features/           # Feature modules
│   ├── swap/          # All swap-related functionality
│   │   ├── components/ # Swap UI components
│   │   ├── hooks/     # Swap-specific hooks (includes usePrivacySwapExecution.ts)
│   │   ├── services/  # DEX integrations & factory pattern
│   │   ├── store/     # Zustand store for swap state
│   │   ├── types/     # Swap-related TypeScript types
│   │   └── utils/     # Swap utilities (Typhoon storage, etc.)
│   ├── wallet/        # All wallet-related functionality
│   │   ├── components/ # Wallet UI components
│   │   ├── hooks/     # Wallet connection hooks
│   │   ├── store/     # Zustand store for wallet state
│   │   └── types/     # Wallet-related TypeScript types
│   ├── withdraw/      # All withdraw-related functionality
│   │   ├── components/ # Withdraw UI components
│   │   ├── hooks/     # Withdraw-specific hooks
│   │   ├── services/  # Withdraw service implementations
│   │   ├── store/     # Zustand store for withdraw state
│   │   └── types/     # Withdraw-related TypeScript types
│   ├── verification/  # Token verification features
│   │   ├── components/ # Verification UI components
│   │   ├── hooks/     # Verification hooks
│   │   └── types/     # Verification types
│   └── privacy/       # Enhanced privacy features (Phase III)
│       ├── components/ # PrivacyModeToggle, PrivacySwapProgress, PrivacyDepositBalance
│       ├── hooks/     # usePrivacySwap.ts for privacy flow execution
│       ├── services/  # PrivacyFlowOrchestrator.ts for 5-phase privacy swaps
│       └── store/     # privacyStore.ts for privacy mode state
├── shared/            # Shared across features
│   ├── components/ui/ # shadcn/ui component library
│   ├── hooks/        # Generic reusable hooks
│   ├── store/        # Global app state
│   ├── types/        # Common TypeScript types
│   └── utils/        # Utility functions and helpers
├── core/             # Core application infrastructure
│   ├── api/          # Base API configuration
│   ├── config/       # App configuration
│   └── providers/    # Core React providers (StarknetProvider)
└── pages/            # Route-based page components
```

### State Management Architecture

**Zustand Stores with Persistence:**
- `features/swap/store/swapStore.ts` - Swap form state, quotes, settings with localStorage persistence
- `features/wallet/store/walletStore.ts` - Wallet connection state
- `features/withdraw/store/withdrawStore.ts` - Withdraw form state and transaction management
- `features/privacy/store/privacyStore.ts` - Privacy mode state and enhanced privacy flow management
- `shared/store/appStore.ts` - Global application state

**React Query:** Server state management for API calls and caching

### Service Layer Architecture

**Factory Pattern for DEX Integration:**
- `DEXFactory` - Manages multiple DEX providers with lazy loading
- `BaseDEX` - Abstract base class defining DEX interface
- `AVNUService` - AVNU DEX aggregator implementation
- `TyphoonService` - Privacy-focused DEX with zk-SNARK technology
- Registry pattern supports easy addition of new DEX providers (MySwap, 10KSwap)

### Import Path Strategy

Modular imports through feature boundaries:
- `@/features/swap` - All swap functionality (includes privacy swap execution hooks)
- `@/features/wallet` - All wallet functionality
- `@/features/withdraw` - All withdraw functionality
- `@/features/verification` - Token verification features
- `@/features/privacy` - Enhanced privacy features (Phase III implementation)
- `@/shared` - Shared utilities, components, types
- `@/core` - Core infrastructure

Each feature module exports through index files for clean API boundaries.

### Component Architecture
- **App.tsx** - Root with providers (QueryClient, StarknetProvider, Tooltip, Toast, Router)
- **Feature Error Boundaries** - `SwapErrorBoundary`, `WalletErrorBoundary` prevent app-wide crashes
- **Modular Components** - Each feature owns its components, shared UI in `/shared/components/ui`

### Development Patterns

**State Management:**
- Feature stores for feature-specific state with persistence
- React Query for server state and caching
- Hooks abstract store usage from components

**Error Handling:**
- Feature-specific error boundaries
- Comprehensive error states in hooks
- Debug logging for development

**Code Organization:**
- Features are self-contained modules
- Clear separation between business logic and UI
- Shared code lives in `/shared` with generic utilities

### Blockchain Integration
- **StarkNet React** (`@starknet-react/core`) for primary wallet integration
- **Wallet Connectors**: Argent and Braavos with fallback support
- **AVNU DEX Aggregator**: Optimal swap routing with "Privfi" integrator (0.15% fees)
- **Typhoon Privacy Protocol**: zk-SNARK based private transactions with SDK integration
- **Quote Management**: Expiry checking, price impact calculation, multi-route aggregation
- **Privacy Features**: Private swaps and withdrawals with note commitment/nullifier system
- **Enhanced Privacy (Phase III)**: 5-phase privacy flow with proxy wallet execution for complete transaction unlinkability

### Styling System
- **Tailwind CSS** with custom classes in `index.css`
- **Custom CSS classes**: `.crypto-card`, `.token-input`, `.token-selector`, `.percentage-button`, `.swap-button`
- **Theme System**: `next-themes` with comprehensive dark/light mode tokens
- **Design Tokens**: CSS variables for crypto-specific UI elements

### Development Configuration
- **ESLint**: React and TypeScript rules with `@typescript-eslint/no-unused-vars` disabled
- **Lovable Tagger**: Component tagging in development mode
- **Vite Server**: IPv6 (::) binding for broader network access, port 8080 for dev, 8084 for tests
- **TypeScript**: Relaxed settings (no strict null checks, allows unused parameters)
- **Playwright**: E2E testing configuration for major browsers and mobile viewports
- **Test Configuration**: Automatic dev server startup via `webServer` config in `playwright.config.ts`

### Package Management
- **Yarn 4.8.1** with PnP (Plug'n'Play) system
- npm commands work through Yarn compatibility layer
- Package manager enforced via `packageManager` field in package.json

### Deployment Configuration
- **Vercel**: Configured with `vercel.json` for production deployment
- **WASM Support**: Special headers configured for `.wasm` and `.zkey` files required by Typhoon SDK
- **Environment Variables**: `VITE_DISABLE_TYPHOON` controls Typhoon SDK integration
- **Build Output**: Static files served from `dist/` directory
- **Custom Domain**: https://privfi-app.vercel.app

### WASM and Cryptographic Assets
- Large WASM files in `public/wasm/` for zero-knowledge proof generation
- Files include `deposit.wasm`, `withdraw.wasm`, and `withdraw_0001.zkey` (~46MB)
- Requires specific CORS headers: `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`

## Backend Architecture (Enhanced Privacy System)

### Backend Service Structure
Located in `/backend` directory, the privacy server enables Phase III enhanced privacy features:

```
backend/
├── src/
│   ├── index.ts              # Express server setup and main entry point
│   ├── routes/               # API routes
│   │   ├── proxy.ts         # Privacy swap endpoints (POST /api/proxy/swap, etc.)
│   │   └── health.ts        # Health check endpoint
│   ├── services/            # Core privacy services
│   │   ├── ProxyWalletManager.ts      # Hot wallet management with private key storage
│   │   ├── TransactionQueue.ts        # FIFO queue with retry logic
│   │   ├── PrivacyDepositManager.ts   # Typhoon deposit tracking and selection
│   │   └── ProxyExecutor.ts           # Handles withdrawals, swaps, and re-deposits
│   ├── types/               # TypeScript type definitions
│   ├── middleware/          # Express middleware
│   └── utils/              # Utility functions
├── .env                    # Environment variables (proxy wallet config)
├── .env.example           # Environment template
├── tsconfig.json         # TypeScript configuration
└── package.json         # Backend dependencies
```

### Enhanced Privacy Flow (Phase III)

**5-Phase Privacy Architecture:**
1. **Phase 1 - Depositing**: User deposits tokens to Typhoon (client-side)
2. **Phase 2 - Withdrawing**: Proxy wallet withdraws from Typhoon
3. **Phase 3 - Swapping**: Proxy executes swap via AVNU
4. **Phase 4 - Re-depositing**: Proxy re-deposits swapped tokens to Typhoon
5. **Phase 5 - Ready to Withdraw**: User withdraws from Typhoon (client-side)

**Key Privacy Benefits:**
- Complete transaction unlinkability between user and DEX
- Proxy wallet serves as intermediary with no connection to user identity
- Sequential processing prevents nonce conflicts
- Hot wallet approach with ETH pre-funding for gas fees

### Backend Configuration Requirements

**Essential Environment Variables:**
- `PROXY_WALLET_ADDRESS` - Proxy wallet address for privacy operations
- `PROXY_WALLET_PRIVATE_KEY` - Private key (secure storage required)
- `TYPHOON_CONTRACT_ADDRESS` - Typhoon protocol contract address
- `STARKNET_RPC_URL` - StarkNet RPC endpoint (optional, defaults to public)
- `MIN_ETH_BALANCE` - Minimum ETH balance threshold (default: 0.01)

### Backend API Endpoints

- `POST /api/proxy/swap` - Initiate privacy swap execution
- `GET /api/proxy/swap/:swapId` - Get swap status and progress
- `GET /api/proxy/swaps/:userAddress` - Get user's active swaps
- `GET /api/proxy/swap/:swapId/stream` - SSE stream for real-time updates
- `POST /api/proxy/deposits` - Track new Typhoon deposits
- `GET /api/proxy/deposits/:userAddress` - Get user's deposits
- `GET /api/proxy/balance/:userAddress/:tokenAddress` - Get total shielded balance
- `GET /api/proxy/queue/status` - Transaction queue status
- `GET /api/health` - Health check endpoint

### Integration Between Frontend and Backend

**Frontend Privacy Components:**
- `PrivacyModeToggle` - Enables/disables enhanced privacy mode
- `PrivacySwapProgress` - Shows 5-phase progress tracking
- `PrivacyDepositBalance` - Displays total shielded balances
- `usePrivacySwap` hook - Manages privacy swap execution
- `usePrivacySwapExecution` hook - Coordinates with privacy store

**Privacy Flow Coordination:**
- Frontend initiates privacy swaps via backend API
- Real-time progress updates through SSE streams
- Frontend handles Phases 1 and 5 (user Typhoon interactions)
- Backend handles Phases 2-4 (proxy wallet operations)
- State synchronization between frontend privacy store and backend queue

## Development Workflow Patterns

### Feature Development Approach
- **Feature-First**: Organize code by business feature, not technical layer
- **Store per Feature**: Each feature maintains its own Zustand store with persistence
- **Service Layer**: Abstract external API interactions behind service interfaces
- **Error Boundaries**: Implement feature-specific error boundaries to prevent app-wide crashes

### State Management Best Practices
- **Client State**: Use Zustand stores with localStorage persistence for user preferences and form state
- **Server State**: Use React Query for API calls, caching, and synchronization
- **Privacy State**: Enhanced privacy flows require careful state management across frontend/backend boundary

### Key File Locations
- **Main App Entry**: `src/App.tsx` - Root component with all providers
- **Routing**: `src/pages/` - Route-based page components
- **Privacy Flow**: `src/features/privacy/services/PrivacyFlowOrchestrator.ts` - Core privacy logic
- **DEX Integration**: `src/features/swap/services/DEXFactory.ts` - Multi-DEX support
- **Backend Entry**: `backend/src/index.ts` - Express server for privacy services

### Important Configuration Files
- **Vite Config**: `vite.config.ts` - Build configuration with WASM support
- **TypeScript**: `tsconfig.json` - Relaxed TypeScript settings for rapid development
- **Tailwind**: `tailwind.config.ts` - Custom theme and crypto-specific styling
- **Playwright**: `playwright.config.ts` - E2E testing configuration
- **Vercel**: `vercel.json` - Deployment configuration with WASM headers

### Debugging Privacy Flows
- **Browser DevTools**: Privacy flows involve multiple async phases, use browser DevTools Network tab
- **Backend Logs**: Check backend console for proxy wallet operations and queue status
- **Typhoon SDK**: Large WASM files may cause loading delays, check browser console for WASM errors
- **State Inspection**: Use Redux DevTools extension to inspect Zustand store state changes

### Integration Points
- **Typhoon SDK**: Requires WASM files in `public/wasm/` and specific CORS headers
- **AVNU API**: Route optimization through DEX aggregator with "Privfi" integrator identifier
- **StarkNet**: Wallet connectivity via `@starknet-react/core` with Argent/Braavos connectors
- **Proxy Wallet**: Backend service requires `PROXY_WALLET_PRIVATE_KEY` environment variable

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.