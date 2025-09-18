import React, { useState } from 'react';
import { Download, Search, Wallet, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { ClaimingKeyInput } from './ClaimingKeyInput';
import { usePrivacyWithdrawal } from '../hooks/usePrivacyWithdrawal';

export const WithdrawalForm: React.FC = () => {
  const {
    withdrawalData,
    formState,
    setClaimingKey,
    setRecipient,
    searchTransaction,
    executeWithdrawal,
    resetForm,
    isFormValid,
    isTransactionFound,
    isAlreadyClaimed,
    formattedAmount,
    tokenInfo,
    mist,
  } = usePrivacyWithdrawal();

  const [searchAttempted, setSearchAttempted] = useState(false);

  const handleSearch = async () => {
    setSearchAttempted(true);
    await searchTransaction();
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !isTransactionFound) return;
    await executeWithdrawal();
  };

  const handleReset = () => {
    setSearchAttempted(false);
    resetForm();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!mist.isConnected && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to claim private deposits.
          </AlertDescription>
        </Alert>
      )}

      {isAlreadyClaimed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This transaction has already been claimed and cannot be claimed again.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Private Transaction
          </CardTitle>
          <CardDescription>
            Enter your claiming key and recipient address to find and claim your private deposit.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <ClaimingKeyInput
            value={withdrawalData.claimingKey}
            onChange={setClaimingKey}
            placeholder="Enter your claiming key"
            required={true}
            disabled={formState.isLoading}
          />

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address *</Label>
            <Input
              id="recipient"
              value={withdrawalData.recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              disabled={formState.isLoading}
              className="font-mono"
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={!withdrawalData.claimingKey || !withdrawalData.recipient || formState.isLoading || !mist.isConnected || isAlreadyClaimed}
            className="w-full"
          >
            {formState.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Transaction
              </>
            )}
          </Button>

          {formState.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{formState.error}</AlertDescription>
            </Alert>
          )}

          {formState.success && formState.message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{formState.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isTransactionFound && withdrawalData.asset && tokenInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Transaction Found!
            </CardTitle>
            <CardDescription>
              We found your private transaction. Review the details and claim your tokens.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: tokenInfo.color,
                    color: tokenInfo.textColor
                  }}
                >
                  {tokenInfo.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-lg">{formattedAmount} {tokenInfo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Token: {withdrawalData.asset.addr.slice(0, 10)}...{withdrawalData.asset.addr.slice(-8)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Ready to Claim</Badge>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm font-mono break-all">
                  {withdrawalData.recipient}
                </code>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!isFormValid || formState.isLoading || mist.isPending}
                  className="flex-1"
                >
                  {formState.isLoading || mist.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {mist.isPending ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Claim Tokens
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={formState.isLoading || mist.isPending}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {searchAttempted && !isTransactionFound && !formState.isLoading && !formState.error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">No Transaction Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We could not find a transaction with the provided details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};