import React from 'react';
import { mainnet } from '@starknet-react/chains';
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  voyager
} from '@starknet-react/core';

interface StarknetProviderProps {
  children: React.ReactNode;
}

export const StarknetProvider: React.FC<StarknetProviderProps> = ({ children }) => {
  // Use explicit connectors instead of useInjectedConnectors
  const connectors = [argent(), braavos()];

  console.log('StarknetProvider connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

  return (
    <StarknetConfig
      chains={[mainnet]}
      provider={publicProvider()}
      connectors={connectors}
      explorer={voyager}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
};