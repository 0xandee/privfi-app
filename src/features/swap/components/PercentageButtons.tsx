import React from 'react';

interface PercentageButtonsProps {
  percentages: number[];
  onPercentageClick: (percentage: number) => void;
}

export const PercentageButtons: React.FC<PercentageButtonsProps> = ({
  percentages,
  onPercentageClick,
}) => {
  return (
    <div className="flex gap-2">
      {percentages.map((percentage) => (
        <button
          key={percentage}
          onClick={() => onPercentageClick(percentage)}
          className="percentage-button"
        >
          {percentage}%
        </button>
      ))}
    </div>
  );
};