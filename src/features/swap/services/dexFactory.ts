import { DEXAggregatorInterface } from '../types';

export type DEXProvider = 'avnu' | 'myswap' | '10kswap';

export interface DEXFactoryConfig {
  defaultProvider: DEXProvider;
  providers: Record<DEXProvider, () => Promise<DEXAggregatorInterface>>;
}

export class DEXFactory {
  private static instance: DEXFactory;
  private config: DEXFactoryConfig;
  private providerCache = new Map<DEXProvider, DEXAggregatorInterface>();

  private constructor(config: DEXFactoryConfig) {
    this.config = config;
  }

  static getInstance(config?: DEXFactoryConfig): DEXFactory {
    if (!DEXFactory.instance) {
      if (!config) {
        throw new Error('DEXFactory must be initialized with config');
      }
      DEXFactory.instance = new DEXFactory(config);
    }
    return DEXFactory.instance;
  }

  async getDEXProvider(provider?: DEXProvider): Promise<DEXAggregatorInterface> {
    const selectedProvider = provider || this.config.defaultProvider;
    
    if (this.providerCache.has(selectedProvider)) {
      return this.providerCache.get(selectedProvider)!;
    }

    const providerFactory = this.config.providers[selectedProvider];
    if (!providerFactory) {
      throw new Error(`Unsupported DEX provider: ${selectedProvider}`);
    }

    const dexProvider = await providerFactory();
    this.providerCache.set(selectedProvider, dexProvider);
    
    return dexProvider;
  }

  async getDefaultDEX(): Promise<DEXAggregatorInterface> {
    return this.getDEXProvider();
  }

  getSupportedProviders(): DEXProvider[] {
    return Object.keys(this.config.providers) as DEXProvider[];
  }

  clearCache(): void {
    this.providerCache.clear();
  }
}