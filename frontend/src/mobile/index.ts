/**
 * RoamWise Mobile App - Entry Point
 *
 * React Native (Expo) application with bottom tab navigation
 * for hiking and travel assistance.
 */

// Main App
export { default as App } from './App';

// Navigation
export { BottomTabNavigator } from './navigation/BottomTabNavigator';
export type { RootTabParamList } from './navigation/BottomTabNavigator';

// Screens
export { ExploreScreen } from './screens/ExploreScreen';
export { PlannerScreen } from './screens/PlannerScreen';
export { LiveScreen } from './screens/LiveScreen';
export { ProfileScreen } from './screens/ProfileScreen';

// Hooks
export { useAppNavigation } from './hooks/useNavigation';

// Theme
export { theme, colors, spacing, typography, borderRadius, shadows } from './theme/tokens';
export type { Theme } from './theme/tokens';
