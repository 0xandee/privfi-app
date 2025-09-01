import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningMessageProps {
  message: string;
  className?: string;
}

export const WarningMessage: React.FC<WarningMessageProps> = ({ 
  message, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-yellow-500 mt-1 ${className}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};