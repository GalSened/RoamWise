/**
 * Profile Components Index
 *
 * Exports all profile-related components for the Travel Identity Hub
 */

// Types
export * from './types';

// Components
export { AIGreeting } from './AIGreeting';
export { TravelDNARadar } from './TravelDNARadar';
export { WorldMapCard } from './WorldMapCard';
export {
  AchievementBadge,
  AchievementCard,
  BadgeGrid,
  AchievementsSection
} from './Achievements';
export { BucketList } from './BucketList';
export { TravelInsights } from './TravelInsights';
export { MemoriesTimeline } from './MemoriesTimeline';

// Default exports for convenience
export { default as AIGreetingDefault } from './AIGreeting';
export { default as TravelDNARadarDefault } from './TravelDNARadar';
export { default as WorldMapCardDefault } from './WorldMapCard';
export { default as BucketListDefault } from './BucketList';
export { default as TravelInsightsDefault } from './TravelInsights';
export { default as MemoriesTimelineDefault } from './MemoriesTimeline';
