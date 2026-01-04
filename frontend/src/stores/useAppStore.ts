/**
 * App Store - Global application state
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'he';
export type View = 'search' | 'trip' | 'ai' | 'profile' | 'home' | 'onboarding';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface AppStoreState {
  // UI State
  currentView: View;
  theme: Theme;
  language: Language;
  isRTL: boolean;
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;

  // Location
  currentLocation: Location | null;
  locationPermission: 'granted' | 'denied' | 'prompt';

  // Network
  isOnline: boolean;
  isSyncing: boolean;

  // UI Actions
  setCurrentView: (view: View) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;

  // Location Actions
  setCurrentLocation: (location: Location | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'prompt') => void;

  // Network Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useAppStore = create<AppStoreState>()(
  devtools(
    persist(
      (set) => ({
        // Initial UI state
        currentView: 'search',
        theme: 'system',
        language: 'en',
        isRTL: false,
        isSidebarOpen: false,
        isModalOpen: false,
        modalContent: null,

        // Initial location state
        currentLocation: null,
        locationPermission: 'prompt',

        // Initial network state
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isSyncing: false,

        // UI Actions
        setCurrentView: (view) => set({ currentView: view }),

        setTheme: (theme) => set({ theme }),

        toggleTheme: () => set((state) => ({
          theme: state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light',
        })),

        setLanguage: (language) => set({
          language,
          isRTL: language === 'he',
        }),

        toggleSidebar: () => set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),

        openModal: (content) => set({
          isModalOpen: true,
          modalContent: content,
        }),

        closeModal: () => set({
          isModalOpen: false,
          modalContent: null,
        }),

        // Location Actions
        setCurrentLocation: (location) => set({ currentLocation: location }),

        setLocationPermission: (permission) => set({ locationPermission: permission }),

        // Network Actions
        setOnline: (online) => set({ isOnline: online }),
        setSyncing: (syncing) => set({ isSyncing: syncing }),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          isRTL: state.isRTL,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);

// Selectors
export const selectIsRTL = (state: AppStoreState) => state.isRTL;
export const selectTheme = (state: AppStoreState) => state.theme;
export const selectLanguage = (state: AppStoreState) => state.language;
export const selectCurrentView = (state: AppStoreState) => state.currentView;
