import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

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
      variant={isConnected ? "secondary" : "default"}
      size="sm"
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={isConnecting}
      className="flex items-center gap-2 group w-40"
    >
      {isConnected && !isConnecting ? (
        <>
          <Wallet className="h-4 w-4 group-hover:hidden" />
          {/* <LogOut className="h-4 w-4 hidden group-hover:inline" /> */}
        </>
      ) : (
        <></>
      )}
      {isConnecting
        ? 'Connecting...'
        : isConnected
          ? (
            <>
              <span className="group-hover:hidden">
                {formatAddress(address || '')}
              </span>
              <span className="hidden group-hover:inline">
                Disconnect
              </span>
            </>
          )
          : 'Connect Wallet'
      }
    </Button>
  );
};