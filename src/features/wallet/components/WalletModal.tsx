import React from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ArgentIcon, BraavosIcon } from './WalletIcons';

interface WalletModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  connectors: Array<{ id: string; name: string }>;
  onConnectWithConnector: (connector: any) => void;
  onConnectFallback: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onOpenChange,
  connectors,
  onConnectWithConnector,
  onConnectFallback,
}) => {
  const getConnectorIcon = (connectorId: string) => {
    switch (connectorId) {
      case 'argentX':
        return <ArgentIcon />;
      case 'braavos':
        return <BraavosIcon />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => onConnectWithConnector(connector)}
            >
              <div className="mr-3">
                {getConnectorIcon(connector.id)}
              </div>
              <div className="text-left">
                <div className="font-medium">{connector.name}</div>
              </div>
            </Button>
          ))}
          <Button
            variant="outline"
            className="w-full justify-start h-12"
            onClick={onConnectFallback}
          >
            <Wallet className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Other wallets</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};