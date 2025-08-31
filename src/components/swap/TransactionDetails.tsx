import React from 'react';

interface TransactionDetailsProps {
  price?: string;
  serviceFee?: string;
  minimumReceived?: string;
  maximumSlippage?: string;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  price = "0",
  serviceFee = "0%",
  minimumReceived = "0",
  maximumSlippage = "0%",
}) => {
  return (
    <div className="crypto-card px-4 py-6 mt-6 space-y-3">
      <div className="transaction-detail">
        <span className="transaction-detail-label">Price</span>
        <span className="transaction-detail-value">{price}</span>
      </div>

      <div className="transaction-detail">
        <span className="transaction-detail-label">Service fee</span>
        <span className="transaction-detail-value">{serviceFee}</span>
      </div>

      <div className="transaction-detail">
        <span className="transaction-detail-label">Minimum received</span>
        <span className="transaction-detail-value">{minimumReceived}</span>
      </div>

      <div className="transaction-detail">
        <span className="transaction-detail-label">Maximum slippage</span>
        <span className="transaction-detail-value">{maximumSlippage}</span>
      </div>
    </div>
  );
};