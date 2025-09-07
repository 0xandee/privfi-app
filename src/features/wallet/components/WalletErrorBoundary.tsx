import React from 'react';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface WalletErrorFallbackProps {
  onRetry: () => void;
}

const WalletErrorFallback: React.FC<WalletErrorFallbackProps> = ({ onRetry }) => (
  <Card className="p-4 text-center">
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-destructive">
        <Wallet className="h-5 w-5" />
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div>
        <h4 className="font-medium mb-1">Wallet Connection Error</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Unable to connect to wallet services.
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" size="sm">
        Retry Connection
      </Button>
    </div>
  </Card>
);

interface WalletErrorBoundaryProps {
  children: React.ReactNode;
}

export const WalletErrorBoundary: React.FC<WalletErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    // You could send this to an error tracking service
    // trackError('wallet', error);
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={<WalletErrorFallback onRetry={() => window.location.reload()} />}
    >
      {children}
    </ErrorBoundary>
  );
};