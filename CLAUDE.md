# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses port 8080, accessible via IPv6)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`
- **Run E2E tests**: `npx playwright test` (configured but no tests implemented yet - Playwright config expects server on port 8084, needs alignment with dev server port 8080)
- **Deploy to Vercel**: `vercel --prod` (requires Vercel CLI installed)

Note: This project uses Yarn 4.8.1 with PnP. All npm commands work via Yarn compatibility layer.

## Project Architecture

This is **Privfi** - a React-based private cryptocurrency swap application built with Vite and TypeScript, using shadcn/ui components. The project follows a **feature-based architecture** with clear module boundaries and centralized state management.

**Current Deployment**: https://privfi-app.vercel.app

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
│   │   ├── hooks/     # Swap-specific hooks
│   │   ├── services/  # DEX integrations & factory pattern
│   │   ├── store/     # Zustand store for swap state
│   │   ├── types/     # Swap-related TypeScript types
│   │   └── utils/     # Swap utilities (Typhoon storage, etc.)
│   ├── wallet/        # All wallet-related functionality
│   │   ├── components/ # Wallet UI components
│   │   ├── hooks/     # Wallet connection hooks
│   │   ├── store/     # Zustand store for wallet state
│   │   └── types/     # Wallet-related TypeScript types
│   └── deposit/       # Privacy-preserving deposit functionality
│       ├── components/ # Deposit UI components
│       ├── hooks/     # Deposit-specific hooks
│       ├── services/  # Typhoon integration & Supabase tracking
│       ├── store/     # Zustand store for deposit state
│       └── types/     # Deposit-related TypeScript types
├── shared/            # Shared across features
│   ├── components/ui/ # shadcn/ui component library
│   ├── hooks/        # Generic reusable hooks
│   ├── store/        # Global app state
│   ├── types/        # Common TypeScript types
│   └── utils/        # Utility functions and helpers
├── components/        # Shared layout components (Layout.tsx, etc.)
├── core/             # Core application infrastructure
│   ├── api/          # Base API configuration
│   ├── config/       # App configuration
│   ├── providers/    # Core React providers (StarknetProvider, RealtimeProvider)
│   └── supabase/     # Supabase client and database integration
├── constants/        # Application constants and enums
└── pages/            # Route-based page components
    ├── Index.tsx     # Main swap interface
    ├── Deposit.tsx   # Privacy deposit interface
    ├── HowItWorks.tsx# Educational content
    ├── Roadmap.tsx   # Project roadmap
    └── NotFound.tsx  # 404 error page
```

### State Management Architecture

**Zustand Stores with Persistence:**
- `features/swap/store/swapStore.ts` - Swap form state, quotes, settings with localStorage persistence
- `features/wallet/store/walletStore.ts` - Wallet connection state
- `features/deposit/store/depositStore.ts` - Deposit form state and privacy transaction tracking
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
- `@/features/swap` - All swap functionality
- `@/features/wallet` - All wallet functionality
- `@/features/deposit` - All deposit and privacy functionality
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

### Database & Real-time Integration
- **Supabase Client**: Configured for anonymous access with wallet address identification
- **Privacy-Preserving Deposit Tracking**: `deposits` table stores encrypted secrets, nullifiers, and pool data
- **Typhoon Data Storage**: Dedicated `typhoon_data` table for zk-SNARK proof metadata
- **Real-time Subscriptions**: Live deposit status updates via Supabase real-time
- **Row Level Security**: Anonymous users can read/write with validation in application layer
- **Environment Variables**: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Styling System
- **Tailwind CSS** with custom classes in `index.css`
- **Custom CSS classes**: `.crypto-card`, `.token-input`, `.token-selector`, `.percentage-button`, `.swap-button`
- **Theme System**: `next-themes` with comprehensive dark/light mode tokens
- **Design Tokens**: CSS variables for crypto-specific UI elements

### Development Configuration
- **ESLint**: React and TypeScript rules with `@typescript-eslint/no-unused-vars` disabled
- **Lovable Tagger**: Component tagging in development mode
- **Vite Server**: IPv6 (::) binding on port 8080 for broader network access
- **TypeScript**: Relaxed settings (no strict null checks, allows unused parameters)
- **Playwright**: E2E testing configuration for major browsers and mobile viewports (configured but `tests/` directory not yet created)
- **WASM Support**: Special CORS headers for `.wasm` and `.zkey` files during development

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.