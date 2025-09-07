import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimations } from '@/shared/hooks/useAnimations';

interface AnimatedNumberProps {
  value: string | number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const { variants, shouldAnimate } = useAnimations();
  const [displayValue, setDisplayValue] = useState(value);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (value !== displayValue) {
      setKey(prev => prev + 1);
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  if (!shouldAnimate) {
    return (
      <span className={className}>
        {prefix}{value}{suffix}
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={key}
        className={className}
        variants={variants.counter}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {prefix}{displayValue}{suffix}
      </motion.span>
    </AnimatePresence>
  );
};