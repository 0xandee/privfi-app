import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string;
  
  // UI state
  showWalletModal: boolean;
  
  // Wallet info
  connectedWallet: {
    name: string;
    icon?: string;
  } | null;
  
  // Error state
  connectionError: string | null;
  
  // Settings
  settings: {
    autoConnect: boolean;
    preferredWallet: string | null;
  };
}

interface WalletActions {
  // Connection actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setAddress: (address: string | null) => void;
  setBalance: (balance: string) => void;
  
  // UI actions
  setShowWalletModal: (show: boolean) => void;
  
  // Wallet info actions
  setConnectedWallet: (wallet: WalletState['connectedWallet']) => void;
  
  // Error actions
  setConnectionError: (error: string | null) => void;
  
  // Utility actions
  disconnect: () => void;
  reset: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<WalletState['settings']>) => void;
}

type WalletStore = WalletState & WalletActions;

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  balance: '0',
  
  showWalletModal: false,
  
  connectedWallet: null,
  connectionError: null,
  
  settings: {
    autoConnect: true,
    preferredWallet: null,
  },
};

export const useWalletStore = create<WalletStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // Connection actions
        setConnected: (connected) => set({ isConnected: connected }),
        setConnecting: (connecting) => set({ isConnecting: connecting }),
        setAddress: (address) => set({ address }),
        setBalance: (balance) => set({ balance }),
        
        // UI actions
        setShowWalletModal: (show) => set({ showWalletModal: show }),
        
        // Wallet info actions
        setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
        
        // Error actions
        setConnectionError: (error) => set({ connectionError: error }),
        
        // Utility actions
        disconnect: () => set({
          isConnected: false,
          address: null,
          balance: '0',
          connectedWallet: null,
          connectionError: null,
        }),
        
        reset: () => set(initialState),
        
        // Settings actions
        updateSettings: (newSettings) => set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      }),
      {
        name: 'wallet-store',
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    { name: 'wallet' }
  )
);