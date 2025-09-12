import { Plus, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { LoadingButton } from '@/shared/components/ui/loading-button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useWithdraw } from '../hooks';
import { RecipientInfo } from '../types';

interface WithdrawCardProps {
  walletAddress?: string;
  isConnected: boolean;
}

const WithdrawCard: React.FC<WithdrawCardProps> = ({
  walletAddress,
  isConnected
}) => {
  const withdraw = useWithdraw();

  const handleRecipientAddressChange = (id: string, address: string) => {
    withdraw.updateRecipient(id, { address });
  };

  const handleRecipientPercentageChange = (id: string, percentage: number) => {
    if (percentage >= 0 && percentage <= 100) {
      withdraw.updateRecipient(id, { percentage });
    }
  };

  const handleWithdrawClick = () => {
    withdraw.executeWithdraw();
  };

  const getStatusMessage = () => {
    switch (withdraw.status) {
      case 'validating':
        return 'Validating transaction...';
      case 'executing':
        return 'Executing withdrawal...';
      case 'success':
        return 'Withdrawal completed successfully!';
      case 'error':
        return withdraw.error;
      default:
        return null;
    }
  };

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (withdraw.progress) {
      const message = withdraw.progress.message;
      const timeEstimate = withdraw.progress.estimatedTimeMs 
        ? ` (~${Math.ceil(withdraw.progress.estimatedTimeMs / 1000)}s)`
        : '';
      return (
        <span>
          {message}
          {timeEstimate && <span className="text-gray-400">{timeEstimate}</span>}
        </span>
      );
    }
    if (withdraw.isLoading) return 'Processing...';
    if (!withdraw.canExecute) return 'Complete Form';
    return 'Withdraw';
  };

  return (
    <div>
      <div className="crypto-card px-4 py-6 space-y-4">
        {/* Transaction Hash Input */}
        <div className="space-y-2">
          <Label htmlFor="transaction-hash" className="text-white">
            Deposit Transaction Hash
          </Label>
          <Input
            id="transaction-hash"
            placeholder="0x..."
            value={withdraw.transactionHash}
            onChange={(e) => {
              withdraw.setTransactionHash(e.target.value);
            }}
            className="token-input"
          />
        </div>

        {/* Recipients Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-white">Recipients</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={withdraw.addRecipient}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Recipient
            </Button>
          </div>

          {/* Recipients List */}
          <div className="space-y-3">
            {withdraw.recipients.map((recipient: RecipientInfo, index: number) => (
              <div key={recipient.id} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Recipient Address"
                    value={recipient.address}
                    onChange={(e) => handleRecipientAddressChange(recipient.id, e.target.value)}
                    className="token-input text-xs"
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    placeholder="%"
                    value={recipient.percentage}
                    onChange={(e) => handleRecipientPercentageChange(recipient.id, Number(e.target.value))}
                    className="token-input text-xs text-center"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                {withdraw.recipients.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => withdraw.removeRecipient(recipient.id)}
                    className="p-1 h-8 w-8"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Percentage Summary */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Total: {withdraw.totalPercentage.toFixed(2)}%
            </span>
            {!withdraw.isPercentageValid && (
              <span className="text-red-400">
                Must equal 100%
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={withdraw.autoDistributePercentages}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Auto Distribute
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {getStatusMessage() && (
          <div className={`p-3 rounded-lg text-xs ${
            withdraw.status === 'error' 
              ? 'bg-red-900/20 border border-red-500/20 text-red-400'
              : withdraw.status === 'success'
              ? 'bg-green-900/20 border border-green-500/20 text-green-400'  
              : 'bg-blue-900/20 border border-blue-500/20 text-blue-400'
          }`}>
            {getStatusMessage()}
          </div>
        )}

      </div>
      
      {/* Withdraw Button */}
      <div className="mt-6 space-y-3">
        <LoadingButton
          onClick={handleWithdrawClick}
          disabled={!isConnected || !withdraw.canExecute || withdraw.isLoading || !!withdraw.progress || !withdraw.isPercentageValid}
          loading={withdraw.isLoading}
          loadingText="Processing..."
          spinnerVariant="refresh"
          className="swap-button"
        >
          {getButtonText()}
        </LoadingButton>
        
        {/* Transaction Processing Warning */}
        {(withdraw.isLoading || withdraw.progress) && (
          <div className="flex items-center justify-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2 px-3">
            <span>⚠️</span>
            <span>Do not refresh or close this page while transaction is processing</span>
          </div>
        )}
      </div>

      {/* Transaction History */}
      {withdraw.transactionHistory.length > 0 && (
        <div className="mt-6 space-y-2 pt-4 border-t border-gray-700">
          <Label className="text-white text-xs">Recent Deposits</Label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {withdraw.transactionHistory.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-xs cursor-pointer hover:bg-gray-700/50"
                onClick={() => withdraw.setTransactionHash(tx.hash)}
              >
                <span className="text-gray-400">
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                </span>
                <span className="text-white">
                  {tx.amount} {tx.tokenSymbol}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawCard;