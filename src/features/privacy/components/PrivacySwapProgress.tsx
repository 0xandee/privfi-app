import React from 'react';
import { Progress } from '@/shared/components/ui/progress';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { usePrivacyStore } from '../store/privacyStore';
import { PrivacyFlowPhase } from '../services/PrivacyFlowOrchestrator';
import { cn } from '@/shared/utils/lib/utils';

const phases = [
  { key: PrivacyFlowPhase.DEPOSITING, label: 'Shielding Tokens', icon: Circle },
  { key: PrivacyFlowPhase.WITHDRAWING, label: 'Proxy Withdrawal', icon: Circle },
  { key: PrivacyFlowPhase.SWAPPING, label: 'Anonymous Swap', icon: Circle },
  { key: PrivacyFlowPhase.REDEPOSITING, label: 'Re-shielding', icon: Circle },
  { key: PrivacyFlowPhase.READY_TO_WITHDRAW, label: 'Ready to Withdraw', icon: Circle },
];

export const PrivacySwapProgress: React.FC = () => {
  const { flowState } = usePrivacyStore();

  if (flowState.phase === PrivacyFlowPhase.IDLE) {
    return null;
  }

  const getCurrentPhaseIndex = () => {
    const index = phases.findIndex(p => p.key === flowState.phase);
    return index >= 0 ? index : -1;
  };

  const currentPhaseIndex = getCurrentPhaseIndex();

  const getPhaseIcon = (index: number) => {
    if (flowState.phase === PrivacyFlowPhase.FAILED) {
      return XCircle;
    }
    if (index < currentPhaseIndex) {
      return CheckCircle2;
    }
    if (index === currentPhaseIndex && flowState.phase !== PrivacyFlowPhase.COMPLETED) {
      return Loader2;
    }
    if (flowState.phase === PrivacyFlowPhase.COMPLETED || flowState.phase === PrivacyFlowPhase.READY_TO_WITHDRAW) {
      return CheckCircle2;
    }
    return Circle;
  };

  const getPhaseClass = (index: number) => {
    if (flowState.phase === PrivacyFlowPhase.FAILED) {
      return 'text-red-500';
    }
    if (index < currentPhaseIndex) {
      return 'text-green-500';
    }
    if (index === currentPhaseIndex) {
      return 'text-blue-500';
    }
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Privacy Swap Progress</h3>
        <span className="text-sm text-muted-foreground">
          {flowState.progress}% Complete
        </span>
      </div>

      <Progress value={flowState.progress} className="h-2" />

      <div className="space-y-3 mt-4">
        {phases.map((phase, index) => {
          const Icon = getPhaseIcon(index);
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex || flowState.phase === PrivacyFlowPhase.COMPLETED;

          return (
            <div
              key={phase.key}
              className={cn(
                'flex items-center space-x-3 transition-all',
                isActive && 'scale-105'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  getPhaseClass(index),
                  isActive && flowState.phase !== PrivacyFlowPhase.FAILED && 'animate-spin'
                )}
              />
              <span
                className={cn(
                  'text-sm',
                  isCompleted && 'text-green-500',
                  isActive && 'font-semibold',
                  !isCompleted && !isActive && 'text-muted-foreground'
                )}
              >
                {phase.label}
              </span>
              {isActive && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Processing...
                </span>
              )}
              {isCompleted && !isActive && (
                <span className="text-xs text-green-500 ml-auto">
                  Complete
                </span>
              )}
            </div>
          );
        })}
      </div>

      {flowState.message && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-sm">{flowState.message}</p>
        </div>
      )}

      {flowState.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-sm text-red-500">{flowState.error}</p>
        </div>
      )}

      {flowState.phase === PrivacyFlowPhase.READY_TO_WITHDRAW && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-500">
            Your swap is complete! The swapped tokens are now shielded in Typhoon
            and ready for private withdrawal.
          </p>
        </div>
      )}
    </div>
  );
};