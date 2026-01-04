/**
 * Trip Store - Zustand state management for trips
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Trip, TripAlert, CreateTripInput, TripState } from '../domain/trip/types';

interface TripStoreState {
  // State
  trips: Trip[];
  activeTrip: Trip | null;
  alerts: TripAlert[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  setActiveTrip: (trip: Trip | null) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  updateTripState: (id: string, state: TripState) => void;

  // Alert actions
  addAlert: (alert: TripAlert) => void;
  dismissAlert: (alertId: string) => void;
  clearAlerts: (tripId: string) => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTripStore = create<TripStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        trips: [],
        activeTrip: null,
        alerts: [],
        isLoading: false,
        error: null,

        // Trip actions
        setTrips: (trips) => set({ trips }),

        addTrip: (trip) => set((state) => ({
          trips: [...state.trips, trip],
        })),

        setActiveTrip: (trip) => set({ activeTrip: trip }),

        updateTrip: (id, updates) => set((state) => ({
          trips: state.trips.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
          activeTrip: state.activeTrip?.id === id
            ? { ...state.activeTrip, ...updates, updatedAt: new Date() }
            : state.activeTrip,
        })),

        deleteTrip: (id) => set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
          activeTrip: state.activeTrip?.id === id ? null : state.activeTrip,
        })),

        updateTripState: (id, tripState) => set((state) => ({
          trips: state.trips.map((t) =>
            t.id === id ? { ...t, state: tripState, updatedAt: new Date() } : t
          ),
          activeTrip: state.activeTrip?.id === id
            ? { ...state.activeTrip, state: tripState, updatedAt: new Date() }
            : state.activeTrip,
        })),

        // Alert actions
        addAlert: (alert) => set((state) => ({
          alerts: [...state.alerts, alert],
        })),

        dismissAlert: (alertId) => set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, dismissedAt: new Date() } : a
          ),
        })),

        clearAlerts: (tripId) => set((state) => ({
          alerts: state.alerts.filter((a) => a.tripId !== tripId),
        })),

        // Loading/Error
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'trip-store',
        partialize: (state) => ({
          trips: state.trips,
          activeTrip: state.activeTrip,
        }),
      }
    ),
    { name: 'TripStore' }
  )
);

// Selectors
export const selectActiveAlerts = (state: TripStoreState) =>
  state.alerts.filter((a) => !a.dismissedAt && a.tripId === state.activeTrip?.id);

export const selectTripById = (id: string) => (state: TripStoreState) =>
  state.trips.find((t) => t.id === id);

export const selectTripsByState = (tripState: TripState) => (state: TripStoreState) =>
  state.trips.filter((t) => t.state === tripState);
