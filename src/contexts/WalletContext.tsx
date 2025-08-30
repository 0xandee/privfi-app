import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connect, disconnect } from '@starknet-io/get-starknet';

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  error: string | null;
  balance: string;
}

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    error: null,
    balance: '0.0000',
  });

  const connectWallet = async () => {
    try {
      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Add timeout to prevent infinite connecting state
      const connectPromise = connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 30000);
      });

      const starknet = await Promise.race([connectPromise, timeoutPromise]);
      console.log("starknet connection result:", starknet);

      if (starknet && typeof starknet === 'object') {
        // If wallet exists but is not connected, try to enable it
        if ('isConnected' in starknet && !starknet.isConnected && 'enable' in starknet) {
          console.log("Wallet found but not connected, attempting to enable...");
          try {
            await (starknet as { enable: () => Promise<void> }).enable();
          } catch (enableError) {
            console.error("Failed to enable wallet:", enableError);
          }
        }

        // Check connection status after potential enable
        const isConnected = 'isConnected' in starknet ? starknet.isConnected : false;
        const selectedAddress = 'selectedAddress' in starknet ? starknet.selectedAddress as string : null;
        const account = 'account' in starknet ? starknet.account : null;

        console.log("Final connection status:", { isConnected, selectedAddress, account });

        if (isConnected && (selectedAddress || account)) {
          const address = selectedAddress || (account && typeof account === 'object' && account !== null && 'address' in account ? (account as { address: string }).address : null);
          console.log("Wallet connected successfully, address:", address);

          setWalletState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            address,
            error: null,
          }));
        } else {
          // Connection attempt completed but wallet is not connected
          console.log("Connection attempt completed but wallet not connected");
          setWalletState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            error: 'Wallet connection was not established. Please try connecting again and make sure to approve the connection in your wallet.',
          }));
        }
      } else {
        console.log("No wallet found");
        setWalletState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: 'No wallet found. Please make sure your wallet extension is installed and try again.',
        }));
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setWalletState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setWalletState({
      isConnected: false,
      isConnecting: false,
      address: null,
      error: null,
      balance: '0.0000',
    });
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const starknet = await connect();
        if (starknet && typeof starknet === 'object' && 'isConnected' in starknet && starknet.isConnected) {
          const address = 'selectedAddress' in starknet ? starknet.selectedAddress as string : null;
          setWalletState(prev => ({
            ...prev,
            isConnected: true,
            address,
          }));
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();
  }, []);

  const contextValue: WalletContextType = {
    ...walletState,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};