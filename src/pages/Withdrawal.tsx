import React from 'react';
import { WithdrawalForm } from '@/features/privacy';

const Withdrawal: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <WithdrawalForm />
      </div>
    </div>
  );
};

export default Withdrawal;