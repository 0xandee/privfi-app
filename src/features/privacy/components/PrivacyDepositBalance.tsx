import React, { useEffect, useState } from 'react';
import { Wallet, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { usePrivacyStore } from '../store/privacyStore';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { PrivacyFlowOrchestrator } from '../services/PrivacyFlowOrchestrator';
import { formatUnits } from 'ethers';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export const PrivacyDepositBalance: React.FC = () => {
  const { deposits, getTotalBalance } = usePrivacyStore();
  const { address } = useWalletStore();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalances = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const orchestrator = PrivacyFlowOrchestrator.getInstance();
      const userDeposits = await orchestrator.getUserDeposits(address);

      // Group deposits by token
      const tokenMap = new Map<string, { symbol: string; decimals: number }>();
      userDeposits.forEach(deposit => {
        if (!tokenMap.has(deposit.tokenAddress)) {
          // TODO: Fetch actual token metadata
          tokenMap.set(deposit.tokenAddress, {
            symbol: deposit.tokenAddress.slice(0, 6) + '...',
            decimals: 18 // Default, should fetch actual decimals
          });
        }
      });

      const balances: TokenBalance[] = [];
      for (const [tokenAddress, metadata] of tokenMap) {
        const balance = getTotalBalance(tokenAddress);
        if (balance !== '0') {
          balances.push({
            address: tokenAddress,
            symbol: metadata.symbol,
            balance,
            decimals: metadata.decimals
          });
        }
      }

      setTokenBalances(balances);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [address, deposits]);

  if (!address || tokenBalances.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Shielded Balances
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchBalances}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tokenBalances.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{token.symbol}</span>
              </div>
              <span className="text-sm font-mono">
                {formatUnits(token.balance, token.decimals)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <p className="text-xs text-blue-500">
            These are your shielded tokens in Typhoon, ready for private swaps.
            The system will automatically select the optimal deposit for each swap.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}