import React, { useState } from 'react';
import { ArrowDownIcon, CheckCircle, Wallet, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { useWithdrawal } from '../hooks/useWithdrawal';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { useWalletConnection } from '@/features/wallet/hooks/useWalletConnection';
import { WalletConnectionButton } from '@/features/wallet/components/WalletConnectionButton';
import { WalletModal } from '@/features/wallet/components/WalletModal';
import { formatUnits } from 'ethers';
import { STARKNET_TOKENS, getTokenByAddress, formatBalanceForDisplay } from '@/constants/tokens';

const VOYAGER_BASE_URL = 'https://voyager.online/tx';

export const WithdrawalInterface: React.FC = () => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [customRecipient, setCustomRecipient] = useState(false);

  const { address: walletStoreAddress } = useWalletStore();
  const {
    isConnecting,
    showWalletModal,
    setShowWalletModal,
    isConnected,
    address: connectedAddress,
    connectors,
    handleConnectWithConnector,
    handleConnectFallback,
    handleDisconnect,
  } = useWalletConnection();

  // Use the address from StarkNet React (which is more reliable)
  const address = connectedAddress || walletStoreAddress;
  const {
    isLoading,
    error,
    transactionHash,
    isSuccess,
    withdrawalData,
    hasWithdrawalData,
    executeWithdrawal,
    resetState
  } = useWithdrawal();

  // Debug log withdrawal data
  console.log('WithdrawalInterface - withdrawalData:', withdrawalData);
  console.log('WithdrawalInterface - hasWithdrawalData:', hasWithdrawalData);

  const handleWithdraw = async () => {
    if (!withdrawalData) return;

    const targetAddress = customRecipient ? recipientAddress : address;
    if (!targetAddress) return;

    await executeWithdrawal(
      withdrawalData.tokenAddress,
      withdrawalData.amount,
      targetAddress
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTokenInfo = (tokenAddress: string) => {
    // Debug log to see what tokenAddress we're getting
    console.log('Getting token info for address:', tokenAddress);

    const token = getTokenByAddress(tokenAddress);
    console.log('Found token:', token);

    return {
      symbol: token?.symbol || tokenAddress.slice(0, 6) + '...',
      decimals: token?.decimals || 18,
      logoURI: token?.logoURI
    };
  };

  if (!address || !isConnected) {
    return (
      <>
        <div className="max-w-md mx-auto mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                <p className="text-muted-foreground mb-4">
                  Please connect your wallet to access the withdrawal interface.
                </p>
                <WalletConnectionButton
                  isConnected={isConnected}
                  isConnecting={isConnecting}
                  address={address}
                  onConnect={() => setShowWalletModal(true)}
                  onDisconnect={handleDisconnect}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <WalletModal
          isOpen={showWalletModal}
          onOpenChange={setShowWalletModal}
          connectors={connectors}
          onConnectWithConnector={handleConnectWithConnector}
          onConnectFallback={handleConnectFallback}
        />
      </>
    );
  }

  if (!hasWithdrawalData) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Withdrawal Available</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any tokens ready for withdrawal. Complete a privacy swap first.
              </p>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess && transactionHash) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">Withdrawal Successful</h3>
              <p className="text-muted-foreground mb-4">
                Your withdrawal has been submitted successfully.
              </p>

              <div className="bg-muted p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transactionHash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-mono text-xs break-all">{transactionHash}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`${VOYAGER_BASE_URL}/${transactionHash}`, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Voyager
                </Button>
                <Button onClick={resetState} className="flex-1">
                  New Withdrawal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownIcon className="h-5 w-5" />
            Withdraw from Typhoon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Withdrawal Details */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Withdrawal Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token:</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const tokenInfo = getTokenInfo(withdrawalData.tokenAddress);
                    return (
                      <>
                        {tokenInfo.logoURI && (
                          <img src={tokenInfo.logoURI} alt={tokenInfo.symbol} className="w-5 h-5" />
                        )}
                        <span className="font-mono">{tokenInfo.symbol}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono">
                  {(() => {
                    const tokenInfo = getTokenInfo(withdrawalData.tokenAddress);
                    const rawAmount = formatUnits(withdrawalData.amount, tokenInfo.decimals);
                    return formatBalanceForDisplay(rawAmount, tokenInfo.symbol);
                  })()}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recipient Address */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomRecipient(!customRecipient)}
              >
                {customRecipient ? 'Use My Address' : 'Custom Address'}
              </Button>
            </div>

            {customRecipient ? (
              <Input
                id="recipient"
                placeholder="Enter recipient address..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono"
              />
            ) : (
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-mono text-sm break-all">{address}</p>
                <p className="text-xs text-muted-foreground mt-1">Your connected wallet</p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Withdraw Button */}
          <Button
            onClick={handleWithdraw}
            disabled={isLoading || (customRecipient && !recipientAddress)}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Processing Withdrawal...' : 'Withdraw Tokens'}
          </Button>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
            <p className="text-xs text-blue-500">
              This will withdraw your swapped tokens from the Typhoon privacy pool to your specified address.
              The transaction will be executed on StarkNet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};