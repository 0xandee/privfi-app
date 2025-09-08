import React from 'react';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

interface SwapErrorFallbackProps {
  onRetry: () => void;
}

const SwapErrorFallback: React.FC<SwapErrorFallbackProps> = ({ onRetry }) => (
  <Card className="p-6 text-center">
    <div className="flex flex-col items-center gap-4">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="font-semibold mb-2">Swap Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to load swap functionality. This could be due to network issues or a temporary service outage.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRetry} variant="outline" size="sm">
          Try Again
        </Button>
        <Button onClick={() => window.location.reload()} size="sm">
          Refresh App
        </Button>
      </div>
    </div>
  </Card>
);

interface SwapErrorBoundaryProps {
  children: React.ReactNode;
}

export const SwapErrorBoundary: React.FC<SwapErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    // You could send this to an error tracking service
    // trackError('swap', error);
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={<SwapErrorFallback onRetry={() => window.location.reload()} />}
    >
      {children}
    </ErrorBoundary>
  );
};