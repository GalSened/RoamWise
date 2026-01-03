/**
 * Home Components Index
 *
 * Exports all home page components and utilities
 */

export {
  UserStateProvider,
  useUserState,
  getTimeBasedGreeting,
  getStateCTA,
  getStateTitle,
} from './UserStateManager';
export type { UserState, TripInfo } from './UserStateManager';

export { TripCountdown } from './TripCountdown';
export { InspirationCards } from './InspirationCards';
export { QuickActions } from './QuickActions';
export { TripSummaryCard } from './TripSummaryCard';
