/**
 * UserStateManager
 *
 * Manages the 5 dynamic user states for the Home Page:
 * - NewUser: First-time user, no trips yet
 * - PlannedTrip: Has upcoming trip with countdown
 * - ActiveTrip: Currently on a trip
 * - BetweenTrips: Has past trips, no active/upcoming
 * - PostTrip: Just returned from a trip (within 7 days)
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

/**
 * User state types
 */
export type UserState =
  | 'NewUser'
  | 'PlannedTrip'
  | 'ActiveTrip'
  | 'BetweenTrips'
  | 'PostTrip';

/**
 * Trip data for state determination
 */
export interface TripInfo {
  id: string;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'planned' | 'active' | 'completed' | 'cancelled';
  coverImage?: string;
  daysCount: number;
  activitiesCount: number;
}

/**
 * Context state shape
 */
interface UserStateContextValue {
  userState: UserState;
  activeTrip: TripInfo | null;
  upcomingTrip: TripInfo | null;
  recentTrip: TripInfo | null;
  pastTrips: TripInfo[];
  isLoading: boolean;
  daysUntilTrip: number | null;
  daysSinceTrip: number | null;
  currentTripDay: number | null;
  refreshState: () => void;
}

const UserStateContext = createContext<UserStateContextValue | undefined>(undefined);

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / oneDay);
}

/**
 * Determine user state from trip data
 */
function determineUserState(
  trips: TripInfo[],
  now: Date = new Date()
): {
  state: UserState;
  activeTrip: TripInfo | null;
  upcomingTrip: TripInfo | null;
  recentTrip: TripInfo | null;
  daysUntilTrip: number | null;
  daysSinceTrip: number | null;
  currentTripDay: number | null;
} {
  // Find active trip (currently happening)
  const activeTrip = trips.find(
    trip => trip.status === 'active' ||
    (trip.status === 'planned' && trip.startDate <= now && trip.endDate >= now)
  ) || null;

  if (activeTrip) {
    const currentTripDay = daysBetween(activeTrip.startDate, now) + 1;
    return {
      state: 'ActiveTrip',
      activeTrip,
      upcomingTrip: null,
      recentTrip: null,
      daysUntilTrip: null,
      daysSinceTrip: null,
      currentTripDay,
    };
  }

  // Find upcoming planned trip
  const upcomingTrips = trips
    .filter(trip => trip.status === 'planned' && trip.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const upcomingTrip = upcomingTrips[0] || null;

  if (upcomingTrip) {
    const daysUntilTrip = daysBetween(now, upcomingTrip.startDate);
    return {
      state: 'PlannedTrip',
      activeTrip: null,
      upcomingTrip,
      recentTrip: null,
      daysUntilTrip,
      daysSinceTrip: null,
      currentTripDay: null,
    };
  }

  // Find recent completed trip (within 7 days)
  const completedTrips = trips
    .filter(trip => trip.status === 'completed')
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  const mostRecentTrip = completedTrips[0] || null;

  if (mostRecentTrip) {
    const daysSinceTrip = daysBetween(mostRecentTrip.endDate, now);

    // PostTrip state if within 7 days of returning
    if (daysSinceTrip <= 7) {
      return {
        state: 'PostTrip',
        activeTrip: null,
        upcomingTrip: null,
        recentTrip: mostRecentTrip,
        daysUntilTrip: null,
        daysSinceTrip,
        currentTripDay: null,
      };
    }

    // BetweenTrips if has past trips but nothing upcoming
    return {
      state: 'BetweenTrips',
      activeTrip: null,
      upcomingTrip: null,
      recentTrip: mostRecentTrip,
      daysUntilTrip: null,
      daysSinceTrip,
      currentTripDay: null,
    };
  }

  // NewUser if no trips at all
  return {
    state: 'NewUser',
    activeTrip: null,
    upcomingTrip: null,
    recentTrip: null,
    daysUntilTrip: null,
    daysSinceTrip: null,
    currentTripDay: null,
  };
}

/**
 * UserStateProvider Props
 */
interface UserStateProviderProps {
  children: ReactNode;
  trips?: TripInfo[];
}

/**
 * UserStateProvider Component
 *
 * Wraps the app and provides user state context
 */
export function UserStateProvider({ children, trips = [] }: UserStateProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tripData, setTripData] = useState<TripInfo[]>(trips);

  // Parse dates if they're strings
  useEffect(() => {
    const parsedTrips = trips.map(trip => ({
      ...trip,
      startDate: trip.startDate instanceof Date ? trip.startDate : new Date(trip.startDate),
      endDate: trip.endDate instanceof Date ? trip.endDate : new Date(trip.endDate),
    }));
    setTripData(parsedTrips);
    setIsLoading(false);
  }, [trips]);

  // Calculate state
  const stateInfo = useMemo(() => {
    return determineUserState(tripData);
  }, [tripData]);

  // Get past trips (completed, sorted by end date desc)
  const pastTrips = useMemo(() => {
    return tripData
      .filter(trip => trip.status === 'completed')
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  }, [tripData]);

  // Refresh function
  const refreshState = () => {
    setIsLoading(true);
    // In a real app, this would fetch from API
    setTimeout(() => setIsLoading(false), 500);
  };

  const value: UserStateContextValue = {
    userState: stateInfo.state,
    activeTrip: stateInfo.activeTrip,
    upcomingTrip: stateInfo.upcomingTrip,
    recentTrip: stateInfo.recentTrip,
    pastTrips,
    isLoading,
    daysUntilTrip: stateInfo.daysUntilTrip,
    daysSinceTrip: stateInfo.daysSinceTrip,
    currentTripDay: stateInfo.currentTripDay,
    refreshState,
  };

  return (
    <UserStateContext.Provider value={value}>
      {children}
    </UserStateContext.Provider>
  );
}

