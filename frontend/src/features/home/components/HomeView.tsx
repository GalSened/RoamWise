/**
 * HomeView - Main home page with 5 conditional states
 * States: new-user, planned-trip, active-trip, between-trips, post-trip
 */
import { useMemo } from 'react';
import { useTripStore, useUserStore } from '@/stores';
import { TripState } from '@/domain';
import { NewUserState } from './NewUserState';
import { PlannedTripState } from './PlannedTripState';
import { ActiveTripState } from './ActiveTripState';
import { BetweenTripsState } from './BetweenTripsState';
import { PostTripState } from './PostTripState';

type HomeState = 'new-user' | 'planned-trip' | 'active-trip' | 'between-trips' | 'post-trip';

export function HomeView() {
  const { trips, activeTrip } = useTripStore();
  const { user, onboarding } = useUserStore();

  // Determine which home state to show based on user and trip data
  const homeState = useMemo((): HomeState => {
    // Check for active trip first
    if (activeTrip?.state === TripState.ACTIVE) {
      return 'active-trip';
    }

    // Check for planned trips (upcoming)
    const plannedTrips = trips.filter(
      (t) => t.state === TripState.PLANNED && new Date(t.startDate) > new Date()
    );
    if (plannedTrips.length > 0) {
      return 'planned-trip';
    }

    // Check for recently completed trips (within 24 hours)
    const recentlyCompleted = trips.filter((t) => {
      if (t.state !== TripState.COMPLETED) return false;
      const completedTime = new Date(t.updatedAt).getTime();
      const now = Date.now();
      return now - completedTime < 24 * 60 * 60 * 1000; // 24 hours
    });
    if (recentlyCompleted.length > 0) {
      return 'post-trip';
    }

    // Check if user has any trip history
    const hasCompletedTrips = trips.some((t) => t.state === TripState.COMPLETED);
    if (hasCompletedTrips || (user && user.stats.tripsCompleted > 0)) {
      return 'between-trips';
    }

    // New user (no trips, onboarding may be incomplete)
    return 'new-user';
  }, [trips, activeTrip, user]);

  // Get the next planned trip for planned-trip state
  const nextTrip = useMemo(() => {
    return trips
      .filter((t) => t.state === TripState.PLANNED && new Date(t.startDate) > new Date())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
  }, [trips]);

  // Get the most recently completed trip for post-trip state
  const lastCompletedTrip = useMemo(() => {
    return trips
      .filter((t) => t.state === TripState.COMPLETED)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [trips]);

  return (
    <div className="home-view">
      {homeState === 'new-user' && <NewUserState />}
      {homeState === 'planned-trip' && nextTrip && <PlannedTripState trip={nextTrip} />}
      {homeState === 'active-trip' && activeTrip && <ActiveTripState trip={activeTrip} />}
      {homeState === 'between-trips' && <BetweenTripsState />}
      {homeState === 'post-trip' && lastCompletedTrip && <PostTripState trip={lastCompletedTrip} />}
    </div>
  );
}
