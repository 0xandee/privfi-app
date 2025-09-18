import React, { useState } from 'react';
import { Send, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ClaimingKeyInput } from './ClaimingKeyInput';
import { usePrivacyDeposit } from '../hooks/usePrivacyDeposit';

export const DepositForm: React.FC = () => {
  const {
    depositData,
    formState,
    setAmount,
    setTokenAddress,
    setClaimingKey,
    setRecipient,
    generateRandomKey,
    executeDeposit,
    resetForm,
    isFormValid,
    supportedTokens,
    mist,
  } = usePrivacyDeposit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    await executeDeposit();
  };

  const selectedToken = supportedTokens.find(token => token.id === depositData.tokenAddress);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!mist.isConnected && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to create private deposits.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create Private Deposit
          </CardTitle>
          <CardDescription>
            Deposit tokens privately using the MIST.cash protocol on Starknet.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="token-select">Token *</Label>
              <Select
                value={depositData.tokenAddress}
                onValueChange={(value) => {
                  const token = supportedTokens.find(t => t.id === value);
                  if (token) {
                    setTokenAddress(value, token.name);
                  }
                }}
                disabled={formState.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((token) => (
                    <SelectItem key={token.id} value={token.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: token.color,
                            color: token.textColor
                          }}
                        >
                          {token.name[0]}
                        </div>
                        <span>{token.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                value={depositData.amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={formState.isLoading}
                className="text-right font-mono"
              />
            </div>

            <ClaimingKeyInput
              value={depositData.claimingKey}
              onChange={setClaimingKey}
              onGenerate={generateRandomKey}
              showGenerator={true}
              required={true}
              disabled={formState.isLoading}
            />

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address *</Label>
              <Input
                id="recipient"
                value={depositData.recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                disabled={formState.isLoading}
                className="font-mono"
              />
            </div>

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

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!isFormValid || formState.isLoading || !mist.isConnected}
                className="flex-1"
              >
                {formState.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {formState.message || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Deposit
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={formState.isLoading}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};