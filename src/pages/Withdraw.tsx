import React from 'react';
import { WithdrawalInterface } from '@/features/withdraw';

const Withdraw: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Withdraw from Typhoon</h1>
          <p className="text-muted-foreground">
            Complete your privacy swap by withdrawing your swapped tokens from the Typhoon privacy pool.
          </p>
        </div>

        <WithdrawalInterface />
      </div>
    </div>
  );
};

export default Withdraw;