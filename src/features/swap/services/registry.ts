import { DEXFactory, DEXProvider } from './dexFactory';
import { API_CONFIG } from '@/core/config';

// Import DEX implementations (will be created next)
const createAVNUService = async () => {
  const { AVNUService } = await import('./avnu');
  return new AVNUService();
};

// Future DEX implementations can be added here
// const createMySwapService = async () => {
//   const { MySwapService } = await import('./myswap');
//   return new MySwapService();
// };

export const initializeDEXFactory = (): DEXFactory => {
  const config = {
    defaultProvider: 'avnu' as DEXProvider,
    providers: {
      avnu: createAVNUService,
      // myswap: createMySwapService,
      // '10kswap': create10KSwapService,
    }
  };

  return DEXFactory.getInstance(config);
};

// Global instance
let dexFactory: DEXFactory;

export const getDEXFactory = (): DEXFactory => {
  if (!dexFactory) {
    dexFactory = initializeDEXFactory();
  }
  return dexFactory;
};

// Convenience functions
export const getDefaultDEX = () => getDEXFactory().getDefaultDEX();
export const getDEXProvider = (provider: DEXProvider) => getDEXFactory().getDEXProvider(provider);