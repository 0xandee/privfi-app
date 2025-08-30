# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on port 8080)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

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
- **Blockchain Integration**: StarkNet integration via `@starknet-io/get-starknet` and `starknet` packages

### Key Directory Structure
- `src/pages/` - Route-based page components (currently Index and NotFound)
- `src/components/` - Custom components (SwapInterface is the main UI)
- `src/components/ui/` - shadcn/ui component library
- `src/lib/` - Utility functions (primarily cn() for className merging)
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React contexts for state management (WalletContext)
- `src/assets/` - Static assets including logo images

### Component Architecture
- **App.tsx** - Root component with providers (QueryClient, WalletProvider, Tooltip, Toast, Router)
- **SwapInterface** - Main cryptocurrency swap interface with wallet connection and token swap functionality
- **WalletContext** - Provides StarkNet wallet connection state and functions throughout the app
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
- Uses StarkNet wallet connection via `@starknet-io/get-starknet`
- WalletContext provides connection state, address, balance, and error handling
- Includes timeout handling and comprehensive error states for wallet connection flows
- Supports automatic connection checking on app load

### Package Management
- Project uses Yarn 4.8.1 as specified in package.json packageManager field
- All dependencies are managed through Yarn with PnP (Plug'n'Play) system