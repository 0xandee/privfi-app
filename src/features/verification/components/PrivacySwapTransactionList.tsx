import React from 'react';
import { Shield, ArrowDownIcon, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { TransactionExplorerLink, TransactionInfo } from './TransactionExplorerLink';
import { usePrivacyStore } from '@/features/privacy/store/privacyStore';
import { PrivacyFlowPhase } from '@/features/privacy/services/PrivacyFlowOrchestrator';

export const PrivacySwapTransactionList: React.FC = () => {
  const { flowState } = usePrivacyStore();

  const getPhaseTransactions = (): TransactionInfo[] => {
    const transactions: TransactionInfo[] = [];

    // Phase 1: User Deposit
    if (flowState.depositTxHash) {
      transactions.push({
        hash: flowState.depositTxHash,
        status: 'confirmed',
        phase: 'Phase 1',
        label: 'User Deposit to Typhoon'
      });
    }

    // Phase 2: Proxy Withdrawal
    if (flowState.proxyTxHashes?.withdrawal) {
      transactions.push({
        hash: flowState.proxyTxHashes.withdrawal,
        status: getPhaseStatus(PrivacyFlowPhase.WITHDRAWING),
        phase: 'Phase 2',
        label: 'Proxy Withdrawal from Typhoon'
      });
    }

    // Phase 3: Proxy Swap
    if (flowState.proxyTxHashes?.swap) {
      transactions.push({
        hash: flowState.proxyTxHashes.swap,
        status: getPhaseStatus(PrivacyFlowPhase.SWAPPING),
        phase: 'Phase 3',
        label: 'Anonymous Swap via AVNU'
      });
    }

    // Phase 4: Proxy Re-deposit
    if (flowState.proxyTxHashes?.redeposit) {
      transactions.push({
        hash: flowState.proxyTxHashes.redeposit,
        status: getPhaseStatus(PrivacyFlowPhase.REDEPOSITING),
        phase: 'Phase 4',
        label: 'Proxy Re-deposit to Typhoon'
      });
    }

    return transactions;
  };

  const getPhaseStatus = (phase: PrivacyFlowPhase): 'pending' | 'confirmed' | 'failed' => {
    if (flowState.phase === PrivacyFlowPhase.FAILED) {
      return 'failed';
    }

    const phaseOrder = [
      PrivacyFlowPhase.DEPOSITING,
      PrivacyFlowPhase.WITHDRAWING,
      PrivacyFlowPhase.SWAPPING,
      PrivacyFlowPhase.REDEPOSITING,
      PrivacyFlowPhase.READY_TO_WITHDRAW
    ];

    const currentIndex = phaseOrder.indexOf(flowState.phase);
    const targetIndex = phaseOrder.indexOf(phase);

    if (currentIndex > targetIndex) {
      return 'confirmed';
    } else if (currentIndex === targetIndex) {
      return 'pending';
    } else {
      return 'pending';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'Phase 1':
        return <ArrowDownIcon className="h-4 w-4" />;
      case 'Phase 2':
        return <RefreshCw className="h-4 w-4" />;
      case 'Phase 3':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'Phase 4':
        return <ArrowDownIcon className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const transactions = getPhaseTransactions();

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Swap Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction, index) => (
            <div key={transaction.hash} className="relative">
              {index < transactions.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
              )}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border">
                  {getPhaseIcon(transaction.phase || '')}
                </div>
                <div className="flex-1">
                  <TransactionExplorerLink
                    transaction={transaction}
                    className="mb-0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {flowState.phase === PrivacyFlowPhase.READY_TO_WITHDRAW && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
            <p className="text-sm text-green-500 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy swap completed! Your tokens are ready for withdrawal.
            </p>
          </div>
        )}

        {flowState.phase === PrivacyFlowPhase.FAILED && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-500">
              Privacy swap failed. Please try again or contact support.
            </p>
            {flowState.error && (
              <p className="text-xs text-red-400 mt-1">{flowState.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};