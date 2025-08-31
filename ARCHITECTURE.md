# Project Architecture

This document describes the refactored architecture of the Privfi swap application, which has been restructured to be more modular, scalable, and maintainable.

## 📁 Project Structure

```
src/
├── features/                    # Feature-based modules
│   ├── swap/                   # Swap functionality
│   │   ├── components/         # Swap UI components
│   │   ├── hooks/              # Swap-specific hooks
│   │   ├── services/           # DEX services & API calls
│   │   ├── store/              # Swap state management (Zustand)
│   │   ├── types/              # Swap domain types
│   │   └── index.ts            # Feature exports
│   └── wallet/                 # Wallet functionality
│       ├── components/         # Wallet UI components
│       ├── hooks/              # Wallet-specific hooks
│       ├── store/              # Wallet state management
│       ├── types/              # Wallet domain types
│       └── index.ts            # Feature exports
├── shared/                     # Shared utilities & components
│   ├── components/             # Reusable UI components (shadcn/ui)
│   ├── hooks/                  # Shared React hooks
│   ├── store/                  # Global app state
│   ├── utils/                  # Utility functions
│   └── types/                  # Common type definitions
├── core/                       # Core infrastructure
│   ├── api/                    # API clients & base classes
│   ├── config/                 # Configuration management
│   └── providers/              # React providers (StarkNet, etc.)
├── constants/                  # Application constants
├── assets/                     # Static assets
└── pages/                      # Route-based pages
```

## 🏗️ Architecture Principles

### 1. Feature-Based Organization
- Code is organized by business features rather than technical layers
- Each feature is self-contained and can be developed independently
- Features can be easily extracted into separate packages if needed

### 2. Separation of Concerns
- **Components**: UI presentation logic
- **Hooks**: Reusable stateful logic
- **Services**: External API interactions and business logic
- **Store**: State management using Zustand
- **Types**: Type definitions and interfaces

### 3. Dependency Flow
```
Pages → Features → Shared → Core
```
- Pages depend on Features
- Features can depend on Shared utilities
- Core provides foundational infrastructure
- No circular dependencies between layers

## 🔧 Core Infrastructure

### API Layer (`src/core/api/`)
- **Base API Client**: Common HTTP client with retry logic and error handling
- **Service Abstraction**: DEX aggregator interface for multiple providers
- **Factory Pattern**: Dynamic service instantiation

### Configuration (`src/core/config/`)
- Centralized configuration management
- Environment-specific settings
- API endpoints and integrator settings

### Providers (`src/core/providers/`)
- React context providers
- StarkNet blockchain integration
- Global state initialization

## 📊 State Management

### Global State (Zustand)
- **App Store**: Global app settings, theme, notifications
- **Feature Stores**: Feature-specific state (swap, wallet)
- **Persistence**: Automatic state persistence with selective storage

### State Architecture
```typescript
// Feature-specific stores
useSwapStore()    // Swap form state, quotes, settings
useWalletStore()  // Wallet connection, balance, settings
useAppStore()     // Global app settings, theme, debug
```

## 🧩 Feature Modules

### Swap Feature (`src/features/swap/`)
- **Components**: SwapCard, TokenInput, TransactionDetails, etc.
- **Services**: AVNU DEX aggregator, quote management
- **State**: Form state, quote caching, user preferences
- **Error Boundaries**: Swap-specific error handling

### Wallet Feature (`src/features/wallet/`)
- **Components**: Connection button, wallet modal, provider icons
- **Services**: Wallet connection abstraction
- **State**: Connection state, balance tracking
- **Error Boundaries**: Wallet-specific error handling

## 🛡️ Error Handling

### Error Boundary Strategy
- **Global Error Boundary**: Catches any unhandled errors
- **Feature Error Boundaries**: Feature-specific error handling
- **Development Mode**: Detailed error information and stack traces
- **Production Mode**: User-friendly error messages

### Error Types
```typescript
// Service-level errors
interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
}

// UI error states
interface AsyncState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: ErrorInfo | null;
}
```

## 🔌 Service Layer

### DEX Aggregator Interface
```typescript
interface DEXAggregatorInterface {
  getQuotes(request: QuoteRequest): Promise<QuoteResponse>;
  executeSwap(request: ExecuteSwapRequest): Promise<ExecuteSwapResponse>;
  getSupportedTokens(): Promise<Token[]>;
  isQuoteValid(quote: SwapQuote): boolean;
  getName(): string;
}
```

### Service Factory
- Dynamic provider loading
- Extensible architecture for new DEX integrations
- Caching and retry mechanisms

## 📦 Import Strategy

### Path Aliases
```typescript
// Feature imports
import { SwapInterface, useSwapStore } from '@/features/swap';
import { WalletModal, useWalletStore } from '@/features/wallet';

// Shared utilities
import { Button, ErrorBoundary } from '@/shared/components';
import { useTokenBalance } from '@/shared/hooks';

// Core infrastructure
import { ApiClient } from '@/core/api';
import { APP_CONFIG } from '@/core/config';
```

### Export Strategy
- Each module has a clean `index.ts` with organized exports
- Features export components, hooks, stores, and types
- Shared modules provide utilities and common functionality

## 🚀 Benefits

### 1. Scalability
- Easy to add new features (Portfolio, Lending, Governance)
- Modular architecture supports team scaling
- Clear boundaries prevent feature coupling

### 2. Maintainability
- Code organization follows domain boundaries
- Clear separation of concerns
- Consistent patterns across features

### 3. Testability
- Isolated feature modules
- Service abstractions for mocking
- Clear dependency injection points

### 4. Developer Experience
- Intuitive folder structure
- Strong TypeScript integration
- Consistent coding patterns

## 🔄 Migration Guide

### For New Features
1. Create feature directory: `src/features/newfeature/`
2. Set up standard structure: `components/`, `hooks/`, `services/`, `store/`, `types/`
3. Implement feature using existing patterns
4. Add error boundary and export index
5. Import and use in pages

### For Existing Code
1. Move components to appropriate feature modules
2. Update imports to use new paths
3. Extract shared utilities to `src/shared/`
4. Convert to Zustand stores if needed
5. Add error boundaries and proper exports

## 🛠️ Development Guidelines

### 1. Code Organization
- One feature per directory
- Related files stay together
- Clear separation of UI and business logic

### 2. State Management
- Use Zustand for complex state
- Local state for UI-only concerns
- Persist important user preferences

### 3. Error Handling
- Always use error boundaries
- Provide meaningful error messages
- Log errors for debugging

### 4. TypeScript
- Strong typing throughout
- Shared types in appropriate modules
- Interface segregation principle

This architecture provides a solid foundation for scaling the application while maintaining code quality and developer productivity.