import React, { useState } from 'react';
import { Download, FileText, Copy, Calendar, Hash, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { usePrivacyStore } from '@/features/privacy/store/privacyStore';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { formatUnits } from 'ethers';

interface PrivacySwapReceipt {
  receiptId: string;
  swapId: string;
  userAddress: string;
  timestamp: number;

  swapDetails: {
    fromToken: string;
    toToken: string;
    amountIn: string;
    amountOut: string;
    priceImpact?: number;
  };

  transactions: {
    phase1_deposit?: string;
    phase2_withdraw?: string;
    phase3_swap?: string;
    phase4_redeposit?: string;
    phase5_withdrawal?: string;
  };

  privacyLevel: 'enhanced';
  completionTime: number;
}

export const ReceiptGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<PrivacySwapReceipt | null>(null);

  const { flowState, withdrawalHistory } = usePrivacyStore();
  const { address } = useWalletStore();

  const generateReceipt = () => {
    if (!address || !flowState.swapId) return;

    setIsGenerating(true);

    // Generate receipt from current flow state
    const receipt: PrivacySwapReceipt = {
      receiptId: `receipt_${Date.now()}`,
      swapId: flowState.swapId,
      userAddress: address,
      timestamp: Date.now(),

      swapDetails: {
        fromToken: 'ETH', // TODO: Get from actual swap data
        toToken: 'STRK', // TODO: Get from actual swap data
        amountIn: '1000000000000000000', // TODO: Get from actual swap data
        amountOut: '1000000000000000000', // TODO: Get from actual swap data
        priceImpact: 0.5
      },

      transactions: {
        phase1_deposit: flowState.depositTxHash,
        phase2_withdraw: flowState.proxyTxHashes?.withdrawal,
        phase3_swap: flowState.proxyTxHashes?.swap,
        phase4_redeposit: flowState.proxyTxHashes?.redeposit,
        phase5_withdrawal: withdrawalHistory.find(w =>
          w.userAddress === address && w.status === 'confirmed'
        )?.transactionHash
      },

      privacyLevel: 'enhanced',
      completionTime: Date.now() - (flowState.timestamp || Date.now())
    };

    setGeneratedReceipt(receipt);
    setIsGenerating(false);
  };

  const downloadAsJSON = () => {
    if (!generatedReceipt) return;

    const dataStr = JSON.stringify(generatedReceipt, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `privfi_receipt_${generatedReceipt.receiptId}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const copyToClipboard = () => {
    if (!generatedReceipt) return;

    const receiptText = JSON.stringify(generatedReceipt, null, 2);
    navigator.clipboard.writeText(receiptText);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getTokenSymbol = (address: string) => {
    // TODO: Map token addresses to symbols
    return address.slice(0, 6) + '...';
  };

  if (!address) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Connect wallet to generate receipts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flowState.swapId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No privacy swap to generate receipt for</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Privacy Swap Receipt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!generatedReceipt ? (
          <div className="text-center">
            <Button
              onClick={generateReceipt}
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Receipt'}
              <FileText className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Generate a downloadable receipt for your privacy swap
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Receipt Header */}
            <div className="text-center border-b pb-4">
              <h3 className="text-lg font-semibold">PRIVFI PRIVACY SWAP RECEIPT</h3>
              <p className="text-sm text-muted-foreground">
                Receipt ID: {generatedReceipt.receiptId}
              </p>
              <Badge variant="outline" className="mt-2">
                Enhanced Privacy
              </Badge>
            </div>

            {/* Swap Details */}
            <div className="space-y-3">
              <h4 className="font-medium">Swap Details</h4>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="font-mono">{getTokenSymbol(generatedReceipt.swapDetails.fromToken)}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-mono">{getTokenSymbol(generatedReceipt.swapDetails.toToken)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount In:</span>
                    <p className="font-mono">{formatUnits(generatedReceipt.swapDetails.amountIn, 18)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Out:</span>
                    <p className="font-mono">{formatUnits(generatedReceipt.swapDetails.amountOut, 18)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price Impact:</span>
                    <p>{generatedReceipt.swapDetails.priceImpact}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completion Time:</span>
                    <p>{formatDuration(generatedReceipt.completionTime)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Hashes */}
            <div className="space-y-3">
              <h4 className="font-medium">Transaction History</h4>
              <div className="space-y-2">
                {Object.entries(generatedReceipt.transactions).map(([phase, txHash]) => {
                  if (!txHash) return null;

                  const phaseLabels = {
                    phase1_deposit: 'Phase 1: User Deposit',
                    phase2_withdraw: 'Phase 2: Proxy Withdrawal',
                    phase3_swap: 'Phase 3: Anonymous Swap',
                    phase4_redeposit: 'Phase 4: Proxy Re-deposit',
                    phase5_withdrawal: 'Phase 5: User Withdrawal'
                  };

                  return (
                    <div key={phase} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="text-sm">{phaseLabels[phase as keyof typeof phaseLabels]}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{txHash.slice(0, 8)}...{txHash.slice(-8)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(txHash)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="space-y-3">
              <h4 className="font-medium">Receipt Information</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Generated:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatTimestamp(generatedReceipt.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Swap ID:</span>
                  <span className="font-mono text-xs">{generatedReceipt.swapId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">User Address:</span>
                  <span className="font-mono text-xs">
                    {generatedReceipt.userAddress.slice(0, 8)}...{generatedReceipt.userAddress.slice(-8)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Download Actions */}
            <div className="flex gap-2">
              <Button onClick={downloadAsJSON} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Data
              </Button>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
              <p className="text-xs text-blue-500">
                This receipt contains sensitive transaction data. Store it securely and only share with trusted parties.
                The receipt is generated client-side and is not stored on any server.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};