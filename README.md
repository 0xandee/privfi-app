# Privfi - Private Cryptocurrency Swapping Application

**Privfi** is a cutting-edge React-based private cryptocurrency swap application that combines the power of decentralized exchange aggregation with privacy-preserving technology. Built with modern web technologies and integrated with StarkNet blockchain, Privfi offers users the ability to perform anonymous, secure cryptocurrency swaps.

🌐 **Live Application**: https://privfi-app.vercel.app

## ✨ Key Features

### 🔒 Privacy-First Design

-   **Typhoon Protocol Integration** - Zero-knowledge proof-based private transactions using zk-SNARKs
-   **Anonymous Swaps** - Complete transaction privacy with note commitment/nullifier system
-   **Secure Withdrawals** - Privacy-preserving withdrawal mechanisms

### 💱 Advanced DEX Integration

-   **AVNU DEX Aggregator** - Optimal swap routing with "Privfi" integrator (0.15% fees)
-   **Multi-DEX Support** - Factory pattern architecture supporting multiple DEX providers
-   **Real-time Quotes** - Live pricing with expiry checking and price impact calculations

### 🎨 Modern User Interface

-   **Responsive Design** - Mobile-first approach with beautiful animations
-   **Dark/Light Themes** - Comprehensive theming with `next-themes`
-   **Intuitive UX** - Clean, crypto-focused interface with custom CSS classes
-   **Educational Pages** - Comprehensive How It Works guide and project Roadmap

## 🚀 Technology Stack

### Frontend Architecture

-   **React 18** with TypeScript for type-safe development
-   **Vite** with SWC plugin for lightning-fast builds and hot-reload
-   **shadcn/ui** component library built on Radix UI primitives
-   **Tailwind CSS** with custom design tokens and CSS variables
-   **React Router v6** for client-side navigation

### State Management

-   **Zustand** stores with localStorage persistence for client state
-   **TanStack Query (React Query)** for server state management and caching
-   **React Hook Form** with Zod validation for form handling

### Blockchain Integration

-   **StarkNet React** (`@starknet-react/core`) for wallet connectivity
-   **Wallet Support** - Argent and Braavos connectors with fallback mechanisms
-   **Web3 Integration** - Complete StarkNet ecosystem support

### Privacy Technology

-   **Typhoon SDK** - zk-SNARK proof generation for private transactions
-   **WASM Support** - Large cryptographic files (~46MB) for zero-knowledge proofs
-   **Advanced Cryptography** - Commitment/nullifier schemes for transaction privacy

## 📁 Project Architecture

Privfi follows a **feature-based architecture** with clear module boundaries:

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
│   └── withdraw/      # All withdraw-related functionality
├── shared/            # Shared across features
│   ├── components/ui/ # shadcn/ui component library
│   ├── hooks/        # Generic reusable hooks
│   ├── store/        # Global app state
│   ├── types/        # Common TypeScript types
│   └── utils/        # Utility functions and helpers
├── core/             # Core application infrastructure
│   ├── api/          # Base API configuration
│   ├── config/       # App configuration
│   └── providers/    # Core React providers
├── components/       # Shared layout components (Layout.tsx)
└── pages/            # Route-based page components
    ├── Index.tsx     # Main swap interface page
    ├── HowItWorks.tsx # Educational guide explaining swap flows
    ├── Roadmap.tsx   # Project roadmap and upcoming features
    └── NotFound.tsx  # 404 error page
```

## 🛠️ Development Setup

### Prerequisites

-   **Node.js** (v18+) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
-   **Yarn 4.8.1** with PnP (Plug'n'Play) system

### Installation

```bash
# Clone the repository
git clone https://github.com/0xandee/privfi-app.git

# Navigate to project directory
cd privfi-app

# Install dependencies (uses Yarn 4.8.1 with PnP)
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev          # Start dev server (port 8080, IPv6 accessible)
npm run build:dev    # Build for development

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Lint code with ESLint

# Testing
npx playwright test  # Run E2E tests (expects server on port 8084)

# Deployment
vercel --prod       # Deploy to Vercel (requires Vercel CLI)
```

## 🔧 Configuration

### Environment Variables

-   `VITE_DISABLE_TYPHOON` - Controls Typhoon SDK integration

### Package Management

-   Uses **Yarn 4.8.1** with PnP system
-   npm commands work through Yarn compatibility layer
-   Package manager enforced via `packageManager` field in package.json

### Deployment Configuration

-   **Vercel** deployment with `vercel.json` configuration
-   **WASM Support** with special CORS headers for `.wasm` and `.zkey` files
-   **Custom Domain** support with HTTPS

## 🎯 Key Components

### Service Layer (Factory Pattern)

-   `DEXFactory` - Manages multiple DEX providers with lazy loading
-   `BaseDEX` - Abstract base class defining DEX interface
-   `AVNUService` - AVNU DEX aggregator implementation
-   `TyphoonService` - Privacy-focused DEX with zk-SNARK technology

### State Management

-   `features/swap/store/swapStore.ts` - Swap state with persistence
-   `features/wallet/store/walletStore.ts` - Wallet connection state
-   `features/withdraw/store/withdrawStore.ts` - Withdraw transaction state
-   `shared/store/appStore.ts` - Global application state

### UI Components

-   Feature-specific error boundaries prevent app-wide crashes
-   Modular component architecture with clean separation
-   Custom CSS classes for crypto-specific styling
-   Consistent navigation layout with responsive header design

### Page Structure

-   **Main Swap Page** (`/`) - Primary swap interface with wallet connectivity
-   **How It Works** (`/how-it-works`) - Detailed explanation of regular vs private swap flows
-   **Roadmap** (`/roadmap`) - Project development roadmap and upcoming features

## 🚀 Deployment

The application is deployed on **Vercel** with:

-   Automatic deployments from main branch
-   WASM file support with proper CORS headers
-   Custom domain configuration
-   Environment variable management

**Production URL**: https://privfi-app.vercel.app

## 🔐 Security Features

-   **Privacy-Preserving Swaps** - Complete transaction anonymity
-   **Secure Wallet Integration** - Safe connection patterns
-   **Error Boundaries** - Graceful error handling
-   **Type Safety** - Full TypeScript coverage
-   **Input Validation** - Comprehensive form validation with Zod

## 📊 Performance

-   **Fast Builds** - Vite with SWC for optimal build performance
-   **Code Splitting** - Automatic route-based code splitting
-   **Lazy Loading** - Component and service lazy loading
-   **Optimized Assets** - Efficient asset bundling and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏗️ Attribution

This frontend was forked from https://www.train.tech/ and adapted for private cryptocurrency swapping functionality.

## 🔗 Links

-   **Live App**: https://privfi-app.vercel.app
-   **Repository**: https://github.com/0xandee/privfi-app
-   **Documentation**: See `CLAUDE.md` for detailed technical documentation

---

Built with ❤️ for the future of private DeFi
