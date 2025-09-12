import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnimations } from '@/shared/hooks/useAnimations';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  className = '' 
}) => {
  const { variants } = useAnimations();

  return (
    <motion.div 
      className={`flex items-center gap-2 text-xs text-red-400 mt-1 ${className}`}
      variants={variants.shake}
      initial="initial"
      animate="animate"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      </motion.div>
      <motion.span
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.span>
    </motion.div>
  );
};