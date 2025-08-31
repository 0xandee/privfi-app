import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  
  // Performance
  performance: {
    enableAnimations: boolean;
    reduceMotion: boolean;
    enableTooltips: boolean;
  };
  
  // Debug
  debug: {
    enabled: boolean;
    verbose: boolean;
  };
  
  // App metadata
  lastUpdated: string;
  version: string;
}

interface AppActions {
  // Theme actions
  setTheme: (theme: AppState['theme']) => void;
  
  // Notification actions
  updateNotifications: (notifications: Partial<AppState['notifications']>) => void;
  
  // Performance actions
  updatePerformance: (performance: Partial<AppState['performance']>) => void;
  
  // Debug actions
  setDebug: (debug: boolean) => void;
  updateDebug: (debug: Partial<AppState['debug']>) => void;
  
  // Utility actions
  resetToDefaults: () => void;
  updateLastUpdated: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  theme: 'system',
  
  notifications: {
    enabled: true,
    sound: false,
    desktop: false,
  },
  
  performance: {
    enableAnimations: true,
    reduceMotion: false,
    enableTooltips: true,
  },
  
  debug: {
    enabled: false,
    verbose: false,
  },
  
  lastUpdated: new Date().toISOString(),
  version: '1.0.0',
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // Theme actions
        setTheme: (theme) => set({ theme }),
        
        // Notification actions
        updateNotifications: (notifications) => set((state) => ({
          notifications: { ...state.notifications, ...notifications }
        })),
        
        // Performance actions
        updatePerformance: (performance) => set((state) => ({
          performance: { ...state.performance, ...performance }
        })),
        
        // Debug actions
        setDebug: (enabled) => set((state) => ({
          debug: { ...state.debug, enabled }
        })),
        
        updateDebug: (debug) => set((state) => ({
          debug: { ...state.debug, ...debug }
        })),
        
        // Utility actions
        resetToDefaults: () => set(initialState),
        
        updateLastUpdated: () => set({
          lastUpdated: new Date().toISOString()
        }),
      }),
      {
        name: 'app-store',
      }
    ),
    { name: 'app' }
  )
);