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
    setIsConnecting(true);
    setShowWalletModal(false);

    connect({ connector: selectedConnector });
    setTimeout(() => setIsConnecting(false), 2000);
  };

  const handleConnectFallback = async () => {
    setIsConnecting(true);
    setShowWalletModal(false);

    try {
      await getStarknetConnect();
    } catch (error) {
      // Silently handle connection errors
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