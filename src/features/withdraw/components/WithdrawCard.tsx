import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatTokenAmount, formatBalanceForDisplay } from '@/constants/tokens';
import type { WithdrawFormData, WithdrawExecution } from '../types';

interface WithdrawCardProps {
  formData: WithdrawFormData;
  execution: WithdrawExecution;
  walletAddress?: string;
  onRecipientAddressChange: (address: string) => void;
  onWithdraw: () => void;
  onReset: () => void;
}

export const WithdrawCard = ({
  formData,
  execution,
  walletAddress,
  onRecipientAddressChange,
  onWithdraw,
  onReset,
}: WithdrawCardProps) => {
  const [recipientAddress, setRecipientAddress] = useState(formData.recipientAddress);

  const handleAddressChange = (value: string) => {
    setRecipientAddress(value);
    onRecipientAddressChange(value);
  };

  const isValidAddress = (address: string): boolean => {
    // Basic StarkNet address validation - should start with 0x and be proper length
    return /^0x[0-9a-fA-F]{1,64}$/.test(address.trim());
  };

  const canSubmit =
    formData.selectedDeposits.length > 0 &&
    recipientAddress.trim() !== '' &&
    isValidAddress(recipientAddress) &&
    !execution.isLoading &&
    walletAddress;

  // Show success state
  if (execution.isSuccess && execution.withdrawalRecord) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Withdrawal Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="text-lg font-medium text-green-600 mb-2">
              Withdrawal Complete
            </div>
            <div className="text-sm text-muted-foreground">
              Your tokens have been successfully withdrawn
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono">
                {formData.token && formatBalanceForDisplay(
                  formatTokenAmount(formData.totalAmount, formData.token.decimals),
                  formData.token.symbol
                )} {formData.token?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recipient:</span>
              <span className="font-mono text-xs">
                {execution.withdrawalRecord.recipientAddresses[0]?.slice(0, 10)}...
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction:</span>
              <span className="font-mono text-xs">
                {execution.transactionHash?.slice(0, 10)}...
              </span>
            </div>
          </div>

          <Button onClick={onReset} className="w-full">
            Make Another Withdrawal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Withdraw Deposits</CardTitle>
        <div className="text-sm text-muted-foreground">
          Withdraw your private deposits to any address
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Deposits Summary */}
        {formData.selectedDeposits.length > 0 && formData.token && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img
                src={formData.token.logoURI}
                alt={formData.token.symbol}
                className="w-6 h-6 rounded-full"
              />
              <span className="font-medium">{formData.token.symbol}</span>
              <Badge variant="secondary">
                {formData.selectedDeposits.length} deposit{formData.selectedDeposits.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
              <div className="text-lg font-mono font-medium">
                {formatBalanceForDisplay(
                  formatTokenAmount(formData.totalAmount, formData.token.decimals),
                  formData.token.symbol
                )} {formData.token.symbol}
              </div>
            </div>

            <Separator />
          </div>
        )}

        {/* Recipient Address Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            disabled={execution.isLoading}
            className={
              recipientAddress && !isValidAddress(recipientAddress)
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
            }
          />
          {recipientAddress && !isValidAddress(recipientAddress) && (
            <div className="text-sm text-red-500">
              Please enter a valid StarkNet address
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Enter the StarkNet address where you want to receive the tokens
          </div>
        </div>

        {/* Error Display */}
        {execution.isError && execution.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{execution.error.message}</AlertDescription>
          </Alert>
        )}

        {/* No Wallet Warning */}
        {!walletAddress && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to withdraw deposits
            </AlertDescription>
          </Alert>
        )}

        {/* No Deposits Selected Warning */}
        {formData.selectedDeposits.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please select deposits from the table above to withdraw
            </AlertDescription>
          </Alert>
        )}

        {/* Withdraw Button */}
        <Button
          onClick={onWithdraw}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {execution.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Withdrawal...
            </>
          ) : (
            'Withdraw'
          )}
        </Button>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>🔒 Powered by Typhoon Privacy Protocol</div>
          <div>Your withdrawal is completely private and anonymous</div>
        </div>
      </CardContent>
    </Card>
  );
};