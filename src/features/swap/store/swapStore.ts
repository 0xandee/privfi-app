import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Token, SwapQuote } from '@/shared/types';
import { STARKNET_TOKENS } from '@/constants/tokens';

interface SwapState {
  // Form state
  fromAmount: string;
  toAmount: string;
  fromToken: Token;
  toToken: Token;
  slippage: number;
  
  // Quote state
  quotes: SwapQuote[];
  selectedQuote: SwapQuote | null;
  isLoadingQuotes: boolean;
  quotesError: string | null;
  
  // Privacy configuration
  privacy: {
    recipientAddress: string;
    isEnabled: boolean; // Always true by default for private swaps
  };
  
  // Settings
  settings: {
    defaultSlippage: number;
    autoSelectBestQuote: boolean;
    refreshInterval: number;
  };
}

interface SwapActions {
  // Form actions
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;
  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;
  setSlippage: (slippage: number) => void;
  
  // Quote actions
  setQuotes: (quotes: SwapQuote[]) => void;
  setSelectedQuote: (quote: SwapQuote | null) => void;
  setQuotesLoading: (loading: boolean) => void;
  setQuotesError: (error: string | null) => void;
  
  // Privacy actions
  setRecipientAddress: (address: string) => void;
  setPrivacyEnabled: (enabled: boolean) => void;
  
  // Utility actions
  swapTokens: () => void;
  resetForm: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<SwapState['settings']>) => void;
}

type SwapStore = SwapState & SwapActions;

const initialState: SwapState = {
  fromAmount: '',
  toAmount: '',
  fromToken: STARKNET_TOKENS.ETH,
  toToken: STARKNET_TOKENS.STRK,
  slippage: 0.5,
  
  quotes: [],
  selectedQuote: null,
  isLoadingQuotes: false,
  quotesError: null,
  
  privacy: {
    recipientAddress: '',
    isEnabled: true, // Always enabled for private swaps
  },
  
  settings: {
    defaultSlippage: 0.5,
    autoSelectBestQuote: true,
    refreshInterval: 30000,
  },
};

export const useSwapStore = create<SwapStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Form actions
        setFromAmount: (amount) => set({ fromAmount: amount }),
        setToAmount: (amount) => set({ toAmount: amount }),
        setFromToken: (token) => set({ fromToken: token }),
        setToToken: (token) => set({ toToken: token }),
        setSlippage: (slippage) => set({ slippage }),
        
        // Quote actions
        setQuotes: (quotes) => set({ quotes }),
        setSelectedQuote: (quote) => set({ selectedQuote: quote }),
        setQuotesLoading: (loading) => set({ isLoadingQuotes: loading }),
        setQuotesError: (error) => set({ quotesError: error }),
        
        // Privacy actions
        setRecipientAddress: (address) => set((state) => ({
          privacy: { ...state.privacy, recipientAddress: address }
        })),
        setPrivacyEnabled: (enabled) => set((state) => ({
          privacy: { ...state.privacy, isEnabled: enabled }
        })),
        
        // Utility actions
        swapTokens: () => {
          const { fromToken, toToken, fromAmount, toAmount } = get();
          set({
            fromToken: toToken,
            toToken: fromToken,
            fromAmount: toAmount,
            toAmount: fromAmount,
          });
        },
        
        resetForm: () => set({
          fromAmount: '',
          toAmount: '',
          quotes: [],
          selectedQuote: null,
          quotesError: null,
        }),
        
        // Settings actions
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      }),
      {
        name: 'swap-store',
        partialize: (state) => ({
          fromToken: state.fromToken,
          toToken: state.toToken,
          slippage: state.slippage,
          privacy: state.privacy,
          settings: state.settings,
        }),
      }
    ),
    { name: 'swap' }
  )
);