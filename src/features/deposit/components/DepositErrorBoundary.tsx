import React, { Component, ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DepositErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Deposit Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#1C1C1C] rounded-xl p-6 text-center space-y-4">
          <div className="text-red-400">
            <h3 className="text-lg font-medium mb-2">Deposit Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Something went wrong with the deposit interface.
            </p>
            {this.state.error && (
              <details className="text-left bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
                <summary className="cursor-pointer text-xs font-medium">Error Details</summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}