# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses port 8080, accessible via IPv6)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

Note: This project uses Yarn 4.8.1 with PnP. All npm commands work via Yarn compatibility layer.

## Project Architecture

This is a React-based cryptocurrency swap application built with Vite and TypeScript, using shadcn/ui components for the interface.

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite with SWC plugin for fast compilation
- **UI Framework**: shadcn/ui (based on Radix UI primitives)
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Blockchain Integration**: StarkNet integration via `@starknet-react/core`, `@starknet-io/get-starknet`, and `starknet` packages

### Key Directory Structure
- `src/pages/` - Route-based page components (currently Index and NotFound)
- `src/components/` - Custom components organized by feature (swap/, wallet/, ui/)
- `src/components/ui/` - shadcn/ui component library
- `src/lib/` - Utility functions (primarily cn() for className merging)
- `src/hooks/` - Custom React hooks for wallet, swap forms, token prices, and validation
- `src/contexts/` - React contexts for state management (StarknetProvider)
- `src/services/` - External API integrations (AVNU DEX aggregator)
- `src/assets/` - Static assets including logo images

### Component Architecture
- **App.tsx** - Root component with providers (QueryClient, StarknetProvider, Tooltip, Toast, Router)
- **SwapInterface** - Main cryptocurrency swap interface with wallet connection and token swap functionality
- **StarknetProvider** - Provides StarkNet configuration with Argent and Braavos wallet connectors
- **useWalletConnection** - Custom hook managing wallet connection state and StarkNet React integration
- **UI Components** - Extensively uses shadcn/ui components for consistent design

### Import Aliases
- `@/` maps to `src/`
- `@/components` for components
- `@/lib` for utilities  
- `@/hooks` for custom hooks
- `@/components/ui` for UI components
- `@/contexts` for React contexts

### Styling System
- Uses Tailwind CSS with custom classes defined in `index.css`
- Custom CSS classes: `.crypto-card`, `.token-input`, `.token-selector`, `.percentage-button`, `.swap-button`
- Color system based on CSS variables with semantic naming
- Theme support via `next-themes` package with comprehensive dark/light mode tokens
- Custom design tokens for crypto-specific UI elements (percentage buttons, token selectors, transaction details)

### Development Notes
- ESLint configured with React and TypeScript rules
- `@typescript-eslint/no-unused-vars` is disabled
- Uses `lovable-tagger` for component tagging in development mode
- Server runs on `::` (IPv6 any address) for broader network access
- TypeScript configured with relaxed settings (no strict null checks, allows unused parameters)

### Wallet Integration
- Uses StarkNet React (`@starknet-react/core`) for primary wallet integration with Argent and Braavos connectors
- Falls back to `@starknet-io/get-starknet` for additional wallet support
- `useWalletConnection` hook provides connection state, address, balance, and error handling
- Includes comprehensive error states and debug logging for wallet connection flows
- Supports automatic connection checking on app load via StarknetConfig autoConnect

### Swap Functionality
- **AVNU Integration**: Uses AVNU DEX aggregator API for optimal swap routing and pricing
- **services/avnu.ts**: Handles quote fetching, best quote selection, and quote formatting
- **Integrator Configuration**: Configured with "Privfi" integrator name and 0.15% fees
- **Quote Management**: Supports expiry checking, price impact calculation, and multi-route aggregation
- **Token Price Extraction**: Extracts token prices from quotes for UI display with proper decimal handling

### Custom Hooks Architecture
- **useSwapForm**: Main form state management for swap interface
- **useSwapQuotes**: Handles quote fetching and management from AVNU
- **useInputValidation**: Validates swap amounts and token selections
- **useTokenBalance**: Manages token balance fetching and display
- **useTokenPrices**: Handles token price data and USD conversions
- **useWalletConnection**: Manages wallet connection state and StarkNet integration

### Package Management
- Project uses Yarn 4.8.1 as specified in package.json packageManager field
- All dependencies are managed through Yarn with PnP (Plug'n'Play) system