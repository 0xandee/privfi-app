import React from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletConnectionButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletConnectionButton: React.FC<WalletConnectionButtonProps> = ({
  isConnected,
  isConnecting,
  address,
  onConnect,
  onDisconnect,
}) => {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Button
      variant={isConnected ? "outline" : "default"}
      size="sm"
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isConnecting 
        ? 'Connecting...' 
        : isConnected 
          ? formatAddress(address || '')
          : 'Connect Wallet'
      }
    </Button>
  );
};