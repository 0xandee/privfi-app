import { useState, useEffect, useRef } from 'react';
import { SwapProgress } from '../types/swap';

interface UseTimeEstimationResult {
  remainingTime: number | null;
  elapsedTime: number | null;
  progressPercentage: number | null;
  formattedRemainingTime: string | null;
}

export const useTimeEstimation = (progress: SwapProgress | undefined): UseTimeEstimationResult => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastProgressRef = useRef<SwapProgress | undefined>(progress);

  useEffect(() => {
    if (progress && progress !== lastProgressRef.current) {
      lastProgressRef.current = progress;
    }
  }, [progress]);

  // Update time calculations every second
  useEffect(() => {
    if (!progress?.startedAt) {
      setRemainingTime(null);
      setElapsedTime(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    // Handle phases without time estimates (like awaiting-signature)
    if (!progress.estimatedTimeMs) {
      setRemainingTime(null);
      
      // Still track elapsed time for phases without estimates
      const updateElapsedTime = () => {
        const now = Date.now();
        const elapsed = now - (progress.startedAt || now);
        setElapsedTime(elapsed);
      };

      updateElapsedTime();
      intervalRef.current = setInterval(updateElapsedTime, 1000);
      return;
    }

    const updateTimes = () => {
      const now = Date.now();
      const elapsed = now - (progress.startedAt || now);
      const remaining = Math.max(0, (progress.estimatedTimeMs || 0) - elapsed);
      
      setElapsedTime(elapsed);
      setRemainingTime(remaining);
    };

    // Update immediately
    updateTimes();
    
    // Then update every second
    intervalRef.current = setInterval(updateTimes, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [progress?.startedAt, progress?.estimatedTimeMs, progress?.phase]);

  const progressPercentage = elapsedTime && progress?.estimatedTimeMs 
    ? Math.min(100, (elapsedTime / progress.estimatedTimeMs) * 100)
    : null;

  const formattedRemainingTime = remainingTime !== null 
    ? `~${Math.ceil(remainingTime / 1000)}s`
    : null;

  return {
    remainingTime,
    elapsedTime,
    progressPercentage,
    formattedRemainingTime
  };
};