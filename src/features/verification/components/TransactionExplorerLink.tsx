import React from 'react';
import { ExternalLink, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

const VOYAGER_BASE_URL = 'https://voyager.online/tx';

export interface TransactionInfo {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  phase?: string;
  label?: string;
  blockNumber?: number;
  timestamp?: number;
}

interface TransactionExplorerLinkProps {
  transaction: TransactionInfo;
  className?: string;
}

export const TransactionExplorerLink: React.FC<TransactionExplorerLinkProps> = ({
  transaction,
  className = ''
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = () => {
    window.open(`${VOYAGER_BASE_URL}/${transaction.hash}`, '_blank');
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    const variants = {
      confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20'
    };

    return (
      <Badge variant="outline" className={variants[transaction.status]}>
        {getStatusIcon()}
        <span className="ml-1 capitalize">{transaction.status}</span>
      </Badge>
    );
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`bg-muted/30 p-4 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {transaction.label && (
            <span className="text-sm font-medium">{transaction.label}</span>
          )}
          {transaction.phase && (
            <Badge variant="secondary" className="text-xs">
              {transaction.phase}
            </Badge>
          )}
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Transaction Hash:</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">{formatHash(transaction.hash)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(transaction.hash)}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {transaction.blockNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Block:</span>
            <span className="font-mono text-xs">#{transaction.blockNumber}</span>
          </div>
        )}

        {transaction.timestamp && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time:</span>
            <span className="text-xs">{formatTimestamp(transaction.timestamp)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openInExplorer}
          className="flex-1"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View on Voyager
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(transaction.hash)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy Hash
        </Button>
      </div>
    </div>
  );
};