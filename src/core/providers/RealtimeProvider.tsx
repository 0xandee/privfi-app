/**
 * Realtime Provider for Supabase
 * Manages WebSocket connections and real-time subscriptions
 */

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { SUPABASE_CONFIG } from '../supabase/config';
import type { DepositRow } from '../supabase/types';

interface RealtimeContextValue {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;

  // Subscribe to deposit changes for a specific wallet
  subscribeToUserDeposits: (walletAddress: string, callback: DepositCallback) => () => void;

  // Subscribe to all deposit changes
  subscribeToAllDeposits: (callback: DepositCallback) => () => void;

  // Manually reconnect
  reconnect: () => void;
}

type DepositCallback = (payload: RealtimePayload<DepositRow>) => void;

interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  errors?: string[];
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  enabled = true
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store active subscriptions
  const subscriptionsRef = useRef<Set<RealtimeChannel>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connection management
  const reconnect = React.useCallback(() => {
    if (!enabled) return;

    setIsConnecting(true);
    setError(null);

    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Attempt to reconnect after a delay
    reconnectTimeoutRef.current = setTimeout(() => {
      setIsConnected(false);
      setIsConnecting(false);

      // Check connection status
      const checkConnection = async () => {
        try {
          const { error } = await supabase.from('deposits').select('count', { count: 'exact', head: true });
          if (!error) {
            setIsConnected(true);
            setError(null);
          } else {
            setError(new Error('Failed to connect to Supabase'));
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Connection failed'));
        } finally {
          setIsConnecting(false);
        }
      };

      checkConnection();
    }, SUPABASE_CONFIG.REALTIME.RECONNECT_DELAY);
  }, [enabled]);

  // Initialize connection
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initializeConnection = async () => {
      if (!mounted) return;

      setIsConnecting(true);

      try {
        // Test connection
        const { error } = await supabase.from('deposits').select('count', { count: 'exact', head: true });

        if (mounted) {
          if (error) {
            setError(new Error('Failed to initialize Supabase connection'));
            setIsConnected(false);
          } else {
            setIsConnected(true);
            setError(null);
          }
          setIsConnecting(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Connection initialization failed'));
          setIsConnected(false);
          setIsConnecting(false);
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled]);

  // Subscribe to user deposits
  const subscribeToUserDeposits = React.useCallback((
    walletAddress: string,
    callback: DepositCallback
  ): (() => void) => {
    if (!enabled || !isConnected) {
      return () => {};
    }

    const channel = supabase
      .channel(`${SUPABASE_CONFIG.CHANNELS.DEPOSITS}_${walletAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
          filter: `wallet_address=eq.${walletAddress}`,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to deposits for wallet: ${walletAddress}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error for wallet: ${walletAddress}`);
          setError(new Error(`Failed to subscribe to deposits for wallet: ${walletAddress}`));
        }
      });

    subscriptionsRef.current.add(channel);

    // Return unsubscribe function
    return () => {
      subscriptionsRef.current.delete(channel);
      supabase.removeChannel(channel);
    };
  }, [enabled, isConnected]);

  // Subscribe to all deposits
  const subscribeToAllDeposits = React.useCallback((
    callback: DepositCallback
  ): (() => void) => {
    if (!enabled || !isConnected) {
      return () => {};
    }

    const channel = supabase
      .channel(SUPABASE_CONFIG.CHANNELS.DEPOSITS)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to all deposits');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error for all deposits');
          setError(new Error('Failed to subscribe to deposits'));
        }
      });

    subscriptionsRef.current.add(channel);

    // Return unsubscribe function
    return () => {
      subscriptionsRef.current.delete(channel);
      supabase.removeChannel(channel);
    };
  }, [enabled, isConnected]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const value: RealtimeContextValue = {
    isConnected,
    isConnecting,
    error,
    subscribeToUserDeposits,
    subscribeToAllDeposits,
    reconnect,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

/**
 * Hook to access realtime context
 */
export const useRealtime = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

/**
 * Hook to subscribe to user deposits in real-time
 */
export const useRealtimeUserDeposits = (
  walletAddress: string | undefined,
  onDepositChange: DepositCallback
) => {
  const { subscribeToUserDeposits, isConnected } = useRealtime();

  useEffect(() => {
    if (!walletAddress || !isConnected) return;

    const unsubscribe = subscribeToUserDeposits(walletAddress, onDepositChange);
    return unsubscribe;
  }, [walletAddress, isConnected, subscribeToUserDeposits, onDepositChange]);
};

/**
 * Hook to subscribe to all deposits in real-time
 */
export const useRealtimeDeposits = (onDepositChange: DepositCallback) => {
  const { subscribeToAllDeposits, isConnected } = useRealtime();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribeToAllDeposits(onDepositChange);
    return unsubscribe;
  }, [isConnected, subscribeToAllDeposits, onDepositChange]);
};