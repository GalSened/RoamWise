/**
 * User Store - Zustand state management for user profile
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  User,
  UserPreferences,
  TravelDNA,
  OnboardingState,
  BucketListItem,
} from '../domain/user/types';
import { DEFAULT_USER_PREFERENCES, DEFAULT_TRAVEL_DNA } from '../domain/user/constants';

interface UserStoreState {
  // State
  user: User | null;
  onboarding: OnboardingState;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // User actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateTravelDNA: (dna: Partial<TravelDNA>) => void;
  addXP: (amount: number) => void;

  // Bucket list actions
  addToBucketList: (item: BucketListItem) => void;
  removeFromBucketList: (itemId: string) => void;
  markBucketItemCompleted: (itemId: string) => void;

  // Onboarding actions
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  setPermission: (permission: 'location' | 'notifications', granted: boolean) => void;

  // Auth actions
  login: (user: User) => void;
  logout: () => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialOnboarding: OnboardingState = {
  completed: false,
  currentStep: 0,
  permissionsGranted: {
    location: false,
    notifications: false,
  },
  initialPreferencesSet: false,
};

export const useUserStore = create<UserStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        onboarding: initialOnboarding,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // User actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),

        updateUser: (updates) => set((state) => ({
          user: state.user ? { ...state.user, ...updates, updatedAt: new Date() } : null,
        })),

        updatePreferences: (preferences) => set((state) => ({
          user: state.user
            ? {
                ...state.user,
                preferences: { ...state.user.preferences, ...preferences },
                updatedAt: new Date(),
              }
            : null,
        })),

        updateTravelDNA: (dna) => set((state) => ({
          user: state.user
            ? {
                ...state.user,
                travelDNA: { ...state.user.travelDNA, ...dna },
                updatedAt: new Date(),
              }
            : null,
        })),

        addXP: (amount) => set((state) => {
          if (!state.user) return {};
          const newXP = state.user.xp + amount;
          // Level calculation would go here
          return {
            user: { ...state.user, xp: newXP, updatedAt: new Date() },
          };
        }),

        // Bucket list
        addToBucketList: (item) => set((state) => ({
          user: state.user
            ? {
                ...state.user,
                bucketList: [...state.user.bucketList, item],
                updatedAt: new Date(),
              }
            : null,
        })),

        removeFromBucketList: (itemId) => set((state) => ({
          user: state.user
            ? {
                ...state.user,
                bucketList: state.user.bucketList.filter((i) => i.id !== itemId),
                updatedAt: new Date(),
              }
            : null,
        })),

        markBucketItemCompleted: (itemId) => set((state) => ({
          user: state.user
            ? {
                ...state.user,
                bucketList: state.user.bucketList.map((i) =>
                  i.id === itemId ? { ...i, completedAt: new Date() } : i
                ),
                updatedAt: new Date(),
              }
            : null,
        })),

        // Onboarding
        setOnboardingStep: (step) => set((state) => ({
          onboarding: { ...state.onboarding, currentStep: step },
        })),

        completeOnboarding: () => set((state) => ({
          onboarding: { ...state.onboarding, completed: true },
        })),

        setPermission: (permission, granted) => set((state) => ({
          onboarding: {
            ...state.onboarding,
            permissionsGranted: {
              ...state.onboarding.permissionsGranted,
              [permission]: granted,
            },
          },
        })),

        // Auth
        login: (user) => set({
          user,
          isAuthenticated: true,
          error: null,
        }),

        logout: () => set({
          user: null,
          isAuthenticated: false,
          onboarding: initialOnboarding,
        }),

        // Loading/Error
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'user-store',
        partialize: (state) => ({
          user: state.user,
          onboarding: state.onboarding,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);

// Selectors
export const selectUserPreferences = (state: UserStoreState) =>
  state.user?.preferences ?? DEFAULT_USER_PREFERENCES;

export const selectTravelDNA = (state: UserStoreState) =>
  state.user?.travelDNA ?? DEFAULT_TRAVEL_DNA;

export const selectBucketList = (state: UserStoreState) =>
  state.user?.bucketList ?? [];

export const selectUncompletedBucketItems = (state: UserStoreState) =>
  state.user?.bucketList.filter((i) => !i.completedAt) ?? [];
