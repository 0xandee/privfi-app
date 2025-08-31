import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { connect as getStarknetConnect } from '@starknet-io/get-starknet';

export const useWalletConnection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, status } = useConnect();
  const { disconnect } = useDisconnect();

  const balance = '0.0000'; // TODO: Implement balance fetching with useBalance hook

  const handleConnectWithConnector = async (selectedConnector: typeof connectors[0]) => {
    console.log('Connecting with connector:', selectedConnector);
    setIsConnecting(true);
    setShowWalletModal(false);

    try {
      connect({ connector: selectedConnector });
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setTimeout(() => setIsConnecting(false), 2000);
    }
  };

  const handleConnectFallback = async () => {
    console.log('Using get-starknet fallback connection');
    setIsConnecting(true);
    setShowWalletModal(false);

    try {
      const wallet = await getStarknetConnect();
      console.log('get-starknet result:', wallet);
      if (wallet) {
        console.log('Wallet connected via get-starknet');
      }
    } catch (error) {
      console.error('get-starknet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return {
    // State
    isConnecting,
    showWalletModal,
    setShowWalletModal,
    isConnected,
    address,
    balance,
    connectors,
    connectError,

    // Actions
    handleConnectWithConnector,
    handleConnectFallback,
    handleDisconnect,
  };
};