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

  // Log phase changes and timing data
  useEffect(() => {
    if (progress && progress !== lastProgressRef.current) {
      const now = Date.now();
      const timestamp = new Date().toISOString();
      
      // Log phase completion if we had a previous phase
      if (lastProgressRef.current && lastProgressRef.current.startedAt && lastProgressRef.current.estimatedTimeMs) {
        const actualDuration = now - lastProgressRef.current.startedAt;
        const estimatedDuration = lastProgressRef.current.estimatedTimeMs;
        const difference = actualDuration - estimatedDuration;
        const accuracy = ((estimatedDuration / actualDuration) * 100).toFixed(1);
        
        console.log(`[SWAP_TIMING] Phase Complete: ${lastProgressRef.current.phase}`, {
          actualDuration: `${actualDuration}ms`,
          estimatedDuration: `${estimatedDuration}ms`,
          difference: `${difference > 0 ? '+' : ''}${difference}ms`,
          accuracy: `${accuracy}%`,
          timestamp
        });
      }
      
      // Log new phase start
      console.log(`[SWAP_TIMING] Phase: ${progress.phase}`, {
        startedAt: timestamp,
        estimatedTime: progress.estimatedTimeMs ? `${progress.estimatedTimeMs}ms` : 'unknown',
        message: progress.message
      });
      
      lastProgressRef.current = progress;
    }
  }, [progress]);

  // Update time calculations every second
  useEffect(() => {
    if (!progress?.startedAt || !progress.estimatedTimeMs) {
      setRemainingTime(null);
      setElapsedTime(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    const updateTimes = () => {
      const now = Date.now();
      const elapsed = now - (progress.startedAt || now);
      const remaining = Math.max(0, (progress.estimatedTimeMs || 0) - elapsed);
      const progressPercentage = ((elapsed / (progress.estimatedTimeMs || 1)) * 100);
      
      setElapsedTime(elapsed);
      setRemainingTime(remaining);
      
      // Log countdown updates every second
      console.log(`[SWAP_COUNTDOWN] Phase: ${progress.phase}`, {
        elapsed: `${elapsed}ms`,
        remaining: `${remaining}ms`,
        progress: `${Math.min(100, progressPercentage).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
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