/**
 * useUserState Hook
 *
 * Access user state from any component
 */
export function useUserState(): UserStateContextValue {
  const context = useContext(UserStateContext);
  if (context === undefined) {
    throw new Error('useUserState must be used within a UserStateProvider');
  }
  return context;
}

/**
 * Get greeting based on time of day
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'בוקר טוב';      // Good morning
  if (hour < 17) return 'צהריים טובים';   // Good afternoon
  if (hour < 21) return 'ערב טוב';        // Good evening
  return 'לילה טוב';                      // Good night
}

/**
 * Get CTA text based on user state
 */
export function getStateCTA(state: UserState): { text: string; textEn: string } {
  switch (state) {
    case 'NewUser':
      return { text: 'תכנן טיול ראשון', textEn: 'Plan First Trip' };
    case 'PlannedTrip':
      return { text: 'השלם הכנות', textEn: 'Complete Prep' };
    case 'ActiveTrip':
      return { text: 'נווט לעצירה הבאה', textEn: 'Navigate Next' };
    case 'BetweenTrips':
      return { text: 'לאן הבא?', textEn: 'Where Next?' };
    case 'PostTrip':
      return { text: 'שתף וסכם', textEn: 'Share & Summarize' };
    default:
      return { text: 'תכנן טיול', textEn: 'Plan Trip' };
  }
}

/**
 * Get header title based on user state
 */
export function getStateTitle(state: UserState): { text: string; textEn: string } {
  switch (state) {
    case 'NewUser':
      return { text: 'לאן ההרפתקה הבאה?', textEn: "Where's your next adventure?" };
    case 'PlannedTrip':
      return { text: 'הטיול שלך מתקרב!', textEn: 'Your trip is coming!' };
    case 'ActiveTrip':
      return { text: 'בטיול', textEn: 'On Trip' };
    case 'BetweenTrips':
      return { text: 'מוכן להרפתקה הבאה?', textEn: 'Ready for the next adventure?' };
    case 'PostTrip':
      return { text: 'ברוך שובך!', textEn: 'Welcome back!' };
    default:
      return { text: 'גלה יעדים', textEn: 'Discover Destinations' };
  }
}

export default UserStateProvider;
